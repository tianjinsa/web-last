
(function registerSearchPage() {
    const register = () => {
        if (!window.SPA || typeof window.SPA.registerPage !== 'function') {
            return setTimeout(register, 20);
        }

        window.SPA.registerPage({
            name: 'docs-search',
            navId: 'docs-search',
            // 匹配 /docs 路由
            match: (path) => path === '/docs',
            
            // 动态生成 Header
            header: ({ tags = [] }) => ({
                tagline: '快速检索 · 标签联动 · 本地缓存',
                pageTitle: '文档搜索 · Alpha Docs'
            }),
            
            // 动态生成 Footer
            footer: ({ articles = [], tags = [] }) => ({
                note: `目前共收录 ${articles.length} 篇文档，${tags.length} 个标签`,
                extra: '<small>提示：输入多个关键字可使用空格分隔，系统会自动做包含匹配。</small>'
            }),
            
            // 核心渲染逻辑
            render: ({ root, articles = [], tags = [] }) => {
                if (!root) return;
                
                // 搜索状态管理
                const state = { keyword: '', tag: 'all', sort: 'date-desc', fuzzyMode: false };
                const uniqueTags = Array.from(new Set(tags)).filter(Boolean);
                
                // 渲染搜索界面骨架
                root.innerHTML = `
                <div id="doc-search" class="cardgroup">
                    <div class="card-t">
                        <div class="cardhead">文档标题 / 描述</div>
                        <div class="cardbody" style="width: 400px;">
                            <!-- 搜索输入框 -->
                            <input id="doc-search-input" type="search" placeholder="例如：Python、部署、架构..." autocomplete="off" />
                            
                            <!-- 排序与模糊搜索选项 -->
                            <div class="search-options d-flex flex-column flex-md-row" style="gap: 0.5rem;">
                                <select id="doc-sort-select" class="search-select">
                                    <option value="date-desc">📅 时间 (最新)</option>
                                    <option value="date-asc">📅 时间 (最早)</option>
                                    <option value="title-asc">🔤 标题 (A-Z)</option>
                                    <option value="title-desc">🔤 标题 (Z-A)</option>
                                </select>
                                <button id="doc-fuzzy-toggle" class="search-select w-md-auto" style="flex: 0 0 auto;" title="开启/关闭模糊匹配">
                                    ✨ 模糊
                                </button>
                            </div>

                            <!-- 标签过滤器 -->
                            <div class="tag-group" id="doc-tag-filter">
                                <button type="button" class="tag-chip is-active" data-tag="all">全部</button>
                                ${uniqueTags.map((tag) => `<button type="button" class="tag-chip" data-tag="${tag}">${tag}</button>`).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="card-t">
                        <div class="cardhead" id="search-result-head">搜索结果</div>
                        <div id="doc-search-results" class="cardbody doc-list" style="width: 500px;">
                            <!-- 结果列表将在此渲染 -->
                        </div>
                    </div>
                </div>
                `;

                const input = root.querySelector('#doc-search-input');
                const sortSelect = root.querySelector('#doc-sort-select');
                const fuzzyToggle = root.querySelector('#doc-fuzzy-toggle');
                const tagFilter = root.querySelector('#doc-tag-filter');
                const resultContainer = root.querySelector('#doc-search-results');
                const resultHead = root.querySelector('#search-result-head');

                // 渲染结果列表函数
                const renderResultList = () => {
                    if (!resultContainer) return;
                    const keyword = state.keyword.trim().toLowerCase();
                    const tag = state.tag;
                    
                    // 过滤逻辑
                    let filtered = articles.filter((article) => {
                        let matchesKeyword = !keyword;
                        if (!matchesKeyword) {
                            const fields = [
                                article.title,
                                article.description,
                                article.category
                            ];
                            // 模糊匹配 vs 精确匹配
                            if (state.fuzzyMode && window.FuzzySearch) {
                                matchesKeyword = fields.some(field => field && window.FuzzySearch.match(field, keyword));
                            } else {
                                matchesKeyword = fields.some(field => field && field.toLowerCase().includes(keyword));
                            }
                        }
                        
                        const matchesTag = tag === 'all' || (article.tags || []).includes(tag);
                        return matchesKeyword && matchesTag;
                    });

                    // 更新结果头部计数
                    if (resultHead) {
                        resultHead.innerHTML = `
                            <span>搜索结果</span>
                            <div class="count-display">
                                <span class="count-num">${filtered.length}</span>
                                <span class="count-divider">/</span>
                                <span class="count-num">${articles.length}</span>
                            </div>
                        `;
                    }

                    // 排序逻辑
                    filtered.sort((a, b) => {
                        switch (state.sort) {
                            case 'date-desc':
                                return new Date(b.date || 0) - new Date(a.date || 0);
                            case 'date-asc':
                                return new Date(a.date || 0) - new Date(b.date || 0);
                            case 'title-asc':
                                return (a.title || '').localeCompare(b.title || '', 'zh-CN');
                            case 'title-desc':
                                return (b.title || '').localeCompare(a.title || '', 'zh-CN');
                            default:
                                return 0;
                        }
                    });

                    console.log("文章数", filtered.length);
                    
                    // 无结果处理
                    if (!filtered.length) {
                        resultContainer.innerHTML = '<p class="text-muted">暂无匹配结果，换个关键词试试吧。</p>';
                        return;
                    }

                    // 渲染卡片列表
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

                    // 绑定点击事件跳转
                    resultContainer.querySelectorAll('.doc-card').forEach((card) => {
                        card.addEventListener('click', () => {
                            const slug = card.getAttribute('data-doc-slug');
                            if (slug) {
                                window.SPA.navigate(`/docs/${slug}`);
                            }
                        });
                    });
                };

                // 事件监听：输入框
                input?.addEventListener('input', (event) => {
                    state.keyword = event.target.value;
                    renderResultList();
                });

                // 事件监听：排序下拉框
                sortSelect?.addEventListener('change', (event) => {
                    state.sort = event.target.value;
                    renderResultList();
                });

                // 事件监听：模糊搜索开关
                fuzzyToggle?.addEventListener('click', () => {
                    state.fuzzyMode = !state.fuzzyMode;
                    fuzzyToggle.classList.toggle('is-active', state.fuzzyMode);
                    fuzzyToggle.style.borderColor = state.fuzzyMode ? 'var(--accent)' : '';
                    fuzzyToggle.style.color = state.fuzzyMode ? 'var(--accent)' : '';
                    renderResultList();
                });

                // 事件监听：标签过滤器
                tagFilter?.addEventListener('click', (event) => {
                    const btn = event.target.closest('[data-tag]');
                    if (!btn) return;
                    tagFilter.querySelectorAll('.tag-chip').forEach((chip) => chip.classList.remove('is-active'));
                    btn.classList.add('is-active');
                    state.tag = btn.getAttribute('data-tag');
                    renderResultList();
                });

                // 初始渲染
                renderResultList();

                // 初始化卡片动画（确保 DOM 完全渲染后执行）
                if (typeof window.cardsInit === 'function') {
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            window.cardsInit();
                        });
                    });
                }
            }
        });
    };

    register();
})();
