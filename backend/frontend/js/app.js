(function () {
    // ==========================================
    // 全局配置与常量
    // ==========================================
    const STORAGE_KEYS = {
        articleIndex: 'alpha-docs:index:v2', // 文章索引缓存 Key (v2 版本)
        markdownPrefix: 'alpha-docs:doc'     // 文章内容缓存前缀
    };
    
    // 缓存策略：本地开发环境不缓存，生产环境缓存 10 分钟
    const isDev = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const INDEX_TTL = isDev ? 0 : 1000 * 60 * 10;
    const THEME_STORAGE_KEY = 'alpha-docs:theme';

    // ==========================================
    // SPA 核心对象
    // ==========================================
    const SPA = {
        pages: [], // 已注册的页面路由定义
        refs: {},  // DOM 元素引用缓存
        dataCache: {
            articles: null,      // 文章列表缓存
            articleMap: new Map(), // 文章 Slug -> 对象 映射
            tags: new Set(),     // 所有标签集合
            markdown: new Map()  // 文章内容缓存 (Slug -> Content)
        },

        /**
         * 初始化应用
         * 绑定 DOM 元素，设置主题，绑定事件，启动路由
         */
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

        /**
         * 绑定全局事件监听
         * 拦截所有内部链接点击，实现 SPA 路由跳转
         */
        bindGlobalEvents() {
            document.body.addEventListener('click', (event) => {
                const link = event.target.closest('[data-route]');
                if (!link) return;
                const route = link.getAttribute('data-route') || link.getAttribute('href');
                // 排除外部链接、邮件链接和锚点
                if (!route || route.startsWith('http') || route.startsWith('mailto:') || route.startsWith('#')) {
                    return;
                }
                event.preventDefault();
                this.navigate(route);
            });

            // 监听浏览器前进/后退事件
            window.addEventListener('popstate', () => this.handleRoute());
        },

        /**
         * 设置主题切换逻辑 (深色/浅色模式)
         */
        setupThemeControls() {
            const prefersDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
            this.themeMediaQuery = prefersDark;
            
            // 读取本地存储的主题，如果没有则跟随系统
            const stored = this.readStoredTheme();
            const initialTheme = stored ?? (prefersDark && prefersDark.matches ? 'dark' : 'light');
            this.applyTheme(initialTheme, { persist: Boolean(stored) });

            if (this.refs.themeToggle) {
                this.refs.themeToggle.addEventListener('click', () => this.toggleTheme());
            }

            // 监听系统主题变化
            if (prefersDark) {
                const handleChange = (event) => {
                    if (this.userChoseTheme) return; // 如果用户手动设置过，则不跟随系统
                    this.applyTheme(event.matches ? 'dark' : 'light', { persist: false });
                };
                if (typeof prefersDark.addEventListener === 'function') {
                    prefersDark.addEventListener('change', handleChange);
                } else if (typeof prefersDark.addListener === 'function') {
                    prefersDark.addListener(handleChange);
                }
            }
        },

        /**
         * 启动流程
         * 预加载文章索引，配置 Markdown 解析器
         */
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

        /**
         * 注册页面路由
         * @param {Object} pageDef 页面定义对象
         */
        registerPage(pageDef) {
            this.pages.push(pageDef);
        },

        /**
         * 编程式导航
         * @param {string} path 目标路径
         * @param {Object} options 导航选项 (replace, force)
         */
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

        /**
         * 规范化路由路径
         * 默认跳转到 /about
         */
        normalizeRoute(path) {
            if (!path || path === '/' || path === '/index.html') {
                return '/about';
            }
            return path.replace(/\/+$/, '') || '/about';
        },

        /**
         * 处理路由变化，渲染对应页面
         */
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

            // 立即开始退出动画
            const exitPromise = new Promise(resolve => {
                if (this.refs.main) {
                    this.refs.main.classList.remove('page-enter');
                    this.refs.main.classList.add('page-exit');
                    setTimeout(resolve, 250); // 匹配 CSS 动画时长
                } else {
                    resolve();
                }
            });

            const params = typeof page.parseParams === 'function' ? page.parseParams(normalized) : {};
            
            try {
                // 并行执行：退出动画 + 数据准备
                const [_, context] = await Promise.all([
                    exitPromise,
                    this.buildContext(normalized, params)
                ]);

                context.page = page;
                this.applyChrome(page, context); // 更新 Header/Footer
                
                // 渲染新页面内容
                await page.render(context);
                
                // 重置滚动条
                window.scrollTo({ top: 0, behavior: 'instant' });

                // 开始进入动画
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

        /**
         * 匹配路由
         */
        matchRoute(path) {
            return this.pages.find((page) => {
                if (typeof page.match === 'function') {
                    return page.match(path);
                }
                return page.path === path;
            });
        },

        /**
         * 构建页面渲染上下文
         * 包含路由参数、文章数据等
         */
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

        /**
         * 确保文章索引数据已加载
         * 优先读取内存缓存 -> 本地存储 -> 网络请求
         */
        async ensureArticles() {
            if (this.dataCache.articles) {
                return {
                    list: this.dataCache.articles,
                    map: this.dataCache.articleMap,
                    tags: this.dataCache.tags
                };
            }
            const cached = this.readIndexFromStorage();
            let data = cached;
            if (!data) {
                data = await this.fetchArticlesIndex();
            }
            
            // 兼容旧版数组格式，统一转换为列表
            let list = [];
            if (Array.isArray(data)) {
                // 旧格式：纯数组
                list = data.map(item => ({ ...item, type: 'md' }));
            } else if (data && (data.md || data.html || data.ifmhtml)) {
                // 新格式：{ md: [], html: [], ifmhtml: [] }
                const md = (data.md || []).map(item => ({ ...item, type: 'md' }));
                const html = (data.html || []).map(item => ({ ...item, type: 'html' }));
                const ifmhtml = (data.ifmhtml || []).map(item => ({ ...item, type: 'ifmhtml' }));
                list = [...md, ...html, ...ifmhtml];
            }

            this.storeIndex(data);
            this.dataCache.articles = list;
            this.dataCache.articleMap = new Map();
            this.dataCache.tags = new Set();
            
            // 构建索引 Map 和标签集合
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

        /**
         * 从 LocalStorage 读取文章索引
         */
        readIndexFromStorage() {
            try {
                const payload = localStorage.getItem(STORAGE_KEYS.articleIndex);
                if (!payload) return null;
                const parsed = JSON.parse(payload);
                if (Date.now() - parsed.timestamp > INDEX_TTL) {
                    return null; // 缓存过期
                }
                return parsed.data;
            } catch {
                return null;
            }
        },

        /**
         * 缓存文章索引到 LocalStorage
         */
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

        /**
         * 从服务器获取文章索引文件 (md-map.json)
         */
        async fetchArticlesIndex() {
            const base = (CDN_URL || '').replace(/\/$/, '');
            const url = base ? `${base}/md-map.json` : '/md-map.json';
            const response = await fetch(url, { cache: 'no-store' });
            if (!response.ok) {
                throw new Error('无法加载文档索引');
            }
            return response.json();
        },

        /**
         * 根据文件路径生成 Slug
         */
        generateSlugFromPath(path, index) {
            if (!path) {
                return `doc-${index}`;
            }
            return path.replace(/\.(md|html)$/, '').split('/').pop() || `doc-${index}`;
        },

        /**
         * 同步页脚的文档链接
         */
        syncDocShortcuts() {
            if (!this.dataCache.articles || !this.dataCache.articles.length) {
                return;
            }
            const first = this.dataCache.articles[0];
            const target = `/docs/${first.slug}`;
            
            if (this.refs.footerDocLink) {
                this.refs.footerDocLink.setAttribute('href', target);
                this.refs.footerDocLink.setAttribute('data-route', target);
            }
        },

        /**
         * 应用页面特定的 Header/Footer 配置
         */
        applyChrome(page, context) {
            const headerConfig = typeof page.header === 'function' ? page.header(context) : (page.header || {});
            const footerConfig = typeof page.footer === 'function' ? page.footer(context) : (page.footer || {});
            this.setHeader(headerConfig);
            this.setFooter(footerConfig);
        },

        /**
         * 更新 Header 内容 (Tagline, Actions)
         */
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

        /**
         * 文本切换动画
         */
        animateText(element, newContent, isHTML = false) {
            if (!element) return;
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

        /**
         * 更新 Footer 内容
         */
        setFooter(config = {}) {
            if (this.refs.footerNote && config.note) {
                this.refs.footerNote.textContent = config.note;
            }
            if (this.refs.footerDynamic) {
                this.refs.footerDynamic.innerHTML = config.extra || '';
            }
        },

        /**
         * 更新导航栏激活状态
         */
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

        /**
         * 渲染错误页面
         */
        renderError(error) {
            if (!this.refs.main) return;
            this.refs.main.innerHTML = `
                <section class="page-section">
                    <h2>页面加载失败</h2>
                    <p>${error?.message || error}</p>
                </section>
            `;
        },

        /**
         * 读取存储的主题
         */
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

        /**
         * 应用主题
         */
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

        /**
         * 切换主题
         */
        toggleTheme() {
            const next = this.currentTheme === 'light' ? 'dark' : 'light';
            this.applyTheme(next, { persist: true });
        },

        /**
         * 更新主题切换按钮状态
         */
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

        /**
         * 获取文章元数据
         */
        getArticle(slug) {
            if (!slug) return null;
            return this.dataCache.articleMap?.get(slug) || null;
        },

        /**
         * 获取文章内容 (Markdown/HTML)
         * 优先读取内存缓存 -> SessionStorage -> 网络请求
         */
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

        /**
         * 处理 CDN 路径
         */
        withCDN(path) {
            if (!path) return '';
            if (/^https?:/i.test(path)) {
                return path;
            }
            const base = (CDN_URL || '').replace(/\/$/, '');
            const clean = path.replace(/^\//, '');
            return base ? `${base}/${clean}` : `/${clean}`;
        },

        /**
         * 上报访问统计
         */
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
