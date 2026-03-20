# 心理健康测评平台 · 后端 API

**联调从哪开始：** 请看仓库内 **[联调启动指南](../claudeplan0317/联调启动指南.md)**（Docker → db push → seed → 后端 3002 → 前端 5173）。

## 先启动 MySQL（必须）

`.env` 默认连接 `localhost:3306`。若未装本机 MySQL，用 Docker：

```bash
# 1. 启动 MySQL 容器（首次会拉镜像，约 1～2 分钟）
npm run db:up

# 2. 等待 healthy 后（约 10～30 秒），建表 + 播种（仅首次或换库后）
npx prisma db push
npm run db:seed

# 3. 再启动 API
npm run start
```

若容器已存在但停了：

```bash
docker start mentalhealth-mysql
# 或
npm run db:up
```

停止数据库容器：`npm run db:down`（数据在 Docker volume 里会保留）。

### 提示「容器名 mentalhealth-mysql 已存在」

任选其一：

1. **沿用旧容器**（数据还在里面）：  
   `docker start mentalhealth-mysql`  
   然后直接 `npm run start`，不必再 `db:up`。

2. **删掉旧容器再用 compose 新建**（会丢该容器里的数据，除非另有 volume）：  
   `docker rm -f mentalhealth-mysql`  
   再执行 `npm run db:up`，然后 `npx prisma db push` 与 `npm run db:seed`。

当前 `docker-compose.mysql.yml` 已不再写死容器名，新建出来的名字类似 `backend-mysql-1`，可与旧容器并存（注意 **3306 只能被一个容器占用**）。

## 常见问题

| 现象 | 处理 |
|------|------|
| `Can't reach database server at localhost:3306` | 先执行 `npm run db:up`，确认 Docker Desktop 已打开 |
| 3306 被占用 | 改 `docker-compose.mysql.yml` 里端口映射为 `3307:3306`，并把 `.env` 里 `DATABASE_URL` 改为 `...localhost:3307/...` |

## 测试账号（seed 后）

- 管理员：`admin` / `123456` / 学校编码 `demo_school`
