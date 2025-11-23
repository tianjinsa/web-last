(function registerAboutPage() {
    const register = () => {
        if (!window.SPA || typeof window.SPA.registerPage !== 'function') {
            return setTimeout(register, 20);
        }

        window.SPA.registerPage({
            name: 'about',
            navId: 'about',
            match: (path) => path === '/about',
            header: ({ articles = [] }) => {
                const latest = articles[0];
                return {
                tagline: '个人介绍 · 技术履历 · 创作定位',
                pageTitle: '关于我 · Alpha Docs'
                };
            },
            footer: () => ({
                note: '保持好奇，持续递归自我',
                extra: '<small>© 2025 Alpha Docs · Crafted with caffeine & curiosity.</small>'
            }),
            render: ({ root, articles = [], tags = [] }) => {
                if (!root) return;
                const totalWords = articles.length * 1200;
                root.innerHTML = `
                    <section class="page-section hero">
                        <p class="text-muted">Hi there 👋</p>
                        <h1 class="hero-title">我是一个热衷构建知识体系的全栈开发者。</h1>
                        <p>
                            我相信「文档即产品」。每一篇文章都经过拆解、重构与打磨，只为在需要的时候
                            能快速复用。这个 SPA 将个人介绍、文档检索与阅读体验聚合在同一页面里，
                            并尽可能减少资源加载次数，让知识真正长留在浏览器缓存中。
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
                        <h2>我在做什么？</h2>
                        <p>聚焦三个方向：
                            <strong>1) 架构与后端</strong>（以 Python/Flask 为主），
                            <strong>2) 前端体验</strong>（用纯 JS + CSS 打造丝滑交互），
                            <strong>3) 文档工程</strong>（让知识具备可迭代性）。
                        </p>
                        <div class="doc-meta">
                            <span>🧠 长期主义 · 复利思维</span>
                            <span>🛠️ Build in public</span>
                            <span>📚 Knowledge as a Service</span>
                        </div>
                    </section>

                    <section class="page-section">
                        <h2>近期计划</h2>
                        <ul>
                            <li>补完文档流程自动化工具链，让文章元信息与渲染逻辑自动同步。</li>
                            <li>将更多小型实验、片段式灵感沉淀为可检索的碎片化文档。</li>
                            <li>把访客行为（仅路径）匿名化统计，用数据持续打磨体验。</li>
                        </ul>
                    </section>
                `;
            }
        });
    };

    register();
})();
