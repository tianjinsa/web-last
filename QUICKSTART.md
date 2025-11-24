# 快速启动指南

## 安装依赖

```bash
# 激活虚拟环境（如果有）
# Windows:
.venv\Scripts\Activate.ps1

# 安装新依赖
pip install flask-jwt-extended
```

## 启动服务器

```bash
python backend/app.py
```

## 首次使用

1. 访问 http://localhost:5000
2. 点击导航栏的"登录/注册"
3. 注册第一个用户（将自动成为管理员）
4. 登录后，导航栏会显示"管理后台"链接

## 重要提示

- **JWT 密钥**：生产环境请设置环境变量 `JWT_SECRET_KEY`
- **第一个用户**：自动获得管理员权限
- **评论功能**：现在需要登录才能评论
- **管理后台**：`/admin` 路由（仅管理员可访问）

详细文档请查看 `USER_AUTH_GUIDE.md`
