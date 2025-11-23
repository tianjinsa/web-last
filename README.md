# Python Blog System

这是一个基于 Flask 和 Bootstrap 的博客系统。

## 目录结构

- `backend/`: Python 后端代码
- `frontend/`: 前端 HTML/JS/CSS
- `articles/`: Markdown 文章
- `css/`: (旧目录，可忽略)

## 运行方法

1. 安装依赖:

    ```bash
    pip install -r backend/requirements.txt
    ```

2. 运行后端:

    ```bash
    cd backend
    python app.py
    ```

3. 访问:
    打开浏览器访问 `http://localhost:5000`

## 功能

- **首页**: 展示文章列表，支持搜索和分类筛选。
- **文章页**: 渲染 Markdown 文章，支持评论。
- **控制台**: 访问 `/dash` 查看访问统计。
- **CDN**: 设置环境变量 `CDN_URL` (例如 `export CDN_URL=https://mycdn.com`)，静态资源将自动重定向。

## 添加文章

1. 在 `articles/` 目录下创建 `.md` 文件。
2. 在 `frontend/md-map.json` 中添加文章元数据。
