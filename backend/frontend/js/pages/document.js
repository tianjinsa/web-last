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
                
                // 清理之前的模态框（如果存在）
                const oldModal = document.getElementById('stats-modal');
                if (oldModal) {
                    oldModal.remove();
                }
                
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
                                ${article.type === 'ifmhtml' ? '<button type="button" class="ghost-btn w-100 w-sm-auto" id="fullscreen-btn">⛶ 全屏阅读</button>' : ''}
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
                                <div class="comment-form" id="comment-form-container">
                                    <!-- 动态渲染：登录状态或未登录提示 -->
                                </div>
                                <div id="comments-list" class="comments-list">
                                    <p class="text-muted">加载评论中...</p>
                                </div>
                            </section>
                        </section>
                    </div>
                `;

                // 创建模态框（添加到 body，确保 fixed 定位正确）
                const modal = document.createElement('div');
                modal.id = 'stats-modal';
                modal.className = 'modal-overlay';
                modal.style.display = 'none';
                modal.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>访问趋势 (7天)</h3>
                            <button type="button" class="close-modal">×</button>
                        </div>
                        <div class="modal-body">
                            <canvas id="stats-chart" width="400" height="200"></canvas>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);

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
                    const target = root.querySelector('#doc-markdown');
                    if (target) {
                        if (article.type === 'ifmhtml') {
                            let src = article.path;
                            let proxied = false;
                            const isAbsolute = /^https?:\/\//i.test(src);
                            if (!isAbsolute) {
                                src = spa.withCDN(src);
                            } else if (/^http:\/\//i.test(src) && window.location.protocol === 'https:') {
                                src = `/api/ifm-proxy?target=${encodeURIComponent(article.path)}`;
                                proxied = true;
                            }

                            const sandboxPermissions = proxied
                                ? 'allow-scripts allow-forms allow-pointer-lock allow-downloads'
                                : 'allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-downloads';

                            target.innerHTML = `
                                <div class="ifm-wrapper">
                                    <div class="ifm-container" style="position: relative; width: 100%; min-height: 400px; height: 800px;">
                                        <iframe
                                            src="${src}"
                                            style="width: 100%; height: 100%; border: 0; border-radius: 8px;"
                                            title="${article.title}"
                                            allowfullscreen
                                            loading="lazy"
                                            sandbox="${sandboxPermissions}"
                                        ></iframe>
                                    </div>
                                </div>
                            `;

                            // 注入模态样式 (如果尚未注入)
                            if (!document.getElementById('ifm-modal-style')) {
                                const style = document.createElement('style');
                                style.id = 'ifm-modal-style';
                                style.textContent = `
                                    .ifm-modal {
                                        position: fixed;
                                        inset: 0;
                                        width: 100vw;
                                        height: 100vh;
                                        background: rgba(5, 8, 20, 0.85);
                                        backdrop-filter: blur(8px);
                                        -webkit-backdrop-filter: blur(8px);
                                        display: none;
                                        align-items: center;
                                        justify-content: center;
                                        z-index: 2000;
                                        padding: 4vw;
                                    }
                                    .ifm-modal.is-open {
                                        display: flex;
                                        animation: fadeIn 250ms ease;
                                    }
                                    .ifm-modal__content {
                                        position: relative;
                                        width: min(1600px, 96vw);
                                        height: min(1000px, 92vh);
                                        background: var(--bg-panel);
                                        border: 1px solid var(--border-medium);
                                        border-radius: var(--radius-xl);
                                        box-shadow: var(--shadow-lg);
                                        overflow: hidden;
                                    }
                                    .ifm-modal__body {
                                        position: relative;
                                        width: 100%;
                                        height: 100%;
                                        overflow: hidden;
                                    }
                                    .ifm-modal__body .ifm-container {
                                        width: 100%;
                                        height: 100%;
                                        margin: 0;
                                        border-radius: 0;
                                    }
                                    .ifm-modal__body .ifm-container iframe {
                                        border-radius: 0;
                                        height: 100%;
                                    }
                                    .ifm-modal__close {
                                        position: absolute;
                                        top: 16px;
                                        right: 16px;
                                        width: 44px;
                                        height: 44px;
                                        border-radius: 50%;
                                        background: rgba(0, 0, 0, 0.55);
                                        color: #fff;
                                        border: 1px solid rgba(255, 255, 255, 0.2);
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        font-size: 26px;
                                        cursor: pointer;
                                        opacity: 0;
                                        transition: opacity 0.3s ease, transform 0.2s ease;
                                    }
                                    .ifm-modal__content:hover .ifm-modal__close {
                                        opacity: 1;
                                    }
                                    .ifm-modal__close:hover {
                                        background: var(--danger);
                                        transform: scale(1.1) rotate(90deg);
                                    }
                                `;
                                document.head.appendChild(style);
                            }

                            // 创建或复用模态 DOM
                            let ifmModal = document.getElementById('ifm-modal');
                            if (!ifmModal) {
                                ifmModal = document.createElement('div');
                                ifmModal.id = 'ifm-modal';
                                ifmModal.className = 'ifm-modal';
                                ifmModal.innerHTML = `
                                    <div class="ifm-modal__content">
                                        <button type="button" class="ifm-modal__close" title="退出全屏">×</button>
                                        <div class="ifm-modal__body"></div>
                                    </div>
                                `;
                                document.body.appendChild(ifmModal);
                            }

                            const modalBody = ifmModal.querySelector('.ifm-modal__body');
                            const modalClose = ifmModal.querySelector('.ifm-modal__close');
                            const fsBtn = root.querySelector('#fullscreen-btn');
                            const wrapper = target.querySelector('.ifm-wrapper');
                            const container = wrapper?.querySelector('.ifm-container');
                            const iframeEl = container?.querySelector('iframe');
                            const placeholder = document.createElement('div');
                            placeholder.className = 'ifm-container-placeholder';
                            let escHandler = null;

                            if (iframeEl) {
                                iframeEl.addEventListener('load', () => {
                                    iframeEl.dataset.loaded = 'true';
                                }, { once: true });
                            }

                            const closeModal = () => {
                                if (modalBody && container && modalBody.contains(container)) {
                                    if (wrapper && placeholder.parentNode === wrapper) {
                                        wrapper.replaceChild(container, placeholder);
                                    } else if (wrapper) {
                                        wrapper.appendChild(container);
                                    }
                                }
                                ifmModal.classList.remove('is-open');
                                document.body.style.overflow = '';
                                if (escHandler) {
                                    document.removeEventListener('keydown', escHandler);
                                    escHandler = null;
                                }
                            };

                            const openModal = () => {
                                if (!modalBody || !container || !wrapper) return;
                                placeholder.style.height = `${container.offsetHeight}px`;
                                wrapper.replaceChild(placeholder, container);
                                modalBody.appendChild(container);
                                ifmModal.classList.add('is-open');
                                document.body.style.overflow = 'hidden';
                                escHandler = (e) => {
                                    if (e.key === 'Escape') closeModal();
                                };
                                document.addEventListener('keydown', escHandler);
                            };

                            if (ifmModal) {
                                ifmModal.onclick = (event) => {
                                    if (event.target === ifmModal) {
                                        closeModal();
                                    }
                                };
                            }

                            if (modalClose) {
                                modalClose.onclick = closeModal;
                            }

                            if (fsBtn) {
                                fsBtn.addEventListener('click', openModal);
                            }
                        } else {
                            const content = await spa.getArticleContent(article.slug);
                            // 根据类型渲染 HTML 或 Markdown
                            if (article.type === 'html') {
                                target.innerHTML = content;
                            } else {
                                target.innerHTML = window.marked ? window.marked.parse(content) : content;
                            }
                        }
                        
                        // 生成目录 (TOC)
                        const tocEl = root.querySelector('#doc-toc');
                        const headers = target.querySelectorAll('h2, h3');
                        const commentsAnchor = 'comments-section';
                        const commentsTitle = '💬 评论区';
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
                            // 添加评论区跳转
                            const commentSection = document.getElementById(commentsAnchor) || root.querySelector('.comments-section');
                            if (commentSection) {
                                commentSection.id = commentsAnchor;
                                const li = document.createElement('li');
                                li.className = 'toc-comments';
                                li.innerHTML = `<a href="#${commentsAnchor}">${commentsTitle}</a>`;
                                ul.appendChild(li);
                            }
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
                            // 如果没有标题，隐藏目录按钮和容器
                            const toggleBtn = root.querySelector('#toc-toggle');
                            if (toggleBtn) toggleBtn.style.display = 'none';
                            if (tocEl) {
                                tocEl.classList.remove('d-lg-block');
                                tocEl.classList.add('d-none');
                            }
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
                        const modalEl = document.getElementById('stats-modal');
                        const closeBtn = modalEl?.querySelector('.close-modal');
                        const canvas = modalEl?.querySelector('#stats-chart');
                        
                        if (btn && modalEl && canvas && closeBtn) {
                            btn.addEventListener('click', () => {
                                console.log('Opening stats modal');
                                modalEl.style.display = 'flex';
                                
                                // 确保模态框内容可见
                                requestAnimationFrame(() => {
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
                                                maintainAspectRatio: true,
                                                interaction: {
                                                    mode: 'index',
                                                    intersect: false,
                                                },
                                                plugins: { legend: { display: false } },
                                                scales: {
                                                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' } },
                                                    x: { grid: { display: false } }
                                                }
                                            }
                                        });
                                    }
                                });
                            });
                            
                            closeBtn.addEventListener('click', () => {
                                console.log('Closing stats modal');
                                modalEl.style.display = 'none';
                            });
                            
                            modalEl.addEventListener('click', (e) => {
                                if (e.target === modalEl) {
                                    console.log('Closing modal by clicking overlay');
                                    modalEl.style.display = 'none';
                                }
                            });
                        } else {
                            console.warn('Stats modal elements not found:', { btn, modalEl, canvas, closeBtn });
                        }
                    }
                } catch (e) {
                    console.warn('Stats failed', e);
                }

                // 评论区逻辑
                const commentFormContainer = root.querySelector('#comment-form-container');
                const commentList = root.querySelector('#comments-list');
                
                // 检查登录状态并渲染评论表单
                const user = window.SPA.getCurrentUser();
                const token = localStorage.getItem('auth_token');
                
                if (user && token) {
                    // 已登录 - 显示评论表单
                    commentFormContainer.innerHTML = `
                        <div class="logged-in-user">
                            <span>以 <strong>${user.username}</strong> 的身份发表评论</span>
                        </div>
                        <textarea id="comment-content" placeholder="写下您的想法..." rows="3"></textarea>
                        <button type="button" id="submit-comment" class="primary-btn">发表评论</button>
                    `;
                } else {
                    // 未登录 - 显示登录提示
                    commentFormContainer.innerHTML = `
                        <div class="login-prompt">
                            <p>您需要<a href="/auth" data-route="/auth">登录</a>后才能发表评论</p>
                        </div>
                    `;
                }

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
                                    <span class="comment-time">${new Date(c.timestamp).toLocaleString()}</span>
                                </div>
                                <div class="comment-content">${c.content}</div>
                            </div>
                        `).join('');
                    } catch (e) {
                        commentList.innerHTML = '<p class="text-muted">加载评论失败</p>';
                    }
                };

                loadComments();

                // 如果已登录，绑定提交事件
                if (user && token) {
                    const submitBtn = root.querySelector('#submit-comment');
                    const contentInput = root.querySelector('#comment-content');
                    
                    submitBtn?.addEventListener('click', async () => {
                        const content = contentInput.value.trim();
                        if (!content) return alert('请填写评论内容');
                        
                        submitBtn.disabled = true;
                        submitBtn.textContent = '提交中...';
                        
                        try {
                            const res = await fetch('/api/comments', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({
                                    article_path: article.path,
                                    content
                                })
                            });
                            
                            if (res.status === 401) {
                                localStorage.removeItem('auth_token');
                                localStorage.removeItem('user');
                                window.location.hash = '/auth';
                                return;
                            }
                            
                            if (res.ok) {
                                const data = await res.json();
                                contentInput.value = '';
                                alert(data.message || '评论已提交');
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
            }
        });
    };

    register();
})();
