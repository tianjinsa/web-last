/**
 * 独立管理后台入口脚本
 */

const AdminApp = {
    init() {
        this.root = document.getElementById('app');
        this.checkAuth();
    },

    checkAuth() {
        const token = localStorage.getItem('admin_token');
        const userStr = localStorage.getItem('admin_user');
        
        if (!token || !userStr) {
            this.renderLogin();
            return;
        }

        try {
            const user = JSON.parse(userStr);
            if (!user.is_admin) {
                this.renderForbidden();
            } else {
                this.renderDashboard(user);
            }
        } catch (e) {
            this.logout();
        }
    },

    logout() {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        this.renderLogin();
    },

    renderLogin() {
        this.root.innerHTML = `
            <div class="admin-login-container">
                <h2 class="text-center mb-4">管理员登录</h2>
                <div class="form-group mb-3">
                    <label class="form-label">用户名</label>
                    <input type="text" id="username" class="form-control" required>
                </div>
                <div class="form-group mb-3">
                    <label class="form-label">密码</label>
                    <input type="password" id="password" class="form-control" required>
                </div>
                <div id="login-error" class="text-danger mb-3"></div>
                <button id="login-btn" class="btn btn-primary w-100">登录</button>
                <div class="text-center mt-3">
                    <a href="/" class="text-muted text-decoration-none">← 返回主站</a>
                </div>
            </div>
        `;

        document.getElementById('login-btn').addEventListener('click', () => this.handleLogin());
        document.getElementById('password').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });
    },

    async handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const errorEl = document.getElementById('login-error');
        const btn = document.getElementById('login-btn');

        if (!username || !password) {
            errorEl.textContent = '请输入用户名和密码';
            return;
        }

        btn.disabled = true;
        btn.textContent = '登录中...';
        errorEl.textContent = '';

        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '登录失败');
            }

            if (!data.user.is_admin) {
                throw new Error('该账号没有管理员权限');
            }

            localStorage.setItem('admin_token', data.access_token);
            localStorage.setItem('admin_user', JSON.stringify(data.user));
            
            this.renderDashboard(data.user);
        } catch (error) {
            errorEl.textContent = error.message;
            btn.disabled = false;
            btn.textContent = '登录';
        }
    },

    renderForbidden() {
        this.root.innerHTML = `
            <div class="admin-login-container text-center">
                <h2 class="text-danger">无权访问</h2>
                <p>您的账号没有管理员权限。</p>
                <button class="btn btn-secondary" onclick="AdminApp.logout()">切换账号</button>
                <a href="/" class="btn btn-link">返回主站</a>
            </div>
        `;
    },

    renderDashboard(user) {
        this.root.innerHTML = `
            <div class="admin-wrapper">
                <header class="admin-header">
                    <div class="d-flex align-items-center gap-3">
                        <h1>管理后台</h1>
                        <span class="badge bg-primary">v1.0</span>
                    </div>
                    <div class="d-flex align-items-center gap-3">
                        <span>欢迎, ${user.username}</span>
                        <a href="/" class="btn btn-outline-light btn-sm" target="_blank">查看站点</a>
                        <button class="btn btn-outline-danger btn-sm" onclick="AdminApp.logout()">退出</button>
                    </div>
                </header>
                
                <div class="admin-tabs">
                    <button class="admin-tab active" data-tab="users">用户管理</button>
                    <button class="admin-tab" data-tab="comments">评论审核</button>
                    <button class="admin-tab" data-tab="ai">AI 助手</button>
                    <button class="admin-tab" data-tab="settings">系统设置</button>
                </div>
                
                <div class="admin-content">
                    <!-- 用户管理 -->
                    <div class="admin-section" id="admin-users">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h2>用户列表</h2>
                            <button class="btn btn-sm btn-primary" onclick="AdminApp.loadUsers()">刷新</button>
                        </div>
                        <div id="users-list" class="table-container">
                            <p>加载中...</p>
                        </div>
                    </div>
                    
                    <!-- 评论审核 -->
                    <div class="admin-section hidden" id="admin-comments">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h2>待审核评论</h2>
                            <button class="btn btn-sm btn-primary" onclick="AdminApp.loadPendingComments()">刷新</button>
                        </div>
                        <div id="comments-list" class="table-container">
                            <p>加载中...</p>
                        </div>
                    </div>
                    
                    <!-- AI 助手设置 -->
                    <div class="admin-section hidden" id="admin-ai">
                        <h2>AI 助手设置</h2>
                        <p class="text-muted mb-4">配置 AI 搜索助手的 API 参数，使用 OpenAI 兼容格式。</p>
                        <div class="settings-form mt-4" style="max-width: 700px;">
                            <div class="form-check form-switch mb-4">
                                <input class="form-check-input" type="checkbox" id="ai-enabled">
                                <label class="form-check-label" for="ai-enabled">启用 AI 助手</label>
                            </div>
                            <div class="form-group mb-3">
                                <label class="form-label">API 地址</label>
                                <input type="text" id="ai-api-url" class="form-control" placeholder="https://open.bigmodel.cn/api/paas/v4/chat/completions">
                                <small class="text-muted">OpenAI 兼容的 Chat Completions 接口地址</small>
                            </div>
                            <div class="form-group mb-3">
                                <label class="form-label">API Key</label>
                                <input type="password" id="ai-api-key" class="form-control" placeholder="sk-xxx 或其他格式的密钥">
                            </div>
                            <div class="form-group mb-3">
                                <label class="form-label">模型 ID</label>
                                <input type="text" id="ai-model" class="form-control" placeholder="glm-4.5-flash">
                            </div>
                            <div class="form-group mb-4">
                                <label class="form-label">系统提示词 (System Prompt)</label>
                                <textarea id="ai-system-prompt" class="form-control" rows="4" placeholder="你是一个智能文档助手..."></textarea>
                                <small class="text-muted">文档列表会自动附加到系统提示词后面</small>
                            </div>
                            <button id="save-ai-settings" class="btn btn-primary">保存 AI 设置</button>
                            <div id="ai-settings-message" class="mt-2"></div>
                        </div>
                    </div>
                    
                    <!-- 系统设置 -->
                    <div class="admin-section hidden" id="admin-settings">
                        <h2>系统设置</h2>
                        <div class="settings-form mt-4" style="max-width: 600px;">
                            <div class="form-check form-switch mb-3">
                                <input class="form-check-input" type="checkbox" id="auto-approve-users">
                                <label class="form-check-label" for="auto-approve-users">自动批准新用户注册</label>
                            </div>
                            <div class="form-check form-switch mb-4">
                                <input class="form-check-input" type="checkbox" id="auto-approve-comments">
                                <label class="form-check-label" for="auto-approve-comments">自动批准所有评论（无需审核）</label>
                            </div>
                            <button id="save-settings" class="btn btn-primary">保存设置</button>
                            <div id="settings-message" class="mt-2"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents();
        this.loadUsers();
    },

    bindEvents() {
        // Tab 切换
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetTab = e.target.dataset.tab;
                
                document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                
                document.querySelectorAll('.admin-section').forEach(s => s.classList.add('hidden'));
                document.getElementById(`admin-${targetTab}`).classList.remove('hidden');
                
                if (targetTab === 'users') this.loadUsers();
                else if (targetTab === 'comments') this.loadPendingComments();
                else if (targetTab === 'ai') this.loadAISettings();
                else if (targetTab === 'settings') this.loadSettings();
            });
        });

        // 设置保存
        const saveBtn = document.getElementById('save-settings');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveSettings());
        }
        
        // AI 设置保存
        const saveAiBtn = document.getElementById('save-ai-settings');
        if (saveAiBtn) {
            saveAiBtn.addEventListener('click', () => this.saveAISettings());
        }
    },

    async fetchApi(url, options = {}) {
        const token = localStorage.getItem('admin_token');
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
        };

        try {
            const response = await fetch(url, { ...options, headers });
            
            if (response.status === 401 || response.status === 422) {
                this.logout();
                return null;
            }
            
            return response;
        } catch (error) {
            console.error('API Error:', error);
            alert('网络错误');
            return null;
        }
    },

    async loadUsers() {
        const container = document.getElementById('users-list');
        const response = await this.fetchApi('/api/admin/users');
        
        if (!response || !response.ok) {
            container.innerHTML = '<p class="text-danger">加载失败</p>';
            return;
        }
        
        const users = await response.json();
        
        if (users.length === 0) {
            container.innerHTML = '<p>暂无用户</p>';
            return;
        }
        
        container.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>用户名</th>
                        <th>邮箱</th>
                        <th>状态</th>
                        <th>角色</th>
                        <th>评论审核</th>
                        <th>注册时间</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(u => `
                        <tr>
                            <td>${u.id}</td>
                            <td>${u.username}</td>
                            <td>${u.email || '-'}</td>
                            <td>
                                <span class="badge ${u.is_approved ? 'badge-success' : 'badge-warning'}">
                                    ${u.is_approved ? '已批准' : '待审核'}
                                </span>
                            </td>
                            <td>${u.is_admin ? '管理员' : '普通用户'}</td>
                            <td>${u.comment_needs_approval ? '需要' : '无需'}</td>
                            <td>${new Date(u.created_at).toLocaleString()}</td>
                            <td>
                                <div class="btn-group btn-group-sm">
                                    ${!u.is_approved ? `
                                        <button class="btn btn-success" onclick="AdminApp.approveUser(${u.id})">批准</button>
                                    ` : !u.is_admin ? `
                                        <button class="btn btn-warning" onclick="AdminApp.rejectUser(${u.id})">冻结</button>
                                    ` : ''}
                                    ${!u.is_admin ? `
                                        <button class="btn btn-secondary" onclick="AdminApp.toggleCommentApproval(${u.id}, ${u.comment_needs_approval})">
                                            ${u.comment_needs_approval ? '免审' : '需审'}
                                        </button>
                                        <button class="btn btn-danger" onclick="AdminApp.deleteUser(${u.id})">删除</button>
                                    ` : ''}
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    async loadPendingComments() {
        const container = document.getElementById('comments-list');
        const response = await this.fetchApi('/api/admin/comments/pending');
        
        if (!response || !response.ok) {
            container.innerHTML = '<p class="text-danger">加载失败</p>';
            return;
        }
        
        const comments = await response.json();
        
        if (comments.length === 0) {
            container.innerHTML = '<p class="text-muted p-3">暂无待审核评论</p>';
            return;
        }
        
        container.innerHTML = comments.map(c => `
            <div class="comment-review-card">
                <div class="comment-meta d-flex justify-content-between">
                    <span><strong>${c.author}</strong> (ID: ${c.user_id})</span>
                    <span>${new Date(c.timestamp).toLocaleString()}</span>
                </div>
                <div class="comment-path text-muted small mb-2">文章: ${c.article_path}</div>
                <div class="comment-content p-2 bg-dark rounded mb-2">${c.content}</div>
                <div class="comment-actions">
                    <button class="btn btn-sm btn-success" onclick="AdminApp.approveComment(${c.id})">批准发布</button>
                    <button class="btn btn-sm btn-danger" onclick="AdminApp.rejectComment(${c.id})">拒绝删除</button>
                </div>
            </div>
        `).join('');
    },

    async loadSettings() {
        const response = await this.fetchApi('/api/admin/config');
        if (!response || !response.ok) return;
        
        const config = await response.json();
        document.getElementById('auto-approve-users').checked = config.auto_approve_users;
        document.getElementById('auto-approve-comments').checked = config.auto_approve_comments;
    },

    async loadAISettings() {
        const response = await this.fetchApi('/api/admin/config');
        if (!response || !response.ok) return;
        
        const config = await response.json();
        document.getElementById('ai-enabled').checked = config.ai_enabled;
        document.getElementById('ai-api-url').value = config.ai_api_url || '';
        document.getElementById('ai-api-key').value = config.ai_api_key || '';
        document.getElementById('ai-model').value = config.ai_model || '';
        document.getElementById('ai-system-prompt').value = config.ai_system_prompt || '';
    },

    async saveAISettings() {
        const btn = document.getElementById('save-ai-settings');
        const msg = document.getElementById('ai-settings-message');
        
        btn.disabled = true;
        
        const response = await this.fetchApi('/api/admin/config', {
            method: 'PUT',
            body: JSON.stringify({
                ai_enabled: document.getElementById('ai-enabled').checked,
                ai_api_url: document.getElementById('ai-api-url').value.trim(),
                ai_api_key: document.getElementById('ai-api-key').value.trim(),
                ai_model: document.getElementById('ai-model').value.trim(),
                ai_system_prompt: document.getElementById('ai-system-prompt').value.trim()
            })
        });
        
        btn.disabled = false;
        
        if (response && response.ok) {
            msg.textContent = 'AI 设置已保存';
            msg.className = 'text-success mt-2';
        } else {
            msg.textContent = '保存失败';
            msg.className = 'text-danger mt-2';
        }
        
        setTimeout(() => msg.textContent = '', 3000);
    },

    async saveSettings() {
        const btn = document.getElementById('save-settings');
        const msg = document.getElementById('settings-message');
        
        btn.disabled = true;
        
        const response = await this.fetchApi('/api/admin/config', {
            method: 'PUT',
            body: JSON.stringify({
                auto_approve_users: document.getElementById('auto-approve-users').checked,
                auto_approve_comments: document.getElementById('auto-approve-comments').checked
            })
        });
        
        btn.disabled = false;
        
        if (response && response.ok) {
            msg.textContent = '设置已保存';
            msg.className = 'text-success mt-2';
        } else {
            msg.textContent = '保存失败';
            msg.className = 'text-danger mt-2';
        }
        
        setTimeout(() => msg.textContent = '', 3000);
    },

    // User Actions
    async approveUser(id) {
        if (await this.fetchApi(`/api/admin/users/${id}/approve`, { method: 'POST' })) {
            this.loadUsers();
        }
    },

    async rejectUser(id) {
        if (!confirm('确定要冻结/取消批准此用户吗？')) return;
        if (await this.fetchApi(`/api/admin/users/${id}/reject`, { method: 'POST' })) {
            this.loadUsers();
        }
    },

    async toggleCommentApproval(id, current) {
        const response = await this.fetchApi(`/api/admin/users/${id}/permissions`, {
            method: 'PUT',
            body: JSON.stringify({ comment_needs_approval: !current })
        });
        
        if (response && response.ok) {
            this.loadUsers();
        } else {
            alert('操作失败');
        }
    },

    async deleteUser(id) {
        if (!confirm('确定要删除此用户吗？此操作不可恢复！')) return;
        if (await this.fetchApi(`/api/admin/users/${id}`, { method: 'DELETE' })) {
            this.loadUsers();
        }
    },

    // Comment Actions
    async approveComment(id) {
        if (await this.fetchApi(`/api/admin/comments/${id}/approve`, { method: 'POST' })) {
            this.loadPendingComments();
        }
    },

    async rejectComment(id) {
        if (await this.fetchApi(`/api/admin/comments/${id}/reject`, { method: 'POST' })) {
            this.loadPendingComments();
        }
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    AdminApp.init();
});
