# 📋 SnapFit AI 环境变量配置统一指南

本文档提供所有部署方式的环境变量配置对比和使用指南。

## 🎯 配置文件对比

| 配置项 | 开发环境 | Docker完整部署 | Docker单容器 |
|--------|----------|---------------|--------------|
| **文件位置** | `/.env.local` | `/deployment/docker-full/.env` | `/deployment/docker-single/.env` |
| **数据库类型** | PostgreSQL/Supabase | PostgreSQL (内置) | Supabase (外部) |
| **端口** | 3000 | 38000 | 3000 |
| **HTTPS** | 可选 | 可配置 | 可配置 |
| **容器化** | 否 | 是 | 是 |

## 📊 环境变量结构对比

### 🗄️ 数据库配置

#### 开发环境 (.env.local)
```bash
# 数据库提供商选择
DB_PROVIDER=postgresql  # 或 supabase

# PostgreSQL 配置
DATABASE_URL=postgresql://username:password@localhost:5432/snapfit_ai

# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

#### Docker完整部署 (deployment/docker-full/.env)
```bash
# 固定使用 PostgreSQL
DB_PROVIDER=postgresql

# PostgreSQL 容器配置
POSTGRES_DB=snapfit_ai
POSTGRES_USER=snapfit_user
POSTGRES_PASSWORD=your_secure_password_here
```

#### Docker单容器 (deployment/docker-single/.env)
```bash
# 固定使用 Supabase
DB_PROVIDER=supabase

# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

### 🔐 安全配置 (所有环境相同)

```bash
# NextAuth 密钥
NEXTAUTH_SECRET=your_nextauth_secret_here

# 数据加密密钥
KEY_ENCRYPTION_SECRET=your_encryption_secret_here
```

### 🚀 部署配置

#### 开发环境
```bash
DEPLOYMENT_TYPE=http
FORCE_HTTPS=false
DB_SSL=false
NEXTAUTH_URL=http://localhost:3000
```

#### Docker完整部署
```bash
DEPLOYMENT_TYPE=http
FORCE_HTTPS=false
DB_SSL=false
NEXTAUTH_URL=http://localhost:38000
APP_HOST_PORT=38000
APP_CONTAINER_PORT=3000
```

#### Docker单容器
```bash
DEPLOYMENT_TYPE=http
FORCE_HTTPS=false
DB_SSL=false
NEXTAUTH_URL=http://localhost:3000
APP_PORT=3000
```

### 🔑 OAuth 配置 (所有环境相同)

```bash
# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 📧 邮件配置 (所有环境相同)

```bash
# Resend API Key
RESEND_API_KEY=your_resend_api_key
# 发件人邮箱
FROM_EMAIL=noreply@yourdomain.com
```

### 🤖 AI API 配置 (所有环境相同)

```bash
# 默认OpenAI API配置
DEFAULT_OPENAI_API_KEY=your_default_openai_key
DEFAULT_OPENAI_BASE_URL=https://api.openai.com
```

### ⚙️ 应用配置 (所有环境相同)

```bash
# 应用信息
APP_NAME=SnapFit AI
APP_VERSION=1.0.0
# 时区设置
TZ=Asia/Shanghai
# 日志级别
LOG_LEVEL=info
```

## 🔧 配置步骤

### 1. 开发环境配置

```bash
# 1. 复制配置文件
cp .env.example .env.local

# 2. 编辑配置
nano .env.local

# 3. 设置必要配置
DB_PROVIDER=postgresql  # 或 supabase
DATABASE_URL=postgresql://...  # 或配置 Supabase
NEXTAUTH_SECRET=$(openssl rand -base64 32)
KEY_ENCRYPTION_SECRET=$(openssl rand -base64 32)

# 4. 启动开发服务器
npm run dev
```

### 2. Docker完整部署配置

```bash
# 1. 进入部署目录
cd deployment/docker-full

# 2. 复制配置文件
cp .env.example .env

# 3. 编辑配置
nano .env

# 4. 设置必要配置
POSTGRES_PASSWORD=your_secure_password
NEXTAUTH_SECRET=$(openssl rand -base64 32)
KEY_ENCRYPTION_SECRET=$(openssl rand -base64 32)

# 5. 启动服务
./quick-start.sh
```

### 3. Docker单容器配置

```bash
# 1. 进入部署目录
cd deployment/docker-single

# 2. 复制配置文件
cp .env.example .env

# 3. 编辑配置
nano .env

# 4. 设置 Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXTAUTH_SECRET=$(openssl rand -base64 32)
KEY_ENCRYPTION_SECRET=$(openssl rand -base64 32)

# 5. 启动服务
docker-compose up -d
```

## 🔍 配置验证

### 使用部署检测脚本

```bash
# 开发环境
npm run check-deployment

# Docker部署
node ../../scripts/deployment-check.js
```

### 手动验证

```bash
# 检查必要环境变量
echo $NEXTAUTH_SECRET
echo $KEY_ENCRYPTION_SECRET

# 检查数据库连接
# PostgreSQL
psql $DATABASE_URL -c "SELECT 1;"

# Supabase
curl -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
     "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/"
```

## ⚠️ 安全注意事项

### 1. 密钥生成

```bash
# 生成强密钥
openssl rand -base64 32

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2. 文件权限

```bash
# 设置正确的文件权限
chmod 600 .env*
```

### 3. 版本控制

```bash
# 确保 .env 文件不被提交
echo ".env*" >> .gitignore
echo "!.env.example" >> .gitignore
```

## 🚀 快速配置模板

### 开发环境快速配置

```bash
#!/bin/bash
# 开发环境快速配置脚本

cp .env.example .env.local

# 生成密钥
NEXTAUTH_SECRET=$(openssl rand -base64 32)
KEY_ENCRYPTION_SECRET=$(openssl rand -base64 32)

# 更新配置文件
sed -i "s/your_nextauth_secret_here/$NEXTAUTH_SECRET/" .env.local
sed -i "s/your_encryption_secret_here/$KEY_ENCRYPTION_SECRET/" .env.local

echo "✅ 开发环境配置完成"
echo "请手动配置数据库连接信息"
```

### Docker部署快速配置

```bash
#!/bin/bash
# Docker部署快速配置脚本

cd deployment/docker-full
cp .env.example .env

# 生成密钥
POSTGRES_PASSWORD=$(openssl rand -base64 16)
NEXTAUTH_SECRET=$(openssl rand -base64 32)
KEY_ENCRYPTION_SECRET=$(openssl rand -base64 32)

# 更新配置文件
sed -i "s/your_secure_password_here/$POSTGRES_PASSWORD/" .env
sed -i "s/your_nextauth_secret_here/$NEXTAUTH_SECRET/" .env
sed -i "s/your_encryption_secret_here/$KEY_ENCRYPTION_SECRET/" .env

echo "✅ Docker部署配置完成"
echo "数据库密码: $POSTGRES_PASSWORD"
```

## 📚 相关文档

- [环境变量文件使用指南](./ENV-FILE-GUIDE.md)
- [HTTP/HTTPS 部署指南](./DEPLOYMENT-HTTP-HTTPS.md)
- [Docker 完整部署指南](../deployment/docker-full/README.md)
- [Docker 单容器部署指南](../deployment/docker-single/README.md)
