from asyncio.log import logger
from logging import log
import os
from datetime import datetime, date, timedelta
from flask import Flask, request, jsonify, render_template, redirect, send_from_directory, abort
from flask_cors import CORS
from models import db, Visit, Comment
from sqlalchemy import func

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

# CDN 配置：如果设置了环境变量，静态资源将重定向到 CDN
CDN_URL = os.environ.get('CDN_URL')

# 初始化数据库插件
db.init_app(app)

# 应用启动时确保数据目录和数据库表存在
with app.app_context():
    data_dir = os.path.join(basedir, 'data')
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)
    db.create_all()


# ==========================================
# 静态资源路由
# ==========================================

@app.route('/favicon.ico')
def favicon():
    """服务站点图标"""
    return send_from_directory(app.static_folder or 'frontend', 'favicon.ico', mimetype='image/vnd.microsoft.icon')

@app.route('/frontend/articles/<path:filename>')
def serve_frontend_articles(filename):
    """
    服务前端文章资源 (Markdown/HTML)
    如果配置了 CDN，则禁止直接访问此路径，强制走 CDN
    """
    if CDN_URL:
        abort(403)
    return send_from_directory('articles', filename)

@app.route('/frontend/<path:filename>')
def serve_frontend_static(filename):
    """
    服务前端通用静态资源 (JS/CSS/Images)
    如果配置了 CDN，则禁止直接访问此路径
    """
    if CDN_URL:
        abort(403)
    return send_from_directory('frontend', filename)

@app.route('/articles/<path:filename>')
def serve_articles(filename):
    """
    文章内容的统一访问入口
    如果配置了 CDN，重定向到 CDN 地址；否则直接返回本地文件
    """
    if CDN_URL:
        return redirect(f"{CDN_URL}/articles/{filename}")
    return send_from_directory('articles', filename)

# ==========================================
# API: 评论系统
# ==========================================

@app.route('/api/comments', methods=['GET'])
def get_comments():
    """获取指定文章的评论列表"""
    article_path = request.args.get('article_path')
    if not article_path:
        return jsonify({'error': 'article_path required'}), 400
    
    # 按时间倒序排列
    comments = Comment.query.filter_by(article_path=article_path).order_by(Comment.timestamp.desc()).all()
    return jsonify([c.to_dict() for c in comments])

@app.route('/api/comments', methods=['POST'])
def add_comment():
    """
    发布新评论
    包含简单的频率限制：每个 IP 每天最多 3 条
    """
    data = request.json
    ip_address = request.remote_addr
    user_agent = request.headers.get('User-Agent')
    author = data.get('author')
    content = data.get('content')
    article_path = data.get('article_path')

    if not author or not content or not article_path:
        return jsonify({'error': 'Missing required fields'}), 400

    # 频率限制检查
    today_start = datetime.combine(date.today(), datetime.min.time())
    comment_count = Comment.query.filter(
        Comment.ip_address == ip_address,
        Comment.timestamp >= today_start
    ).count()

    if comment_count >= 3:
        return jsonify({'error': 'Daily comment limit reached'}), 429

    new_comment = Comment(
        article_path=article_path,
        author=author,
        content=content,
        ip_address=ip_address,
        user_agent=user_agent
    )
    db.session.add(new_comment)
    db.session.commit()
    return jsonify(new_comment.to_dict()), 201

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

# ==========================================
# SPA 路由捕获
# ==========================================

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
