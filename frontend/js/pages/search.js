
const SearchPage = {
    async render(container) {
        container.innerHTML = `
            <div class="row animate__animated animate__fadeIn">
                <div class="col-12 mb-4">
                    <h2 class="text-white mb-3">文章搜索</h2>
                    <div class="input-group input-group-lg">
                        <input type="text" class="form-control" id="search-input" placeholder="输入标题或标签...">
                        <button class="btn btn-primary" type="button" id="search-btn">搜索</button>
                    </div>
                    <div class="mt-2 text-white-50">
                        热门标签: <span id="tag-cloud"></span>
                    </div>
                </div>
                <div class="col-12">
                    <div id="search-results" class="row"></div>
                </div>
            </div>
        `;

        // Header for Search Page
        document.getElementById('header-nav').innerHTML = `
            <a href="/" class="text-white text-decoration-none me-3" onclick="router.navigate('/'); return false;">首页</a>
        `;

        const articles = await DataService.getArticles();
        
        // Render Tags
        const tags = new Set();
        articles.forEach(a => {
            if(a.category) tags.add(a.category);
            // if(a.tags) a.tags.forEach(t => tags.add(t)); // Assuming tags exist
        });
        const tagContainer = document.getElementById('tag-cloud');
        tags.forEach(tag => {
            const span = document.createElement('span');
            span.className = 'badge bg-secondary me-1 cursor-pointer';
            span.style.cursor = 'pointer';
            span.innerText = tag;
            span.onclick = () => {
                document.getElementById('search-input').value = tag;
                performSearch(tag);
            };
            tagContainer.appendChild(span);
        });

        // Search Logic
        const performSearch = (query) => {
            query = query.toLowerCase();
            const results = articles.filter(a => 
                a.title.toLowerCase().includes(query) || 
                (a.category && a.category.toLowerCase().includes(query))
            );
            renderResults(results);
        };

        const renderResults = (list) => {
            const resultsContainer = document.getElementById('search-results');
            if (list.length === 0) {
                resultsContainer.innerHTML = '<div class="col-12 text-white">没有找到相关文章</div>';
                return;
            }
            resultsContainer.innerHTML = list.map(a => `
                <div class="col-md-6 mb-3">
                    <div class="card h-100">
                        <div class="card-body">
                            <h5 class="card-title">${a.title}</h5>
                            <h6 class="card-subtitle mb-2 text-muted">${a.category || '未分类'} | ${a.date}</h6>
                            <a href="/articles/${a.path.replace('articles/', '').replace('.md', '')}" class="card-link" onclick="router.navigate(this.getAttribute('href')); return false;">阅读全文</a>
                        </div>
                    </div>
                </div>
            `).join('');
        };

        // Bind events
        const input = document.getElementById('search-input');
        input.addEventListener('input', (e) => performSearch(e.target.value));
        
        // Initial render (all or empty?) - let's show all initially
        renderResults(articles);
    }
};
