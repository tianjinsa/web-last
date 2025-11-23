
(function registerSearchPage() {
    const register = () => {
        if (!window.SPA || typeof window.SPA.registerPage !== 'function') {
            return setTimeout(register, 20);
        }

        window.SPA.registerPage({
            name: 'docs-search',
            navId: 'docs-search',
            match: (path) => path === '/docs',
            header: ({ tags = [] }) => ({
                tagline: '快速检索 · 标签联动 · 本地缓存',
                pageTitle: '文档搜索 · Alpha Docs'
            }),
            footer: ({ articles = [], tags = [] }) => ({
                note: `目前共收录 ${articles.length} 篇文档，${tags.length} 个标签`,
                extra: '<small>提示：输入多个关键字可使用空格分隔，系统会自动做包含匹配。</small>'
            }),
            render: ({ root, articles = [], tags = [] }) => {
                if (!root) return;
                const state = { keyword: '', tag: 'all' };
                const uniqueTags = Array.from(new Set(tags)).filter(Boolean);
                root.innerHTML = `
                <div id="doc-search" class="cardgroup">
                    <div class="card-t">
                        <div class="cardhead">文档标题 / 描述</div>
                        <div class="cardbody" style="width: 400px;">
                            <input id="doc-search-input" type="search" placeholder="例如：Python、部署、架构..." autocomplete="off" />
                            <div class="tag-group" id="doc-tag-filter">
                                <button type="button" class="tag-chip is-active" data-tag="all">全部</button>
                                ${uniqueTags.map((tag) => `<button type="button" class="tag-chip" data-tag="${tag}">${tag}</button>`).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="card-t">
                        <div class="cardhead">搜索结果</div>
                        <div id="doc-search-results" class="cardbody doc-list">

                        </div>
                    </div>
                </div>
                `;

                const input = root.querySelector('#doc-search-input');
                const tagFilter = root.querySelector('#doc-tag-filter');
                const resultContainer = root.querySelector('#doc-search-results');

                const renderResultList = () => {
                    if (!resultContainer) return;
                    const keyword = state.keyword.trim().toLowerCase();
                    const tag = state.tag;
                    const filtered = articles.filter((article) => {
                        const matchesKeyword = !keyword || [
                            article.title,
                            article.description,
                            article.category
                        ].some((field) => field && field.toLowerCase().includes(keyword));
                        const matchesTag = tag === 'all' || (article.tags || []).includes(tag);
                        return matchesKeyword && matchesTag;
                    });
                    console.log("文章数",filtered.length);
                    
                    if (!filtered.length) {
                        resultContainer.innerHTML = '<p class="text-muted">暂无匹配结果，换个关键词试试吧。</p>';
                        return;
                    }

                    resultContainer.innerHTML = filtered.map((article) => `
                        <article class="doc-card" data-doc-slug="${article.slug}">
                            <h3>${article.title}</h3>
                            <p>${article.description || '这篇文档还没有简介。'}</p>
                            <div class="doc-meta">
                                <span>🗂 ${article.category}</span>
                                <span>🕒 ${article.date || '时间未知'}</span>
                                <span>🏷 ${(article.tags || []).join(' · ')}</span>
                            </div>
                        </article>
                    `).join('');

                    resultContainer.querySelectorAll('.doc-card').forEach((card) => {
                        card.addEventListener('click', () => {
                            const slug = card.getAttribute('data-doc-slug');
                            if (slug) {
                                window.SPA.navigate(`/docs/${slug}`);
                            }
                        });
                    });
                };

                input?.addEventListener('input', (event) => {
                    state.keyword = event.target.value;
                    renderResultList();
                });

                tagFilter?.addEventListener('click', (event) => {
                    const btn = event.target.closest('[data-tag]');
                    if (!btn) return;
                    tagFilter.querySelectorAll('.tag-chip').forEach((chip) => chip.classList.remove('is-active'));
                    btn.classList.add('is-active');
                    state.tag = btn.getAttribute('data-tag');
                    renderResultList();
                });

                renderResultList();

                if (typeof window.cardsInit === 'function') {
                    setTimeout(() => window.cardsInit(), 500);
                }
            }
        });
    };

    register();
})();
