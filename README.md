# 心晴 · 中小学生心理健康管理平台

PC 管理端 + H5 学生端 + 家长端，技术栈：**Vue 3 + Vite**（前端）、**Node.js + Express + Prisma**（后端）、**MySQL 8**。

## 仓库结构

| 目录 | 说明 |
|------|------|
| `frontend/` | Web 前端（Arco Design Vue），开发默认端口 **5173**，API 代理到 `localhost:3002` |
| `backend/` | REST API，默认端口 **3002** |
| `docs/` | 前端联调与设计说明 |
| `claudeplan0317/` | 规划与联调指南（含 [联调启动指南](./claudeplan0317/联调启动指南.md)） |
| `deploy.md` | 生产部署（Nginx、Docker、HTTPS） |
| `api-actual.md` | 接口清单（联调以实际为准） |

## 快速开始

### 后端

详见 [backend/README.md](./backend/README.md)。概要：

```bash
cd backend
npm install
# MySQL 可用后：npx prisma db push && npm run db:seed
npm run start   # 默认 http://localhost:3002
```

### 前端

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
```

构建：`npm run build`；预览：`npx vite preview`（默认 4173）。

## 文档索引

| 文档 | 内容 |
|------|------|
| [docs/FRONTEND_INTEGRATION_NOTES.md](./docs/FRONTEND_INTEGRATION_NOTES.md) | PC/H5/家长端联调、路由与接口对应、注意事项 |
| [docs/FRONTEND_DESIGN_SYSTEM.md](./docs/FRONTEND_DESIGN_SYSTEM.md) | 设计令牌与页面容器规范 |
| [backend/README.md](./backend/README.md) | 数据库、种子账号、常见问题 |
| [deploy.md](./deploy.md) | 生产环境部署 |

## 对外入口（生产）

登录页提供快速入口（新标签打开）：

- 学生答题：`https://psylink.chat/h5/verify`
- 家长绑定：`https://psylink.chat/parent/bind`

## 分支

- **`main`**：主分支  
- **`dev`**：日常开发与合并

---

*文档随功能迭代更新；接口细节以 `api-actual.md` 与后端路由为准。*
