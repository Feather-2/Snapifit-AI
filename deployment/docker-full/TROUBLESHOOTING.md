# 🔧 SnapFit AI Docker 完整部署故障排除指南

本文档提供常见问题的解决方案和调试方法。

## 🚨 常见问题

### 1. 数据库相关问题

#### 问题：数据库连接失败
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**解决方案：**
```bash
# 检查数据库容器状态
docker-compose ps

# 查看数据库日志
docker-compose logs db

# 检查数据库是否就绪
docker-compose exec db pg_isready -U snapfit_user -d snapfit_ai

# 重启数据库服务
docker-compose restart db
```

#### 问题：数据库认证失败
```
FATAL: password authentication failed for user "snapfit_user"
```

**解决方案：**
```bash
# 检查环境变量
grep POSTGRES_PASSWORD .env

# 重新创建数据库卷
docker-compose down
docker volume rm snapfit-postgres-data
docker-compose up -d
```

#### 问题：数据库初始化失败
```
initdb: error: directory "/var/lib/postgresql/data" exists but is not empty
```

**解决方案：**
```bash
# 完全清理并重新初始化
docker-compose down -v
docker volume prune -f
docker-compose up -d
```

### 2. 应用相关问题

#### 问题：应用启动失败
```
Error: Cannot find module 'next'
```

**解决方案：**
```bash
# 重新构建应用镜像
docker-compose build --no-cache snapfit-ai
docker-compose up -d snapfit-ai
```

#### 问题：健康检查失败
```
curl: (7) Failed to connect to localhost port 38000
```

**解决方案：**
```bash
# 检查应用日志
docker-compose logs snapfit-ai

# 检查端口映射
docker-compose ps

# 检查应用容器内部
docker-compose exec snapfit-ai curl http://localhost:3000/api/health
```

#### 问题：环境变量未生效
```
Error: NEXTAUTH_SECRET is not defined
```

**解决方案：**
```bash
# 检查 .env 文件
cat .env | grep NEXTAUTH_SECRET

# 重新启动服务
docker-compose down
docker-compose up -d

# 检查容器内环境变量
docker-compose exec snapfit-ai env | grep NEXTAUTH_SECRET
```

### 3. 网络相关问题

#### 问题：容器间网络连接失败
```
Error: getaddrinfo ENOTFOUND db
```

**解决方案：**
```bash
# 检查网络
docker network ls | grep snapfit

# 检查容器网络连接
docker-compose exec snapfit-ai ping db

# 重新创建网络
docker-compose down
docker-compose up -d
```

### 4. 权限相关问题

#### 问题：文件权限错误
```
Error: EACCES: permission denied, open '/app/logs/app.log'
```

**解决方案：**
```bash
# 检查卷挂载权限
docker-compose exec snapfit-ai ls -la /app/logs

# 修复权限（如果需要）
docker-compose exec --user root snapfit-ai chown -R nextjs:nodejs /app/logs
```

## 🔍 调试方法

### 1. 查看日志

```bash
# 查看所有服务日志
docker-compose logs

# 查看特定服务日志
docker-compose logs db
docker-compose logs snapfit-ai

# 实时查看日志
docker-compose logs -f

# 查看最近的日志
docker-compose logs --tail=50
```

### 2. 进入容器调试

```bash
# 进入数据库容器
docker-compose exec db bash

# 进入应用容器
docker-compose exec snapfit-ai sh

# 以 root 用户进入容器
docker-compose exec --user root snapfit-ai sh
```

### 3. 检查配置

```bash
# 验证 docker-compose 配置
docker-compose config

# 检查环境变量
docker-compose exec snapfit-ai env

# 检查网络配置
docker network inspect snapfit-network
```

### 4. 资源监控

```bash
# 查看容器资源使用
docker stats

# 查看系统资源
docker system df

# 查看容器详情
docker inspect snapfit-ai-app
docker inspect snapfit-postgres
```

## 🛠️ 重置和清理

### 完全重置部署

```bash
# 停止所有服务
docker-compose down

# 删除所有卷（注意：会丢失数据）
docker-compose down -v

# 删除镜像
docker rmi snapfit-ai:latest

# 清理系统
docker system prune -f

# 重新部署
./quick-start.sh
```

### 仅重置数据库

```bash
# 停止服务
docker-compose down

# 删除数据库卷
docker volume rm snapfit-postgres-data

# 重新启动
docker-compose up -d
```

### 仅重建应用

```bash
# 重新构建应用
docker-compose build --no-cache snapfit-ai

# 重启应用服务
docker-compose up -d snapfit-ai
```

## 📊 性能优化

### 数据库性能

```bash
# 检查数据库连接数
docker-compose exec db psql -U snapfit_user -d snapfit_ai -c "SELECT count(*) FROM pg_stat_activity;"

# 检查慢查询
docker-compose exec db psql -U snapfit_user -d snapfit_ai -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

### 应用性能

```bash
# 检查应用内存使用
docker stats snapfit-ai-app

# 检查应用日志中的性能信息
docker-compose logs snapfit-ai | grep -i "slow\|performance\|memory"
```

## 🆘 获取帮助

### 收集诊断信息

运行以下命令收集诊断信息：

```bash
#!/bin/bash
echo "=== 系统信息 ===" > debug.log
uname -a >> debug.log
docker --version >> debug.log
docker-compose --version >> debug.log

echo -e "\n=== 容器状态 ===" >> debug.log
docker-compose ps >> debug.log

echo -e "\n=== 容器日志 ===" >> debug.log
docker-compose logs --tail=100 >> debug.log

echo -e "\n=== 网络信息 ===" >> debug.log
docker network ls >> debug.log

echo -e "\n=== 卷信息 ===" >> debug.log
docker volume ls >> debug.log

echo -e "\n=== 资源使用 ===" >> debug.log
docker stats --no-stream >> debug.log

echo "诊断信息已保存到 debug.log"
```

### 联系支持

如果问题仍未解决，请提供以下信息：

1. 操作系统和版本
2. Docker 和 Docker Compose 版本
3. 错误信息和日志
4. 使用的配置文件（隐藏敏感信息）
5. 诊断信息文件

## 📚 相关文档

- [部署指南](./README.md)
- [环境变量指南](../../docs/ENV-FILE-GUIDE.md)
- [HTTP/HTTPS 部署指南](../../docs/DEPLOYMENT-HTTP-HTTPS.md)
- [安全配置清单](../../docs/SECURITY-CHECKLIST.md)
