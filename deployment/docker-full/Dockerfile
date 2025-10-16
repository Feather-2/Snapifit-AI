# SnapFit AI - Docker 完整部署 Dockerfile
# 多阶段构建，适用于包含 PostgreSQL 的完整部署
# 应用运行在容器内部3000端口，映射到主机38000端口

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

# 构建参数 - 仅用于构建时的非敏感信息
ARG NODE_ENV=production
ARG BUILD_DATE
ARG GIT_COMMIT
ARG APP_VERSION

# 设置构建环境变量 - 不包含敏感信息
ENV NODE_ENV=$NODE_ENV
ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_BUILD=true

# 设置构建时需要的占位符环境变量（避免构建错误）
# 这些值在运行时会被真实值覆盖
ENV NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder_anon_key
ENV SUPABASE_SERVICE_ROLE_KEY=placeholder_service_role_key
ENV DATABASE_URL=postgresql://placeholder:placeholder@placeholder:5432/placeholder
ENV NEXTAUTH_SECRET=placeholder_nextauth_secret
ENV KEY_ENCRYPTION_SECRET=placeholder_encryption_secret

# 在生产构建前删除调试和测试文件以避免构建错误
RUN rm -rf app/debug app/api/debug app/\[locale\]/test-* app/api/test-* app/api/test || true

# 构建应用 - 使用占位符环境变量避免构建错误
RUN pnpm build

# ==========================================
# 阶段3: 运行时镜像
# ==========================================
FROM node:18-alpine AS runner

WORKDIR /app

# 传递构建参数到运行时 - 仅非敏感信息
ARG BUILD_DATE
ARG GIT_COMMIT
ARG APP_VERSION

# 设置基础环境变量 - 不包含敏感信息
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV BUILD_DATE=$BUILD_DATE
ENV GIT_COMMIT=$GIT_COMMIT
ENV APP_VERSION=$APP_VERSION

# 注意：
# - 容器内部使用3000端口，docker-compose会映射到38000
# - 敏感信息（密码、密钥等）通过docker-compose运行时传入
# - 不在镜像中硬编码任何敏感信息

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

# 创建必要的目录
RUN mkdir -p /app/logs /app/uploads

# 设置文件权限
RUN chown -R nextjs:nodejs /app

# 切换到非 root 用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# 添加镜像标签
LABEL maintainer="SnapFit AI Team"
LABEL version="$APP_VERSION"
LABEL build-date="$BUILD_DATE"
LABEL git-commit="$GIT_COMMIT"
LABEL description="SnapFit AI - 健康管理应用"

# 启动应用
CMD ["dumb-init", "node", "server.js"]
