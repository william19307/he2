# ── 阶段 1: 构建 ─────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── 阶段 2: 仅输出 dist（供 nginx 使用）────────────
# 此镜像通常不直接运行；生产上 nginx 直接挂载宿主机的 dist 目录。
# 若需要独立容器部署，取消注释以下 FROM 块：
#
# FROM nginx:1.27-alpine
# COPY --from=builder /app/dist /usr/share/nginx/html
# EXPOSE 80
# CMD ["nginx", "-g", "daemon off;"]

# 默认导出 builder 层（用于 CI 中提取 dist）
FROM builder AS export
