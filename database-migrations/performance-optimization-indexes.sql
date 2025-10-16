-- 数据库性能优化 - 索引创建
-- 这些索引使用 CONCURRENTLY 创建，必须单独执行，不能在事务块中运行
-- 执行顺序：先运行此文件，再运行 performance-optimization.sql

-- 检查连接和权限
\echo '开始创建性能优化索引...'

-- 1. IP检查相关索引
\echo '创建IP检查索引...'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_ip_address
ON security_events USING hash (ip_address);

\echo 'IP检查索引创建完成'

-- 2. AI记忆相关索引
\echo '创建AI记忆索引...'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_memories_last_updated
ON ai_memories (last_updated);

\echo 'AI记忆时间索引创建完成'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_memories_content_prefix
ON ai_memories (content text_pattern_ops)
WHERE content LIKE '[该内容距今时间较长，可能会有更新]%';

\echo 'AI记忆内容索引创建完成'

-- 3. 其他可能需要的索引
\echo '创建其他性能索引...'

-- 用户相关索引（如果需要）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_trust_level
ON users (trust_level) WHERE is_active = true;

-- 共享密钥相关索引（如果需要）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shared_keys_active_usage
ON shared_keys (is_active, usage_count_today) WHERE is_active = true;

-- 日志相关索引（如果需要）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_logs_user_date
ON daily_logs (user_id, date);

\echo '所有索引创建完成！'

-- 显示创建的索引信息
\echo '检查新创建的索引...'
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE indexname IN (
    'idx_security_events_ip_address',
    'idx_ai_memories_last_updated', 
    'idx_ai_memories_content_prefix',
    'idx_users_trust_level',
    'idx_shared_keys_active_usage',
    'idx_daily_logs_user_date'
)
ORDER BY tablename, indexname;

\echo '索引创建脚本执行完成！'
\echo '现在可以运行 performance-optimization.sql 来创建缓存表和函数'
