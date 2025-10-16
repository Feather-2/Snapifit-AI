# Docker 单容器部署 + Supabase

轻量级容器化部署方案，结合 Docker 的环境一致性和 Supabase 的云数据库优势。

## 🎯 方案特点

- ✅ **轻量级部署**：只需一个应用容器
- ✅ **托管数据库**：使用 Supabase 云数据库服务
- ✅ **快速启动**：5-10分钟完成部署
- ✅ **易于扩展**：支持水平扩展和负载均衡
- ✅ **CI/CD 友好**：完美适配自动化部署流程
- ✅ **成本优化**：减少服务器资源消耗

## 📋 部署步骤

### 步骤1：环境准备

```bash
# 检查 Docker 安装
docker --version
docker-compose --version

# 如果未安装 Docker，请先安装
# Ubuntu/Debian:
# curl -fsSL https://get.docker.com -o get-docker.sh
# sudo sh get-docker.sh

# 进入项目目录
cd your-project-directory
```

### 步骤2：配置 Supabase

1. **创建 Supabase 项目**
   - 访问：https://supabase.com/dashboard
   - 创建新项目或使用现有项目

2. **获取 API 密钥**
   - 进入项目设置：Settings > API
   - 复制以下信息：
     - Project URL
     - Anon (public) key
     - Service role (secret) key

3. **部署数据库结构**
   - 在 Supabase SQL Editor 中执行：
   - `deployment/database/empty_database_schema.sql`

### 步骤3：配置环境变量

```bash
# 进入 docker-single 目录
cd deployment/docker-single

# 复制环境配置模板
cp .env.example .env

# 编辑配置文件
nano .env
```

**必须配置的项目：**
```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# 应用安全配置
NEXTAUTH_SECRET=your_random_secret_here
KEY_ENCRYPTION_SECRET=your_encryption_secret_here
```

### 步骤4：构建和启动

```bash
# 构建并启动容器
docker-compose up -d

# 查看启动状态
docker-compose ps

# 查看日志
docker-compose logs -f snapfit-ai
```

### 步骤5：验证部署

```bash
# 健康检查
curl -f http://localhost:3000/api/health

# 访问应用
# http://localhost:3000
```

## 🐳 Docker 配置详解

### Dockerfile 特性

- **多阶段构建**：优化镜像大小（~200MB）
- **非 root 用户**：提高安全性
- **健康检查**：自动监控容器状态
- **生产优化**：启用 Next.js 优化

### docker-compose.yml 配置

```yaml
version: '3.8'

services:
  snapfit-ai:
    build:
      context: ../../
      dockerfile: deployment/docker-single/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_PROVIDER=supabase
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## 🚀 生产部署

### 云服务器部署

```bash
# 1. 连接到服务器
ssh user@your-server.com

# 2. 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 3. 克隆项目
git clone your-repo-url
cd your-project

# 4. 配置环境变量
cd deployment/docker-single
cp .env.example .env
nano .env

# 5. 启动服务
docker-compose up -d

# 6. 配置域名和SSL（可选）
```

### 使用 Nginx 反向代理

```nginx
# /etc/nginx/sites-available/snapfit-ai
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL 配置（Let's Encrypt）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取 SSL 证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo crontab -e
# 添加：0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔧 管理命令

### 容器管理

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

# 进入容器
docker-compose exec snapfit-ai sh

# 更新应用
git pull
docker-compose build --no-cache
docker-compose up -d
```

### 应用管理

```bash
# 健康检查
curl -f http://localhost:3000/api/health

# 查看资源使用
docker stats

# 备份配置
cp .env .env.backup.$(date +%Y%m%d)

# 查看容器详情
docker inspect snapfit-ai-single
```

## 📊 监控和日志

### 容器监控

```bash
# 查看资源使用
docker stats snapfit-ai-single

# 查看容器详情
docker inspect snapfit-ai-single

# 查看网络
docker network ls
docker network inspect snapfit-single-network
```

### 日志管理

```bash
# 实时日志
docker-compose logs -f --tail=100

# 导出日志
docker-compose logs > app.log

# 日志轮转已在 docker-compose.yml 中配置
```

## 🔒 安全配置

### 容器安全

1. **非 root 用户**：容器内使用 nextjs 用户
2. **资源限制**：限制 CPU 和内存使用
3. **网络隔离**：使用自定义网络
4. **健康检查**：自动监控和重启

### 生产安全清单

- [ ] 更新所有默认密钥
- [ ] 配置防火墙规则
- [ ] 启用 HTTPS
- [ ] 设置 API 限流
- [ ] 配置日志监控
- [ ] 定期更新镜像
- [ ] 备份 Supabase 数据

## 🔄 CI/CD 集成

### GitHub Actions 示例

```yaml
# .github/workflows/deploy-single.yml
name: Deploy Single Container

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to server
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /path/to/snapfit-ai
            git pull
            cd deployment/docker-single
            docker-compose build --no-cache
            docker-compose up -d
```

## 💰 成本分析

### 服务成本

- **VPS**：$5-20/月（1-2GB RAM）
- **Supabase**：$0-25/月（按使用量）
- **域名**：$10-15/年
- **SSL证书**：免费（Let's Encrypt）

### 成本优化

1. 选择合适的服务器配置（1-2GB RAM 足够）
2. 使用 Supabase 免费额度
3. 配置资源限制避免过度消耗
4. 使用 CDN 减少带宽成本

## 📞 故障排除

### 常见问题

1. **容器启动失败**
   ```bash
   # 查看详细日志
   docker-compose logs snapfit-ai
   
   # 检查配置
   docker-compose config
   ```

2. **Supabase 连接失败**
   ```bash
   # 检查环境变量
   docker-compose exec snapfit-ai env | grep SUPABASE
   
   # 测试连接
   curl -f http://localhost:3000/api/debug/db-test
   ```

3. **端口冲突**
   ```bash
   # 检查端口占用
   sudo netstat -tlnp | grep :3000
   
   # 修改端口映射
   # 在 .env 中设置 APP_PORT=3001
   ```

### 调试技巧

```bash
# 进入容器调试
docker-compose exec snapfit-ai sh

# 查看容器内进程
docker-compose exec snapfit-ai ps aux

# 查看容器内网络
docker-compose exec snapfit-ai netstat -tlnp

# 测试 Supabase 连接
docker-compose exec snapfit-ai curl -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/"
```

## 🆚 与其他方案对比

| 特性 | docker-single | docker-full | 开发环境 |
|------|---------------|-------------|----------|
| **容器数量** | 1个 | 3-4个 | 0个 |
| **数据库** | Supabase | PostgreSQL | Supabase/PostgreSQL |
| **内存使用** | ~1GB | ~2.5GB | ~500MB |
| **启动时间** | 30秒 | 2-3分钟 | 10秒 |
| **适用场景** | 生产/云部署 | 完全隔离 | 开发调试 |

开始您的轻量级 Docker 部署！🐳
