# SnapFit AI 部署指南

## 🚀 GitHub Actions 自动化部署

### 功能说明

GitHub Actions 会自动帮您：

1. **构建 Docker 镜像** - 每次推送代码时自动构建
2. **推送到 GitHub Container Registry** - 免费的容器仓库
3. **生成 docker-compose 文件** - 自动生成部署配置
4. **创建 Release** - 打标签时自动发布版本

### 🔧 设置步骤

#### 1. 启用 GitHub Actions
- 确保您的仓库启用了 Actions
- 推送代码到 `main` 或 `master` 分支

#### 2. 查看构建状态
- 访问 `https://github.com/您的用户名/仓库名/actions`
- 查看构建进度和日志

#### 3. 获取构建产物
构建完成后，您可以：
- 在 Actions 页面下载 `docker-compose-files` 工件
- 或者创建 Release 获取正式版本

## 📦 部署方式

### 方式1：使用外部数据库 (推荐生产环境)

```bash
# 1. 下载配置文件
curl -O https://github.com/您的用户名/仓库名/releases/latest/download/docker-compose.yml
curl -O https://github.com/您的用户名/仓库名/releases/latest/download/.env.example

# 2. 配置环境变量
cp .env.example .env
nano .env  # 编辑配置文件

# 3. 启动服务
docker-compose up -d

# 4. 查看日志
docker-compose logs -f snapfit-ai
```

### 方式2：包含数据库 (适合测试环境)

```bash
# 1. 下载完整配置
curl -O https://github.com/您的用户名/仓库名/releases/latest/download/docker-compose.full.yml
curl -O https://github.com/您的用户名/仓库名/releases/latest/download/.env.example

# 2. 配置环境变量
cp .env.example .env
nano .env

# 3. 启动服务 (包含PostgreSQL)
docker-compose -f docker-compose.full.yml up -d

# 4. 查看所有服务状态
docker-compose -f docker-compose.full.yml ps
```

## ⚙️ 环境变量配置

### 必需配置

```bash
# 数据库连接
DATABASE_URL=postgresql://username:password@host:5432/database

# 安全密钥 (生成一个长随机字符串)
NEXTAUTH_SECRET=your-very-long-random-secret-here

# 访问地址
NEXTAUTH_URL=http://your-domain.com:38000

# AI服务
OPENAI_API_KEY=sk-your-openai-key-here
```

### 可选配置

```bash
# 邮件服务 (用于密码重置等)
RESEND_API_KEY=re_your-resend-key-here

# 或者使用SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# 安全设置
INVITE_CODE_REQUIRED=true
INVITE_CODE=your-invite-code
RATE_LIMIT_ENABLED=true

# 日志级别
LOG_LEVEL=info
```

## 🔄 更新部署

### 自动更新 (推荐)

```bash
# 1. 拉取最新镜像
docker-compose pull

# 2. 重启服务
docker-compose up -d

# 3. 清理旧镜像
docker image prune -f
```

### 手动指定版本

```bash
# 修改 docker-compose.yml 中的镜像标签
# image: ghcr.io/您的用户名/仓库名:v1.2.3

docker-compose up -d
```

## 📊 监控和维护

### 查看服务状态

```bash
# 查看运行状态
docker-compose ps

# 查看实时日志
docker-compose logs -f

# 查看资源使用
docker stats
```

### 备份数据

```bash
# 备份数据卷
docker run --rm -v snapfit_data:/data -v $(pwd):/backup alpine tar czf /backup/snapfit-backup-$(date +%Y%m%d).tar.gz -C /data .

# 备份数据库 (如果使用内置PostgreSQL)
docker-compose exec postgres pg_dump -U snapfit_user snapfit_ai > backup-$(date +%Y%m%d).sql
```

### 恢复数据

```bash
# 恢复数据卷
docker run --rm -v snapfit_data:/data -v $(pwd):/backup alpine tar xzf /backup/snapfit-backup-20241203.tar.gz -C /data

# 恢复数据库
docker-compose exec -T postgres psql -U snapfit_user snapfit_ai < backup-20241203.sql
```

## 🐛 故障排除

### 常见问题

1. **容器无法启动**
   ```bash
   # 查看详细错误
   docker-compose logs snapfit-ai
   
   # 检查配置文件
   docker-compose config
   ```

2. **数据库连接失败**
   ```bash
   # 检查数据库状态
   docker-compose logs postgres
   
   # 测试连接
   docker-compose exec snapfit-ai npm run db:test
   ```

3. **端口冲突**
   ```bash
   # 修改端口映射
   # ports:
   #   - "38001:3000"  # 改为其他端口
   ```

### 性能优化

```bash
# 限制内存使用
# deploy:
#   resources:
#     limits:
#       memory: 1G
#     reservations:
#       memory: 512M
```

## 🔐 安全建议

1. **使用强密码** - 数据库和应用密钥
2. **启用防火墙** - 只开放必要端口
3. **定期更新** - 保持镜像和系统最新
4. **备份数据** - 定期备份重要数据
5. **监控日志** - 关注异常访问

## 📞 获取帮助

- **GitHub Issues**: 报告问题和建议
- **Discussions**: 社区讨论和经验分享
- **Wiki**: 详细文档和教程

---

🎉 现在您可以通过 GitHub Actions 自动化部署 SnapFit AI 了！
