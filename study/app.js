let articles = [];
let currentArticle = null;

// Flag to indicate script loaded
const appLoaded = true;

document.addEventListener('DOMContentLoaded', () => {
    fetchArticles();
    recordVisit(window.location.pathname);
});

async function fetchArticles() {
    try {
        const url = CDN_URL ? `${CDN_URL}/md-map.json` : '/md-map.json';
        const response = await fetch(url);
        articles = await response.json();
        renderCategories();
        loadHome();
    } catch (error) {
        console.error('Error loading articles:', error);
        document.getElementById('content-area').innerHTML = '<div class="alert alert-danger">无法加载文章列表</div>';
    }
}

function renderCategories() {
    const categories = [...new Set(articles.map(a => a.category))];
    const container = document.getElementById('categories-list');
    container.innerHTML = categories.map(cat => `
        <div class="col-6">
            <a href="#" onclick="filterByCategory('${cat}'); return false;">${cat}</a>
        </div>
    `).join('');
}

function loadHome() {
    currentArticle = null;
    document.getElementById('comments-section').classList.add('d-none');
    renderArticleList(articles);
}

function renderArticleList(list) {
    const container = document.getElementById('content-area');
    container.innerHTML = list.map(article => `
        <div class="card mb-4 animate__animated animate__fadeIn">
            <div class="card-body">
                <h2 class="card-title"><a href="#" onclick="loadArticle('${article.path}'); return false;">${article.title}</a></h2>
                <p class="card-text text-muted">
                    <small>分类: ${article.category} | 日期: ${article.date}</small>
                </p>
                <a href="#" class="btn btn-primary" onclick="loadArticle('${article.path}'); return false;">阅读更多 &rarr;</a>
            </div>
        </div>
    `).join('');
}

async function loadArticle(path) {
    const article = articles.find(a => a.path === path);
    if (!article) return;

    currentArticle = article;
    const container = document.getElementById('content-area');
    
    // Show loading
    container.innerHTML = '<div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div>';

    try {
        const url = CDN_URL ? `${CDN_URL}/${path}` : `/${path}`;
        const response = await fetch(url);
        const text = await response.text();
        
        container.innerHTML = `
            <div class="animate__animated animate__fadeIn">
                <h1 class="mb-3">${article.title}</h1>
                <p class="text-muted mb-4">
                    分类: ${article.category} | 日期: ${article.date}
                </p>
                <div class="article-content">
                    ${marked.parse(text)}
                </div>
                <hr>
                <button class="btn btn-secondary mt-3" onclick="loadHome()">返回列表</button>
            </div>
        `;

        // Load comments
        loadComments(path);
        document.getElementById('comments-section').classList.remove('d-none');
        
        // Record visit for specific article
        recordVisit(path);

    } catch (error) {
        console.error('Error loading article:', error);
        container.innerHTML = '<div class="alert alert-danger">无法加载文章内容</div>';
    }
}

function searchArticles() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const filtered = articles.filter(a => 
        a.title.toLowerCase().includes(query) || 
        a.category.toLowerCase().includes(query)
    );
    renderArticleList(filtered);
}

function filterByCategory(category) {
    const filtered = articles.filter(a => a.category === category);
    renderArticleList(filtered);
}

async function loadComments(articlePath) {
    const list = document.getElementById('comments-list');
    list.innerHTML = '<p>加载评论中...</p>';
    
    try {
        const response = await fetch(`/api/comments?article_path=${encodeURIComponent(articlePath)}`);
        const comments = await response.json();
        
        if (comments.length === 0) {
            list.innerHTML = '<p class="text-muted">暂无评论，快来抢沙发吧！</p>';
        } else {
            list.innerHTML = comments.map(c => `
                <div class="card mb-2 animate__animated animate__fadeIn">
                    <div class="card-body">
                        <h6 class="card-subtitle mb-2 text-muted">${c.author} - ${new Date(c.timestamp).toLocaleString()}</h6>
                        <p class="card-text">${c.content}</p>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading comments:', error);
        list.innerHTML = '<p class="text-danger">加载评论失败</p>';
    }
}

document.getElementById('comment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentArticle) return;

    const author = document.getElementById('comment-author').value;
    const content = document.getElementById('comment-content').value;

    try {
        const response = await fetch('/api/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                article_path: currentArticle.path,
                author,
                content
            })
        });

        if (response.ok) {
            document.getElementById('comment-content').value = '';
            loadComments(currentArticle.path);
        } else {
            alert('评论提交失败');
        }
    } catch (error) {
        console.error('Error posting comment:', error);
        alert('评论提交失败');
    }
});

async function recordVisit(path) {
    try {
        await fetch('/api/stats/visit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path })
        });
    } catch (e) {
        console.error('Stats error', e);
    }
}
