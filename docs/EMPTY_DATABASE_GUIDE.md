# 空数据库生成指南

本指南介绍如何生成和部署一个保留所有数据库结构但清空数据的PostgreSQL数据库版本。

## 📋 概述

空数据库版本包含：
- ✅ **保留所有表结构** - users, user_profiles, shared_keys, daily_logs, ai_memories等
- ✅ **保留所有函数** - upsert_ai_memories, atomic_usage_check_and_increment等
- ✅ **保留所有触发器** - 自动更新时间戳、数据验证等
- ✅ **保留所有索引和约束** - 性能优化和数据完整性
- ✅ **保留所有视图** - 数据查询视图
- 🧹 **清除所有数据行** - 所有表中的数据都被清空
- 🔄 **重置所有序列** - ID序列重置为初始值

## 🚀 快速开始

### 一键完整工作流（推荐）

```bash
# 给脚本执行权限
chmod +x scripts/setup-empty-database.sh

# 运行完整工作流
./scripts/setup-empty-database.sh
```

这个脚本会自动执行：
1. 📤 导出当前数据库schema
2. 🏗️ 生成空数据库版本
3. 🐳 准备Docker部署文件
4. 🚀 (可选) 直接部署

### 分步执行

如果您想分步执行，可以按以下顺序：

#### 第一步：导出当前数据库Schema

```bash
# 导出当前数据库
node scripts/export-database-schema.js
```

#### 第二步：生成空数据库Schema

```bash
# 生成空版本
node scripts/create-empty-database.js
```

#### 第三步：部署

**方法一：Docker Compose部署（推荐）**

```bash
# 进入Docker目录
cd deployment/docker-full

# 编辑环境变量
nano .env

# 启动服务
docker-compose up -d
```

**方法二：部署到现有PostgreSQL**

```bash
# 使用部署脚本
./scripts/deploy-empty-database.sh

# 或手动部署
psql -h localhost -p 5432 -U snapfit_user -d snapfit_ai \
  -f deployment/database/empty_database_schema.sql
```

## 📊 脚本功能详解

### create-empty-database.js

**功能：**
- 基于现有schema生成空数据库版本
- 智能识别和移除数据语句
- 保留所有数据库结构
- 添加数据清理语句

**处理过程：**
1. 移除所有 `INSERT INTO` 语句
2. 移除所有 `COPY ... FROM stdin` 数据块
3. 移除所有 `SELECT pg_catalog.setval` 序列设置
4. 添加按依赖关系排序的 `DELETE` 语句
5. 添加序列重置语句

**验证功能：**
- 检查核心表是否存在
- 检查核心函数是否存在
- 验证数据语句是否已移除
- 生成详细的处理统计

### deploy-empty-database.sh

**功能：**
- 自动化部署空数据库schema
- 支持命令行参数和交互式输入
- 包含安全确认机制
- 提供数据备份选项

**安全特性：**
- 连接测试
- 操作确认（需要输入 "CONFIRM"）
- 可选数据备份
- 部署结果验证

## 🔧 使用场景

### 1. 开发环境重置
```bash
# 重置开发数据库到干净状态
node scripts/create-empty-database.js
./scripts/deploy-empty-database.sh --database dev_snapfit_ai
```

### 2. 测试环境准备
```bash
# 为测试准备干净的数据库
node scripts/create-empty-database.js
./scripts/deploy-empty-database.sh --database test_snapfit_ai
```

### 3. 生产环境初始化
```bash
# 为新的生产环境准备数据库
node scripts/create-empty-database.js
./scripts/deploy-empty-database.sh --database prod_snapfit_ai --host prod-server
```

### 4. 加密密钥更改后的数据清理
```bash
# 当KEY_ENCRYPTION_SECRET更改时，清理加密数据
node scripts/create-empty-database.js
./scripts/deploy-empty-database.sh
```

## 📁 生成的文件

| 文件 | 描述 |
|------|------|
| `deployment/database/empty_database_schema.sql` | 空数据库schema文件 |
| `deployment/database/supabase_schema_backup.sql` | 原始schema备份 |
| `backup_YYYYMMDD_HHMMSS.sql` | 部署前的数据备份（可选） |

## ⚠️ 注意事项

### 安全警告
- **数据丢失风险**：部署空数据库会清空所有现有数据
- **不可逆操作**：数据清理后无法恢复（除非有备份）
- **生产环境**：在生产环境使用前请务必备份

### 最佳实践
1. **总是备份**：部署前创建完整的数据备份
2. **测试环境先试**：在测试环境验证脚本功能
3. **分步执行**：先生成schema，检查无误后再部署
4. **权限控制**：确保数据库用户有足够的权限

## 🔍 故障排除

### 常见问题

**Q: 脚本提示找不到schema文件**
```bash
# 确保在项目根目录运行
cd /path/to/health-app
node scripts/create-empty-database.js
```

**Q: 数据库连接失败**
```bash
# 检查数据库服务状态
sudo systemctl status postgresql

# 检查连接参数
psql -h localhost -p 5432 -U username -d database -c "SELECT 1;"
```

**Q: 权限不足错误**
```sql
-- 确保用户有足够权限
GRANT ALL PRIVILEGES ON DATABASE snapfit_ai TO snapfit_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO snapfit_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO snapfit_user;
```

### 验证部署结果

```sql
-- 检查表结构
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;

-- 检查函数
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' ORDER BY routine_name;

-- 检查数据是否为空
SELECT
  table_name,
  (SELECT COUNT(*) FROM users) as users_count,
  (SELECT COUNT(*) FROM daily_logs) as logs_count,
  (SELECT COUNT(*) FROM ai_memories) as memories_count;
```

## 📞 支持

如果遇到问题，请检查：
1. PostgreSQL服务是否正常运行
2. 数据库连接参数是否正确
3. 用户权限是否足够
4. schema文件是否存在且完整

更多帮助请参考项目文档或提交Issue。
