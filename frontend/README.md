# 心晴平台 · 前端（Vue 3 + Vite）

## 技术栈

- Vue 3（`<script setup>`）、Vue Router、Pinia  
- Arco Design Vue  
- Axios（`src/utils/request.js`，`/api` 在开发环境由 Vite 代理到后端）

## 命令

```bash
npm install
npm run dev          # 开发服务，默认 http://localhost:5173
npm run build        # 产出 dist/
npm run preview      # 本地预览构建结果（vite preview）
```

`vite.config.js` 中 `server.port` 为 **5173**，`proxy['/api']` → `http://localhost:3002`。

## 目录说明（摘要）

| 路径 | 说明 |
|------|------|
| `src/views/login/` | PC 登录页（含学生/家长快速入口外链） |
| `src/views/dashboard/` | 工作台（KPI 可跳转计划/预警/个案） |
| `src/views/alerts/` | 预警列表与详情 |
| `src/views/cases/` | 个案列表与详情 |
| `src/views/h5/` | 学生 H5（身份验证、任务、作答、AI 倾诉等） |
| `src/views/parent/` | 家长绑定与首页 |
| `src/layouts/MainLayout.vue` | 后台布局（侧栏 `AppSidebar.vue`） |
| `src/styles/` | 全局样式与变量 |

## 说明

- H5 已去除 Vant，相关页使用原生布局 + Arco/自定义样式。  
- 全量联调说明见仓库根目录 **`docs/FRONTEND_INTEGRATION_NOTES.md`**。
