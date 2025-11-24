# Alpha Docs - 快速启动指南

## 🚀 开始使用

### 1. 项目结构

你的前端已经完全重构，包含以下新文件：

```
backend/frontend/
├── css/
│   ├── main.css          # ⭐ 新：全局样式和主题变量
│   ├── components.css    # ⭐ 新：按钮、表单、卡片等组件
│   ├── animations.css    # ⭐ 新：完整的动画系统
│   └── cards.css         # ⭐ 重构：搜索卡片组件
├── main.html             # ⭐ 重构：更现代的HTML结构
├── index-map.json        # ⭐ 更新：新的资源引用
└── DESIGN_SYSTEM.md      # ⭐ 新：设计系统文档
```

### 2. 启动应用

确保你的 Flask 后端正在运行：

```powershell
cd d:\code\github\ke\web-last\backend
python app.py
```

然后在浏览器访问：
```
http://localhost:5000
```

### 3. 查看效果

#### ✨ 主要改进

**视觉设计**：
- 🌓 双主题支持（深色/浅色）
- 🎨 现代化的渐变色和毛玻璃效果
- ✨ 流畅的动画过渡
- 📱 完善的响应式设计

**交互体验**：
- 🎯 悬停提升效果
- 💫 页面切换动画
- 🌊 波纹点击反馈
- 🎪 堆叠入场动画

**性能优化**：
- ⚡ GPU 硬件加速
- 🎨 CSS 变量统一管理
- 📦 模块化的样式文件
- 🚀 尊重用户动画偏好

## 🎨 使用 Bootstrap 栅栏系统

### 基础布局

```html
<!-- 响应式三列布局 -->
<div class="container-fluid">
  <div class="row">
    <div class="col-12 col-md-6 col-lg-4">列 1</div>
    <div class="col-12 col-md-6 col-lg-4">列 2</div>
    <div class="col-12 col-md-6 col-lg-4">列 3</div>
  </div>
</div>
```

### Header 布局

```html
<div class="row align-items-center">
  <div class="col-auto">Logo</div>
  <div class="col">导航</div>
  <div class="col-auto">工具栏</div>
</div>
```

## 🎯 核心功能

### 1. 主题切换

点击右上角的主题按钮即可切换深色/浅色模式。系统会：
- 保存你的选择到 localStorage
- 应用平滑的过渡动画
- 更新所有组件的颜色

### 2. 搜索功能

搜索页面（`/docs`）现在有：
- 🔍 实时搜索过滤
- 🏷️ 标签过滤
- 📊 排序选项（时间/标题）
- ✨ 模糊搜索（可选）
- 🎨 美观的双卡片布局

### 3. 文档阅读

文档页面（`/docs/[slug]`）包含：
- 📖 Markdown/HTML 渲染
- 📑 自动生成目录
- 💬 评论系统
- 📊 访问统计
- 🔗 分享链接

## 🛠️ 自定义主题

### 修改主题色

编辑 `css/main.css` 中的 CSS 变量：

```css
:root {
  /* 修改强调色为红色 */
  --accent: #ff6b6b;
  --accent-strong: #ff4444;
  
  /* 修改背景色 */
  --bg-base: #1a1a2e;
  --bg-elevated: #16213e;
}
```

### 添加新主题

```css
[data-theme="custom"] {
  --bg-base: #your-color;
  --accent: #your-accent;
  /* ... 其他变量 */
}
```

然后在 JS 中应用：
```javascript
SPA.applyTheme('custom');
```

## 📱 响应式测试

在浏览器开发者工具中测试不同设备：

- **手机** (< 576px): 单列布局，移动优先
- **平板** (768px): 双列卡片
- **桌面** (992px+): 完整布局，侧边栏目录

## 🎨 组件示例

### 创建一个带动画的卡片

```html
<div class="card hover-lift animate-fade-in-up">
  <h3>标题</h3>
  <p>这是一个带悬停提升和淡入动画的卡片</p>
</div>
```

### 创建堆叠动画列表

```html
<div class="stagger-animation">
  <div class="doc-card">文档 1</div>
  <div class="doc-card">文档 2</div>
  <div class="doc-card">文档 3</div>
</div>
```

## ⚡ 性能提示

### 1. 动画性能

只对以下属性使用动画以获得最佳性能：
- `transform`
- `opacity`
- `filter`

避免动画：
- `width` / `height`
- `margin` / `padding`
- `top` / `left`

### 2. 使用硬件加速

```css
.gpu-accelerated {
  will-change: transform, opacity;
  transform: translateZ(0);
}
```

### 3. 尊重用户偏好

系统自动检测 `prefers-reduced-motion`，为运动敏感用户禁用动画。

## 🐛 故障排除

### 样式没有生效？

1. 清除浏览器缓存（Ctrl + Shift + R）
2. 检查 `index-map.json` 是否正确引用了新的 CSS 文件
3. 查看浏览器控制台是否有 404 错误

### 主题切换不工作？

1. 检查 localStorage 是否启用
2. 查看控制台的 JavaScript 错误
3. 确认 `theme-toggle` 按钮存在

### 动画卡顿？

1. 检查是否使用了 `transform` 而不是 `left/top`
2. 为动画元素添加 `will-change`
3. 减少同时进行的动画数量

## 📚 进一步阅读

- 📖 [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) - 完整的设计系统文档
- 🎨 [CSS 变量参考](./css/main.css) - 查看所有可用的设计变量
- 🧩 [组件库](./css/components.css) - 浏览所有组件样式
- ✨ [动画系统](./css/animations.css) - 学习所有可用的动画

## 💡 下一步

1. **自定义配色**：修改 CSS 变量打造独特风格
2. **添加新组件**：参考 `components.css` 创建新组件
3. **优化动画**：根据需求调整动画时长和缓动函数
4. **扩展功能**：基于现有架构添加新页面

## 🎉 享受新设计！

你的 Alpha Docs 现在拥有：
- ✅ 现代化的视觉设计
- ✅ 流畅的动画效果
- ✅ 完善的响应式布局
- ✅ 可扩展的组件系统
- ✅ 优秀的性能表现

---

**需要帮助？** 查看代码注释或参考 DESIGN_SYSTEM.md 文档。
