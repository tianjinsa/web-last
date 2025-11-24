# Alpha Docs - 前端设计系统文档

## 📋 概述

这是 Alpha Docs 的全新前端设计系统，采用现代化的视觉设计和流畅的动画效果，同时只使用 Bootstrap 的栅栏系统进行布局。

## 🎨 设计特点

### 1. **双主题支持**
- 深色主题（默认）
- 浅色主题
- 平滑的主题切换动画
- 自动跟随系统主题偏好

### 2. **CSS 架构**

```
css/
├── main.css          # 全局样式、变量、基础布局
├── components.css    # 组件样式（按钮、表单、卡片等）
├── animations.css    # 动画系统
└── cards.css         # 搜索卡片组件
```

### 3. **设计系统变量**

#### 颜色系统
- `--bg-base`: 页面基础背景
- `--bg-elevated`: 抬升层背景
- `--bg-panel`: 面板/卡片背景
- `--text-primary`: 主要文本
- `--text-secondary`: 次要文本
- `--text-muted`: 弱化文本
- `--accent`: 强调色（紫色）
- `--accent-strong`: 强强调色（青色）

#### 间距系统
- `--spacing-xs`: 0.25rem
- `--spacing-sm`: 0.5rem
- `--spacing-md`: 1rem
- `--spacing-lg`: 1.5rem
- `--spacing-xl`: 2rem

#### 圆角系统
- `--radius-sm`: 6px
- `--radius-md`: 10px
- `--radius-lg`: 16px
- `--radius-xl`: 24px
- `--radius-full`: 9999px

#### 过渡动画
- `--transition-fast`: 150ms
- `--transition-base`: 250ms
- `--transition-slow`: 350ms
- `--transition-bounce`: 500ms 弹跳效果

## 🧩 组件库

### 按钮组件

```html
<!-- 主要按钮 -->
<button class="primary-btn">提交</button>

<!-- 幽灵按钮 -->
<button class="ghost-btn">取消</button>

<!-- 图标按钮 -->
<button class="icon-btn">⚙️</button>
```

### 表单组件

```html
<!-- 文本输入 -->
<input type="text" placeholder="请输入...">

<!-- 搜索框（带图标） -->
<input type="search" placeholder="搜索...">

<!-- 下拉选择 -->
<select>
  <option>选项1</option>
  <option>选项2</option>
</select>

<!-- 文本域 -->
<textarea placeholder="写下您的想法..."></textarea>
```

### 卡片组件

```html
<!-- 基础卡片 -->
<div class="card">
  <div class="card-header">
    <h3 class="card-title">标题</h3>
  </div>
  <div class="card-body">
    <p>内容...</p>
  </div>
  <div class="card-footer">
    <span>元信息</span>
  </div>
</div>

<!-- 文档卡片 -->
<article class="doc-card">
  <h3>文档标题</h3>
  <p>文档描述...</p>
  <div class="doc-meta">
    <span>🗂 分类</span>
    <span>🕒 日期</span>
    <span>🏷 标签</span>
  </div>
</article>
```

### 标签组件

```html
<div class="tag-group">
  <button class="tag-chip is-active">全部</button>
  <button class="tag-chip">Python</button>
  <button class="tag-chip">前端</button>
</div>
```

### 模态框

```html
<div class="modal-overlay">
  <div class="modal-content">
    <div class="modal-header">
      <h3>标题</h3>
      <button class="close-modal">×</button>
    </div>
    <div class="modal-body">
      <!-- 内容 -->
    </div>
  </div>
</div>
```

## ✨ 动画系统

### 页面过渡动画

页面切换时自动应用：
- `fadeIn`: 淡入
- `fadeOut`: 淡出
- `fadeInUp`: 从下向上淡入
- `slideInLeft`: 从左滑入
- `slideInRight`: 从右滑入

### 工具类动画

```html
<!-- 淡入效果 -->
<div class="animate-fade-in">...</div>

<!-- 从下向上淡入 -->
<div class="animate-fade-in-up">...</div>

<!-- 脉冲动画 -->
<div class="animate-pulse">...</div>

<!-- 旋转动画 -->
<div class="animate-rotate">...</div>

<!-- 浮动动画 -->
<div class="animate-float">...</div>

<!-- 延迟执行 -->
<div class="animate-fade-in delay-200">...</div>
```

### 交互动画

```html
<!-- 悬停提升 -->
<div class="hover-lift">...</div>

<!-- 悬停发光 -->
<div class="hover-glow">...</div>

<!-- 悬停缩放 -->
<div class="hover-scale">...</div>

<!-- 点击波纹 -->
<button class="ripple-effect">...</button>
```

### 堆叠动画

```html
<!-- 子元素依次出现 -->
<div class="stagger-animation">
  <div>项目 1</div>
  <div>项目 2</div>
  <div>项目 3</div>
</div>
```

## 🎯 布局系统

### Bootstrap 栅栏使用

```html
<!-- 基础布局 -->
<div class="container-fluid">
  <div class="row">
    <div class="col-12 col-md-6 col-lg-4">
      <!-- 内容 -->
    </div>
  </div>
</div>

<!-- 响应式对齐 -->
<div class="row align-items-center">
  <div class="col-auto">左侧固定</div>
  <div class="col">中间自适应</div>
  <div class="col-auto">右侧固定</div>
</div>
```

### 工具类

```html
<!-- Flex 布局 -->
<div class="u-flex u-items-center u-justify-between u-gap-2">
  ...
</div>

<!-- 文本颜色 -->
<p class="text-primary">主要文本</p>
<p class="text-secondary">次要文本</p>
<p class="text-muted">弱化文本</p>
<p class="text-accent">强调文本</p>
```

## 📱 响应式设计

### 断点

- **手机**: < 576px
- **平板**: 576px - 768px
- **桌面**: 768px - 992px
- **大屏**: > 992px

### 响应式组件

- **导航栏**: 大屏横向，小屏折叠
- **卡片组**: 大屏双列，小屏单列
- **目录**: 大屏侧边栏，小屏浮动弹窗
- **工具栏**: 大屏横向，小屏纵向

## 🎨 主题切换

### 自动切换

系统会自动检测用户的系统主题偏好，并应用相应的主题。

### 手动切换

用户可以通过右上角的主题切换按钮手动切换主题，选择会保存到 localStorage。

### 自定义主题

修改 CSS 变量即可自定义主题：

```css
[data-theme="custom"] {
  --accent: #ff6b6b;
  --accent-strong: #4ecdc4;
  /* 其他变量... */
}
```

## 🚀 性能优化

### CSS 优化
- 使用 CSS 变量减少重复代码
- GPU 硬件加速动画
- 尊重用户的动画偏好设置
- 延迟加载非关键 CSS

### 动画优化
- 使用 `transform` 和 `opacity` 实现动画
- 避免触发布局重排
- 合理使用 `will-change`
- 支持 `prefers-reduced-motion`

## 📦 文件结构

```
backend/frontend/
├── index.html              # 启动页面
├── main.html               # 应用外壳
├── index-map.json          # 资源清单
├── css/
│   ├── main.css           # 全局样式
│   ├── components.css     # 组件样式
│   ├── animations.css     # 动画系统
│   ├── cards.css          # 卡片组件
│   └── bootstrap.min.css  # Bootstrap（仅栅栏）
└── js/
    ├── load.js            # 资源加载器
    ├── app.js             # 核心应用
    └── pages/
        ├── about.js       # 关于页面
        ├── search.js      # 搜索页面
        └── document.js    # 文档页面
```

## 🎓 最佳实践

### 1. 使用语义化 HTML
```html
<!-- 好 ✅ -->
<article class="doc-card">
  <h3>标题</h3>
  <p>描述</p>
</article>

<!-- 不好 ❌ -->
<div class="doc-card">
  <div class="title">标题</div>
  <div class="desc">描述</div>
</div>
```

### 2. 合理使用 CSS 变量
```css
/* 好 ✅ */
.custom-button {
  background: var(--accent);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
}

/* 不好 ❌ */
.custom-button {
  background: #7b6cff;
  padding: 16px;
  border-radius: 10px;
}
```

### 3. 组件化思维
- 每个组件独立可复用
- 样式不依赖外部上下文
- 使用 BEM 或语义化命名

### 4. 性能优先
- 避免不必要的重绘
- 使用 CSS 代替 JS 实现动画
- 合理使用动画延迟

## 🔧 调试技巧

### 主题调试
```javascript
// 在控制台切换主题
document.documentElement.setAttribute('data-theme', 'light');
document.documentElement.setAttribute('data-theme', 'dark');
```

### 动画调试
```css
/* 临时禁用所有动画 */
* {
  animation: none !important;
  transition: none !important;
}
```

### 变量查看
```javascript
// 查看当前 CSS 变量值
getComputedStyle(document.documentElement).getPropertyValue('--accent');
```

## 📝 更新日志

### v2.0.0 (当前版本)
- ✨ 全新的设计系统
- 🎨 双主题支持
- ✨ 丰富的动画效果
- 📱 完善的响应式设计
- 🧩 模块化的组件库
- ⚡ 性能优化

---

**构建者**: Alpha Docs Team  
**更新时间**: 2025年11月24日  
**许可证**: MIT
