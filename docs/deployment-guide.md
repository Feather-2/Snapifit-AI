# Snapifit AI 部署指南

## 🎯 项目概述

Snapifit AI 是一个现代化的健康管理应用，支持：
- 双数据库架构（Supabase + PostgreSQL）
- 完整的用户认证系统
- AI 智能建议功能
- 健康数据管理
- 国际化支持

## 🚀 快速部署

### 方案1：Supabase 部署（推荐）

1. **获取 API Keys**
   ```bash
   # 访问 Supabase 项目
   # https://supabase.com/dashboard/project/zvjmcihslxlahvovhiye
   # 获取 API Keys
   ```

2. **更新环境变量**
   ```bash
   # 复制并修改环境配置
   cp .env.local .env.production

   # 更新以下变量
   NEXT_PUBLIC_SUPABASE_URL=https://zvjmcihslxlahvovhiye.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

3. **本地开发**
   ```bash
   pnpm install
   pnpm dev
   ```

4. **Docker 部署**
   ```bash
   make build
   make dev  # 开发环境
   make prod # 生产环境
   ```

### 方案2：PostgreSQL 独立部署

1. **切换数据库提供商**
   ```bash
   # 修改 .env.local
   DB_PROVIDER=postgresql
   DATABASE_URL=postgresql://user:password@host:5432/Snapifit_ai
   ```

2. **安装依赖**
   ```bash
   pnpm add pg @types/pg
   ```

3. **部署数据库**
   ```bash
   # 使用导出的 Schema
   psql -d Snapifit_ai -f manual_complete_schema.sql
   ```

4. **启动应用**
   ```bash
   pnpm dev
   ```

## 🔧 环境配置

### 必需环境变量

```env
# 数据库配置
DB_PROVIDER=supabase  # 或 postgresql

# Supabase 配置（当 DB_PROVIDER=supabase）
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# PostgreSQL 配置（当 DB_PROVIDER=postgresql）
DATABASE_URL=postgresql://user:password@host:5432/database

# 认证配置
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret

# OAuth 配置
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# 安全配置
KEY_ENCRYPTION_SECRET=your_encryption_secret
```

## 🐳 Docker 部署

### 开发环境

```bash
# 使用 Makefile 快捷命令
make dev

# 或直接使用 docker-compose
docker-compose -f deployment/docker/docker-compose.yml up -d
```

### 生产环境

```bash
# 构建镜像
make build

# 启动生产环境
make prod

# 查看日志
make logs

# 健康检查
make health
```

### Docker Compose 配置

项目包含完整的 Docker 配置：
- `deployment/docker/Dockerfile` - 多阶段构建
- `deployment/docker/docker-compose.yml` - 开发环境
- `deployment/docker/docker-compose.prod.yml` - 生产环境
- `deployment/docker/nginx.conf` - 反向代理配置

## 📊 数据库管理

### Schema 部署

项目已导出完整的数据库 Schema：
- 位置：`/root/complete_schema_export/manual_complete_schema.sql`
- 大小：775KB
- 包含：11个表、33个函数、64个索引、4个触发器

### 数据库切换

支持一键切换数据库：
```bash
# 切换到 Supabase
./deployment/scripts/switch-database.sh supabase

# 切换到 PostgreSQL
./deployment/scripts/switch-database.sh postgresql
```

## 🔐 安全配置

### 生产环境安全清单

- [ ] 更新所有默认密钥
- [ ] 配置 HTTPS
- [ ] 设置防火墙规则
- [ ] 配置 CORS 策略
- [ ] 启用日志监控
- [ ] 定期备份数据库

### OAuth 配置

支持 GitHub 和 Google OAuth：

#### GitHub OAuth
1. 在 GitHub Settings > Developer settings > OAuth Apps 创建应用
2. 设置回调 URL: `http://localhost:3000/api/auth/callback/github`
3. 更新环境变量: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`

#### Google OAuth
1. 在 Google Cloud Console 创建 OAuth 客户端
2. 设置回调 URL: `http://localhost:3000/api/auth/callback/google`
3. 更新环境变量: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

## 🚀 部署平台

### Vercel 部署

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel --prod

# 设置环境变量
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# ... 其他环境变量
```

### 自建服务器部署

```bash
# 服务器初始化
./deployment/scripts/server-init.sh

# 数据库设置
./deployment/scripts/setup-database.sh

# 应用部署
./deployment/scripts/deploy.sh
```

## 📋 部署检查清单

### 部署前检查

- [ ] 环境变量配置完整
- [ ] 数据库连接正常
- [ ] OAuth 应用配置正确
- [ ] SSL 证书配置（生产环境）
- [ ] 域名解析配置

### 部署后验证

- [ ] 应用正常启动
- [ ] 数据库连接成功
- [ ] 用户注册/登录功能
- [ ] AI 功能正常
- [ ] 健康数据记录功能
- [ ] 国际化切换正常

## 🔧 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查环境变量
   - 验证数据库服务状态
   - 检查网络连接

2. **OAuth 登录失败**
   - 验证回调 URL 配置
   - 检查客户端 ID 和密钥
   - 确认应用权限设置

3. **Docker 构建失败**
   - 检查 Node.js 版本
   - 清理 Docker 缓存
   - 验证依赖安装

### 日志查看

```bash
# Docker 日志
make logs

# 应用日志
docker-compose logs -f Snapifit-ai

# 数据库日志
docker-compose logs -f postgres
```

## 📞 支持

如遇问题，请检查：
1. 环境变量配置
2. 数据库连接状态
3. 网络连接
4. 日志错误信息

项目文档：
- 数据库部署文档已合并到本目录与脚本文件，参考：
  - `docs/DATABASE_MIGRATION_GUIDE.md`
  - `docs/postgresql-optimization-guide.md`
  - `docs/deploy-postgresql.sh`
- [Docker 部署文档](./deployment/docs/DOCKER.md)
- [API 文档](./docs/)
