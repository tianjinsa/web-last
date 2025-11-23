(function () {
    const STORAGE_KEYS = {
        articleIndex: 'alpha-docs:index:v1',
        markdownPrefix: 'alpha-docs:doc'
    };
    const INDEX_TTL = 1000 * 60 * 60; // 1h
    const THEME_STORAGE_KEY = 'alpha-docs:theme';

    const SPA = {
        pages: [],
        refs: {},
        dataCache: {
            articles: null,
            articleMap: new Map(),
            tags: new Set(),
            markdown: new Map()
        },
        init() {
            this.refs.shell = document.getElementById('app-shell');
            this.refs.main = document.getElementById('site-main');
            this.refs.headerTagline = document.getElementById('header-tagline');
            this.refs.footerNote = document.getElementById('footer-note');
            this.refs.footerDynamic = document.getElementById('footer-dynamic');
            this.refs.footerDocLink = document.getElementById('footer-doc-link');
            this.refs.nav = document.getElementById('primary-nav');
            this.refs.themeToggle = document.getElementById('theme-toggle');
            this.refs.themeToggleIcon = document.getElementById('theme-toggle-icon');
            this.refs.themeToggleLabel = document.getElementById('theme-toggle-label');
            this.setupThemeControls();
            this.bindGlobalEvents();
            this.bootstrap();
        },
        bindGlobalEvents() {
            document.body.addEventListener('click', (event) => {
                const link = event.target.closest('[data-route]');
                if (!link) return;
                const route = link.getAttribute('data-route') || link.getAttribute('href');
                if (!route || route.startsWith('http') || route.startsWith('mailto:') || route.startsWith('#')) {
                    return;
                }
                event.preventDefault();
                this.navigate(route);
            });

            window.addEventListener('popstate', () => this.handleRoute());
        },
        setupThemeControls() {
            const prefersDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
            this.themeMediaQuery = prefersDark;
            const stored = this.readStoredTheme();
            const initialTheme = stored ?? (prefersDark && prefersDark.matches ? 'dark' : 'light');
            this.applyTheme(initialTheme, { persist: Boolean(stored) });

            if (this.refs.themeToggle) {
                this.refs.themeToggle.addEventListener('click', () => this.toggleTheme());
            }

            if (prefersDark) {
                const handleChange = (event) => {
                    if (this.userChoseTheme) return;
                    this.applyTheme(event.matches ? 'dark' : 'light', { persist: false });
                };
                if (typeof prefersDark.addEventListener === 'function') {
                    prefersDark.addEventListener('change', handleChange);
                } else if (typeof prefersDark.addListener === 'function') {
                    prefersDark.addListener(handleChange);
                }
            }
        },
        async bootstrap() {
            try {
                await this.ensureArticles();
                this.syncDocShortcuts();
                if (window.marked && !this.markedConfigured) {
                    window.marked.setOptions({ breaks: true, gfm: true });
                    this.markedConfigured = true;
                }
            } catch (error) {
                console.error('初始化失败', error);
                this.renderError(error);
                return;
            }
            this.handleRoute();
        },
        registerPage(pageDef) {
            this.pages.push(pageDef);
        },
        navigate(path, options = {}) {
            const normalized = this.normalizeRoute(path);
            if (normalized === this.currentPath && !options.force) {
                return;
            }
            if (options.replace) {
                history.replaceState({}, '', normalized);
            } else {
                history.pushState({}, '', normalized);
            }
            this.handleRoute(normalized);
        },
        normalizeRoute(path) {
            if (!path || path === '/' || path === '/index.html') {
                return '/about';
            }
            return path.replace(/\/+$/, '') || '/about';
        },
        async handleRoute(pathname) {
            const normalized = this.normalizeRoute(pathname ?? window.location.pathname);
            this.currentPath = normalized;
            const page = this.matchRoute(normalized);
            if (!page) {
                console.warn(`未匹配到路由: ${normalized}`);
                if (normalized === '/about') {
                    this.renderError('系统错误：默认页面 (/about) 未加载。');
                    return;
                }
                return this.navigate('/about', { replace: true, force: true });
            }

            // Start Exit Animation immediately
            const exitPromise = new Promise(resolve => {
                if (this.refs.main) {
                    this.refs.main.classList.remove('page-enter');
                    this.refs.main.classList.add('page-exit');
                    setTimeout(resolve, 250); // Match CSS duration
                } else {
                    resolve();
                }
            });

            const params = typeof page.parseParams === 'function' ? page.parseParams(normalized) : {};
            
            try {
                // Run data fetching in parallel with animation
                const [_, context] = await Promise.all([
                    exitPromise,
                    this.buildContext(normalized, params)
                ]);

                context.page = page;
                this.applyChrome(page, context);
                
                // Render new content
                await page.render(context);
                
                // Reset scroll
                window.scrollTo({ top: 0, behavior: 'instant' });

                // Start Enter Animation
                if (this.refs.main) {
                    this.refs.main.classList.remove('page-exit');
                    this.refs.main.classList.add('page-enter');
                }
            } catch (error) {
                this.renderError(error);
                console.error('页面渲染失败', error);
            }
            this.updateNavActive(page.navId);
            this.reportVisit(normalized);
        },
        matchRoute(path) {
            return this.pages.find((page) => {
                if (typeof page.match === 'function') {
                    return page.match(path);
                }
                return page.path === path;
            });
        },
        async buildContext(path, params) {
            const store = await this.ensureArticles();
            return {
                root: this.refs.main,
                spa: this,
                path,
                params,
                articles: store.list,
                articleMap: store.map,
                tags: Array.from(store.tags)
            };
        },
        async ensureArticles() {
            if (this.dataCache.articles) {
                return {
                    list: this.dataCache.articles,
                    map: this.dataCache.articleMap,
                    tags: this.dataCache.tags
                };
            }
            const cached = this.readIndexFromStorage();
            const list = cached ?? await this.fetchArticlesIndex();
            this.storeIndex(list);
            this.dataCache.articles = list;
            this.dataCache.articleMap = new Map();
            this.dataCache.tags = new Set();
            list.forEach((item, index) => {
                const slug = item.slug || this.generateSlugFromPath(item.path, index);
                item.slug = slug;
                item.tags = item.tags || [];
                this.dataCache.articleMap.set(slug, item);
                item.tags.forEach((tag) => this.dataCache.tags.add(tag));
            });
            return {
                list,
                map: this.dataCache.articleMap,
                tags: this.dataCache.tags
            };
        },
        readIndexFromStorage() {
            try {
                const payload = localStorage.getItem(STORAGE_KEYS.articleIndex);
                if (!payload) return null;
                const parsed = JSON.parse(payload);
                if (Date.now() - parsed.timestamp > INDEX_TTL) {
                    return null;
                }
                return parsed.data;
            } catch {
                return null;
            }
        },
        storeIndex(list) {
            try {
                localStorage.setItem(
                    STORAGE_KEYS.articleIndex,
                    JSON.stringify({ timestamp: Date.now(), data: list })
                );
            } catch (error) {
                console.warn('无法缓存文章索引', error);
            }
        },
        async fetchArticlesIndex() {
            const base = (CDN_URL || '').replace(/\/$/, '');
            const url = base ? `${base}/md-map.json` : '/md-map.json';
            const response = await fetch(url, { cache: 'no-store' });
            if (!response.ok) {
                throw new Error('无法加载文档索引');
            }
            return response.json();
        },
        generateSlugFromPath(path, index) {
            if (!path) {
                return `doc-${index}`;
            }
            return path.replace(/\.md$/, '').split('/').pop() || `doc-${index}`;
        },
        syncDocShortcuts() {
            if (!this.dataCache.articles || !this.dataCache.articles.length) {
                return;
            }
            const first = this.dataCache.articles[0];
            const target = `/docs/${first.slug}`;
            const navLink = document.querySelector('[data-nav="docs-view"]');
            if (navLink) {
                navLink.setAttribute('href', target);
                navLink.setAttribute('data-route', target);
            }
            if (this.refs.footerDocLink) {
                this.refs.footerDocLink.setAttribute('href', target);
                this.refs.footerDocLink.setAttribute('data-route', target);
            }
        },
        applyChrome(page, context) {
            const headerConfig = typeof page.header === 'function' ? page.header(context) : (page.header || {});
            const footerConfig = typeof page.footer === 'function' ? page.footer(context) : (page.footer || {});
            this.setHeader(headerConfig);
            this.setFooter(footerConfig);
        },
        setHeader(config = {}) {
            if (this.refs.headerTagline && config.tagline) {
                this.animateText(this.refs.headerTagline, config.tagline);
            }
            if (this.refs.headerActions) {
                this.refs.headerActions.innerHTML = '';
                (config.actions || []).forEach((action) => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = action.variant === 'primary' ? 'primary-btn' : 'ghost-btn';
                    btn.textContent = action.label;
                    if (action.href) {
                        btn.setAttribute('data-route', action.href);
                    }
                    if (action.onClick) {
                        btn.addEventListener('click', action.onClick);
                    }
                    this.refs.headerActions.appendChild(btn);
                });
            }
            document.title = config.pageTitle || 'Alpha Docs';
        },
        animateText(element, newContent, isHTML = false) {
            if (!element) return;
            // If content is same, do nothing
            const current = isHTML ? element.innerHTML : element.textContent;
            if (current === newContent) return;

            element.classList.add('text-fade', 'out');
            
            setTimeout(() => {
                if (isHTML) {
                    element.innerHTML = newContent;
                } else {
                    element.textContent = newContent;
                }
                element.classList.remove('out');
            }, 200);
        },
        setFooter(config = {}) {
            if (this.refs.footerNote && config.note) {
                this.refs.footerNote.textContent = config.note;
            }
            if (this.refs.footerDynamic) {
                this.refs.footerDynamic.innerHTML = config.extra || '';
            }
        },
        updateNavActive(navId) {
            if (!this.refs.nav) return;
            const pill = this.refs.nav.querySelector('.nav-pill');
            let activeLink = null;

            this.refs.nav.querySelectorAll('[data-nav]').forEach((link) => {
                if (link.dataset.nav === navId) {
                    link.classList.add('is-active');
                    activeLink = link;
                } else {
                    link.classList.remove('is-active');
                }
            });

            if (pill && activeLink) {
                pill.classList.add('is-visible');
                pill.style.width = `${activeLink.offsetWidth}px`;
                pill.style.transform = `translateX(${activeLink.offsetLeft}px)`;
            } else if (pill) {
                pill.classList.remove('is-visible');
            }
        },
        renderError(error) {
            if (!this.refs.main) return;
            this.refs.main.innerHTML = `
                <section class="page-section">
                    <h2>页面加载失败</h2>
                    <p>${error?.message || error}</p>
                </section>
            `;
        },
        readStoredTheme() {
            try {
                const value = localStorage.getItem(THEME_STORAGE_KEY);
                if (value === 'light' || value === 'dark') {
                    return value;
                }
            } catch (error) {
                console.warn('读取主题偏好失败', error);
            }
            return null;
        },
        applyTheme(theme, options = {}) {
            const finalTheme = theme === 'light' ? 'light' : 'dark';
            this.currentTheme = finalTheme;
            document.documentElement.setAttribute('data-theme', finalTheme);
            if (options.persist !== false) {
                try {
                    localStorage.setItem(THEME_STORAGE_KEY, finalTheme);
                    this.userChoseTheme = true;
                } catch (error) {
                    console.warn('保存主题偏好失败', error);
                }
            }
            this.updateThemeToggle();
        },
        toggleTheme() {
            const next = this.currentTheme === 'light' ? 'dark' : 'light';
            this.applyTheme(next, { persist: true });
        },
        updateThemeToggle() {
            if (!this.refs.themeToggle) return;
            const isDark = this.currentTheme !== 'light';
            this.refs.themeToggle.setAttribute('aria-pressed', isDark ? 'true' : 'false');
            if (this.refs.themeToggleIcon) {
                this.refs.themeToggleIcon.textContent = isDark ? '🌙' : '☀️';
            }
            if (this.refs.themeToggleLabel) {
                this.refs.themeToggleLabel.textContent = isDark ? '夜间' : '日间';
            }
        },
        getArticle(slug) {
            if (!slug) return null;
            return this.dataCache.articleMap?.get(slug) || null;
        },
        async getArticleContent(slug) {
            if (!slug) return '';
            if (this.dataCache.markdown.has(slug)) {
                return this.dataCache.markdown.get(slug);
            }
            const storageKey = `${STORAGE_KEYS.markdownPrefix}:${slug}`;
            try {
                const cached = sessionStorage.getItem(storageKey);
                if (cached) {
                    this.dataCache.markdown.set(slug, cached);
                    return cached;
                }
            } catch (error) {
                console.warn('读取文档缓存失败', error);
            }
            const article = this.getArticle(slug);
            if (!article) {
                throw new Error('未找到对应文档');
            }
            const response = await fetch(this.withCDN(article.path), { cache: 'no-store' });
            if (!response.ok) {
                throw new Error('文档内容加载失败');
            }
            const text = await response.text();
            this.dataCache.markdown.set(slug, text);
            try {
                sessionStorage.setItem(storageKey, text);
            } catch (error) {
                console.warn('写入文档缓存失败', error);
            }
            return text;
        },
        withCDN(path) {
            if (!path) return '';
            if (/^https?:/i.test(path)) {
                return path;
            }
            const base = (CDN_URL || '').replace(/\/$/, '');
            const clean = path.replace(/^\//, '');
            return base ? `${base}/${clean}` : `/${clean}`;
        },
        async reportVisit(path) {
            try {
                await fetch('/api/stats/visit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path })
                });
            } catch (error) {
                console.warn('访问统计上报失败', error);
            }
        }
    };

    window.SPA = SPA;

    // 监听资源加载完成事件，或者如果已经加载完成则直接启动
    function tryInit() {
        if (window.__RESOURCES_LOADED__) {
            SPA.init();
        } else {
            window.addEventListener('app-resources-loaded', () => SPA.init(), { once: true });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryInit);
    } else {
        tryInit();
    }
})();
