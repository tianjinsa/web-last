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
            render: async ({ root, articles = [], tags = [] }) => {
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
                                <button id="ai-search-btn" class="search-select w-md-auto" style="flex: 0 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none;" title="使用 AI 助手搜索">
                                    🤖 AI 助手
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

                // --- AI 助手逻辑 ---
                const aiBtn = root.querySelector('#ai-search-btn');
                
                // 检查 AI 是否启用
                let aiEnabled = false;
                try {
                    const aiConfigRes = await fetch('/api/ai/config');
                    if (aiConfigRes.ok) {
                        const aiConfig = await aiConfigRes.json();
                        aiEnabled = aiConfig.enabled;
                    }
                } catch (e) {
                    console.warn('Failed to check AI config:', e);
                }
                
                // 如果 AI 未启用，隐藏按钮
                if (!aiEnabled && aiBtn) {
                    aiBtn.style.display = 'none';
                }
                
                // 清理旧模态框
                const oldAiModal = document.getElementById('ai-search-modal');
                if (oldAiModal) oldAiModal.remove();

                // 创建模态框
                const aiModal = document.createElement('div');
                aiModal.id = 'ai-search-modal';
                aiModal.className = 'modal-overlay';
                aiModal.style.display = 'none';
                aiModal.innerHTML = `
                    <div class="modal-content" style="max-width: 600px; width: 90%; height: 80vh; display: flex; flex-direction: column; background: var(--bg-panel, #fff); color: var(--text-main, #333);">
                        <div class="modal-header" style="padding: 1rem; border-bottom: 1px solid var(--border-medium, #eee); display: flex; justify-content: space-between; align-items: center;">
                            <h3 style="margin: 0;">🤖 AI 智能助手</h3>
                            <button type="button" class="close-modal" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: inherit;">×</button>
                        </div>
                        <div class="modal-body" id="ai-chat-history" style="flex: 1; overflow-y: auto; padding: 1rem; background: rgba(0,0,0,0.02);">
                            <div class="ai-message system">
                                <p>你好！我是你的文档助手。你可以问我关于文档库的任何问题。</p>
                            </div>
                        </div>
                        <div class="modal-footer" style="padding: 1rem; border-top: 1px solid var(--border-medium, #eee);">
                            <div style="display: flex; gap: 0.5rem;">
                                <input type="text" id="ai-input" placeholder="输入你的问题..." style="flex: 1; padding: 0.6rem; border-radius: 4px; border: 1px solid var(--border-medium, #ccc); background: var(--bg-input, #fff); color: var(--text-main, #333);">
                                <button id="ai-send-btn" class="primary-btn" style="padding: 0.5rem 1.2rem; white-space: nowrap;">发送</button>
                            </div>
                        </div>
                    </div>
                    <style>
                        #ai-search-modal { z-index: 2000; }
                        .ai-message { margin-bottom: 1rem; padding: 0.8rem; border-radius: 8px; max-width: 85%; line-height: 1.5; word-wrap: break-word; }
                        .ai-message.system { background: var(--bg-card, #f5f5f5); align-self: flex-start; margin-right: auto; border: 1px solid var(--border-medium, #eee); }
                        .ai-message.user { background: var(--accent, #667eea); color: white; align-self: flex-end; margin-left: auto; }
                        .ai-message.loading { opacity: 0.7; font-style: italic; }
                        .ai-message p { margin: 0 0 0.5rem 0; }
                        .ai-message p:last-child { margin: 0; }
                        #ai-chat-history { display: flex; flex-direction: column; }
                    </style>
                `;
                document.body.appendChild(aiModal);

                // 事件监听
                const closeAiModal = () => {
                    aiModal.style.display = 'none';
                };
                
                aiModal.querySelector('.close-modal').addEventListener('click', closeAiModal);
                aiModal.addEventListener('click', (e) => {
                    if (e.target === aiModal) closeAiModal();
                });

                if (aiBtn) {
                    aiBtn.addEventListener('click', () => {
                        aiModal.style.display = 'flex';
                        setTimeout(() => aiModal.querySelector('#ai-input').focus(), 100);
                    });
                }

                const chatHistory = aiModal.querySelector('#ai-chat-history');
                const aiInput = aiModal.querySelector('#ai-input');
                const aiSendBtn = aiModal.querySelector('#ai-send-btn');

                const appendMessage = (role, text) => {
                    const msgDiv = document.createElement('div');
                    msgDiv.className = `ai-message ${role}`;
                    // 使用 marked 解析 markdown，如果不可用则直接显示文本
                    msgDiv.innerHTML = window.marked ? window.marked.parse(text) : `<p>${text}</p>`;
                    chatHistory.appendChild(msgDiv);
                    chatHistory.scrollTop = chatHistory.scrollHeight;
                };

                const handleSend = async () => {
                    const query = aiInput.value.trim();
                    if (!query) return;

                    appendMessage('user', query);
                    aiInput.value = '';
                    aiInput.disabled = true;
                    aiSendBtn.disabled = true;
                    aiSendBtn.textContent = '...';

                    const loadingMsg = document.createElement('div');
                    loadingMsg.className = 'ai-message system loading';
                    loadingMsg.textContent = '思考中...';
                    chatHistory.appendChild(loadingMsg);
                    chatHistory.scrollTop = chatHistory.scrollHeight;

                    try {
                        // 准备上下文数据 (精简字段以节省 token)
                        const contextData = articles.map(a => ({
                            title: a.title,
                            desc: a.description,
                            tags: a.tags,
                            cat: a.category,
                            slug: a.slug
                        }));

                        const response = await fetch('/api/ai/chat', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                message: query,
                                context: contextData
                            })
                        });

                        if (!response.ok) {
                            const errData = await response.json().catch(() => ({}));
                            throw new Error(errData.error || `API Error: ${response.status}`);
                        }

                        const data = await response.json();
                        chatHistory.removeChild(loadingMsg);
                        
                        if (data.content) {
                            appendMessage('system', data.content);
                        } else {
                            appendMessage('system', '抱歉，我没有理解你的问题，或者服务暂时不可用。');
                        }

                    } catch (error) {
                        if (loadingMsg.parentNode) chatHistory.removeChild(loadingMsg);
                        appendMessage('system', `发生错误: ${error.message}`);
                        console.error('AI Search Error:', error);
                    } finally {
                        aiInput.disabled = false;
                        aiSendBtn.disabled = false;
                        aiSendBtn.textContent = '发送';
                        aiInput.focus();
                    }
                };

                aiSendBtn.addEventListener('click', handleSend);
                aiInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') handleSend();
                });

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
