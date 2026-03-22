# 心理健康测评平台 · 生产部署文档

> 最后更新：2026-03-21  
> 技术栈：Node.js 22 + Express · Prisma · MySQL 8 · Vue 3 + Vite · Nginx · Docker Compose

---

## 目录

1. [服务器环境要求](#1-服务器环境要求)
2. [安装 Docker 和 Docker Compose](#2-安装-docker-和-docker-compose)
3. [克隆代码并配置环境变量](#3-克隆代码并配置环境变量)
4. [构建前端静态资源](#4-构建前端静态资源)
5. [执行数据库迁移与初始化](#5-执行数据库迁移与初始化)
6. [启动所有服务](#6-启动所有服务)
7. [配置 Nginx 反向代理](#7-配置-nginx-反向代理)
8. [申请 HTTPS 证书（Certbot）](#8-申请-https-证书certbot)
9. [验证部署成功的检查清单](#9-验证部署成功的检查清单)
10. [常见问题排查](#10-常见问题排查)
11. [维护操作速查](#11-维护操作速查)

---

## 1. 服务器环境要求

| 项目 | 最低要求 | 推荐 |
|------|----------|------|
| 操作系统 | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| CPU | 2 核 | 4 核 |
| 内存 | 2 GB | 4 GB |
| 硬盘 | 20 GB SSD | 50 GB SSD |
| 开放端口 | 22 / 80 / 443 | 同左 |
| Docker Engine | 24.x | 27.x（最新稳定版） |
| Docker Compose | v2.x | v2.x（内置于 Docker Desktop） |

> 国内服务器（阿里云/腾讯云/华为云）需在安全组同时放行 80 和 443 端口。

---

## 2. 安装 Docker 和 Docker Compose

### Ubuntu 一键安装脚本

```bash
# 卸载旧版本（若有）
sudo apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# 安装官方仓库
sudo apt update && sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 将当前用户加入 docker 组（无需每次 sudo）
sudo usermod -aG docker $USER
newgrp docker

# 验证安装
docker --version          # Docker version 27.x.x
docker compose version    # Docker Compose version v2.x.x
```

### CentOS / RHEL

```bash
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo \
  https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl enable --now docker
```

---

## 3. 克隆代码并配置环境变量

```bash
# 1. 克隆仓库
git clone https://github.com/your-org/heart-test.git /opt/heart-test
cd /opt/heart-test

# 2. 配置后端环境变量（从模板复制）
cp backend/.env.example backend/.env
```

使用文本编辑器打开 `backend/.env`，**必须修改以下字段**：

```bash
vi backend/.env
```

| 变量 | 说明 | 示例 |
|------|------|------|
| `DATABASE_URL` | 生产数据库连接串，密码与 `MYSQL_ROOT_PASSWORD` 保持一致 | `mysql://root:MyStr0ng!@db:3306/mentalhealth` |
| `MYSQL_ROOT_PASSWORD` | MySQL root 密码（在 `docker-compose.yml` ENV 或写入 shell） | `MyStr0ng!Passw0rd` |
| `JWT_SECRET` | 至少 64 位随机字符串，生产必改 | 见下方生成命令 |
| `NODE_ENV` | 必须为 `production` | `production` |
| `DOUBAO_API_KEY` | 火山方舟 API Key（不需要 AI 功能可留空） | `ark-xxxxxxxx` |

**生成安全 JWT_SECRET：**

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**设置 MySQL 密码环境变量**（避免写入文件）：

```bash
export MYSQL_ROOT_PASSWORD="MyStr0ng!Passw0rd"
# 加入 ~/.bashrc 以便重启后生效
echo 'export MYSQL_ROOT_PASSWORD="MyStr0ng!Passw0rd"' >> ~/.bashrc
```

---

## 4. 构建前端静态资源

> 前端使用 Vite 构建，产物为纯静态文件，由 Nginx 直接托管。

```bash
cd /opt/heart-test/frontend

# 安装依赖
npm ci

# 生产构建（输出到 frontend/dist/）
npm run build

# 验证产物
ls dist/
# 应输出: index.html  assets/
```

> 每次代码更新后需重新执行此步骤，然后重启 Nginx 容器使新静态资源生效：
> ```bash
> docker compose restart nginx
> ```

---

## 5. 执行数据库迁移与初始化

### 首次部署（全新数据库）

```bash
cd /opt/heart-test

# 启动数据库容器（仅 db 服务）
docker compose up -d db

# 等待 MySQL 健康（约 30 秒）
docker compose ps   # 确认 db 显示 healthy

# 进入后端容器执行 Prisma 建表 + 初始数据
docker compose run --rm backend \
  sh -c "npx prisma db push && node prisma/seed.js"
```

### 更新部署（已有数据库）

```bash
# 仅执行迁移，不重置数据
docker compose run --rm backend npx prisma migrate deploy
```

> **注意**：`prisma migrate deploy` 会依次执行 `backend/prisma/migrations/` 下所有未执行的迁移文件，不会丢失数据。

---

## 6. 启动所有服务

```bash
cd /opt/heart-test

# 构建镜像并在后台启动全部服务
docker compose up -d --build

# 查看运行状态
docker compose ps

# 查看后端实时日志
docker compose logs -f backend

# 查看所有服务日志
docker compose logs -f
```

**预期输出（`docker compose ps`）：**

```
NAME                     STATUS          PORTS
heart-test-db-1          running (healthy)   3306/tcp
heart-test-backend-1     running             3002/tcp
heart-test-nginx-1       running             0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

---

## 7. 配置 Nginx 反向代理

Nginx 配置文件位于 `nginx/default.conf`，已包含：

- HTTP → HTTPS 301 跳转
- Vue Router history 模式支持（`try_files $uri /index.html`）
- `/api/` 路径反向代理到后端 `:3002`
- 静态资源 1 年强缓存（hash 文件名）
- 安全响应头（X-Frame-Options / HSTS 等）

**修改域名：**

```bash
# 将 your-domain.com 替换为实际域名
sed -i 's/your-domain.com/example.com/g' nginx/default.conf
```

**HTTPS 证书路径：**

```
nginx/certs/fullchain.pem   ← certbot 生成后复制到此
nginx/certs/privkey.pem     ← certbot 生成后复制到此
```

---

## 8. 申请 HTTPS 证书（Certbot）

### 前提
- 域名 DNS 已解析到本服务器 IP
- 80 端口已开放并能访问（先以 HTTP 模式启动 Nginx 完成验证）

### 安装 Certbot

```bash
sudo apt update
sudo apt install -y certbot

# 或使用 snap（Ubuntu 22.04+）
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/bin/certbot
```

### 申请证书（Standalone 模式，临时占用 80 端口）

```bash
# 先停止 Nginx（释放 80 端口给 certbot）
docker compose stop nginx

# 申请证书（替换为实际域名和邮箱）
sudo certbot certonly --standalone \
  -d example.com \
  -d www.example.com \
  --email admin@example.com \
  --agree-tos \
  --non-interactive

# 将证书复制到项目目录
sudo cp /etc/letsencrypt/live/example.com/fullchain.pem nginx/certs/fullchain.pem
sudo cp /etc/letsencrypt/live/example.com/privkey.pem   nginx/certs/privkey.pem
sudo chown $USER:$USER nginx/certs/*.pem

# 重新启动 Nginx
docker compose start nginx
```

### 自动续期

```bash
# 测试续期流程（不实际续期）
sudo certbot renew --dry-run

# 添加 crontab 自动续期（每天 2:30 检查，证书到期前 30 天自动续）
(crontab -l 2>/dev/null; echo "30 2 * * * certbot renew --quiet && \
  cp /etc/letsencrypt/live/example.com/fullchain.pem /opt/heart-test/nginx/certs/fullchain.pem && \
  cp /etc/letsencrypt/live/example.com/privkey.pem   /opt/heart-test/nginx/certs/privkey.pem && \
  docker compose -f /opt/heart-test/docker-compose.yml restart nginx") | crontab -
```

---

## 9. 验证部署成功的检查清单

完成以上步骤后，逐项确认：

### 基础连通性

- [ ] `curl http://your-domain.com/api/health` 返回 `{"status":"ok",...}` 或跳转 HTTPS
- [ ] `curl -k https://your-domain.com/api/health` 返回 `{"status":"ok",...}`
- [ ] 浏览器访问 `https://your-domain.com` 加载登录页，无报错
- [ ] 浏览器地址栏显示 🔒 绿色锁（SSL 证书有效）

### 业务功能

- [ ] 管理员登录成功（学校编码：部署时 seed 脚本输出的编码）
- [ ] 工作台首页数据加载（`GET /api/v1/dashboard/overview` 有响应）
- [ ] 预警列表页可以打开
- [ ] 个案管理（`GET /api/v1/cases`，需心理老师及以上 Token）有列表数据或与种子一致
- [ ] 学生 H5 端访问 `/h5` 正常加载
- [ ] 量表列表可以看到 PHQ-9、GAD-7 等系统量表

### 服务健康

```bash
# 所有容器状态为 running
docker compose ps

# 后端无报错日志
docker compose logs backend --tail=50

# MySQL 无报错
docker compose logs db --tail=20

# 查看内存使用（确认在限制以内）
docker stats --no-stream
```

### 数据库

- [ ] `docker compose exec db mysql -uroot -p$MYSQL_ROOT_PASSWORD mentalhealth -e "SHOW TABLES;"` 显示所有表
- [ ] 种子数据已写入（至少有 1 个 tenant 和 admin 用户）

---

## 10. 常见问题排查

| 现象 | 可能原因 | 解决方法 |
|------|----------|----------|
| 后端启动报 `Can't reach database server` | db 容器还未 healthy | `docker compose logs db` 确认 MySQL 已就绪；等待后重启后端 |
| `prisma db push` 报 `P1001` | DATABASE_URL 中主机名错误 | 检查 .env 中 DATABASE_URL，容器间使用 `db` 而非 `localhost` |
| Nginx 502 Bad Gateway | backend 容器未启动或端口不对 | `docker compose ps` 确认 backend 状态；检查 nginx.conf 中 `proxy_pass http://backend:3002` |
| HTTPS 证书无效 / 443 无法访问 | 证书未复制到 `nginx/certs/` | 重新执行第 8 步证书复制命令，`docker compose restart nginx` |
| 登录提示"学校编码不能为空" | 前端请求字段为 `tenant_code` | 确认登录表单传递了 `tenant_code` 字段（见 `auth.js` 路由） |
| 前端刷新 404 | Nginx 未配置 history 模式 | 确认 `nginx/default.conf` 中有 `try_files $uri $uri/ /index.html` |
| 本地已修复、推 GitHub 后线上仍是旧版 | ① 只推了 `dev` 而 CI 只部署 `main`（或服务器只 `git pull main`）② `index.html` 被浏览器/CDN 强缓存 | 合并到 `main` 再推送，或已改为随 `dev`/`main` 部署；确认 `location = /index.html` 为 no-cache；服务器上 `frontend` 执行 `npm run build` 后 `docker compose restart nginx` |
| 内存不足 OOM | 容器内存限制过低 | 调整 `docker-compose.yml` 中 `limits.memory`；建议服务器 ≥ 2GB |
| 豆包 AI 不回复 | DOUBAO_API_KEY 为空 | 填写有效 API Key 后重启后端：`docker compose restart backend` |

---

## 11. 维护操作速查

```bash
# ── 更新代码并重新部署 ──────────────────────────
cd /opt/heart-test
git pull
cd frontend && npm ci && npm run build && cd ..
docker compose up -d --build backend
docker compose restart nginx

# ── 仅重启后端 ───────────────────────────────────
docker compose restart backend

# ── 查看实时日志 ─────────────────────────────────
docker compose logs -f backend
docker compose logs -f nginx

# ── 备份数据库 ───────────────────────────────────
docker compose exec db mysqldump \
  -uroot -p$MYSQL_ROOT_PASSWORD \
  --single-transaction \
  mentalhealth > backup_$(date +%Y%m%d_%H%M%S).sql

# ── 恢复数据库 ───────────────────────────────────
docker compose exec -T db mysql \
  -uroot -p$MYSQL_ROOT_PASSWORD mentalhealth < backup_20260320_120000.sql

# ── 进入后端容器 Shell ───────────────────────────
docker compose exec backend sh

# ── 完全清除并重新部署（⚠️ 数据库数据会丢失） ────
docker compose down -v
docker compose up -d --build
docker compose run --rm backend \
  sh -c "npx prisma db push && node prisma/seed.js"
```

---

## 附：目录结构说明

```
heart-test/
├── backend/
│   ├── .env                 ← 生产环境变量（不提交 git）
│   ├── .env.example         ← 模板，提交 git
│   ├── Dockerfile           ← 后端生产镜像
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/      ← 历史迁移文件
│   │   └── seed.js          ← 初始数据
│   └── src/
├── frontend/
│   ├── dist/                ← npm run build 产物，挂载给 Nginx
│   └── Dockerfile           ← 前端构建镜像（CI 用）
├── nginx/
│   ├── default.conf         ← Nginx 配置
│   └── certs/               ← SSL 证书（不提交 git）
│       ├── fullchain.pem
│       └── privkey.pem
└── docker-compose.yml       ← 生产一键编排
```

> **安全提示**：`.env`、`nginx/certs/` 目录和任何含密码的文件请确保已加入 `.gitignore`，**切勿提交到代码仓库**。
