# SnapFit AI - 单容器 Dockerfile
# 适用于连接外部 Supabase 数据库的部署

# ==========================================
# 阶段1: 依赖安装
# ==========================================
FROM node:18-alpine AS deps

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apk add --no-cache libc6-compat

# 复制包管理文件
COPY package.json pnpm-lock.yaml* ./

# 安装 pnpm
RUN npm install -g pnpm

# 安装依赖
RUN pnpm install --frozen-lockfile

# ==========================================
# 阶段2: 构建应用
# ==========================================
FROM node:18-alpine AS builder

WORKDIR /app

# 从依赖阶段复制 node_modules
COPY --from=deps /app/node_modules ./node_modules

# 复制源代码
COPY . .

# 安装 pnpm
RUN npm install -g pnpm

# 设置构建环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 构建应用
RUN pnpm build

# ==========================================
# 阶段3: 运行时镜像
# ==========================================
FROM node:18-alpine AS runner

WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# 安装运行时依赖
RUN apk add --no-cache \
    curl \
    dumb-init \
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# 复制构建产物
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 设置文件权限
RUN chown -R nextjs:nodejs /app

# 切换到非 root 用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# 启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]

# ==========================================
# 镜像标签和元数据
# ==========================================
LABEL maintainer="SnapFit AI Team"
LABEL version="1.0.0"
LABEL description="SnapFit AI - Single Container with Supabase"
LABEL org.opencontainers.image.source="https://github.com/your-repo/snapfit-ai"
LABEL org.opencontainers.image.documentation="https://github.com/your-repo/snapfit-ai/blob/main/deployment/docker-single/README.md"

# ==========================================
# 构建说明
# ==========================================
# 构建命令:
# docker build -f deployment/docker-single/Dockerfile -t snapfit-ai:single .
#
# 运行命令:
# docker run -d --name snapfit-ai -p 3000:3000 --env-file .env snapfit-ai:single
#
# 特性:
# - 多阶段构建优化镜像大小
# - 非 root 用户运行提高安全性
# - 健康检查自动监控
# - 生产环境优化配置
# ==========================================
