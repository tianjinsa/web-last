
const ArticlePage = {
    async render(container, params) {
        // params should contain the article path or id
        // URL: /articles/welcome -> params: { id: 'welcome' } (handled by router)
        
        container.innerHTML = `
            <div class="text-center mt-5">
                <div class="spinner-border text-light" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;

        // Header for Article Page
        document.getElementById('header-nav').innerHTML = `
            <a href="/" class="text-white text-decoration-none me-3" onclick="router.navigate('/'); return false;">首页</a>
            <a href="/search" class="text-white text-decoration-none" onclick="router.navigate('/search'); return false;">搜索</a>
        `;

        try {
            // Find article metadata
            const articles = await DataService.getArticles();
            // Simple matching logic: path ends with params.id + '.md'
            const articleId = params.id; 
            const articleMeta = articles.find(a => a.path.includes(articleId + '.md')) || { path: `articles/${articleId}.md`, title: articleId };

            const markdown = await DataService.fetchMarkdown(articleMeta.path);
            const html = marked.parse(markdown);

            container.innerHTML = `
                <div class="bg-white p-5 rounded-3 shadow animate__animated animate__fadeIn">
                    <h1 class="mb-4 border-bottom pb-2">${articleMeta.title}</h1>
                    <div class="article-meta text-muted mb-4">
                        <span>${articleMeta.date || ''}</span>
                        <span class="ms-3">${articleMeta.category || ''}</span>
                    </div>
                    <div class="article-content">
                        ${html}
                    </div>
                    <div class="mt-5 pt-3 border-top">
                        <button class="btn btn-outline-primary" onclick="router.navigate('/search');">返回列表</button>
                    </div>
                </div>
            `;
            
            document.title = `${articleMeta.title} - My Blog`;

        } catch (error) {
            container.innerHTML = `
                <div class="alert alert-danger">
                    <h4>无法加载文章</h4>
                    <p>${error.message}</p>
                    <button class="btn btn-outline-dark" onclick="router.navigate('/search');">返回</button>
                </div>
            `;
        }
    }
};
