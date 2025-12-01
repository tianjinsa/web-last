/**
 * 认证页面逻辑（登录/注册）
 */

window.AuthPage = {
    async render({ root }) {
        root.innerHTML = `
            <div class="page-section auth-container">
                <div class="auth-tabs">
                    <button class="auth-tab active" data-tab="login">登录</button>
                    <button class="auth-tab" data-tab="register">注册</button>
                </div>
                
                <!-- 登录表单 -->
                <div class="auth-form" id="login-form">
                    <h2>用户登录</h2>
                    <div class="form-group">
                        <label for="login-username">用户名</label>
                        <input type="text" id="login-username" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="login-password">密码</label>
                        <input type="password" id="login-password" class="form-control" required>
                    </div>
                    <div id="login-error" class="error-message"></div>
                    <button id="login-btn" class="btn btn-primary">登录</button>
                </div>
                
                <!-- 注册表单 -->
                <div class="auth-form hidden" id="register-form">
                    <h2>用户注册</h2>
                    <div class="form-group">
                        <label for="register-username">用户名</label>
                        <input type="text" id="register-username" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="register-email">邮箱（可选）</label>
                        <input type="email" id="register-email" class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="register-password">密码</label>
                        <input type="password" id="register-password" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="register-password-confirm">确认密码</label>
                        <input type="password" id="register-password-confirm" class="form-control" required>
                    </div>
                    <div id="register-error" class="error-message"></div>
                    <button id="register-btn" class="btn btn-primary">注册</button>
                </div>
            </div>
        `;
    },

    async afterRender() {
        // Tab 切换
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetTab = e.target.dataset.tab;
                
                // 更新 tab 激活状态
                document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                
                // 切换表单
                document.getElementById('login-form').classList.toggle('hidden', targetTab !== 'login');
                document.getElementById('register-form').classList.toggle('hidden', targetTab !== 'register');
            });
        });

        // 登录
        document.getElementById('login-btn').addEventListener('click', async () => {
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value;
            const errorEl = document.getElementById('login-error');
            
            errorEl.textContent = '';
            
            if (!username || !password) {
                errorEl.textContent = '请填写用户名和密码';
                return;
            }
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    errorEl.textContent = data.error || '登录失败';
                    return;
                }
                
                if (!data.access_token) {
                    errorEl.textContent = '登录失败：未收到令牌';
                    return;
                }

                // 存储 token 和用户信息
                localStorage.setItem('auth_token', data.access_token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // 更新导航栏
                if (window.SPA && typeof window.SPA.updateNavBar === 'function') {
                    window.SPA.updateNavBar();
                }

                // 跳转回首页或之前的页面
                alert('登录成功！');
                if (window.SPA && typeof window.SPA.navigate === 'function') {
                    window.SPA.navigate('/about');
                } else {
                    window.location.href = '/';
                }
            } catch (error) {
                errorEl.textContent = '网络错误，请重试';
                console.error('Login error:', error);
            }
        });

        // 注册
        document.getElementById('register-btn').addEventListener('click', async () => {
            const username = document.getElementById('register-username').value.trim();
            const email = document.getElementById('register-email').value.trim();
            const password = document.getElementById('register-password').value;
            const passwordConfirm = document.getElementById('register-password-confirm').value;
            const errorEl = document.getElementById('register-error');
            
            errorEl.textContent = '';
            
            if (!username || !password) {
                errorEl.textContent = '请填写用户名和密码';
                return;
            }
            
            if (password !== passwordConfirm) {
                errorEl.textContent = '两次输入的密码不一致';
                return;
            }
            
            if (password.length < 6) {
                errorEl.textContent = '密码长度至少为 6 位';
                return;
            }
            
            try {
                const body = { username, password };
                if (email) body.email = email;
                
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    errorEl.textContent = data.error || '注册失败';
                    return;
                }
                
                alert(data.message);
                
                // 如果自动批准，自动登录
                if (data.user.is_approved) {
                    // 切换到登录页面
                    document.querySelector('[data-tab="login"]').click();
                    document.getElementById('login-username').value = username;
                } else {
                    window.location.hash = '/about';
                }
            } catch (error) {
                errorEl.textContent = '网络错误，请重试';
                console.error('Register error:', error);
            }
        });
    }
};

// 注册页面路由
(function registerAuthPage() {
    const register = () => {
        if (!window.SPA || typeof window.SPA.registerPage !== 'function') {
            return setTimeout(register, 20);
        }

        window.SPA.registerPage({
            path: '/auth',
            navId: 'auth',
            render: window.AuthPage.render,
            afterRender: window.AuthPage.afterRender,
            pageTitle: '用户认证 - Alpha Docs'
        });
    };
    register();
})();
