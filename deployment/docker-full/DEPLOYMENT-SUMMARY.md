# 🚀 SnapFit AI Docker 完整部署总结

## 📋 部署配置概览

### 端口配置
- **主机访问端口**: 38000
- **容器内部端口**: 3000
- **数据库端口**: 5432 (仅容器内部)

### 服务架构
```
┌─────────────────────────────────────────┐
│              主机系统                    │
│  ┌─────────────────────────────────────┐ │
│  │         Docker 网络              │ │
│  │  ┌─────────────┐  ┌─────────────┐ │ │
│  │  │ snapfit-ai  │  │ PostgreSQL  │ │ │
│  │  │   :3000     │  │    :5432    │ │ │
│  │  └─────────────┘  └─────────────┘ │ │
│  └─────────────────────────────────────┘ │
│           │                              │
│    端口映射 38000:3000                   │
└─────────────────────────────────────────┘
```

## 🔧 核心文件说明

### 1. Dockerfile
- **位置**: `deployment/docker-full/Dockerfile`
- **功能**: 多阶段构建 SnapFit AI 应用镜像
- **特点**: 
  - 基于 Node.js 18 Alpine
  - 支持构建参数（版本、提交哈希等）
  - 非 root 用户运行
  - 内置健康检查

### 2. docker-compose.yml
- **位置**: `deployment/docker-full/docker-compose.yml`
- **功能**: 编排应用和数据库服务
- **特点**:
  - 自动构建应用镜像
  - 端口映射 38000:3000
  - 数据持久化
  - 健康检查和自动重启

### 3. 初始化脚本
- **位置**: `deployment/docker-full/init-scripts/`
- **功能**: 数据库初始化
- **执行顺序**:
  1. `01-init-database.sql` - 创建用户和权限
  2. `02-schema.sql` - 应用数据库结构

### 4. 管理脚本
- **quick-start.sh**: 一键部署脚本
- **build.sh**: 镜像构建脚本
- **verify-deployment.sh**: 部署验证脚本

## 🚀 快速部署流程

### 1. 环境准备
```bash
cd deployment/docker-full
cp .env.example .env
# 编辑 .env 文件设置密码
```

### 2. 一键部署
```bash
chmod +x quick-start.sh
./quick-start.sh
```

### 3. 验证部署
```bash
chmod +x verify-deployment.sh
./verify-deployment.sh
```

## 📊 环境变量配置

### 必须配置
```bash
POSTGRES_PASSWORD=your_secure_password
NEXTAUTH_SECRET=your_nextauth_secret
KEY_ENCRYPTION_SECRET=your_encryption_secret
```

### 端口配置
```bash
APP_HOST_PORT=38000          # 主机端口
APP_CONTAINER_PORT=3000      # 容器端口
NEXTAUTH_URL=http://localhost:38000
```

### 部署类型配置
```bash
DEPLOYMENT_TYPE=http         # http | https
FORCE_HTTPS=false           # HTTP部署设为false
DB_SSL=false                # 本地部署设为false
```

## 🐳 Docker 镜像管理

### 构建镜像
```bash
# 使用构建脚本
./build.sh

# 强制重新构建
./build.sh --force --no-cache

# 手动构建
docker-compose build --no-cache
```

### 镜像标签
- `snapfit-ai:latest` - 最新版本
- `snapfit-ai:1.0.0` - 版本标签

### 镜像信息
```bash
# 查看镜像
docker images | grep snapfit-ai

# 查看镜像详情
docker inspect snapfit-ai:latest
```

## 🔍 服务管理

### 启动和停止
```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart
```

### 日志查看
```bash
# 查看所有日志
docker-compose logs -f

# 查看应用日志
docker-compose logs -f snapfit-ai

# 查看数据库日志
docker-compose logs -f db
```

### 容器管理
```bash
# 进入应用容器
docker-compose exec snapfit-ai sh

# 进入数据库容器
docker-compose exec db psql -U snapfit_user -d snapfit_ai

# 查看容器状态
docker-compose ps
```

## 🗄️ 数据库管理

### 连接数据库
```bash
docker-compose exec db psql -U snapfit_user -d snapfit_ai
```

### 备份和恢复
```bash
# 备份数据库
docker-compose exec db pg_dump -U snapfit_user snapfit_ai > backup.sql

# 恢复数据库
docker-compose exec -T db psql -U snapfit_user -d snapfit_ai < backup.sql
```

### 重置数据库
```bash
# 停止服务
docker-compose down

# 删除数据卷
docker volume rm snapfit-postgres-data

# 重新启动
docker-compose up -d
```

## 🌐 访问信息

### 应用访问
- **URL**: http://localhost:38000
- **健康检查**: http://localhost:38000/api/health
- **API**: http://localhost:38000/api/*

### 数据库访问
- **主机**: db (容器内部)
- **端口**: 5432
- **用户**: snapfit_user
- **数据库**: snapfit_ai

## ⚠️ 注意事项

### 1. 端口冲突
如果 38000 端口被占用，修改 `.env` 文件中的 `APP_HOST_PORT`

### 2. 数据持久化
数据存储在 Docker 卷中，删除卷会丢失所有数据

### 3. 内存要求
- 最低: 2GB RAM
- 推荐: 4GB RAM

### 4. 网络配置
容器使用自定义网络 `snapfit-network`，确保没有网络冲突

## 🔧 故障排除

### 常见问题
1. **端口被占用**: 修改 `APP_HOST_PORT`
2. **数据库连接失败**: 检查数据库容器状态
3. **应用启动失败**: 查看应用日志
4. **权限错误**: 检查文件权限和用户配置

### 获取帮助
- 查看 `TROUBLESHOOTING.md`
- 运行 `./verify-deployment.sh`
- 检查容器日志

## 📚 相关文档

- [完整部署指南](./README.md)
- [故障排除指南](./TROUBLESHOOTING.md)
- [环境变量指南](../../docs/ENV-FILE-GUIDE.md)
- [HTTP/HTTPS 部署指南](../../docs/DEPLOYMENT-HTTP-HTTPS.md)
