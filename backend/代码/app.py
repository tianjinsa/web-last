import os
import html
import re
from datetime import datetime, date, timedelta
from urllib.parse import urlparse, urljoin, quote
from urllib.request import Request, urlopen
import json
from flask import Flask, request, jsonify, render_template, redirect, send_from_directory, abort
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from models import db, Visit, Comment, User, SystemConfig
from sqlalchemy import func
from functools import wraps

# ==========================================
# 配置与初始化
# ==========================================

# 将静态文件和模板文件夹都指向本地的 'frontend' 目录
# 这样 Flask 可以直接服务前端构建产物
app = Flask(__name__, static_folder='frontend', template_folder='frontend')
CORS(app)  # 允许跨域请求，方便开发调试

# 基础路径配置
basedir = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(basedir, 'data', 'blog.db')

# 数据库配置 (SQLite)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + db_path
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# JWT 配置
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=7)

# 管理员配置 (从环境变量获取，默认 admin/admin)
app.config['ADMIN_USERNAME'] = os.environ.get('ADMIN_USERNAME', 'admin')
app.config['ADMIN_PASSWORD'] = os.environ.get('ADMIN_PASSWORD', 'admin')

# CDN 配置：如果设置了环境变量，静态资源将重定向到 CDN
CDN_URL = os.environ.get('CDN_URL')

# 初始化数据库插件
db.init_app(app)
jwt = JWTManager(app)

# 应用启动时确保数据目录和数据库表存在
with app.app_context():
    data_dir = os.path.join(basedir, 'data')
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)
    db.create_all()
    
    # 初始化系统配置
    if not SystemConfig.query.filter_by(key='auto_approve_users').first():
        SystemConfig.set('auto_approve_users', 'false')
    if not SystemConfig.query.filter_by(key='auto_approve_comments').first():
        SystemConfig.set('auto_approve_comments', 'false')
    # AI 助手配置
    if not SystemConfig.query.filter_by(key='ai_enabled').first():
        SystemConfig.set('ai_enabled', 'false')
    if not SystemConfig.query.filter_by(key='ai_api_url').first():
        SystemConfig.set('ai_api_url', 'https://open.bigmodel.cn/api/paas/v4/chat/completions')
    if not SystemConfig.query.filter_by(key='ai_api_key').first():
        SystemConfig.set('ai_api_key', '')
    if not SystemConfig.query.filter_by(key='ai_model').first():
        SystemConfig.set('ai_model', 'glm-4.5-flash')
    if not SystemConfig.query.filter_by(key='ai_system_prompt').first():
        SystemConfig.set('ai_system_prompt', '你是一个智能文档助手。请根据提供的文档列表回答用户的问题。回答请使用 Markdown 格式，保持简洁明了。')


# ==========================================
# 权限装饰器
# ==========================================

def admin_required(fn):
    """要求管理员权限的装饰器"""
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        identity = get_jwt_identity()
        # 仅允许身份为 'admin' 的用户访问
        if identity == 'admin':
            return fn(*args, **kwargs)
        return jsonify({'error': 'Admin access required'}), 403
    return wrapper


def resolve_user_from_token():
    """返回 (identity, user)；identity 为 'admin' 或 int，user 为 User 实例或 None"""
    identity = get_jwt_identity()
    if identity == 'admin':
        return 'admin', None
    try:
        user_id = int(identity)
    except (TypeError, ValueError):
        return None, None
    user = User.query.get(user_id)
    return user_id, user


# ==========================================
# 静态资源路由
# ==========================================

@app.route('/favicon.ico')
def favicon():
    """服务站点图标"""
    return send_from_directory(app.static_folder or 'frontend', 'favicon.ico', mimetype='image/vnd.microsoft.icon')

@app.route('/frontend/<path:filename>')
def serve_frontend_static(filename):
    """
    服务前端资源 (JS/CSS/Images/文章等)
    如果配置了 CDN，则禁止直接访问此路径
    """
    if CDN_URL:
        return redirect(f"{CDN_URL}/frontend/{filename}")
    return send_from_directory('frontend', filename)


# ==========================================
# API: 用户认证
# ==========================================

@app.route('/api/auth/register', methods=['POST'])
def register():
    """用户注册"""
    data = request.json
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    
    # 检查用户名是否已存在
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 409
    
    # 检查邮箱是否已存在（如果提供）
    if email and User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already exists'}), 409
    
    # 创建新用户
    user = User(username=username, email=email)
    user.set_password(password)
    
    # 检查是否自动批准
    auto_approve = SystemConfig.get('auto_approve_users') == 'true'
    user.is_approved = auto_approve
    
    # 检查是否自动批准评论
    user.comment_needs_approval = SystemConfig.get('auto_approve_comments') != 'true'
    
    # 第一个用户自动成为管理员 (已废弃，管理员现在通过环境变量配置)
    # if User.query.count() == 0:
    #     user.is_admin = True
    #     user.is_approved = True
    #     user.comment_needs_approval = False
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({
        'message': 'Registration successful' if user.is_approved else 'Registration successful, waiting for admin approval',
        'user': user.to_dict()
    }), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    """用户登录"""
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    
    user = User.query.filter_by(username=username).first()
    
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid username or password'}), 401
    
    if not user.is_approved:
        return jsonify({'error': 'Account not yet approved by admin'}), 403
    
    # 更新最后登录时间
    user.last_login = datetime.utcnow()
    db.session.commit()
    
    # 生成 JWT token（identity 必须为字符串，符合 JWT 规范）
    access_token = create_access_token(identity=str(user.id))
    
    return jsonify({
        'access_token': access_token,
        'user': user.to_dict()
    }), 200

@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """获取当前登录用户信息"""
    identity, user = resolve_user_from_token()

    if identity == 'admin':
        return jsonify({
            'username': app.config['ADMIN_USERNAME'],
            'is_admin': True,
            'id': 'admin'
        }), 200

    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify(user.to_dict()), 200

@app.route('/api/auth/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """修改密码"""
    identity, user = resolve_user_from_token()

    if identity == 'admin':
        return jsonify({'error': 'Admin password cannot be changed via API'}), 403

    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    data = request.json
    old_password = data.get('old_password')
    new_password = data.get('new_password')
    
    if not old_password or not new_password:
        return jsonify({'error': 'Missing required fields'}), 400
        
    if not user.check_password(old_password):
        return jsonify({'error': 'Invalid old password'}), 401
        
    if len(new_password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
        
    user.set_password(new_password)
    db.session.commit()
    
    return jsonify({'message': 'Password updated successfully'}), 200

# ==========================================
# API: 管理员认证
# ==========================================

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    """管理员登录 (基于配置)"""
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if username == app.config['ADMIN_USERNAME'] and password == app.config['ADMIN_PASSWORD']:
        access_token = create_access_token(identity='admin')
        return jsonify({
            'access_token': access_token,
            'user': {
                'username': username,
                'is_admin': True,
                'id': 'admin'
            }
        }), 200
    
    return jsonify({'error': 'Invalid admin credentials'}), 401

# ==========================================
# API: 评论系统
# ==========================================

@app.route('/api/comments', methods=['GET'])
def get_comments():
    """获取指定文章的评论列表（仅显示已批准的评论）"""
    article_path = request.args.get('article_path')
    if not article_path:
        return jsonify({'error': 'article_path required'}), 400
    
    # 只返回已批准的评论，按时间倒序排列
    comments = Comment.query.filter_by(
        article_path=article_path,
        status='approved'
    ).order_by(Comment.timestamp.desc()).all()
    
    return jsonify([c.to_dict() for c in comments])

@app.route('/api/comments', methods=['POST'])
@jwt_required()
def add_comment():
    """
    发布新评论（需要登录）
    根据用户权限决定是否需要审核
    """
    identity, user = resolve_user_from_token()
    
    if identity is None or not user or not user.is_approved:
        return jsonify({'error': 'User not approved'}), 403
    
    data = request.json
    content = data.get('content')
    article_path = data.get('article_path')

    if not content or not article_path:
        return jsonify({'error': 'Missing required fields'}), 400

    # 频率限制检查
    ip_address = request.remote_addr
    today_start = datetime.combine(date.today(), datetime.min.time())
    comment_count = Comment.query.filter(
        Comment.user_id == user.id,
        Comment.timestamp >= today_start
    ).count()

    if comment_count >= 10:
        return jsonify({'error': 'Daily comment limit reached'}), 429

    # 决定评论状态
    status = 'pending' if user.comment_needs_approval else 'approved'
    
    new_comment = Comment(
        article_path=article_path,
        content=content,
        user_id=user.id,
        ip_address=ip_address,
        user_agent=request.headers.get('User-Agent'),
        status=status
    )
    db.session.add(new_comment)
    db.session.commit()
    
    return jsonify({
        'message': 'Comment submitted' if status == 'pending' else 'Comment published',
        'comment': new_comment.to_dict()
    }), 201

# ==========================================
# API: 访问统计
# ==========================================

@app.route('/dash')
def dashboard():
    """简单的后端管理仪表盘页面"""
    total_visits = Visit.query.count()
    recent_visits = Visit.query.order_by(Visit.timestamp.desc()).limit(10).all()
    total_comments = Comment.query.count()
    
    return render_template('dash.html', 
                           total_visits=total_visits, 
                           recent_visits=recent_visits,
                           total_comments=total_comments,
                           cdn_url=CDN_URL or '/frontend')

@app.route('/api/stats/visit', methods=['POST'])
def record_visit():
    """
    记录页面访问
    包含去重逻辑：同一 IP 同一天访问同一路径只记录一次
    """
    data = request.json
    path = data.get('path', '/')
    ip_address = request.remote_addr
    
    today_start = datetime.combine(date.today(), datetime.min.time())
    existing_visit = Visit.query.filter(
        Visit.ip_address == ip_address,
        Visit.path == path,
        Visit.timestamp >= today_start
    ).first()
    
    if existing_visit:
        return jsonify({'status': 'ignored', 'reason': 'already_visited_today'})

    visit = Visit(path=path, ip_address=ip_address)
    db.session.add(visit)
    db.session.commit()
    return jsonify({'status': 'recorded'})

@app.route('/api/stats/summary', methods=['GET'])
def get_stats_summary():
    """
    获取统计摘要（用于前端图表展示）
    返回总访问量和最近 7 天的每日访问趋势
    可选参数: path - 如果提供，则只统计特定路径的数据
    """
    path = request.args.get('path')
    
    query = Visit.query
    if path:
        query = query.filter_by(path=path)
        
    total_visits = query.count()
    
    # 获取最近 7 天的数据
    end_date = date.today()
    start_date = end_date - timedelta(days=6)
    
    # 按日期分组统计
    daily_query = db.session.query(
        func.date(Visit.timestamp).label('date'),
        func.count(Visit.id).label('count')
    ).filter(
        Visit.timestamp >= datetime.combine(start_date, datetime.min.time())
    )
    
    if path:
        daily_query = daily_query.filter(Visit.path == path)
        
    daily_stats = daily_query.group_by(
        func.date(Visit.timestamp)
    ).all()
    
    # 补全缺失日期的通过 0 填充
    stats_dict = {str(day.date): day.count for day in daily_stats}
    result = []
    for i in range(7):
        day = start_date + timedelta(days=i)
        day_str = day.isoformat()
        result.append({
            'date': day_str,
            'count': stats_dict.get(day_str, 0)
        })
        
    return jsonify({
        'total_visits': total_visits,
        'daily_visits': result
    })

@app.route('/api/stats/top', methods=['GET'])
def get_top_articles():
    """
    获取浏览量最高的文章 (Top 3)
    只统计 /docs/ 开头的路径
    """
    # 统计 path 出现次数，按次数倒序
    top_paths = db.session.query(
        Visit.path,
        func.count(Visit.id).label('count')
    ).filter(
        Visit.path.like('/docs/%')
    ).group_by(
        Visit.path
    ).order_by(
        func.count(Visit.id).desc()
    ).limit(3).all()
    
    result = []
    for path, count in top_paths:
        # 提取 slug: /docs/my-slug -> my-slug
        slug = path.split('/')[-1]
        result.append({
            'slug': slug,
            'path': path,
            'count': count
        })
        
    return jsonify(result)


PROXY_URL_PATTERN = re.compile(r'(src|href|action)=("|\")(.*?)(\2)', re.IGNORECASE)
CSS_URL_PATTERN = re.compile(r'url\(([^)]+)\)', re.IGNORECASE)
CSS_IMPORT_PATTERN = re.compile(r'@import\s+(?:url\()?(["\']?[^\s"\')]+["\']?)\)?', re.IGNORECASE)


def build_proxy_url(target_url: str) -> str:
    return f"/api/ifm-proxy?target={quote(target_url, safe='')}"


def rewrite_url_for_proxy(raw_url: str, base_url: str) -> str:
    if not raw_url:
        return raw_url

    trimmed = raw_url.strip()
    lower = trimmed.lower()

    if trimmed.startswith('#') or lower.startswith('javascript:') or lower.startswith('data:'):
        return trimmed

    if trimmed.startswith('/api/ifm-proxy?target='):
        return trimmed

    if trimmed.startswith('//'):
        base_scheme = urlparse(base_url).scheme or 'http'
        absolute = f"{base_scheme}:{trimmed}"
    elif lower.startswith('http://') or lower.startswith('https://'):
        absolute = trimmed
    else:
        absolute = urljoin(base_url, trimmed)

    if absolute.lower().startswith('https://'):
        return absolute

    return build_proxy_url(absolute)


def rewrite_html_for_proxy(html_text: str, base_url: str) -> str:
    def replace_attr(match):
        attr = match.group(1)
        quote_char = match.group(2)
        value = match.group(3)
        new_value = rewrite_url_for_proxy(value, base_url)
        return f"{attr}={quote_char}{new_value}{quote_char}"

    return PROXY_URL_PATTERN.sub(replace_attr, html_text)


def _wrap_css_url(new_url: str, original_token: str) -> str:
    stripped = original_token.strip()
    if stripped.startswith(('"', "'")) and stripped[-1:] == stripped[:1]:
        quote_char = stripped[0]
        return f"{quote_char}{new_url}{quote_char}"
    return new_url


def rewrite_css_for_proxy(css_text: str, base_url: str) -> str:
    def replace_url(match):
        token = match.group(1)
        cleaned = token.strip().strip('"\'')
        lowered = cleaned.lower()
        if not cleaned or lowered.startswith('data:') or lowered.startswith('javascript:'):
            return match.group(0)
        new_value = rewrite_url_for_proxy(cleaned, base_url)
        wrapped = _wrap_css_url(new_value, token)
        return f"url({wrapped})"

    def replace_import(match):
        token = match.group(1)
        stripped = token.strip()
        cleaned = stripped.strip('"\'')
        lowered = cleaned.lower()
        if not cleaned or lowered.startswith('data:') or lowered.startswith('javascript:'):
            return match.group(0)
        new_value = rewrite_url_for_proxy(cleaned, base_url)
        wrapped = _wrap_css_url(new_value, stripped)
        return f"@import url({wrapped})"

    css_text = CSS_URL_PATTERN.sub(replace_url, css_text)
    css_text = CSS_IMPORT_PATTERN.sub(replace_import, css_text)
    return css_text


@app.route('/api/ifm-proxy', methods=['GET', 'POST'])
def ifm_proxy():
    """将 http/https 资源通过服务器代理，并重写其中的 http 引用，避免 HTTPS Mixed-Content。"""
    target = request.args.get('target')
    if not target:
        return jsonify({'error': 'target_required'}), 400

    parsed = urlparse(target)
    if parsed.scheme not in ('http', 'https'):
        return jsonify({'error': 'invalid_scheme'}), 400

    try:
        method = request.method.upper()
        body = request.get_data() if method == 'POST' else None
        headers = {'User-Agent': 'AlphaDocsProxy/1.0'}
        if method == 'POST' and request.content_type:
            headers['Content-Type'] = request.content_type

        req = Request(target, data=body, headers=headers, method=method)
        with urlopen(req, timeout=8) as remote:
            content = remote.read()
            content_type = remote.headers.get('Content-Type', 'text/html; charset=utf-8')
            content_type_lower = content_type.lower()

            if 'text/html' in content_type_lower:
                charset = remote.headers.get_content_charset() or 'utf-8'
                text = content.decode(charset, errors='replace')
                escaped_target = html.escape(target, quote=True)
                base_tag = f'<base href="{escaped_target}">' if target else ''
                lower_text = text.lower()
                if '<base' not in lower_text:
                    head_index = lower_text.find('<head')
                    if head_index != -1:
                        head_close = lower_text.find('>', head_index)
                        if head_close != -1:
                            text = text[:head_close + 1] + base_tag + text[head_close + 1:]
                        else:
                            text = base_tag + text
                    else:
                        text = base_tag + text
                text = rewrite_html_for_proxy(text, target)
                content = text.encode('utf-8')
                content_type = 'text/html; charset=utf-8'
            elif 'text/css' in content_type_lower:
                charset = remote.headers.get_content_charset() or 'utf-8'
                text = content.decode(charset, errors='replace')
                text = rewrite_css_for_proxy(text, target)
                content = text.encode('utf-8')
                content_type = 'text/css; charset=utf-8'

            response = app.response_class(content, content_type=content_type)
            response.headers['Cache-Control'] = 'public, max-age=60'
            response.headers['X-IFM-Proxy'] = '1'
            response.headers['X-Content-Source'] = target
            return response
    except Exception as exc:
        return jsonify({'error': 'proxy_failed', 'detail': str(exc)}), 502

# ==========================================
# API: 管理员后台
# ==========================================

@app.route('/api/admin/users', methods=['GET'])
@admin_required
def get_all_users():
    """获取所有用户列表"""
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify([u.to_dict() for u in users]), 200

@app.route('/api/admin/users/<int:user_id>/approve', methods=['POST'])
@admin_required
def approve_user(user_id):
    """批准用户"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    user.is_approved = True
    db.session.commit()
    return jsonify({'message': 'User approved', 'user': user.to_dict()}), 200

@app.route('/api/admin/users/<int:user_id>/reject', methods=['POST'])
@admin_required
def reject_user(user_id):
    """拒绝/取消批准用户"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if user.is_admin:
        return jsonify({'error': 'Cannot reject admin user'}), 400
    
    user.is_approved = False
    db.session.commit()
    return jsonify({'message': 'User rejected', 'user': user.to_dict()}), 200

@app.route('/api/admin/users/<int:user_id>/permissions', methods=['PUT'])
@admin_required
def update_user_permissions(user_id):
    """更新用户权限"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.json
    
    # 更新评论审核要求
    if 'comment_needs_approval' in data:
        user.comment_needs_approval = bool(data['comment_needs_approval'])
    
    # 更新管理员权限（需谨慎）
    if 'is_admin' in data:
        user.is_admin = bool(data['is_admin'])
    
    db.session.commit()
    return jsonify({'message': 'Permissions updated', 'user': user.to_dict()}), 200

@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    """删除用户"""
    identity, _ = resolve_user_from_token()
    if isinstance(identity, int) and identity == user_id:
        return jsonify({'error': 'Cannot delete yourself'}), 400
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # 删除用户的所有评论
    Comment.query.filter_by(user_id=user_id).delete()
    
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'User deleted'}), 200

@app.route('/api/admin/comments/pending', methods=['GET'])
@admin_required
def get_pending_comments():
    """获取待审核的评论"""
    comments = Comment.query.filter_by(status='pending').order_by(Comment.timestamp.desc()).all()
    return jsonify([c.to_dict() for c in comments]), 200

@app.route('/api/admin/comments/<int:comment_id>/approve', methods=['POST'])
@admin_required
def approve_comment(comment_id):
    """批准评论"""
    identity, _ = resolve_user_from_token()
    comment = Comment.query.get(comment_id)
    
    if not comment:
        return jsonify({'error': 'Comment not found'}), 404
    
    comment.status = 'approved'
    # 如果是全局管理员，reviewed_by 设为 None (因为 admin 不是 User 表中的 ID)
    comment.reviewed_by = None if identity == 'admin' else identity
    comment.reviewed_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({'message': 'Comment approved', 'comment': comment.to_dict()}), 200

@app.route('/api/admin/comments/<int:comment_id>/reject', methods=['POST'])
@admin_required
def reject_comment(comment_id):
    """拒绝评论"""
    identity, _ = resolve_user_from_token()
    comment = Comment.query.get(comment_id)
    
    if not comment:
        return jsonify({'error': 'Comment not found'}), 404
    
    comment.status = 'rejected'
    comment.reviewed_by = None if identity == 'admin' else identity
    comment.reviewed_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({'message': 'Comment rejected', 'comment': comment.to_dict()}), 200

@app.route('/api/admin/comments/<int:comment_id>', methods=['DELETE'])
@admin_required
def delete_comment(comment_id):
    """删除评论"""
    comment = Comment.query.get(comment_id)
    
    if not comment:
        return jsonify({'error': 'Comment not found'}), 404
    
    db.session.delete(comment)
    db.session.commit()
    return jsonify({'message': 'Comment deleted'}), 200

@app.route('/api/admin/config', methods=['GET'])
@admin_required
def get_config():
    """获取系统配置"""
    return jsonify({
        'auto_approve_users': SystemConfig.get('auto_approve_users') == 'true',
        'auto_approve_comments': SystemConfig.get('auto_approve_comments') == 'true',
        'ai_enabled': SystemConfig.get('ai_enabled') == 'true',
        'ai_api_url': SystemConfig.get('ai_api_url') or '',
        'ai_api_key': SystemConfig.get('ai_api_key') or '',
        'ai_model': SystemConfig.get('ai_model') or 'glm-4.5-flash',
        'ai_system_prompt': SystemConfig.get('ai_system_prompt') or ''
    }), 200

@app.route('/api/admin/config', methods=['PUT'])
@admin_required
def update_config():
    """更新系统配置"""
    data = request.json
    
    if 'auto_approve_users' in data:
        SystemConfig.set('auto_approve_users', 'true' if data['auto_approve_users'] else 'false')
    
    if 'auto_approve_comments' in data:
        SystemConfig.set('auto_approve_comments', 'true' if data['auto_approve_comments'] else 'false')
    
    # AI 配置
    if 'ai_enabled' in data:
        SystemConfig.set('ai_enabled', 'true' if data['ai_enabled'] else 'false')
    if 'ai_api_url' in data:
        SystemConfig.set('ai_api_url', data['ai_api_url'])
    if 'ai_api_key' in data:
        SystemConfig.set('ai_api_key', data['ai_api_key'])
    if 'ai_model' in data:
        SystemConfig.set('ai_model', data['ai_model'])
    if 'ai_system_prompt' in data:
        SystemConfig.set('ai_system_prompt', data['ai_system_prompt'])
    
    return jsonify({'message': 'Config updated'}), 200


# ==========================================
# API: AI 助手
# ==========================================

@app.route('/api/ai/config', methods=['GET'])
def get_ai_public_config():
    """获取 AI 公开配置（不含敏感信息）"""
    return jsonify({
        'enabled': SystemConfig.get('ai_enabled') == 'true'
    }), 200


@app.route('/api/ai/chat', methods=['POST'])
def ai_chat_proxy():
    """AI 聊天代理接口"""
    # 检查是否启用
    if SystemConfig.get('ai_enabled') != 'true':
        return jsonify({'error': 'AI assistant is disabled'}), 403
    
    api_url = SystemConfig.get('ai_api_url')
    api_key = SystemConfig.get('ai_api_key')
    model = SystemConfig.get('ai_model') or 'glm-4.5-flash'
    system_prompt = SystemConfig.get('ai_system_prompt') or '你是一个智能文档助手。'
    
    if not api_url or not api_key:
        return jsonify({'error': 'AI not configured'}), 503
    
    data = request.json
    user_message = data.get('message', '')
    context = data.get('context', [])
    
    if not user_message:
        return jsonify({'error': 'Message required'}), 400
    
    # 构建完整的 system prompt，包含文档上下文
    full_system_prompt = system_prompt
    if context:
        full_system_prompt += f"\n\n文档列表: {json.dumps(context, ensure_ascii=False)}"
        full_system_prompt += "\n\n请注意：如果用户询问某篇文档，请提供文档的标题和链接（链接格式为 /docs/{slug}）。"
    
    try:
        import urllib.request
        import json as json_lib
        
        payload = json_lib.dumps({
            'model': model,
            'messages': [
                {'role': 'system', 'content': full_system_prompt},
                {'role': 'user', 'content': user_message}
            ]
        }).encode('utf-8')
        
        req = urllib.request.Request(
            api_url,
            data=payload,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {api_key}'
            },
            method='POST'
        )
        
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json_lib.loads(resp.read().decode('utf-8'))
            
            if result.get('choices') and len(result['choices']) > 0:
                return jsonify({
                    'content': result['choices'][0]['message']['content']
                }), 200
            else:
                return jsonify({'error': 'Empty response from AI'}), 502
                
    except urllib.error.HTTPError as e:
        return jsonify({'error': f'AI API error: {e.code}'}), 502
    except Exception as e:
        return jsonify({'error': f'AI request failed: {str(e)}'}), 502

# ==========================================
# SPA 路由捕获
# ==========================================

@app.route('/admin')
def admin_page():
    """
    独立的管理员后台页面
    """
    final_cdn_url = CDN_URL if CDN_URL else '/frontend'
    return render_template('admin.html', cdn_url=final_cdn_url)

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    """
    SPA 通配路由
    所有未被上述 API 或静态资源路由捕获的请求，都返回 index.html
    由前端 JS 接管路由处理
    """
    # 如果请求的是 api/ 或 frontend/ 开头但没匹配到，说明资源不存在，返回 404
    if path.startswith('api/') or path.startswith('frontend/'):
        return abort(404)
    
    # 确定 CDN 基础路径注入到模板中
    final_cdn_url = CDN_URL if CDN_URL else '/frontend'
    return render_template('index.html', cdn_url=final_cdn_url)

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=5000)
