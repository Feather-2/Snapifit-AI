# 📁 SnapFit AI 环境变量文件使用指南

本文档详细说明不同部署方式下 `.env` 文件的位置、优先级和使用方法。

## 📋 .env 文件位置总览

```
health-app/
├── .env.example                    # 项目根目录环境变量示例
├── .env.local                      # 本地开发环境变量（开发时使用）
├── .env                            # 项目根目录环境变量（不推荐）
├── deployment/
│   ├── docker-full/
│   │   ├── .env.example           # Docker完整部署示例
│   │   └── .env                   # Docker完整部署环境变量 ⭐
│   └── docker-single/
│       ├── .env.example           # Docker单容器部署示例
│       └── .env                   # Docker单容器部署环境变量 ⭐
```

## 🎯 不同部署方式的 .env 文件使用

### 1. 本地开发环境

**使用文件**: `项目根目录/.env.local`

```bash
# 开发环境
cd /path/to/health-app

# 复制示例文件
cp .env.example .env.local

# 编辑配置
nano .env.local

# 启动开发服务器
npm run dev
```

**特点**:
- Next.js 自动加载 `.env.local`
- 优先级最高，会覆盖其他 .env 文件
- 不会被 Git 跟踪（已在 .gitignore 中）

### 2. Docker 完整部署

**使用文件**: `deployment/docker-full/.env`

```bash
# Docker完整部署
cd deployment/docker-full

# 复制示例文件
cp .env.example .env

# 编辑配置
nano .env

# 启动服务
docker-compose up -d
```

**特点**:
- 包含数据库配置（PostgreSQL）
- 包含应用配置
- 仅在 docker-full 目录下有效

### 3. Docker 单容器部署

**使用文件**: `deployment/docker-single/.env`

```bash
# Docker单容器部署
cd deployment/docker-single

# 复制示例文件
cp .env.example .env

# 编辑配置
nano .env

# 启动服务
docker-compose up -d
```

**特点**:
- 主要是应用配置
- 使用外部 Supabase 数据库
- 仅在 docker-single 目录下有效

## ⚡ 环境变量优先级

### Next.js 环境变量加载顺序（开发环境）

1. `.env.local` （最高优先级）
2. `.env.development`
3. `.env`
4. `.env.example`

### Docker 环境变量加载顺序

1. `docker-compose.yml` 中的 `environment` 配置
2. `docker-compose.yml` 中的 `env_file` 指定的文件
3. 容器内的默认环境变量

## 🔧 配置文件对比

| 配置项 | 开发环境 | docker-full | docker-single |
|--------|----------|-------------|---------------|
| **文件位置** | `/.env.local` | `/deployment/docker-full/.env` | `/deployment/docker-single/.env` |
| **数据库** | 外部数据库 | 内置 PostgreSQL | 外部 Supabase |
| **端口** | 3000 | 38000 | 3000 |
| **HTTPS** | 通常 false | 可配置 | 可配置 |
| **容器化** | 否 | 是 | 是 |

## 📝 配置示例

### 开发环境 (.env.local)

```bash
# 数据库配置
DB_PROVIDER=postgresql
DATABASE_URL=postgresql://user:pass@localhost:5432/snapfit_ai

# 应用配置
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_dev_secret
KEY_ENCRYPTION_SECRET=your_dev_encryption_secret

# 部署配置
DEPLOYMENT_TYPE=http
FORCE_HTTPS=false
DB_SSL=false
```

### Docker完整部署 (deployment/docker-full/.env)

```bash
# 数据库配置
POSTGRES_DB=snapfit_ai
POSTGRES_USER=snapfit_user
POSTGRES_PASSWORD=your_secure_password

# 应用配置
NEXTAUTH_URL=http://localhost:38000
NEXTAUTH_SECRET=your_production_secret
KEY_ENCRYPTION_SECRET=your_production_encryption_secret

# 部署配置
DEPLOYMENT_TYPE=http
FORCE_HTTPS=false
DB_SSL=false
```

### Docker单容器部署 (deployment/docker-single/.env)

```bash
# Supabase配置
DB_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 应用配置
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_production_secret
KEY_ENCRYPTION_SECRET=your_production_encryption_secret

# 部署配置
DEPLOYMENT_TYPE=http
FORCE_HTTPS=false
DB_SSL=true
```

## ⚠️ 重要注意事项

### 1. 文件安全
- **永远不要**将 `.env` 文件提交到 Git
- 使用强密码和随机密钥
- 定期轮换生产环境密钥

### 2. 环境隔离
- 开发环境使用 `.env.local`
- 生产环境使用对应部署目录下的 `.env`
- 不要混用不同环境的配置文件

### 3. 配置验证
```bash
# 检查配置是否正确
npm run check-deployment

# 或手动检查
node scripts/deployment-check.js
```

### 4. 常见错误
- ❌ 在项目根目录创建 `.env` 文件用于 Docker 部署
- ❌ 将开发环境的 `.env.local` 用于生产部署
- ❌ 忘记设置必要的环境变量
- ❌ 在不同目录下运行 docker-compose 命令

## 🚀 快速设置命令

### 开发环境快速设置
```bash
cd /path/to/health-app
cp .env.example .env.local
# 编辑 .env.local 后
npm run dev
```

### Docker完整部署快速设置
```bash
cd deployment/docker-full
cp .env.example .env
# 编辑 .env 后
docker-compose up -d
```

### Docker单容器部署快速设置
```bash
cd deployment/docker-single
cp .env.example .env
# 编辑 .env 后
docker-compose up -d
```

## 🔍 故障排除

### 环境变量未生效
1. 检查文件位置是否正确
2. 检查文件名是否正确（注意大小写）
3. 重启服务或重新构建容器
4. 检查环境变量语法（无空格、正确引号）

### Docker 环境变量问题
1. 确保在正确的目录下运行 `docker-compose`
2. 检查 `env_file` 路径是否正确
3. 使用 `docker-compose config` 验证配置
4. 检查容器内环境变量：`docker exec container_name env`
