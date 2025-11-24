(function registerDocumentPage() {
    const register = () => {
        if (!window.SPA || typeof window.SPA.registerPage !== 'function') {
            return setTimeout(register, 20);
        }

        window.SPA.registerPage({
            name: 'doc-view',
            navId: 'docs-view',
            // 匹配 /docs/xxx 格式的路由
            match: (path) => /^\/docs\/[\w-]+$/.test(path),
            // 解析 URL 参数，提取 slug
            parseParams: (path) => ({ slug: decodeURIComponent(path.split('/').pop() || '') }),
            
            // 动态生成页面 Header
            header: ({ articleMap, params }) => {
                const article = articleMap?.get(params.slug);
                return {
                    tagline: article ? `正在阅读：${article.title}` : '文档详情',
                    pageTitle: article ? `${article.title} · Alpha Docs` : '文档详情 · Alpha Docs'
                };
            },
            
            // 动态生成页面 Footer
            footer: ({ articleMap, params }) => {
                const article = articleMap?.get(params.slug);
                return {
                    note: article ? `标签：${(article.tags || []).join(' / ') || '暂无'}` : '文档暂无更多信息',
                    extra: article ? `<small>最后更新：${article.date || '日期未知'}</small>` : ''
                };
            },
            
            // 核心渲染逻辑
            render: async ({ root, spa, params, articleMap }) => {
                if (!root) return;
                const article = articleMap?.get(params.slug);
                
                // 404 处理
                if (!article) {
                    root.innerHTML = `
                        <section class="page-section">
                            <h2>未找到文档</h2>
                            <p>可能已经被移动或还没同步到 CDN。返回 <a href="/docs" data-route="/docs">文档搜索</a> 再试一次。</p>
                        </section>
                    `;
                    return;
                }

                // 渲染基础骨架
                root.innerHTML = `
                    <div class="doc-layout d-flex flex-column flex-lg-row gap-4">
                        <!-- 目录容器 (初始隐藏) -->
                        <aside class="doc-toc-container d-none d-lg-block" id="doc-toc"></aside>
                        
                        <!-- 目录切换按钮 -->
                        <button id="toc-toggle" class="toc-toggle-btn d-flex d-lg-none" title="目录">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                                <path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
                            </svg>
                        </button>
                        
                        <section class="doc-view" style="flex: 1; min-width: 0;">
                            <!-- 工具栏 -->
                            <div class="doc-toolbar d-flex flex-column flex-sm-row gap-2">
                                <button type="button" data-route="/docs" class="w-100 w-sm-auto">← 返回搜索</button>
                                <button type="button" class="ghost-btn w-100 w-sm-auto" title="复制链接" id="copy-doc-link">复制链接</button>
                                <button type="button" class="ghost-btn w-100 w-sm-auto" id="view-stats-btn">📊 访问统计</button>
                            </div>
                            
                            <!-- 文章头部信息 -->
                            <header>
                                <p class="text-muted">${article.category} · ${article.date || '日期未知'} · <span id="visit-count">...</span> 次阅读</p>
                                <h1 class="doc-title">${article.title}</h1>
                                <div class="doc-meta">
                                    ${(article.tags || []).map((tag) => `<span>#${tag}</span>`).join('') || '<span>暂无标签</span>'}
                                </div>
                            </header>
                            
                            <!-- 文章内容容器 -->
                            <article id="doc-markdown" class="article-content"></article>
                            
                            <hr class="doc-divider">
                            
                            <!-- 评论区 -->
                            <section class="comments-section">
                                <h3>评论</h3>
                                <div class="comment-form">
                                    <input type="text" id="comment-author" placeholder="您的昵称" maxlength="20">
                                    <textarea id="comment-content" placeholder="写下您的想法..." rows="3"></textarea>
                                    <button type="button" id="submit-comment" class="primary-btn">发表评论</button>
                                </div>
                                <div id="comments-list" class="comments-list">
                                    <p class="text-muted">加载评论中...</p>
                                </div>
                            </section>
                        </section>
                    </div>

                    <!-- 统计图表模态框 -->
                    <div id="stats-modal" class="modal-overlay" style="display: none;">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h3>访问趋势 (7天)</h3>
                                <button type="button" class="close-modal">×</button>
                            </div>
                            <div class="modal-body">
                                <canvas id="stats-chart"></canvas>
                            </div>
                        </div>
                    </div>
                `;

                // 绑定复制链接功能
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

                // 渲染文章内容
                try {
                    const content = await spa.getArticleContent(article.slug);
                    const target = root.querySelector('#doc-markdown');
                    if (target) {
                        // 根据类型渲染 HTML 或 Markdown
                        if (article.type === 'html') {
                            target.innerHTML = content;
                        } else {
                            target.innerHTML = window.marked ? window.marked.parse(content) : content;
                        }
                        
                        // 生成目录 (TOC)
                        const tocEl = root.querySelector('#doc-toc');
                        const headers = target.querySelectorAll('h2, h3');
                        if (tocEl && headers.length > 0) {
                            const ul = document.createElement('ul');
                            headers.forEach((header, index) => {
                                const id = header.id || `heading-${index}`;
                                header.id = id;
                                const li = document.createElement('li');
                                li.className = `toc-${header.tagName.toLowerCase()}`;
                                li.innerHTML = `<a href="#${id}">${header.textContent}</a>`;
                                ul.appendChild(li);
                            });
                            tocEl.innerHTML = '<h4>目录</h4>';
                            tocEl.appendChild(ul);
                            
                            // 目录点击平滑滚动
                            tocEl.querySelectorAll('a').forEach(a => {
                                a.addEventListener('click', (e) => {
                                    e.preventDefault();
                                    const targetId = a.getAttribute('href').substring(1);
                                    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
                                    // 移动端点击后自动关闭目录
                                    tocEl.classList.remove('is-open');
                                    document.getElementById('toc-toggle')?.classList.remove('is-active');
                                });
                            });

                            // 目录切换逻辑
                            const toggleBtn = root.querySelector('#toc-toggle');
                            if (toggleBtn) {
                                toggleBtn.style.display = 'flex';
                                toggleBtn.addEventListener('click', () => {
                                    tocEl.classList.toggle('is-open');
                                    toggleBtn.classList.toggle('is-active');
                                });
                                
                                // 点击外部关闭目录
                                document.addEventListener('click', (e) => {
                                    if (!tocEl.contains(e.target) && !toggleBtn.contains(e.target) && tocEl.classList.contains('is-open')) {
                                        tocEl.classList.remove('is-open');
                                        toggleBtn.classList.remove('is-active');
                                    }
                                });
                            }
                        } else {
                            // 如果没有标题，隐藏目录按钮
                            const toggleBtn = root.querySelector('#toc-toggle');
                            if (toggleBtn) toggleBtn.style.display = 'none';
                        }
                    }
                } catch (error) {
                    const fallback = root.querySelector('#doc-markdown');
                    if (fallback) {
                        fallback.innerHTML = `<p class="text-muted">加载失败：${error.message}</p>`;
                    }
                }

                // 统计数据逻辑
                const visitCountEl = root.querySelector('#visit-count');
                const currentPath = `/docs/${params.slug}`;

                // 1. 记录访问 (非阻塞)
                fetch('/api/stats/visit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: currentPath })
                }).catch(e => console.warn('Visit record failed', e));

                // 2. 获取统计数据
                try {
                    const res = await fetch(`/api/stats/summary?path=${encodeURIComponent(currentPath)}`);
                    if (res.ok) {
                        const stats = await res.json();
                        if (visitCountEl) visitCountEl.textContent = stats.total_visits;
                        
                        // 图表逻辑 (Chart.js)
                        const btn = root.querySelector('#view-stats-btn');
                        const modal = root.querySelector('#stats-modal');
                        const close = root.querySelector('.close-modal');
                        const canvas = root.querySelector('#stats-chart');
                        
                        if (btn && modal && canvas) {
                            btn.addEventListener('click', () => {
                                modal.style.display = 'flex';
                                if (window.myChart) {
                                    window.myChart.destroy();
                                    window.myChart = null;
                                }
                                if (window.Chart) {
                                    const ctx = canvas.getContext('2d');
                                    window.myChart = new window.Chart(ctx, {
                                        type: 'line',
                                        data: {
                                            labels: stats.daily_visits.map(d => d.date),
                                            datasets: [{
                                                label: '每日访问',
                                                data: stats.daily_visits.map(d => d.count),
                                                borderColor: '#7b6cff',
                                                backgroundColor: 'rgba(123, 108, 255, 0.1)',
                                                fill: true,
                                                tension: 0.4
                                            }]
                                        },
                                        options: {
                                            responsive: true,
                                            plugins: { legend: { display: false } },
                                            scales: {
                                                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' } },
                                                x: { grid: { display: false } }
                                            }
                                        }
                                    });
                                }
                            });
                            
                            close.addEventListener('click', () => modal.style.display = 'none');
                            modal.addEventListener('click', (e) => {
                                if (e.target === modal) modal.style.display = 'none';
                            });
                        }
                    }
                } catch (e) {
                    console.warn('Stats failed', e);
                }

                // 评论区逻辑
                const commentList = root.querySelector('#comments-list');
                const submitBtn = root.querySelector('#submit-comment');
                const authorInput = root.querySelector('#comment-author');
                const contentInput = root.querySelector('#comment-content');

                const loadComments = async () => {
                    if (!commentList) return;
                    try {
                        const res = await fetch(`/api/comments?article_path=${encodeURIComponent(article.path)}`);
                        const comments = await res.json();
                        if (comments.length === 0) {
                            commentList.innerHTML = '<p class="text-muted">暂无评论，快来抢沙发吧！</p>';
                            return;
                        }
                        commentList.innerHTML = comments.map(c => `
                            <div class="comment-item">
                                <div class="comment-header">
                                    <span class="comment-author">${c.author}</span>
                                    <span>${new Date(c.timestamp).toLocaleString()} · ${c.user_agent ? (c.user_agent.includes('Mobile') ? '📱 手机' : '💻 电脑') : '未知设备'}</span>
                                </div>
                                <div class="comment-content">${c.content}</div>
                            </div>
                        `).join('');
                    } catch (e) {
                        commentList.innerHTML = '<p class="text-muted">加载评论失败</p>';
                    }
                };

                loadComments();

                submitBtn?.addEventListener('click', async () => {
                    const author = authorInput.value.trim();
                    const content = contentInput.value.trim();
                    if (!author || !content) return alert('请填写昵称和内容');
                    
                    submitBtn.disabled = true;
                    submitBtn.textContent = '提交中...';
                    
                    try {
                        const res = await fetch('/api/comments', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                article_path: article.path,
                                author,
                                content
                            })
                        });
                        if (res.ok) {
                            authorInput.value = '';
                            contentInput.value = '';
                            loadComments();
                        } else {
                            const err = await res.json();
                            alert(err.error || '提交失败');
                        }
                    } catch (e) {
                        alert('网络错误');
                    } finally {
                        submitBtn.disabled = false;
                        submitBtn.textContent = '发表评论';
                    }
                });
            }
        });
    };

    register();
})();
