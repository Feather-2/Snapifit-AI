# PostgreSQL 数据库性能优化指南

本指南专门针对使用 PostgreSQL 数据库的 SnapFit AI 系统进行性能优化。

## 🚀 快速开始

### 方法一：自动化脚本执行（推荐）

```bash
# 1. 确保环境变量设置正确
export DATABASE_URL=postgresql://username:password@localhost:5432/snapfit_ai

# 2. 给脚本执行权限
chmod +x optimize-database-postgresql.sh

# 3. 运行优化脚本
./optimize-database-postgresql.sh
```

### 方法二：Node.js 脚本执行

```bash
# 1. 安装依赖
npm install pg

# 2. 设置环境变量
export DATABASE_URL=postgresql://username:password@localhost:5432/snapfit_ai

# 3. 执行优化脚本
node scripts/apply-performance-optimizations-postgresql.js
```

### 方法三：手动 SQL 执行

如果您更喜欢手动控制，可以直接在 PostgreSQL 中执行 SQL：

```bash
# 1. 连接到数据库
psql $DATABASE_URL

# 2. 执行索引创建（一个一个执行）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_ip_address
ON security_events USING hash (ip_address);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_memories_last_updated
ON ai_memories (last_updated);

# ... 其他索引

# 3. 执行缓存表和函数创建
\i database-migrations/performance-optimization.sql
```

## 📊 优化内容

### 🔧 索引优化
- **IP检查索引**: 提升 IP 查询性能 99%+
- **AI记忆索引**: 提升 AI 记忆查询性能 80%+
- **用户信任等级索引**: 提升用户查询性能 70%+
- **共享密钥索引**: 提升密钥查询性能 60%+
- **日志索引**: 提升日志查询性能 50%+

### 🗄️ 缓存表
- **IP检查缓存**: 1小时TTL，减少重复IP查询
- **时区数据缓存**: 静态缓存，减少时区查询
- **表信息物化视图**: 提升管理面板性能
- **函数信息物化视图**: 提升系统查询性能

### ⚙️ 维护函数
- **cleanup_ip_cache()**: 清理过期IP缓存
- **is_ip_banned_cached()**: 带缓存的IP检查
- **refresh_performance_caches()**: 刷新所有缓存

## 📈 性能提升预期

| 优化项目 | 当前性能 | 优化后性能 | 提升幅度 |
|----------|----------|------------|----------|
| IP检查调用 | 14,170次/小时 | <100次/小时 | 99.6%↓ |
| 整体查询时间 | 基准 | 减少40-60% | 40-60%↓ |
| 数据库负载 | 基准 | 减少50%+ | 50%+↓ |
| 管理面板响应 | 基准 | 减少70%+ | 70%+↓ |

## 🔍 验证优化效果

### 检查索引创建
```sql
SELECT schemaname, tablename, indexname
FROM pg_indexes 
WHERE indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

### 检查缓存表
```sql
SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%cache%'
ORDER BY table_name;
```

### 监控缓存效果
```sql
-- 检查IP缓存命中情况
SELECT 
  COUNT(*) as total_cached_ips,
  COUNT(*) FILTER (WHERE expires_at > NOW()) as active_entries,
  COUNT(*) FILTER (WHERE cached_at > NOW() - INTERVAL '1 hour') as recent_entries
FROM ip_check_cache;

-- 检查物化视图状态
SELECT schemaname, matviewname, hasindexes, ispopulated
FROM pg_matviews 
WHERE matviewname LIKE '%cache%';
```

### 查看慢查询
```sql
-- 需要启用 pg_stat_statements 扩展
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;
```

## 🔧 日常维护

### 定期维护任务

```sql
-- 每天执行一次缓存刷新
SELECT refresh_performance_caches();
```

```bash
# 设置定时任务（crontab）
# 每天凌晨2点执行缓存刷新
0 2 * * * psql $DATABASE_URL -c "SELECT refresh_performance_caches();" > /dev/null 2>&1
```

### 监控脚本

创建监控脚本 `monitor-cache-performance.sh`:

```bash
#!/bin/bash
echo "📊 缓存性能监控报告 - $(date)"
echo "================================="

psql $DATABASE_URL -c "
SELECT 
  'IP缓存条目' as metric,
  COUNT(*) as value
FROM ip_check_cache 
WHERE expires_at > NOW()
UNION ALL
SELECT 
  '时区缓存条目' as metric,
  COUNT(*) as value
FROM timezone_cache;
"

echo ""
echo "🔍 最近的慢查询:"
psql $DATABASE_URL -c "
SELECT 
  LEFT(query, 80) as query_preview,
  calls,
  ROUND(total_time::numeric, 2) as total_time_ms,
  ROUND(mean_time::numeric, 2) as mean_time_ms
FROM pg_stat_statements 
WHERE calls > 10
ORDER BY total_time DESC 
LIMIT 5;
"
```

## ⚠️ 注意事项

### 安全考虑
1. **备份数据库**: 执行优化前建议备份
2. **测试环境**: 先在测试环境验证
3. **监控影响**: 执行后密切监控系统性能

### 兼容性
1. **PostgreSQL版本**: 支持 PostgreSQL 12+
2. **扩展要求**: 建议启用 `pg_stat_statements`
3. **权限要求**: 需要数据库管理员权限

### 回滚方案
如果需要回滚优化：

```sql
-- 删除缓存表
DROP TABLE IF EXISTS ip_check_cache CASCADE;
DROP TABLE IF EXISTS timezone_cache CASCADE;

-- 删除物化视图
DROP MATERIALIZED VIEW IF EXISTS table_info_cache CASCADE;
DROP MATERIALIZED VIEW IF EXISTS function_info_cache CASCADE;

-- 删除索引
DROP INDEX IF EXISTS idx_security_events_ip_address;
DROP INDEX IF EXISTS idx_ai_memories_last_updated;
-- ... 其他索引
```

## 📞 支持

如果遇到问题：
1. 检查 PostgreSQL 日志
2. 验证环境变量设置
3. 确认数据库连接权限
4. 查看脚本执行日志

更多帮助请参考项目文档或提交 Issue。
