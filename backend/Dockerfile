# ── 阶段 1: 安装依赖 ──────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

# 只复制依赖描述文件，充分利用 Docker 层缓存
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── 阶段 2: 生成 Prisma Client ────────────────────
FROM node:22-alpine AS prisma
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY prisma ./prisma
RUN npx prisma generate

# ── 阶段 3: 生产运行镜像 ──────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# 创建非 root 用户
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=deps    /app/node_modules ./node_modules
COPY --from=prisma  /app/node_modules/.prisma ./node_modules/.prisma
COPY src ./src
COPY prisma ./prisma
COPY package.json ./

# 上传目录（报告下载等静态文件）
RUN mkdir -p uploads && chown -R appuser:appgroup /app

USER appuser
EXPOSE 3002

# 限制 Node.js 堆内存，防止 OOM
CMD ["node", "--max-old-space-size=256", "src/server.js"]
