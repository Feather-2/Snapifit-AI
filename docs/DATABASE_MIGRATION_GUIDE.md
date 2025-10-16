# SnapFit AI 数据库迁移指南

从 Supabase 迁移到标准 PostgreSQL 的完整指南。

## 📋 概述

本指南将帮助你将 SnapFit AI 项目从 Supabase 迁移到标准的 PostgreSQL 数据库。

## 🛠️ 准备工作

### 1. 服务器要求
- Ubuntu 18.04+ 或其他 Linux 发行版
- PostgreSQL 12+ 
- 足够的磁盘空间

### 2. 安装必要工具
```bash
# 更新系统
sudo apt update

# 安装 PostgreSQL 客户端工具
sudo apt install postgresql-client

# 如果需要安装 PostgreSQL 服务器
sudo apt install postgresql postgresql-contrib
```

## 📤 第一步：从 Supabase 导出数据

### 1. 导出数据库结构
```bash
# 使用你的 Supabase 连接信息
pg_dump "postgresql://postgres.zvjmcihslxlahvovhiye:mZPP4MvHFjebIiZX@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --file=supabase_schema.sql
```

### 2. 导出数据（如果需要）
```bash
# 如果你有数据需要迁移
pg_dump "postgresql://postgres.zvjmcihslxlahvovhiye:mZPP4MvHFjebIiZX@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres" \
  --data-only \
  --no-owner \
  --no-privileges \
  --table=users \
  --table=user_profiles \
  --table=shared_keys \
  --table=daily_logs \
  --table=ai_memories \
  --table=security_events \
  --table=invite_codes \
  --table=invite_configs \
  --file=supabase_data.sql
```

## 🧹 第二步：清理 Supabase 特有内容

### 1. 下载清理脚本
确保你有 `clean-supabase-schema.sh` 脚本。

### 2. 运行清理脚本
```bash
# 给脚本执行权限
chmod +x clean-supabase-schema.sh

# 运行清理脚本
./clean-supabase-schema.sh
```

### 3. 验证清理结果
脚本会生成以下文件：
- `postgresql_schema.sql` - 清理后的 PostgreSQL schema
- `supabase_schema_backup.sql` - 原始文件备份

## 🚀 第三步：部署到 PostgreSQL

### 方法一：使用自动部署脚本（推荐）

```bash
# 给部署脚本执行权限
chmod +x deploy-postgresql.sh

# 运行部署脚本
./deploy-postgresql.sh -d snapfit_ai -u snapfit_user -p your_password

# 或者交互式运行
./deploy-postgresql.sh
```

### 方法二：手动部署

```bash
# 1. 连接到 PostgreSQL
sudo -u postgres psql

# 2. 创建数据库和用户
CREATE USER snapfit_user WITH PASSWORD 'your_password';
CREATE DATABASE snapfit_ai OWNER snapfit_user;
GRANT ALL PRIVILEGES ON DATABASE snapfit_ai TO snapfit_user;
\q

# 3. 部署 schema
psql -U snapfit_user -d snapfit_ai -f postgresql_schema.sql

# 4. 如果有数据需要导入
psql -U snapfit_user -d snapfit_ai -f supabase_data.sql
```

## ⚙️ 第四步：配置应用

### 1. 更新环境变量
```bash
# 在你的 .env 文件中添加或更新
DATABASE_URL=postgresql://snapfit_user:your_password@localhost:5432/snapfit_ai
DB_HOST=localhost
DB_PORT=5432
DB_NAME=snapfit_ai
DB_USER=snapfit_user
DB_PASSWORD=your_password
```

### 2. 更新应用代码
如果你的应用使用 Supabase 客户端，需要更新为标准的 PostgreSQL 连接：

```typescript
// 替换 Supabase 客户端
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

export { pool as db }
```

## 🔍 第五步：验证迁移

### 1. 检查表结构
```sql
-- 连接到数据库
psql -U snapfit_user -d snapfit_ai

-- 查看所有表
\dt

-- 检查核心表
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'user_profiles', 'shared_keys', 'daily_logs', 'ai_memories', 'security_events', 'invite_codes', 'invite_configs');
```

### 2. 测试应用连接
```bash
# 启动你的应用并测试基本功能
npm run dev
# 或
yarn dev
```

## 📊 核心表说明

迁移后应该包含以下核心表：

| 表名 | 用途 | 重要性 |
|------|------|--------|
| `users` | 用户基本信息 | 核心 |
| `user_profiles` | 用户详细档案 | 核心 |
| `shared_keys` | 共享 API 密钥 | 核心 |
| `daily_logs` | 用户日志 | 重要 |
| `ai_memories` | AI 记忆 | 重要 |
| `security_events` | 安全事件 | 重要 |
| `invite_codes` | 邀请码 | 功能性 |
| `invite_configs` | 邀请码配置 | 功能性 |

## 🔧 故障排除

### 常见问题

1. **版本不匹配错误**
   ```bash
   # 升级 PostgreSQL 客户端
   sudo apt install postgresql-client-17
   ```

2. **权限错误**
   ```sql
   -- 授予必要权限
   GRANT ALL PRIVILEGES ON DATABASE snapfit_ai TO snapfit_user;
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO snapfit_user;
   GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO snapfit_user;
   ```

3. **连接错误**
   ```bash
   # 检查 PostgreSQL 服务状态
   sudo systemctl status postgresql
   
   # 启动服务
   sudo systemctl start postgresql
   ```

4. **扩展缺失**
   ```sql
   -- 安装必要扩展
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS "pgcrypto";
   ```

## 🎯 最佳实践

1. **备份**: 始终在迁移前备份原始数据
2. **测试**: 在生产环境部署前先在测试环境验证
3. **监控**: 迁移后监控应用性能和错误日志
4. **文档**: 记录所有配置更改和自定义设置

## 📞 支持

如果遇到问题，请检查：
1. PostgreSQL 服务是否正常运行
2. 网络连接是否正常
3. 用户权限是否正确配置
4. 环境变量是否正确设置

---

**注意**: 这个迁移过程会移除所有 Supabase 特有的功能（如 RLS、实时订阅等）。如果你的应用依赖这些功能，需要使用其他方案替代。
