(function registerAboutPage() {
    const register = () => {
        if (!window.SPA || typeof window.SPA.registerPage !== 'function') {
            return setTimeout(register, 20);
        }

        window.SPA.registerPage({
            name: 'about',
            navId: 'about',
            // 匹配 /about 路由
            match: (path) => path === '/about',
            
            // 动态生成 Header
            header: ({ articles = [] }) => {
                const latest = articles[0];
                return {
                tagline: '资源分享 · 经验分享',
                pageTitle: '关于本站 · Alpha Docs'
                };
            },
            
            // 动态生成 Footer
            footer: () => ({
                note: '保持好奇，持续递归自我',
                extra: '<small>© 2025 Alpha Docs · Crafted with caffeine & curiosity.</small>'
            }),
            
            // 核心渲染逻辑
            render: ({ root, articles = [], tags = [] }) => {
                if (!root) return;
                // 估算总字数 (假设每篇 1200 字)
                const totalWords = articles.length * 1200;
                
                root.innerHTML = `
                    <section class="page-section hero">
                        <p class="text-muted">Hi there 👋</p>
                        <h1 class="hero-title fs-1 fs-md-auto">Alpha Docs 是一个专注于资源整理与个人经验分享的知识小站。</h1>
                        <p>
                            这里收录我在学习与工作中遇到的高质量资料、踩坑记录和复盘心得，按照主题分类整理，
                            方便自己与朋友随时查阅。每篇内容都带着真实语境，既是经验总结也是可直接使用的参考指引。
                        </p>
                        <div class="hero-stats">
                            <article class="stat-card">
                                <span>精选文档</span>
                                <strong>${articles.length}</strong>
                                <small>篇内容在 CDN 上实时更新</small>
                            </article>
                            <article class="stat-card">
                                <span>涵盖标签</span>
                                <strong>${tags.length}</strong>
                                <small>多维视角记录学习路径</small>
                            </article>
                            <article class="stat-card">
                                <span>累计字数</span>
                                <strong>${Math.round(totalWords / 100) / 10}k</strong>
                                <small>持续更新中</small>
                            </article>
                        </div>
                    </section>

                    <section class="page-section glow-card">
                        <h2>站点定位</h2>
                        <p>聚焦三个方向：
                            <strong>1) 精选资源沉淀</strong>（文档、工具与灵感合集），
                            <strong>2) 实战经验复盘</strong>（真实项目的踩坑与解决方案），
                            <strong>3) 长期学习航海日志</strong>（方法论与思考框架分享）。
                        </p>
                        <div class="doc-meta">
                            <span>🧠 资源共享 · 经验互助</span>
                            <span>🛠️ Build in public</span>
                            <span>📚 Personal Knowledge Hub</span>
                        </div>
                    </section>

                    <section class="page-section">
                        <h2>近期计划</h2>
                        <ul>
                            <li>持续整理开发、设计、效率等方向的资源清单，并补充个人注释。</li>
                            <li>把真实项目中的经验与踩坑案例写成文章，帮助后来者少走弯路。</li>
                            <li>完善互动与统计机制，了解大家最想要的资源类型并持续迭代。</li>
                        </ul>
                    </section>
                `;
            }
        });
    };

    register();
})();
