# 用户认证和评论管理系统使用指南

## 概述

已为您的网站添加了完整的用户账号系统和评论管理功能。主要特性包括：

1. **用户注册/登录** - JWT 认证
2. **评论权限控制** - 需要登录才能评论
3. **评论审核机制** - 可配置自动批准或人工审核
4. **管理员后台** - 用户管理和评论审核
5. **权限分级** - 管理员可设置每个用户的发言权限

## 首次使用步骤

### 1. 安装依赖

```bash
cd backend
pip install flask-jwt-extended
```

或者：

```bash
pip install -r requirements.txt
```

### 2. 启动服务器

```bash
python backend/app.py
```

服务器将在 `http://localhost:5000` 启动。

### 3. 创建管理员账号

**重要**：第一个注册的用户将自动成为管理员！

1. 访问 `http://localhost:5000/#/auth`
2. 点击"注册"标签
3. 填写：
   - 用户名（必填）
   - 邮箱（可选）
   - 密码（至少 6 位）
4. 提交注册

第一个用户将：
- 自动获得管理员权限
- 自动批准通过
- 评论无需审核

### 4. 访问管理后台

1. 登录后，导航栏会显示"管理后台"链接
2. 点击进入 `/admin` 页面
3. 可以管理：
   - **用户管理**：批准/拒绝新用户，设置权限，删除用户
   - **评论审核**：批准/拒绝待审核评论
   - **系统设置**：配置自动批准选项

## 主要功能说明

### 用户注册流程

1. 用户填写注册信息
2. 系统检查用户名/邮箱是否重复
3. 根据系统配置：
   - **自动批准开启**：立即可以登录和评论
   - **自动批准关闭**：需要等待管理员批准

### 评论发布流程

1. 用户必须先登录
2. 在文档页面填写评论内容
3. 根据用户权限：
   - **无需审核**：评论立即显示
   - **需要审核**：提交后等待管理员批准

### 管理员功能

#### 用户管理
- **批准用户**：允许用户登录和评论
- **拒绝/取消批准**：禁止用户登录
- **设置评论审核**：决定该用户的评论是否需要人工审核
- **删除用户**：永久删除用户及其所有评论

#### 评论审核
- 查看所有待审核评论
- 批准评论（显示给所有人）
- 拒绝评论（不显示）

#### 系统设置
- **自动批准新用户**：新注册用户无需人工审核
- **自动批准所有评论**：所有评论无需审核（覆盖用户级设置）

## API 端点文档

### 认证相关

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息（需要 JWT）

### 评论相关

- `GET /api/comments?article_path=xxx` - 获取文章评论（仅已批准）
- `POST /api/comments` - 发表评论（需要 JWT）

### 管理员后台（需要管理员权限）

#### 用户管理
- `GET /api/admin/users` - 获取所有用户
- `POST /api/admin/users/{id}/approve` - 批准用户
- `POST /api/admin/users/{id}/reject` - 拒绝用户
- `PUT /api/admin/users/{id}/permissions` - 更新用户权限
- `DELETE /api/admin/users/{id}` - 删除用户

#### 评论管理
- `GET /api/admin/comments/pending` - 获取待审核评论
- `POST /api/admin/comments/{id}/approve` - 批准评论
- `POST /api/admin/comments/{id}/reject` - 拒绝评论
- `DELETE /api/admin/comments/{id}` - 删除评论

#### 系统配置
- `GET /api/admin/config` - 获取系统配置
- `PUT /api/admin/config` - 更新系统配置

## 安全注意事项

### JWT 密钥配置

**重要**：请在生产环境中设置自定义的 JWT 密钥！

```bash
# Linux/Mac
export JWT_SECRET_KEY="your-very-secret-random-string"

# Windows
set JWT_SECRET_KEY=your-very-secret-random-string
```

或在 `app.py` 中修改：
```python
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
```

### 密码安全

- 密码使用 `werkzeug.security` 进行哈希存储
- 最小长度：6 位（可在前端 `auth.js` 中调整）

### 频率限制

- 每个用户每天最多发表 10 条评论（可在 `app.py` 中调整）

## 数据库结构

系统会自动创建以下数据表：

1. **User** - 用户信息
   - `username`, `email`, `password_hash`
   - `is_admin` - 是否为管理员
   - `is_approved` - 是否已批准
   - `comment_needs_approval` - 评论是否需要审核

2. **Comment** - 评论信息
   - `article_path`, `content`, `user_id`
   - `status` - pending/approved/rejected
   - `reviewed_by`, `reviewed_at`

3. **SystemConfig** - 系统配置
   - `auto_approve_users`
   - `auto_approve_comments`

## 前端路由

新增路由：
- `/auth` - 登录/注册页面
- `/admin` - 管理员后台（需要管理员权限）

## 常见问题

### Q: 如何重置管理员密码？
A: 需要直接操作数据库。使用 SQLite 工具打开 `backend/data/blog.db`，然后删除管理员用户，重新注册第一个用户。

### Q: 评论显示"待审核"怎么办？
A: 管理员登录后台，在"评论审核"标签中批准评论。

### Q: 如何允许所有用户自动评论？
A: 进入管理后台 -> 系统设置 -> 勾选"自动批准所有评论"。

### Q: 如何关闭用户注册？
A: 目前系统不支持关闭注册，但可以设置"自动批准新用户"为关闭，所有新用户需要管理员批准。

## 技术栈

- **后端**：Flask + SQLAlchemy + Flask-JWT-Extended
- **前端**：Vanilla JavaScript (SPA)
- **数据库**：SQLite
- **认证**：JWT (JSON Web Tokens)
- **密码加密**：Werkzeug Security

## 下一步建议

1. 设置生产环境的 JWT 密钥
2. 配置 HTTPS（JWT 应该通过加密连接传输）
3. 考虑添加邮箱验证功能
4. 实现找回密码功能
5. 添加用户头像支持
6. 实现评论点赞/回复功能
