# 🚀 SnapFit AI Docker 部署指南

## 📋 标准部署步骤（两步法）

### 第一步：构建Docker镜像（不包含敏感信息）

```bash
# 进入部署目录
cd deployment/docker-full

# 构建镜像
chmod +x build-image.sh
./build-image.sh

# 或手动构建
docker build -t snapfit-ai:latest -f Dockerfile ../../
```

### 第二步：配置环境变量并启动服务

```bash
# 复制配置模板
cp .env.example .env

# 编辑配置文件（设置密码和密钥）
nano .env
```

### 2. 设置必要的密码和密钥

在 `.env` 文件中修改以下配置：

```bash
# 数据库密码 - 请设置强密码
POSTGRES_PASSWORD=your_strong_password_here

# NextAuth 密钥 - 生成方法: openssl rand -base64 32
NEXTAUTH_SECRET=your_nextauth_secret_here

# 数据加密密钥 - 生成方法: openssl rand -base64 32
KEY_ENCRYPTION_SECRET=your_encryption_secret_here
```

### 3. 生成密钥命令

```bash
# 生成 NextAuth 密钥
openssl rand -base64 32

# 生成数据加密密钥
openssl rand -base64 32

# 生成数据库密码
openssl rand -base64 16 | tr -d "=+/" | cut -c1-16
```

### 第三步：启动服务

```bash
# 启动服务（使用已构建的镜像）
docker-compose up -d

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 第四步：验证部署

```bash
# 健康检查
curl -f http://localhost:38000/api/health

# 访问应用
open http://localhost:38000
```

## 🔄 完整流程总结

```bash
# 第一步：构建镜像（不包含敏感信息）
./build-image.sh

# 第二步：配置环境变量
cp .env.example .env
nano .env  # 设置密码和密钥

# 第三步：启动服务（运行时传入敏感信息）
docker-compose up -d

# 第四步：验证
curl http://localhost:38000/api/health
```

## 🔄 完整流程总结

```bash
# 第一步：构建镜像（不包含敏感信息）
./build-image.sh

# 第二步：配置环境变量
cp .env.example .env
nano .env  # 设置密码和密钥

# 第三步：启动服务（运行时传入敏感信息）
docker-compose up -d

# 第四步：验证
curl http://localhost:38000/api/health
```

## 🔧 配置示例

### 完整的 .env 配置示例

```bash
# ==========================================
# 🚀 部署环境配置
# ==========================================
DEPLOYMENT_TYPE=http
FORCE_HTTPS=false
DB_SSL=false

# ==========================================
# 🗄️ PostgreSQL 数据库配置
# ==========================================
DB_PROVIDER=postgresql
POSTGRES_DB=snapfit_ai
POSTGRES_USER=snapfit_user
POSTGRES_PASSWORD=MyStr0ngP@ssw0rd123  # 请修改为你的密码

# ==========================================
# 🔐 应用安全配置
# ==========================================
NEXTAUTH_SECRET=abcd1234567890abcd1234567890abcd1234567890abcd  # 请修改
KEY_ENCRYPTION_SECRET=efgh1234567890efgh1234567890efgh1234567890efgh  # 请修改

# ==========================================
# 🌐 域名和URL配置
# ==========================================
DOMAIN=localhost
NEXTAUTH_URL=http://localhost:38000

# ==========================================
# 🔌 端口配置
# ==========================================
POSTGRES_PORT=5432
APP_HOST_PORT=38000
APP_CONTAINER_PORT=3000

# ==========================================
# ⚙️ 应用配置
# ==========================================
APP_NAME=SnapFit AI
APP_VERSION=1.0.0
TZ=Asia/Shanghai
LOG_LEVEL=info
```

## 🛠️ 管理命令

### 服务管理

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 数据库管理

```bash
# 连接数据库
docker-compose exec db psql -U snapfit_user -d snapfit_ai

# 备份数据库
docker-compose exec db pg_dump -U snapfit_user snapfit_ai > backup.sql

# 恢复数据库
docker-compose exec -T db psql -U snapfit_user -d snapfit_ai < backup.sql
```

### 应用管理

```bash
# 查看应用日志
docker-compose logs snapfit-ai

# 进入应用容器
docker-compose exec snapfit-ai sh

# 重新构建应用
docker-compose build --no-cache snapfit-ai
docker-compose up -d snapfit-ai
```

## ⚠️ 注意事项

### 安全提示

1. **不要使用默认密码** - 必须修改 `.env` 文件中的密码
2. **使用强密钥** - 密钥长度至少32字符
3. **保护 .env 文件** - 不要提交到版本控制
4. **定期备份** - 定期备份数据库数据

### 常见问题

1. **端口被占用** - 修改 `APP_HOST_PORT` 为其他端口
2. **数据库连接失败** - 检查 `POSTGRES_PASSWORD` 是否正确设置
3. **应用无法访问** - 确认防火墙允许 38000 端口

### 文件权限

```bash
# 设置 .env 文件权限
chmod 600 .env

# 确保脚本可执行
chmod +x *.sh
```

## 🎯 总结

这就是最简单的部署方式：

1. **复制配置**: `cp .env.example .env`
2. **编辑密钥**: 修改 `.env` 文件中的密码和密钥
3. **启动服务**: `docker-compose up -d`
4. **访问应用**: http://localhost:38000

就这么简单！🎉
