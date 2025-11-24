from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

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
    存储用户对文章的评论
    """
    id = db.Column(db.Integer, primary_key=True)
    article_path = db.Column(db.String(255), nullable=False)  # 关联的文章路径
    author = db.Column(db.String(100), nullable=False)  # 评论者昵称
    content = db.Column(db.Text, nullable=False)  # 评论内容
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)  # 评论时间
    ip_address = db.Column(db.String(50))  # 评论者 IP（用于频率限制）
    user_agent = db.Column(db.String(255))  # 用户设备信息

    def to_dict(self):
        """序列化为字典，用于 API 返回"""
        return {
            'id': self.id,
            'article_path': self.article_path,
            'author': self.author,
            'content': self.content,
            'timestamp': self.timestamp.isoformat()
        }
