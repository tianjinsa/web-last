from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Visit(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    path = db.Column(db.String(255), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    ip_address = db.Column(db.String(50))
    article_slug = db.Column(db.String(255), nullable=True)  # For article view tracking

class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    article_path = db.Column(db.String(255), nullable=False)
    author = db.Column(db.String(100), nullable=False)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    ip_address = db.Column(db.String(50))
    user_agent = db.Column(db.String(255))

    def to_dict(self):
        return {
            'id': self.id,
            'article_path': self.article_path,
            'author': self.author,
            'content': self.content,
            'timestamp': self.timestamp.isoformat()
        }
