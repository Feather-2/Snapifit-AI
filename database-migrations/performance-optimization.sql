-- 数据库性能优化方案 - 主要部分
-- 基于查询性能分析的优化建议
-- 注意：CONCURRENTLY 索引需要单独执行，请先运行 performance-optimization-indexes.sql

-- 1. IP检查优化
-- 索引将在单独的文件中创建

-- 创建IP检查结果缓存表
CREATE TABLE IF NOT EXISTS ip_check_cache (
  ip_address INET PRIMARY KEY,
  is_banned BOOLEAN NOT NULL,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 hour'
);

-- 创建缓存清理函数
CREATE OR REPLACE FUNCTION cleanup_ip_cache()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ip_check_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 优化后的IP检查函数，使用缓存
CREATE OR REPLACE FUNCTION is_ip_banned_cached(check_ip INET)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  cached_result BOOLEAN;
  cache_found BOOLEAN := FALSE;
BEGIN
  -- 先检查缓存
  SELECT is_banned INTO cached_result
  FROM ip_check_cache
  WHERE ip_address = check_ip AND expires_at > NOW();

  IF FOUND THEN
    RETURN cached_result;
  END IF;

  -- 缓存未命中，执行原始检查
  SELECT is_ip_banned(check_ip) INTO cached_result;

  -- 存入缓存
  INSERT INTO ip_check_cache (ip_address, is_banned)
  VALUES (check_ip, cached_result)
  ON CONFLICT (ip_address)
  DO UPDATE SET
    is_banned = EXCLUDED.is_banned,
    cached_at = NOW(),
    expires_at = NOW() + INTERVAL '1 hour';

  RETURN cached_result;
END;
$$;

-- 2. 表信息查询优化
-- 创建表信息缓存视图
CREATE MATERIALIZED VIEW IF NOT EXISTS table_info_cache AS
WITH base_tables AS (
  SELECT
    c.oid::int8 AS id,
    nc.nspname AS schema,
    c.relname AS name,
    c.relkind,
    c.relrowsecurity AS rls_enabled,
    c.relforcerowsecurity AS rls_forced,
    obj_description(c.oid) AS comment
  FROM pg_class c
  JOIN pg_namespace nc ON nc.oid = c.relnamespace
  WHERE c.relkind IN ('r', 'p')
    AND NOT pg_is_other_temp_schema(nc.oid)
)
SELECT
  bt.*,
  pg_total_relation_size(format('%I.%I', bt.schema, bt.name))::int8 AS bytes,
  pg_size_pretty(pg_total_relation_size(format('%I.%I', bt.schema, bt.name))) AS size,
  pg_stat_get_live_tuples(bt.id) AS live_rows_estimate,
  pg_stat_get_dead_tuples(bt.id) AS dead_rows_estimate
FROM base_tables bt;

-- 创建索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_table_info_cache_id ON table_info_cache(id);
CREATE INDEX IF NOT EXISTS idx_table_info_cache_schema ON table_info_cache(schema);

-- 3. 时区查询优化
-- 创建时区缓存表（减少重复查询）
CREATE TABLE IF NOT EXISTS timezone_cache (
  name TEXT PRIMARY KEY,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 初始化时区缓存
INSERT INTO timezone_cache (name)
SELECT name FROM pg_timezone_names
ON CONFLICT (name) DO NOTHING;

-- 4. 函数信息查询优化
-- 创建函数信息缓存
CREATE MATERIALIZED VIEW IF NOT EXISTS function_info_cache AS
SELECT
  f.oid as id,
  n.nspname as schema,
  f.proname as name,
  l.lanname as language,
  f.prosrc as definition,
  pg_get_function_arguments(f.oid) as argument_types,
  pg_get_function_result(f.oid) as return_type
FROM pg_proc f
LEFT JOIN pg_namespace n ON f.pronamespace = n.oid
LEFT JOIN pg_language l ON f.prolang = l.oid
WHERE f.prokind = 'f'
  AND n.nspname NOT IN ('information_schema', 'pg_catalog', 'pg_toast');

-- 5. 定期维护任务
-- 创建定期刷新缓存的函数
CREATE OR REPLACE FUNCTION refresh_performance_caches()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  -- 刷新物化视图
  REFRESH MATERIALIZED VIEW CONCURRENTLY table_info_cache;
  REFRESH MATERIALIZED VIEW CONCURRENTLY function_info_cache;

  -- 清理过期的IP缓存
  PERFORM cleanup_ip_cache();

  -- 更新统计信息
  ANALYZE;

  RETURN 'Performance caches refreshed successfully';
END;
$$;

-- 6. 查询优化建议
-- 索引将在单独的文件中创建（performance-optimization-indexes.sql）

-- 7. 连接池配置建议（注释形式）
/*
建议的数据库连接池配置：
- max_connections: 适当减少，避免过多连接
- shared_buffers: 增加到系统内存的25%
- effective_cache_size: 设置为系统内存的75%
- work_mem: 根据查询复杂度调整
- maintenance_work_mem: 增加以加快索引创建
*/

-- 8. 应用层优化建议
/*
应用层优化：
1. 实现查询结果缓存（Redis/内存缓存）
2. 使用连接池减少连接开销
3. 批量操作替代单个操作
4. 分页查询大数据集
5. 异步处理非关键查询
*/

COMMENT ON FUNCTION is_ip_banned_cached(INET) IS '带缓存的IP检查函数，减少重复查询';
COMMENT ON FUNCTION refresh_performance_caches() IS '刷新所有性能相关的缓存';
COMMENT ON TABLE ip_check_cache IS 'IP检查结果缓存表，1小时过期';