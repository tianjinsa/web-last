from asyncio.log import logger
from logging import log
import os
from datetime import datetime, date
from flask import Flask, request, jsonify, render_template, redirect, send_from_directory, abort
from flask_cors import CORS
from models import db, Visit, Comment

# Update static/template folders to be local 'frontend' directory
app = Flask(__name__, static_folder='frontend', template_folder='frontend')
CORS(app)

# Configuration
basedir = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(basedir, 'data', 'blog.db')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + db_path
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
CDN_URL = os.environ.get('CDN_URL')

# Initialize DB
db.init_app(app)

with app.app_context():
    data_dir = os.path.join(basedir, 'data')
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)
    db.create_all()

@app.route('/frontend/articles/<path:filename>')
def serve_frontend_articles(filename):
    # If CDN is configured, block access to /frontend
    if CDN_URL:
        abort(403)
    return send_from_directory('articles', filename)

@app.route('/frontend/<path:filename>')
def serve_frontend_static(filename):
    # If CDN is configured, block access to /frontend
    if CDN_URL:
        abort(403)
    return send_from_directory('frontend', filename)

@app.route('/articles/<path:filename>')
def serve_articles(filename):
    if CDN_URL:
        return redirect(f"{CDN_URL}/articles/{filename}")
    return send_from_directory('articles', filename)

# API: Comments
@app.route('/api/comments', methods=['GET'])
def get_comments():
    article_path = request.args.get('article_path')
    if not article_path:
        return jsonify({'error': 'article_path required'}), 400
    
    comments = Comment.query.filter_by(article_path=article_path).order_by(Comment.timestamp.desc()).all()
    return jsonify([c.to_dict() for c in comments])

@app.route('/api/comments', methods=['POST'])
def add_comment():
    data = request.json
    ip_address = request.remote_addr
    user_agent = request.headers.get('User-Agent')
    author = data.get('author')
    content = data.get('content')
    article_path = data.get('article_path')

    if not author or not content or not article_path:
        return jsonify({'error': 'Missing required fields'}), 400

    # Rate limiting: Max 3 comments per IP per day
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

# API: Stats (Dashboard data)
@app.route('/dash')
def dashboard():
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
    data = request.json
    path = data.get('path', '/')
    article_slug = data.get('slug') # Optional, if it's an article view
    ip_address = request.remote_addr
    
    # If it's an article view, apply rate limiting (1 view per IP per article per day)
    if article_slug:
        today_start = datetime.combine(date.today(), datetime.min.time())
        existing_visit = Visit.query.filter(
            Visit.ip_address == ip_address,
            Visit.article_slug == article_slug,
            Visit.timestamp >= today_start
        ).first()
        
        if existing_visit:
            return jsonify({'status': 'ignored', 'reason': 'already_visited_today'})

    visit = Visit(path=path, ip_address=ip_address, article_slug=article_slug)
    db.session.add(visit)
    db.session.commit()
    return jsonify({'status': 'recorded'})

# Catch-all route for SPA
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    # If path starts with api/ or frontend/ (and we are here, meaning it wasn't caught by specific routes)
    # For /frontend, if CDN_URL is set, the specific route above handles it (aborts).
    # If CDN_URL is NOT set, the specific route handles it (serves file).
    # So if we reach here with /frontend, it means the file doesn't exist -> 404.
    if path.startswith('api/') or path.startswith('frontend/'):
        return abort(404)
    
    # For any other route, return index.html
    # If CDN_URL is not set, we use /frontend as base
    final_cdn_url = CDN_URL if CDN_URL else '/frontend'
    return render_template('index.html', cdn_url=final_cdn_url)

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=5000)
