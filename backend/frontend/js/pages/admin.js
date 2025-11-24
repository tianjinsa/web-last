/**
 * 管理员后台页面
 */

window.AdminPage = {
    async render({ root }) {
        // 检查是否为管理员
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user.is_admin) {
            root.innerHTML = `
                <div class="page-section">
                    <h2>无权访问</h2>
                    <p>您没有权限访问此页面。</p>
                </div>
            `;
            return;
        }

        root.innerHTML = `
            <div class="admin-container">
                <h1 class="admin-title">管理员后台</h1>
                
                <div class="admin-tabs">
                    <button class="admin-tab active" data-tab="users">用户管理</button>
                    <button class="admin-tab" data-tab="comments">评论审核</button>
                    <button class="admin-tab" data-tab="settings">系统设置</button>
                </div>
                
                <!-- 用户管理 -->
                <div class="admin-section" id="admin-users">
                    <h2>用户管理</h2>
                    <div id="users-list" class="table-container">
                        <p>加载中...</p>
                    </div>
                </div>
                
                <!-- 评论审核 -->
                <div class="admin-section hidden" id="admin-comments">
                    <h2>待审核评论</h2>
                    <div id="comments-list" class="table-container">
                        <p>加载中...</p>
                    </div>
                </div>
                
                <!-- 系统设置 -->
                <div class="admin-section hidden" id="admin-settings">
                    <h2>系统设置</h2>
                    <div class="settings-form">
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="auto-approve-users">
                                自动批准新用户注册
                            </label>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="auto-approve-comments">
                                自动批准所有评论（无需审核）
                            </label>
                        </div>
                        <button id="save-settings" class="btn btn-primary">保存设置</button>
                        <div id="settings-message" class="message"></div>
                    </div>
                </div>
            </div>
        `;
    },

    async afterRender() {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            window.location.hash = '/auth';
            return;
        }

        // Tab 切换
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetTab = e.target.dataset.tab;
                
                document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                
                document.querySelectorAll('.admin-section').forEach(s => s.classList.add('hidden'));
                document.getElementById(`admin-${targetTab}`).classList.remove('hidden');
                
                // 加载对应数据
                if (targetTab === 'users') {
                    this.loadUsers();
                } else if (targetTab === 'comments') {
                    this.loadPendingComments();
                } else if (targetTab === 'settings') {
                    this.loadSettings();
                }
            });
        });

        // 初始加载用户列表
        await this.loadUsers();
    },

    async loadUsers() {
        const token = localStorage.getItem('auth_token');
        const container = document.getElementById('users-list');
        
        try {
            const response = await fetch('/api/admin/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.status === 401 || response.status === 422) {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user');
                window.location.hash = '/auth';
                return;
            }
            
            if (!response.ok) {
                container.innerHTML = '<p class="error">加载失败</p>';
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
                            <tr data-user-id="${u.id}">
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
                                    ${!u.is_approved ? `
                                        <button class="btn btn-sm btn-success" onclick="AdminPage.approveUser(${u.id})">批准</button>
                                    ` : !u.is_admin ? `
                                        <button class="btn btn-sm btn-warning" onclick="AdminPage.rejectUser(${u.id})">取消批准</button>
                                    ` : ''}
                                    ${!u.is_admin ? `
                                        <button class="btn btn-sm btn-secondary" onclick="AdminPage.toggleCommentApproval(${u.id}, ${!u.comment_needs_approval})">
                                            ${u.comment_needs_approval ? '取消审核' : '需要审核'}
                                        </button>
                                        <button class="btn btn-sm btn-danger" onclick="AdminPage.deleteUser(${u.id})">删除</button>
                                    ` : ''}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } catch (error) {
            console.error('Load users error:', error);
            container.innerHTML = '<p class="error">网络错误</p>';
        }
    },

    async loadPendingComments() {
        const token = localStorage.getItem('auth_token');
        const container = document.getElementById('comments-list');
        
        try {
            const response = await fetch('/api/admin/comments/pending', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.status === 401 || response.status === 422) {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user');
                window.location.hash = '/auth';
                return;
            }
            
            if (!response.ok) {
                container.innerHTML = '<p class="error">加载失败</p>';
                return;
            }
            
            const comments = await response.json();
            
            if (comments.length === 0) {
                container.innerHTML = '<p>暂无待审核评论</p>';
                return;
            }
            
            container.innerHTML = comments.map(c => `
                <div class="comment-review-card" data-comment-id="${c.id}">
                    <div class="comment-meta">
                        <strong>${c.author}</strong> 评论于 
                        <span>${new Date(c.timestamp).toLocaleString()}</span>
                    </div>
                    <div class="comment-content">${c.content}</div>
                    <div class="comment-path">文章: ${c.article_path}</div>
                    <div class="comment-actions">
                        <button class="btn btn-sm btn-success" onclick="AdminPage.approveComment(${c.id})">批准</button>
                        <button class="btn btn-sm btn-danger" onclick="AdminPage.rejectComment(${c.id})">拒绝</button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Load comments error:', error);
            container.innerHTML = '<p class="error">网络错误</p>';
        }
    },

    async loadSettings() {
        const token = localStorage.getItem('auth_token');
        
        try {
            const response = await fetch('/api/admin/config', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.status === 401 || response.status === 422) {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user');
                window.location.hash = '/auth';
                return;
            }
            
            if (!response.ok) return;
            
            const config = await response.json();
            
            document.getElementById('auto-approve-users').checked = config.auto_approve_users;
            document.getElementById('auto-approve-comments').checked = config.auto_approve_comments;
            
            // 保存设置
            document.getElementById('save-settings').onclick = async () => {
                const messageEl = document.getElementById('settings-message');
                
                try {
                    const saveResponse = await fetch('/api/admin/config', {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            auto_approve_users: document.getElementById('auto-approve-users').checked,
                            auto_approve_comments: document.getElementById('auto-approve-comments').checked
                        })
                    });
                    
                    if (saveResponse.ok) {
                        messageEl.textContent = '设置已保存';
                        messageEl.className = 'message success';
                    } else {
                        messageEl.textContent = '保存失败';
                        messageEl.className = 'message error';
                    }
                } catch (error) {
                    messageEl.textContent = '网络错误';
                    messageEl.className = 'message error';
                }
                
                setTimeout(() => {
                    messageEl.textContent = '';
                }, 3000);
            };
        } catch (error) {
            console.error('Load settings error:', error);
        }
    },

    async approveUser(userId) {
        const token = localStorage.getItem('auth_token');
        
        try {
            const response = await fetch(`/api/admin/users/${userId}/approve`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                alert('用户已批准');
                this.loadUsers();
            } else {
                alert('操作失败');
            }
        } catch (error) {
            alert('网络错误');
        }
    },

    async rejectUser(userId) {
        if (!confirm('确定要取消批准此用户吗？')) return;
        
        const token = localStorage.getItem('auth_token');
        
        try {
            const response = await fetch(`/api/admin/users/${userId}/reject`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                alert('已取消批准');
                this.loadUsers();
            } else {
                alert('操作失败');
            }
        } catch (error) {
            alert('网络错误');
        }
    },

    async toggleCommentApproval(userId, needsApproval) {
        const token = localStorage.getItem('auth_token');
        
        try {
            const response = await fetch(`/api/admin/users/${userId}/permissions`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ comment_needs_approval: needsApproval })
            });
            
            if (response.ok) {
                alert('权限已更新');
                this.loadUsers();
            } else {
                alert('操作失败');
            }
        } catch (error) {
            alert('网络错误');
        }
    },

    async deleteUser(userId) {
        if (!confirm('确定要删除此用户吗？此操作不可恢复！')) return;
        
        const token = localStorage.getItem('auth_token');
        
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                alert('用户已删除');
                this.loadUsers();
            } else {
                alert('操作失败');
            }
        } catch (error) {
            alert('网络错误');
        }
    },

    async approveComment(commentId) {
        const token = localStorage.getItem('auth_token');
        
        try {
            const response = await fetch(`/api/admin/comments/${commentId}/approve`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                alert('评论已批准');
                this.loadPendingComments();
            } else {
                alert('操作失败');
            }
        } catch (error) {
            alert('网络错误');
        }
    },

    async rejectComment(commentId) {
        const token = localStorage.getItem('auth_token');
        
        try {
            const response = await fetch(`/api/admin/comments/${commentId}/reject`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                alert('评论已拒绝');
                this.loadPendingComments();
            } else {
                alert('操作失败');
            }
        } catch (error) {
            alert('网络错误');
        }
    }
};

// 注册管理后台页面路由
(function registerAdminPage() {
    const register = () => {
        if (!window.SPA || typeof window.SPA.registerPage !== 'function') {
            return setTimeout(register, 20);
        }

        window.SPA.registerPage({
            path: '/admin',
            navId: 'admin',
            render: window.AdminPage.render,
            afterRender: window.AdminPage.afterRender.bind(window.AdminPage),
            pageTitle: '管理后台 - Alpha Docs'
        });
    };
    register();
})();
