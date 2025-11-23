
// Data Service with Caching
const DataService = {
    articles: null,
    markdownCache: {},

    async getArticles() {
        if (this.articles) return this.articles;
        
        // Try localStorage first
        const cached = localStorage.getItem('md-map');
        if (cached) {
            try {
                this.articles = JSON.parse(cached);
                // Background refresh
                this.fetchArticles(true);
                return this.articles;
            } catch (e) {
                console.error('Cache parse error', e);
            }
        }
        
        return await this.fetchArticles();
    },

    async fetchArticles(background = false) {
        try {
            const response = await fetch(`${CDN_URL}/md-map.json`);
            const data = await response.json();
            this.articles = data;
            localStorage.setItem('md-map', JSON.stringify(data));
            return data;
        } catch (error) {
            console.error('Failed to fetch articles', error);
            if (!background) throw error;
        }
    },

    async fetchMarkdown(path) {
        if (this.markdownCache[path]) return this.markdownCache[path];
        
        // Try localStorage
        const cacheKey = `md:${path}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            this.markdownCache[path] = cached;
            return cached;
        }

        const response = await fetch(`${CDN_URL}/${path}`);
        if (!response.ok) throw new Error('Article not found');
        const text = await response.text();
        
        this.markdownCache[path] = text;
        try {
            localStorage.setItem(cacheKey, text);
        } catch (e) {
            // Quota exceeded or other error
            console.warn('Cache write failed', e);
        }
        return text;
    },
    
    async recordVisit(path) {
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
};

// Router Helper
const router = {
    navigate(url) {
        history.pushState(null, '', url);
        // App.handleRoute() is called by pushState hook in load.js
    }
};

// Main App
window.App = {
    init() {
        console.log('App Initialized');
        this.handleRoute();
    },

    async handleRoute() {
        const path = window.location.pathname;
        const container = document.getElementById('page-content');
        
        // Record visit
        DataService.recordVisit(path);

        // Clear container
        container.innerHTML = '';

        // Route matching
        if (path === '/' || path === '/index.html') {
            if (typeof HomePage !== 'undefined') {
                await HomePage.render(container);
            } else {
                container.innerHTML = 'Loading Home...';
            }
        } else if (path === '/search') {
            if (typeof SearchPage !== 'undefined') {
                await SearchPage.render(container);
            } else {
                container.innerHTML = 'Loading Search...';
            }
        } else if (path.startsWith('/articles/')) {
            const articleId = path.replace('/articles/', '').replace('.md', '');
            if (typeof ArticlePage !== 'undefined') {
                await ArticlePage.render(container, { id: articleId });
            } else {
                container.innerHTML = 'Loading Article...';
            }
        } else if (path === '/dash') {
             // Dash is server-side rendered or separate, but if we want SPA dash:
             window.location.href = '/dash'; // Force reload for dash if it's not SPA
        } else {
            container.innerHTML = '<h1>404 Not Found</h1><p><a href="/" onclick="router.navigate(\'/\'); return false;">Go Home</a></p>';
        }
    }
};
