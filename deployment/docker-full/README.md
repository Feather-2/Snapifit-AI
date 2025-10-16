# Docker 完整部署方案

完整的容器化部署方案，包含应用、Supabase PostgreSQL 数据库等所有组件。

## 🎯 方案特点

- ✅ **完全隔离**：所有组件都在 Docker 容器中运行
- ✅ **Supabase PostgreSQL**：使用 `supabase/postgres:17.4.1.043` 镜像
- ✅ **数据持久化**：通过 Docker 卷实现数据持久化
- ✅ **空数据库初始化**：自动使用空数据库 schema
- ✅ **健康检查**：所有服务都有健康检查和自动重启
- ✅ **资源限制**：合理的 CPU 和内存限制
- ✅ **日志管理**：自动日志轮转和大小限制

## 📋 技术栈

| 组件 | 镜像 | 版本 | 用途 |
|------|------|------|------|
| **应用** | 自构建 | Latest | SnapFit AI 主应用 |
| **数据库** | supabase/postgres | 17.4.1.043 | PostgreSQL 数据库 |
| **网络** | bridge | - | 内部容器通信 |

## 🚀 快速开始

### 步骤1：环境准备

```bash
# 检查 Docker 安装
docker --version
docker-compose --version

# 进入部署目录
cd deployment/docker-full
```

### 步骤2：选择部署类型并配置环境变量

#### HTTP部署（开发/测试环境）
```bash
# 复制环境配置模板
cp .env.example .env

# 编辑配置文件
nano .env

# 设置HTTP部署配置
DEPLOYMENT_TYPE=http
FORCE_HTTPS=false
DB_SSL=false
NEXTAUTH_URL=http://localhost:38000
```

#### HTTPS部署（生产环境）
```bash
# 复制环境配置模板
cp .env.example .env

# 编辑配置文件
nano .env

# 设置HTTPS部署配置
DEPLOYMENT_TYPE=https
FORCE_HTTPS=true
DB_SSL=true
NEXTAUTH_URL=https://yourdomain.com
```

**必须配置的项目：**
```env
# 数据库密码
POSTGRES_PASSWORD=your_secure_password_here

# 应用安全配置
NEXTAUTH_SECRET=your_nextauth_secret_here
KEY_ENCRYPTION_SECRET=your_encryption_secret_here

# 部署类型配置
DEPLOYMENT_TYPE=http  # 或 https
FORCE_HTTPS=false     # HTTP部署设为false，HTTPS部署设为true
```

> 💡 **提示**: 使用 `node ../../scripts/deployment-check.js` 检测和验证部署配置

### 步骤3：启动服务

#### 方法1：标准部署（推荐）
```bash
# 步骤1：配置环境变量
cp .env.example .env
nano .env  # 编辑密码和密钥

# 步骤2：构建和启动
docker-compose up -d
```

#### 方法2：快速启动脚本
```bash
# 使用快速启动脚本（会检查配置）
chmod +x quick-start.sh
./quick-start.sh
```

#### 方法3：分步构建
```bash
# 步骤1：构建镜像
docker-compose build

# 步骤2：启动服务
docker-compose up -d
```

### 步骤4：验证部署

```bash
# 检查服务状态
docker-compose ps

# 健康检查
curl -f http://localhost:38000/api/health

# 查看日志
docker-compose logs -f

# 访问应用
# HTTP部署: http://localhost:38000
# HTTPS部署: https://yourdomain.com
```

## 🐳 服务详解

### Supabase PostgreSQL 数据库

```yaml
db:
  image: supabase/postgres:17.4.1.043
  container_name: Snapifit-postgres
  command: postgres -c config_file=/etc/postgresql/postgresql.conf
  environment:
    POSTGRES_DB: snapfit_ai
    POSTGRES_USER: snapfit_user
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    POSTGRES_HOST_AUTH_METHOD: md5
```

**特性：**
- ✅ 使用 Supabase 官方 PostgreSQL 镜像
- ✅ 版本 17.4.1.043（最新稳定版）
- ✅ 标准 Supabase 配置
- ✅ 自动加载空数据库 schema
- ✅ 优化的性能配置

### SnapFit AI 应用

```yaml
Snapifit-ai:
  build:
    context: ../../
    dockerfile: deployment/docker-full/Dockerfile
  environment:
    - DB_PROVIDER=postgresql
    - DATABASE_URL=postgresql://user:pass@db:5432/database
```

**特性：**
- ✅ 多阶段构建优化
- ✅ 生产环境配置
- ✅ 健康检查
- ✅ 自动重启

## 🔧 管理命令

### 服务管理

```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 重启服务
docker-compose restart

# 查看服务状态
docker-compose ps

# 查看实时日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f db
docker-compose logs -f Snapifit-ai
```

### 数据库管理

```bash
# 进入数据库容器
docker-compose exec db psql -U snapfit_user -d snapfit_ai

# 备份数据库
docker-compose exec db pg_dump -U snapfit_user snapfit_ai > backup.sql

# 恢复数据库
docker-compose exec -T db psql -U snapfit_user -d snapfit_ai < backup.sql

# 查看数据库状态
docker-compose exec db pg_isready -U snapfit_user -d snapfit_ai
```

### 应用管理

```bash
# 进入应用容器
docker-compose exec Snapifit-ai sh

# 重新构建应用
docker-compose build --no-cache Snapifit-ai
docker-compose up -d Snapifit-ai

# 查看应用资源使用
docker stats Snapifit-ai-app
```

## 📊 监控和维护

### 健康检查

```bash
# 应用健康检查
curl -f http://localhost:3000/api/health

# 数据库健康检查
docker-compose exec db pg_isready -U snapfit_user -d snapfit_ai

# 查看所有容器状态
docker-compose ps
```

### 日志管理

```bash
# 查看日志大小
docker system df

# 清理日志
docker system prune

# 查看特定时间段日志
docker-compose logs --since="2024-01-01" --until="2024-01-02"
```

### 性能监控

```bash
# 查看资源使用
docker stats

# 查看容器详情
docker inspect Snapifit-ai-app
docker inspect Snapifit-postgres

# 查看网络状态
docker network inspect Snapifit-network
```

## 🔒 安全配置

### HTTP vs HTTPS 安全策略

项目会根据 `FORCE_HTTPS` 环境变量自动调整安全策略：

#### HTTP部署安全策略
- ❌ **HSTS**: 禁用强制HTTPS传输安全
- ❌ **CSP升级**: 禁用不安全请求升级
- ❌ **安全Cookie**: 禁用Cookie安全标志
- ✅ **基础安全头**: 保留XSS保护、内容类型嗅探保护等

#### HTTPS部署安全策略
- ✅ **HSTS**: 启用强制HTTPS传输安全
- ✅ **CSP升级**: 自动升级不安全请求为HTTPS
- ✅ **安全Cookie**: 启用Cookie安全标志
- ✅ **完整安全头**: 启用所有安全保护措施

### 数据库安全

- ✅ **端口隔离**：数据库端口不暴露到外部
- ✅ **密码认证**：使用 md5 密码认证
- ✅ **网络隔离**：使用专用 Docker 网络
- ✅ **SSL配置**：可通过 `DB_SSL` 环境变量控制
- ✅ **资源限制**：限制 CPU 和内存使用

### 应用安全

- ✅ **环境变量**：敏感信息通过环境变量配置
- ✅ **非 root 用户**：容器内使用非特权用户
- ✅ **健康检查**：自动监控和重启
- ✅ **日志轮转**：防止日志文件过大
- ✅ **动态安全策略**：根据部署环境自动调整安全配置

## 🔧 故障排除

### 常见问题

1. **容器启动失败**
   ```bash
   # 查看详细日志
   docker-compose logs db
   docker-compose logs Snapifit-ai

   # 检查配置
   docker-compose config
   ```

2. **数据库连接失败**
   ```bash
   # 检查数据库状态
   docker-compose exec db pg_isready -U snapfit_user -d snapfit_ai

   # 检查网络连接
   docker-compose exec Snapifit-ai ping db
   ```

3. **端口冲突**
   ```bash
   # 检查端口占用
   netstat -tlnp | grep :3000

   # 修改端口配置
   # 在 .env 中设置 APP_PORT=3001
   ```

### 调试技巧

```bash
# 进入容器调试
docker-compose exec db bash
docker-compose exec Snapifit-ai sh

# 查看容器内进程
docker-compose exec db ps aux
docker-compose exec Snapifit-ai ps aux

# 查看容器内网络
docker-compose exec Snapifit-ai netstat -tlnp
```

## 💰 资源需求

### 最低配置

- **CPU**: 2 核心
- **内存**: 4GB RAM
- **存储**: 20GB 可用空间
- **网络**: 稳定的互联网连接

### 推荐配置

- **CPU**: 4 核心
- **内存**: 8GB RAM
- **存储**: 50GB SSD
- **网络**: 高速互联网连接

## 🆚 与其他方案对比

| 特性 | docker-full | docker-single | 开发环境 |
|------|-------------|---------------|----------|
| **数据库** | 内置 Supabase PostgreSQL | 外部 Supabase | 外部数据库 |
| **容器数量** | 2个 | 1个 | 0个 |
| **内存使用** | ~2.5GB | ~1GB | ~500MB |
| **启动时间** | 2-3分钟 | 30秒 | 10秒 |
| **数据持久化** | Docker卷 | Supabase云端 | 外部数据库 |
| **适用场景** | 完全隔离部署 | 云环境部署 | 开发调试 |

开始您的完整 Docker 部署！🐳
