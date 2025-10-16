# SnapFit AI 简化部署指南

## 已修复的问题

为了避免 PostgreSQL 部署出错，已经移除了以下可能导致问题的内容：

### 1. 环境变量清理
- 移除了硬编码的 API 密钥和敏感信息
- 注释掉了所有第三方服务配置（GitHub OAuth、邮件服务等）
- 简化了数据库连接配置

### 2. Docker Compose 简化
- 移除了 Supabase 特定的环境变量
- 简化了 PostgreSQL 初始化参数
- 移除了复杂的数据库初始化脚本挂载
- 增加了健康检查重试次数和启动时间

### 3. 数据库初始化简化
- 大幅简化了 `01-init-database.sql` 脚本
- 移除了复杂的用户创建和权限设置逻辑
- 只保留必要的扩展创建

### 4. PostgreSQL 配置优化
- 大幅简化了 `postgresql.conf` 配置
- 移除了可能不兼容的配置项
- 使用最基本的安全配置

### 5. 移除问题脚本
- 删除了复杂的 `auto-init-db.sh` 脚本
- 避免了复杂的数据库状态检查逻辑

## 部署步骤

1. **复制环境配置**
   ```bash
   cd deployment/docker-full
   cp .env .env.local
   ```

2. **编辑配置文件**
   ```bash
   nano .env.local
   ```
   
   必须设置的变量：
   ```
   POSTGRES_PASSWORD=your_secure_password
   NEXTAUTH_SECRET=your_nextauth_secret
   KEY_ENCRYPTION_SECRET=your_encryption_secret
   ```

3. **构建镜像**
   ```bash
   ./build-image.sh
   ```

4. **启动服务**
   ```bash
   docker-compose --env-file .env.local up -d
   ```

5. **检查状态**
   ```bash
   docker-compose ps
   docker-compose logs db
   docker-compose logs snapfit-ai
   ```

## 故障排除

如果遇到数据库问题：

1. **清理并重新启动**
   ```bash
   docker-compose down -v
   docker-compose --env-file .env.local up -d
   ```

2. **查看日志**
   ```bash
   docker-compose logs -f db
   ```

3. **手动连接测试**
   ```bash
   docker-compose exec db psql -U snapfit_user -d snapfit_ai
   ```

## 注意事项

- 所有敏感信息已被移除或注释
- 使用最简化的 PostgreSQL 配置
- 避免了复杂的初始化逻辑
- 数据库会自动创建用户和数据库
- 应用会在首次启动时自动创建表结构
