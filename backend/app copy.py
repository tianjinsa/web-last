from asyncio.log import logger
from logging import log
import os
from flask import Flask, request, jsonify, render_template, redirect, send_from_directory
from flask_cors import CORS
from models import db, Visit, Comment

app = Flask(__name__, static_folder='../frontend', template_folder='../frontend')
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

@app.route('/')
def index():
    # Record visit
    visit = Visit(path='/', ip_address=request.remote_addr)
    db.session.add(visit)
    db.session.commit()
    
    # If CDN is set, we might want to pass it to the template to render script tags
    # But since the user asked for "redirect static resources", we'll handle that in the static route
    # or we can pass a context variable to the template.
    return render_template('in.html', cdn_url=CDN_URL or '')

@app.route('/<path:filename>')
def serve_static(filename):
    # If CDN is configured, redirect static assets to CDN
    # We exclude 'dash' and 'api' from this check just in case
    # log.info(f"Serving static file: {filename}")
    logger.info(f"Serving static file: {filename}")
    if CDN_URL and not filename.startswith('api') and not filename.startswith('dash'):
        return redirect(f"{CDN_URL}/{filename}")
    
    return send_from_directory('../frontend', filename)

@app.route('/articles/<path:filename>')
def serve_articles(filename):
    if CDN_URL:
        return redirect(f"{CDN_URL}/articles/{filename}")
    return send_from_directory('../articles', filename)

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
    new_comment = Comment(
        article_path=data.get('article_path'),
        author=data.get('author', 'Anonymous'),
        content=data.get('content')
    )
    db.session.add(new_comment)
    db.session.commit()
    return jsonify(new_comment.to_dict()), 201

# API: Stats (Dashboard data)
@app.route('/dash')
def dashboard():
    # Simple server-side rendered dashboard or serve a specific dash html
    # For now, let's return a simple HTML with stats
    total_visits = Visit.query.count()
    recent_visits = Visit.query.order_by(Visit.timestamp.desc()).limit(10).all()
    total_comments = Comment.query.count()
    
    return render_template('dash.html', 
                           total_visits=total_visits, 
                           recent_visits=recent_visits,
                           total_comments=total_comments)

@app.route('/api/stats/visit', methods=['POST'])
def record_visit():
    data = request.json
    path = data.get('path', '/')
    visit = Visit(path=path, ip_address=request.remote_addr)
    db.session.add(visit)
    db.session.commit()
    return jsonify({'status': 'recorded'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=5000)
