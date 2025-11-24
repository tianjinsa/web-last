
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
                const normalizeCategory = (value) => (value && String(value).trim()) || '未分类';
                const state = {
                    keyword: '',
                    tags: new Set(),
                    categories: new Set(),
                    sort: 'date-desc',
                    fuzzyMode: false
                };
                const uniqueTags = Array.from(new Set(tags)).filter(Boolean);
                const uniqueCategories = Array.from(new Set(articles.map((article) => normalizeCategory(article.category))));
                const SIMILARITY_SORT_VALUE = 'similarity-desc';
                
                // 渲染搜索界面骨架
                root.innerHTML = `
                <div id="doc-search" class="cardgroup">
                    <div class="card-t">
                        <div class="cardhead">文档标题 / 描述</div>
                        <div class="cardbody search-input-panel">
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

                            <div class="filter-stack" style="display: flex; flex-direction: column; gap: 0.75rem;">
                                <div class="filter-group">
                                    <div class="filter-label text-muted">主题筛选</div>
                                    <div class="tag-group" id="doc-category-filter">
                                        <button type="button" class="tag-chip is-active" data-category="all">全部</button>
                                        ${uniqueCategories.map((category) => `<button type="button" class="tag-chip" data-category="${category}">${category}</button>`).join('')}
                                    </div>
                                </div>
                                <div class="filter-group">
                                    <div class="filter-label text-muted">标签筛选</div>
                                    <div class="tag-group" id="doc-tag-filter">
                                        <button type="button" class="tag-chip is-active" data-tag="all">全部</button>
                                        ${uniqueTags.map((tag) => `<button type="button" class="tag-chip" data-tag="${tag}">${tag}</button>`).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="card-t">
                        <div class="cardhead" id="search-result-head">搜索结果</div>
                        <div id="doc-search-results" class="cardbody doc-list">
                            <!-- 结果列表将在此渲染 -->
                        </div>
                    </div>
                </div>
                `;

                const input = root.querySelector('#doc-search-input');
                const sortSelect = root.querySelector('#doc-sort-select');
                const fuzzyToggle = root.querySelector('#doc-fuzzy-toggle');
                const tagFilter = root.querySelector('#doc-tag-filter');
                const categoryFilter = root.querySelector('#doc-category-filter');
                const resultContainer = root.querySelector('#doc-search-results');
                const resultHead = root.querySelector('#search-result-head');

                const syncFilterChips = (container, selectedSet, attr) => {
                    if (!container) return;
                    const chips = container.querySelectorAll(`[data-${attr}]`);
                    chips.forEach((chip) => {
                        const value = chip.getAttribute(`data-${attr}`);
                        if (value === 'all') {
                            chip.classList.toggle('is-active', selectedSet.size === 0);
                        } else {
                            chip.classList.toggle('is-active', selectedSet.has(value));
                        }
                    });
                };

                const ensureSimilaritySortOption = (enabled) => {
                    if (!sortSelect) return;
                    const existing = sortSelect.querySelector(`option[value="${SIMILARITY_SORT_VALUE}"]`);
                    if (enabled) {
                        if (!existing) {
                            const option = document.createElement('option');
                            option.value = SIMILARITY_SORT_VALUE;
                            option.textContent = '✨ 相似度 (高→低)';
                            sortSelect.appendChild(option);
                        }
                        state.sort = SIMILARITY_SORT_VALUE;
                        sortSelect.value = SIMILARITY_SORT_VALUE;
                    } else {
                        if (existing) {
                            existing.remove();
                        }
                        if (state.sort === SIMILARITY_SORT_VALUE) {
                            state.sort = 'date-desc';
                            sortSelect.value = 'date-desc';
                        }
                    }
                };

                const computeSimilarityScore = (article, keywordText) => {
                    if (!keywordText || !window.FuzzySearch || typeof window.FuzzySearch.similarity !== 'function') {
                        return 0;
                    }
                    const titleScore = window.FuzzySearch.similarity(article.title || '', keywordText);
                    const descScore = window.FuzzySearch.similarity(article.description || '', keywordText);
                    return Math.max(titleScore, descScore);
                };

                // 渲染结果列表函数
                const renderResultList = () => {
                    if (!resultContainer) return;
                    const rawKeyword = state.keyword.trim();
                    const keyword = rawKeyword.toLowerCase();
                    const useFuzzy = state.fuzzyMode && rawKeyword.length > 0 && window.FuzzySearch && typeof window.FuzzySearch.similarity === 'function';

                    const passesTaxonomy = (article) => {
                        const articleCategory = normalizeCategory(article.category);
                        const matchesCategory = state.categories.size === 0 || state.categories.has(articleCategory);
                        const matchesTag = state.tags.size === 0 || (article.tags || []).some((tagItem) => state.tags.has(tagItem));
                        return matchesCategory && matchesTag;
                    };

                    let filtered;

                    if (useFuzzy) {
                        const strongMatches = [];
                        const fallbackMatches = [];

                        articles.forEach((article) => {
                            if (!passesTaxonomy(article)) {
                                article._similarity = undefined;
                                return;
                            }

                            const similarity = computeSimilarityScore(article, rawKeyword);
                            article._similarity = Number(similarity.toFixed(3));

                            if (similarity >= 0.7) {
                                strongMatches.push(article);
                            } else if (similarity >= 0.3) {
                                fallbackMatches.push(article);
                            }
                        });

                        fallbackMatches.sort((a, b) => (b._similarity || 0) - (a._similarity || 0));
                        const needed = Math.max(0, 3 - strongMatches.length);
                        const supplements = needed > 0 ? fallbackMatches.slice(0, needed) : [];
                        filtered = strongMatches.concat(supplements);
                    } else {
                        filtered = articles.filter((article) => {
                            article._similarity = undefined;
                            let matchesKeyword = !keyword;
                            if (!matchesKeyword) {
                                const fields = [
                                    article.title,
                                    article.description,
                                    article.category
                                ];
                                matchesKeyword = fields.some(field => field && field.toLowerCase().includes(keyword));
                            }
                            return matchesKeyword && passesTaxonomy(article);
                        });
                    }

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
                            case SIMILARITY_SORT_VALUE:
                                return (b._similarity || 0) - (a._similarity || 0);
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
                                ${useFuzzy ? `<span>✨ 相似度 ${(article._similarity ?? 0).toFixed(2)}</span>` : ''}
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
                    ensureSimilaritySortOption(state.fuzzyMode);
                    renderResultList();
                });

                // 事件监听：标签过滤器（多选）
                tagFilter?.addEventListener('click', (event) => {
                    const btn = event.target.closest('[data-tag]');
                    if (!btn) return;
                    const value = btn.getAttribute('data-tag');
                    if (value === 'all') {
                        state.tags.clear();
                    } else {
                        if (state.tags.has(value)) {
                            state.tags.delete(value);
                        } else {
                            state.tags.add(value);
                        }
                    }
                    syncFilterChips(tagFilter, state.tags, 'tag');
                    renderResultList();
                });

                // 事件监听：主题过滤器（多选）
                categoryFilter?.addEventListener('click', (event) => {
                    const btn = event.target.closest('[data-category]');
                    if (!btn) return;
                    const value = btn.getAttribute('data-category');
                    if (value === 'all') {
                        state.categories.clear();
                    } else {
                        if (state.categories.has(value)) {
                            state.categories.delete(value);
                        } else {
                            state.categories.add(value);
                        }
                    }
                    syncFilterChips(categoryFilter, state.categories, 'category');
                    renderResultList();
                });

                // 同步筛选按钮初始状态
                syncFilterChips(tagFilter, state.tags, 'tag');
                syncFilterChips(categoryFilter, state.categories, 'category');
                ensureSimilaritySortOption(state.fuzzyMode);

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
