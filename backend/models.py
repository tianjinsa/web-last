from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    """
    用户模型
    存储注册用户信息，支持审核和权限管理
    """
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)  # 是否为管理员
    is_approved = db.Column(db.Boolean, default=False)  # 是否已被管理员批准
    comment_needs_approval = db.Column(db.Boolean, default=False)  # 评论是否需要审核
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime, nullable=True)
    
    # 关系
    # comments = db.relationship('Comment', backref='user', lazy=True)
    
    def set_password(self, password):
        """设置密码哈希"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """验证密码"""
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self, include_sensitive=False):
        """序列化为字典"""
        data = {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'is_admin': self.is_admin,
            'is_approved': self.is_approved,
            'comment_needs_approval': self.comment_needs_approval,
            'created_at': self.created_at.isoformat(),
            'last_login': self.last_login.isoformat() if self.last_login else None
        }
        return data

class SystemConfig(db.Model):
    """
    系统配置模型
    存储全局设置（如自动批准用户等）
    """
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(50), unique=True, nullable=False)
    value = db.Column(db.String(255), nullable=False)
    
    @staticmethod
    def get(key, default='false'):
        """获取配置值"""
        config = SystemConfig.query.filter_by(key=key).first()
        return config.value if config else default
    
    @staticmethod
    def set(key, value):
        """设置配置值"""
        config = SystemConfig.query.filter_by(key=key).first()
        if config:
            config.value = value
        else:
            config = SystemConfig(key=key, value=value)
            db.session.add(config)
        db.session.commit()

class Visit(db.Model):
    """
    访问记录模型
    用于统计网站的访问量，包含去重逻辑（在 app.py 中实现）
    """
    id = db.Column(db.Integer, primary_key=True)
    path = db.Column(db.String(255), nullable=False)  # 访问路径
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)  # 访问时间
    ip_address = db.Column(db.String(50))  # 访客 IP
    article_slug = db.Column(db.String(255), nullable=True)  # 关联的文章 Slug（可选）

class Comment(db.Model):
    """
    评论模型
    存储用户对文章的评论，支持审核状态
    """
    id = db.Column(db.Integer, primary_key=True)
    article_path = db.Column(db.String(255), nullable=False)  # 关联的文章路径
    content = db.Column(db.Text, nullable=False)  # 评论内容
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)  # 评论时间
    ip_address = db.Column(db.String(50))  # 评论者 IP（用于频率限制）
    user_agent = db.Column(db.String(255))  # 用户设备信息
    
    # 用户关联
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # 审核状态: pending, approved, rejected
    status = db.Column(db.String(20), default='pending', nullable=False)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)

    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref=db.backref('comments', lazy=True))
    reviewer = db.relationship('User', foreign_keys=[reviewed_by], backref=db.backref('reviewed_comments', lazy=True))

    def to_dict(self):
        """序列化为字典，用于 API 返回"""
        return {
            'id': self.id,
            'article_path': self.article_path,
            'author': self.user.username if self.user else 'Unknown',
            'content': self.content,
            'timestamp': self.timestamp.isoformat(),
            'status': self.status
        }
