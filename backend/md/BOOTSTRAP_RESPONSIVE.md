# 使用 Bootstrap 类实现响应式设计 - 完整实现

## ✅ 已完成的响应式转换

### 移除的 @media 查询
- ✅ **main.css**: 移除了针对 768px 断点的所有媒体查询（标题大小、页面间距、页脚布局、导航布局）
- ✅ **components.css**: 移除了针对 992px 和 576px 的所有媒体查询（文档布局、工具栏、模态框）
- ✅ **cards.css**: 已在之前移除了所有媒体查询（卡片布局、间距）

### 已应用 Bootstrap 类的组件

#### 1. 导航栏 (Header Navigation)
**文件**: `main.html`
```html
<nav class="site-nav d-flex flex-column flex-md-row">
    <div class="nav-pill d-none d-md-block"></div>
```
- **移动端** (< 768px): 垂直堆叠 (`flex-column`)
- **桌面端** (≥ 768px): 水平排列 (`flex-md-row`)
- **导航滑块**: 仅桌面显示 (`d-none d-md-block`)

#### 2. 页脚 (Footer)
**文件**: `main.html`
```html
<div class="footer-base d-flex flex-column flex-md-row justify-content-md-between 
     align-items-center align-items-md-start text-center text-md-start gap-3">
```
- **移动端**: 垂直排列, 居中对齐, 文本居中
- **桌面端**: 水平排列, 两端对齐, 左对齐

#### 3. 文档工具栏 (Document Toolbar)
**文件**: `js/pages/document.js`
```html
<div class="doc-toolbar d-flex flex-column flex-sm-row gap-2">
    <button class="w-100 w-sm-auto">返回搜索</button>
    <button class="w-100 w-sm-auto">复制链接</button>
```
- **移动端** (< 576px): 按钮垂直堆叠, 100% 宽度
- **平板及以上** (≥ 576px): 按钮水平排列, 自动宽度

#### 4. 文档布局 (Document Layout)
**文件**: `js/pages/document.js`
```html
<div class="doc-layout d-flex flex-column flex-lg-row gap-4">
    <aside class="doc-toc-container d-none d-lg-block">...</aside>
    <button class="toc-toggle-btn d-flex d-lg-none">目录</button>
```
- **移动端** (< 992px): 单列布局, 目录隐藏, 显示切换按钮
- **桌面端** (≥ 992px): 侧边栏+内容布局, 目录固定显示, 隐藏切换按钮

#### 5. 搜索选项 (Search Options)
**文件**: `js/pages/search.js`
```html
<div class="search-options d-flex flex-column flex-md-row">
    <select class="flex-fill">...</select>
    <button class="w-100 w-md-auto">搜索</button>
```
- **移动端**: 垂直堆叠, 按钮全宽
- **桌面端**: 水平排列, 下拉框填充, 按钮自动宽度

---

## 📱 响应式策略

Alpha Docs 现在使用 Bootstrap 的工具类来实现响应式设计，而不是自定义媒体查询。

## 🎯 Bootstrap 断点

```
xs: < 576px   (手机)
sm: ≥ 576px   (大手机)
md: ≥ 768px   (平板)
lg: ≥ 992px   (桌面)
xl: ≥ 1200px  (大屏)
xxl: ≥ 1400px (超大屏)
```

## 🔧 常用响应式类

### 1. Flexbox 方向

```html
<!-- 小屏纵向，大屏横向 -->
<div class="d-flex flex-column flex-md-row">
  ...
</div>

<!-- 小屏横向，大屏纵向 -->
<div class="d-flex flex-row flex-md-column">
  ...
</div>
```

### 2. 宽度控制

```html
<!-- 小屏 100% 宽度，中等屏自适应 -->
<div class="w-100 w-md-auto">
  ...
</div>

<!-- 小屏 50% 宽度，大屏 25% 宽度 -->
<div class="w-50 w-lg-25">
  ...
</div>
```

### 3. 显示/隐藏

```html
<!-- 小屏隐藏，中等屏显示 -->
<div class="d-none d-md-block">
  ...
</div>

<!-- 小屏显示，中等屏隐藏 -->
<div class="d-block d-md-none">
  ...
</div>
```

### 4. 间距控制

```html
<!-- 小屏 padding-2，大屏 padding-4 -->
<div class="p-2 p-lg-4">
  ...
</div>

<!-- 小屏 margin-3，大屏 margin-5 -->
<div class="m-3 m-lg-5">
  ...
</div>
```

### 5. 文本对齐

```html
<!-- 小屏居中，大屏左对齐 -->
<div class="text-center text-lg-start">
  ...
</div>
```

## 📝 项目中的实际应用

### 搜索选项区

```html
<!-- 小屏纵向堆叠，中等屏横向排列 -->
<div class="search-options d-flex flex-column flex-md-row">
  <select class="search-select flex-fill">...</select>
  <button class="search-select w-100 w-md-auto">...</button>
</div>
```

**效果：**
- **< 768px**: 按钮纵向堆叠，每个按钮占满宽度
- **≥ 768px**: 按钮横向排列，选择框自动填充，按钮自适应宽度

### 卡片组容器

```html
<!-- 根据需要可以添加响应式类 -->
<div class="cardgroup">
  <!-- 如果需要小屏单列，大屏双列: -->
  <!-- <div class="cardgroup flex-column flex-lg-row"> -->
  ...
</div>
```

### 导航栏（示例）

```html
<!-- 小屏折叠，大屏展开 -->
<nav class="d-flex flex-column flex-lg-row">
  <a class="nav-link">链接1</a>
  <a class="nav-link">链接2</a>
</nav>
```

## 🎨 组合使用

### 响应式卡片

```html
<div class="card p-2 p-md-3 p-lg-4 mb-2 mb-md-3">
  <h3 class="text-center text-md-start">标题</h3>
  <div class="d-flex flex-column flex-md-row gap-2 gap-md-3">
    <div class="flex-fill">内容1</div>
    <div class="flex-fill">内容2</div>
  </div>
</div>
```

**说明：**
- `p-2 p-md-3 p-lg-4`: 不同屏幕不同内边距
- `mb-2 mb-md-3`: 不同屏幕不同下边距
- `text-center text-md-start`: 小屏居中，中屏左对齐
- `flex-column flex-md-row`: 小屏纵向，中屏横向
- `gap-2 gap-md-3`: 不同屏幕不同间距

### 响应式表单

```html
<form>
  <div class="row g-2 g-md-3">
    <div class="col-12 col-md-6">
      <input class="w-100" placeholder="姓名">
    </div>
    <div class="col-12 col-md-6">
      <input class="w-100" placeholder="邮箱">
    </div>
  </div>
</form>
```

**说明：**
- `col-12 col-md-6`: 小屏占满行，中屏占一半
- `g-2 g-md-3`: 响应式间距

## 💡 最佳实践

### 1. 移动优先

始终从最小屏幕开始设计，然后向上扩展：

```html
<!-- ✅ 好 -->
<div class="w-100 w-md-50 w-lg-25">

<!-- ❌ 不好 -->
<div class="w-lg-25 w-md-50 w-100">
```

### 2. 减少断点

只在需要的地方使用断点，避免过度复杂：

```html
<!-- ✅ 好 - 只有一个断点 -->
<div class="flex-column flex-md-row">

<!-- ❌ 过度 - 太多断点 -->
<div class="flex-column flex-sm-row flex-md-column flex-lg-row">
```

### 3. 保持一致性

在整个项目中使用相同的断点：

```html
<!-- ✅ 统一使用 md 作为主要断点 -->
<div class="flex-column flex-md-row">
  <div class="w-100 w-md-auto">...</div>
</div>
```

### 4. 组合工具类

利用 Bootstrap 的工具类组合实现复杂布局：

```html
<div class="d-flex flex-column flex-md-row align-items-center justify-content-between p-3 p-lg-4 mb-2 mb-md-3">
  ...
</div>
```

## 🔍 调试技巧

### 1. 浏览器开发者工具

使用响应式设计模式（F12 → 设备工具栏）测试不同屏幕尺寸。

### 2. Bootstrap 类检查

检查元素查看应用了哪些 Bootstrap 类：

```javascript
// 控制台运行
const el = document.querySelector('.search-options');
console.log(el.className);
```

### 3. 临时禁用

临时移除类来测试效果：

```javascript
// 控制台运行
const el = document.querySelector('.search-options');
el.classList.remove('flex-md-row');
el.classList.add('flex-column');
```

## 📚 参考资源

- [Bootstrap Flex 文档](https://getbootstrap.com/docs/5.3/utilities/flex/)
- [Bootstrap 间距文档](https://getbootstrap.com/docs/5.3/utilities/spacing/)
- [Bootstrap 显示文档](https://getbootstrap.com/docs/5.3/utilities/display/)
- [Bootstrap 尺寸文档](https://getbootstrap.com/docs/5.3/utilities/sizing/)

## 🎯 快速速查表

| 需求 | Bootstrap 类 |
|------|--------------|
| 小屏纵向，大屏横向 | `flex-column flex-lg-row` |
| 小屏横向，大屏纵向 | `flex-row flex-lg-column` |
| 小屏隐藏，大屏显示 | `d-none d-lg-block` |
| 小屏显示，大屏隐藏 | `d-block d-lg-none` |
| 小屏 100%，大屏自适应 | `w-100 w-lg-auto` |
| 小屏居中，大屏左对齐 | `text-center text-lg-start` |
| 响应式间距 | `p-2 p-md-3 p-lg-4` |
| 响应式边距 | `m-2 m-md-3 m-lg-4` |

---

**更新时间**: 2025年11月24日  
**适用版本**: Alpha Docs v2.0+
