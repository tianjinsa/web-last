(function registerDocumentPage() {
    const register = () => {
        if (!window.SPA || typeof window.SPA.registerPage !== 'function') {
            return setTimeout(register, 20);
        }

        window.SPA.registerPage({
            name: 'doc-view',
            navId: 'docs-view',
            match: (path) => /^\/docs\/[\w-]+$/.test(path),
            parseParams: (path) => ({ slug: decodeURIComponent(path.split('/').pop() || '') }),
            header: ({ articleMap, params }) => {
                const article = articleMap?.get(params.slug);
                return {
                    tagline: article ? `正在阅读：${article.title}` : '文档详情',
                    pageTitle: article ? `${article.title} · Alpha Docs` : '文档详情 · Alpha Docs'
                };
            },
            footer: ({ articleMap, params }) => {
                const article = articleMap?.get(params.slug);
                return {
                    note: article ? `标签：${(article.tags || []).join(' / ') || '暂无'}` : '文档暂无更多信息',
                    extra: article ? `<small>最后更新：${article.date || '日期未知'}</small>` : ''
                };
            },
            render: async ({ root, spa, params, articleMap }) => {
                if (!root) return;
                const article = articleMap?.get(params.slug);
                if (!article) {
                    root.innerHTML = `
                        <section class="page-section">
                            <h2>未找到文档</h2>
                            <p>可能已经被移动或还没同步到 CDN。返回 <a href="/docs" data-route="/docs">文档搜索</a> 再试一次。</p>
                        </section>
                    `;
                    return;
                }

                root.innerHTML = `
                    <section class="doc-view">
                        <div class="doc-toolbar">
                            <button type="button" data-route="/docs">← 返回搜索</button>
                            <button type="button" class="ghost-btn" title="复制链接" id="copy-doc-link">复制链接</button>
                        </div>
                        <header>
                            <p class="text-muted">${article.category} · ${article.date || '日期未知'}</p>
                            <h1 class="doc-title">${article.title}</h1>
                            <div class="doc-meta">
                                ${(article.tags || []).map((tag) => `<span>#${tag}</span>`).join('') || '<span>暂无标签</span>'}
                            </div>
                        </header>
                        <article id="doc-markdown" class="article-content"></article>
                    </section>
                `;

                const copyBtn = root.querySelector('#copy-doc-link');
                if (copyBtn) {
                    copyBtn.addEventListener('click', async () => {
                        try {
                            await navigator.clipboard?.writeText(window.location.href);
                            copyBtn.textContent = '已复制';
                            setTimeout(() => (copyBtn.textContent = '复制链接'), 1500);
                        } catch {
                            copyBtn.textContent = '复制失败';
                        }
                    });
                }

                try {
                    const markdown = await spa.getArticleContent(article.slug);
                    const target = root.querySelector('#doc-markdown');
                    if (target) {
                        target.innerHTML = window.marked ? window.marked.parse(markdown) : markdown;
                    }
                } catch (error) {
                    const fallback = root.querySelector('#doc-markdown');
                    if (fallback) {
                        fallback.innerHTML = `<p class="text-muted">加载失败：${error.message}</p>`;
                    }
                }
            }
        });
    };

    register();
})();
