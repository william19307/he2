# 前端设计体系（Design System）

> 文件位置：`frontend/src/styles/variables.css` + `frontend/src/styles/global.css`
>
> 最后更新：2026-03-18

---

## 1. 设计令牌（Design Tokens）

所有颜色、圆角、阴影等视觉参数统一通过 CSS 自定义属性（CSS Variables）管理，定义在 `variables.css` 的 `:root` 中。**禁止在页面中直接写十六进制色值**，应引用对应变量。

### 1.1 品牌色阶

| 变量 | 色值 | 用途 |
|------|------|------|
| `--color-primary-1` | `#edf7f4` | 最浅背景 |
| `--color-primary-2` | `#d0ebe5` | 浅背景、头像底 |
| `--color-primary-3` | `#a3d9cd` | hover 边框 |
| `--color-primary-4` | `#5bb99e` | 渐变终点 |
| `--color-primary-5` | `#2d7a6a` | **主色**（按钮、链接、品牌） |
| `--color-primary-6` | `#24655a` | 按钮 hover |
| `--color-primary-7` | `#1b504a` | 按钮 active、深色背景 |

### 1.2 功能色

| 变量 | 色值 | 语义 |
|------|------|------|
| `--color-danger-6` | `#EF4444` | 错误、红色预警、删除 |
| `--color-warning-6` | `#F59E0B` | 警告、黄色预警 |
| `--color-success-6` | `#10B981` | 成功、正常状态 |
| `--color-info-6` | `#3B82F6` | 信息、蓝色标签 |

### 1.3 中性色阶

从 `--gray-50`（最浅）到 `--gray-900`（最深），共 10 级。页面中通过语义别名引用：

| 语义变量 | 映射 | 用途 |
|----------|------|------|
| `--color-text-1` | `--gray-900` | 标题、正文主色 |
| `--color-text-2` | `--gray-600` | 次要文本、描述 |
| `--color-text-3` | `--gray-500` | 辅助文本、标签 |
| `--color-text-4` | `--gray-300` | 禁用、时间戳 |
| `--color-bg-1` | `--gray-100` | 页面背景 |
| `--color-bg-2` | `--gray-50` | 卡片次级背景 |
| `--color-bg-white` | `#FFFFFF` | 卡片、输入框底 |
| `--color-border-1` | `--gray-200` | 通用边框、分隔线 |

### 1.4 预警专用色

每种预警级别有 `bg` / `border` / `text` / `icon` 四个变量：

- `--alert-red-*`：红色预警（高风险）
- `--alert-yellow-*`：黄色预警（需关注）
- `--alert-green-*`：正常状态
- `--alert-blue-*`：信息提示

### 1.5 阴影

| 变量 | 用途 |
|------|------|
| `--shadow-xs` | 极细阴影 |
| `--shadow-sm` / `--shadow-card` | 卡片默认阴影 |
| `--shadow-md` | 卡片 hover 提升 |
| `--shadow-lg` | 弹窗、浮层 |
| `--shadow-xl` | 大型覆盖层 |
| `--shadow-modal` | 底部操作栏等固定浮层 |

### 1.6 圆角

| 变量 | 值 | 用途 |
|------|-----|------|
| `--radius-sm` | 6px | 小按钮、标签 |
| `--radius-md` | 8px | 卡片、筛选栏 |
| `--radius-lg` | 12px | 大卡片 |
| `--radius-xl` | 16px | 弹窗、特殊容器 |

### 1.7 侧边栏

| 变量 | 用途 |
|------|------|
| `--sidebar-bg` | 侧边栏深色背景 |
| `--sidebar-hover` | 菜单项 hover |
| `--sidebar-active` | 菜单项选中 |
| `--sidebar-accent` | 高亮色（绿） |
| `--sidebar-width` | 展开宽度 240px |
| `--sidebar-collapsed-width` | 收起宽度 64px |

### 1.8 布局

| 变量 | 值 |
|------|-----|
| `--topbar-height` | 56px |

---

## 2. 全局共享 Class（global.css）

以下 class 在 `global.css` 中定义，所有页面可直接使用，**无需在 scoped CSS 中重复定义**。

### 2.1 页面容器

```html
<div class="page-wrap">
  <!-- 页面内容 -->
</div>
```

提供：`min-height: 100%`、`padding: 28px`、页面背景色、文字颜色、行高。

### 2.2 页面头部

```html
<div class="page-header">
  <h2 class="page-title">页面标题</h2>
  <a-button type="primary">操作按钮</a-button>
</div>
```

提供：flex 两端对齐、底部 24px 间距。`.page-title` 提供 20px/700 样式。

### 2.3 统计卡片

```html
<div class="stat-card">
  <div class="stat-label">标签</div>
  <div class="stat-value">128</div>
</div>
```

提供：白底、边框、圆角、阴影、数字字体。通过追加修饰 class 如 `stat-card--red` 设置背景色。

### 2.4 筛选栏

```html
<div class="filter-bar">
  <a-select ... />
  <a-button type="primary">搜索</a-button>
</div>
```

提供：flex 换行、内边距、白底卡片样式。

### 2.5 辅助 Class

| Class | 用途 |
|-------|------|
| `.text-muted` | 弱文本（`--color-text-4`） |
| `.cell-sub` | 表格单元格副文本（12px、`--color-text-3`） |
| `.batch-bar` | 底部浮动操作栏 |
| `.card` | 通用白底卡片 |
| `.card-hoverable` | 可点击卡片（hover 提升） |
| `.section-header` | 区块标题行 |
| `.section-title` | 区块标题文字 |
| `.numeric` | 数字专用字体（DIN Alternate） |

---

## 3. 页面结构规范

### 3.1 标准业务页面

所有后台业务页面（非登录、非 H5）统一使用 `.page-wrap` 作为根容器：

```vue
<template>
  <div class="page-wrap">
    <div class="page-header">
      <h2 class="page-title">页面名称</h2>
      <!-- 右侧操作 -->
    </div>
    <!-- 页面内容 -->
  </div>
</template>
```

### 3.2 特殊页面

- **DashboardPage**：使用 `.dash` 容器（内部令牌已映射到全局变量）
- **LoginPage / SelectRole**：独立全屏布局，不使用 `.page-wrap`
- **H5 页面**（`/h5/*`、`/parent/*`）：独立移动端设计，不受本体系约束；常用背景 `#f5f7fa`，主色与 PC 一致（`--color-primary-6` 等，见 `variables.css`）
- **H5 底栏**（`H5BottomNav.vue`）：四 Tab — 首页 `/h5/tasks`、调适 `/h5/wellness`、倾诉 `/h5/ai-chat`、预约 `/h5/consult`；`active` 取值：`home` | `wellness` | `aichat` | `consult`

### 3.3 限宽页面

需要限制最大宽度的页面，在 scoped CSS 中追加 `max-width`：

```vue
<style scoped>
.page-wrap { max-width: 720px; }
</style>
```

---

## 4. 开发约定

1. **禁止硬编码颜色**：所有颜色必须通过 CSS 变量引用。如需新增色值，先在 `variables.css` 中定义变量。
2. **优先使用全局 class**：如 `.page-wrap`、`.filter-bar`、`.stat-card` 等，避免在 scoped CSS 中重复实现。
3. **Arco 组件主题**：已在 `global.css` 中统一覆盖了 primary 按钮和 link 颜色，无需页面级覆盖。
4. **数字显示**：统计数字使用 `font-family: "DIN Alternate"` 或添加 `.numeric` class。
5. **SVG 内联颜色**：SVG 中的 `fill` / `stroke` 应通过 CSS class 控制（如 `.spark-dot { fill: var(--color-primary-5) }`），而非在模板中内联。
6. **Canvas 颜色**：Canvas API 无法直接使用 CSS 变量，可通过 `getComputedStyle` 读取变量值，或保留硬编码值并在旁加注释标明对应变量。
7. **移动端适配**：页面 `padding` 在 `≤768px` 时通过媒体查询缩小，详见各页面 scoped CSS。

---

## 5. 文件结构

```
frontend/src/styles/
├── variables.css    # 设计令牌（所有 CSS 变量定义）
└── global.css       # 全局样式 + 共享 class（导入 variables.css）
```

`global.css` 在 `main.js` 中全局导入，所有组件均可使用其中定义的变量和 class。
