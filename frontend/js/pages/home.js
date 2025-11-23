
const HomePage = {
    async render(container) {
        container.innerHTML = `
            <div class="row justify-content-center animate__animated animate__fadeIn">
                <div class="col-md-8 text-center">
                    <img src="${CDN_URL}/logo-icon.svg" alt="Avatar" class="rounded-circle mb-4" width="150" height="150" style="border: 5px solid rgba(255,255,255,0.2);">
                    <h1 class="display-4 text-white mb-3">你好，我是博主</h1>
                    <p class="lead text-white-50 mb-5">热爱编程，热爱分享。这里是我的个人博客，记录学习与生活。</p>
                    
                    <div class="d-grid gap-3 d-sm-flex justify-content-sm-center">
                        <a href="/search" class="btn btn-primary btn-lg px-4 gap-3" onclick="router.navigate('/search'); return false;">浏览文章</a>
                        <a href="https://github.com/tianjinsa" target="_blank" class="btn btn-outline-light btn-lg px-4">Github</a>
                    </div>
                </div>
            </div>
            
            <div class="row mt-5">
                <div class="col-md-4 mb-4">
                    <div class="p-4 bg-white rounded-3 h-100 text-dark">
                        <h3>技术栈</h3>
                        <p>Python, JavaScript, Flask, Vue, React...</p>
                    </div>
                </div>
                <div class="col-md-4 mb-4">
                    <div class="p-4 bg-white rounded-3 h-100 text-dark">
                        <h3>最近更新</h3>
                        <div id="home-recent-posts">Loading...</div>
                    </div>
                </div>
                <div class="col-md-4 mb-4">
                    <div class="p-4 bg-white rounded-3 h-100 text-dark">
                        <h3>联系我</h3>
                        <p>Email: example@example.com</p>
                    </div>
                </div>
            </div>
        `;

        // Update Header/Footer specific to Home
        document.getElementById('header-nav').innerHTML = `
            <a href="/search" class="text-white text-decoration-none me-3" onclick="router.navigate('/search'); return false;">文章</a>
            <a href="/dash" class="text-white text-decoration-none">控制台</a>
        `;

        // Load recent posts
        const articles = await DataService.getArticles();
        const recent = articles.slice(0, 5);
        const recentHtml = recent.map(a => 
            `<div><a href="/articles/${a.path.replace('articles/', '').replace('.md', '')}" onclick="router.navigate(this.getAttribute('href')); return false;">${a.title}</a> <small class="text-muted">(${a.date})</small></div>`
        ).join('');
        document.getElementById('home-recent-posts').innerHTML = recentHtml || '暂无文章';
    }
};
