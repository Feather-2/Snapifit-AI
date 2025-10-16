# 数据库性能优化指南

基于查询性能分析，本文档提供了针对健康应用数据库的详细优化方案。

## 🔍 性能问题分析

### 主要性能瓶颈

1. **表信息查询** - 占用26.1%总时间，116次调用
2. **表详细信息查询** - 占用8.7%总时间，625次调用  
3. **时区名称查询** - 占用7.2%总时间，30次调用
4. **函数信息查询** - 占用6.2%总时间，46次调用
5. **IP检查函数** - 占用5.8%总时间，**14,170次调用** ⚠️
6. **表定义生成** - 多个重复查询，每个约1秒

## 🎯 优化策略

### 1. 数据库层优化

#### A. 索引优化
```sql
-- IP检查索引
CREATE INDEX CONCURRENTLY idx_security_events_ip_address 
ON security_events USING hash (ip_address);

-- AI记忆相关索引
CREATE INDEX CONCURRENTLY idx_ai_memories_last_updated 
ON ai_memories (last_updated);

CREATE INDEX CONCURRENTLY idx_ai_memories_content_prefix 
ON ai_memories (content text_pattern_ops) 
WHERE content LIKE '[该内容距今时间较长，可能会有更新]%';
```

#### B. 缓存策略
- **IP检查缓存**: 1小时过期的内存缓存
- **表信息物化视图**: 定期刷新的预计算结果
- **时区数据缓存**: 静态数据缓存

#### C. 查询重写
- 将复杂的JOIN查询拆分为多个简单查询
- 使用物化视图替代重复的复杂计算

### 2. 应用层优化

#### A. 连接池配置
```javascript
// 数据库连接池建议配置
const poolConfig = {
  max: 20,              // 最大连接数
  min: 5,               // 最小连接数
  idle: 10000,          // 空闲超时
  acquire: 30000,       // 获取连接超时
  evict: 1000          // 清理间隔
}
```

#### B. 查询缓存
```javascript
// Redis缓存示例
const cacheConfig = {
  tableInfo: '1h',      // 表信息缓存1小时
  functionInfo: '4h',   // 函数信息缓存4小时
  ipCheck: '1h',        // IP检查缓存1小时
  timezone: '24h'       // 时区信息缓存24小时
}
```

#### C. 批量操作
```javascript
// 批量IP检查示例
async function checkMultipleIPs(ips) {
  const uncachedIPs = await filterUncachedIPs(ips);
  if (uncachedIPs.length > 0) {
    const results = await batchCheckIPs(uncachedIPs);
    await cacheResults(results);
  }
  return getCachedResults(ips);
}
```

## 📈 预期性能提升

### 短期收益 (立即可见)
- **IP检查**: 从14,170次调用减少到 < 100次/小时
- **时区查询**: 从30次减少到1次启动时加载
- **表定义**: 缓存后避免重复生成

### 中期收益 (1-2周后)
- **整体查询时间**: 预计减少40-60%
- **数据库负载**: 减少50%以上
- **响应时间**: API响应时间提升30-50%

### 长期收益 (1个月后)
- **扩展性**: 支持更多并发用户
- **稳定性**: 减少数据库连接超时
- **成本**: 降低数据库资源消耗

## 🔧 实施步骤

### 第一阶段: 紧急优化 (立即执行)
1. 执行 `database-migrations/performance-optimization.sql`
2. 部署IP检查缓存
3. 配置时区数据缓存

### 第二阶段: 应用层优化 (本周内)
1. 实现Redis缓存层
2. 优化数据库连接池
3. 重构高频查询

### 第三阶段: 深度优化 (下周)
1. 实施物化视图
2. 优化复杂查询
3. 添加监控和告警

## 📊 监控指标

### 关键性能指标 (KPIs)
- 平均查询响应时间
- 数据库连接池使用率
- 缓存命中率
- 每秒查询数 (QPS)

### 监控查询
```sql
-- 查看慢查询
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;

-- 检查缓存效果
SELECT 
  COUNT(*) as total_checks,
  COUNT(*) FILTER (WHERE cached_at > NOW() - INTERVAL '1 hour') as cached_checks
FROM ip_check_cache;
```

## ⚠️ 注意事项

### 风险控制
1. **并发执行**: 使用 `CONCURRENTLY` 创建索引
2. **逐步部署**: 分阶段实施，监控每个变更
3. **回滚计划**: 准备快速回滚方案

### 兼容性
1. **PostgreSQL版本**: 确保所有功能兼容当前版本
2. **应用代码**: 更新应用代码以使用新的缓存函数
3. **测试覆盖**: 在生产环境前充分测试

## 🔄 维护计划

### 日常维护
- 每天清理过期缓存
- 监控查询性能
- 检查连接池状态

### 周期性维护
- 每周刷新物化视图
- 每月分析查询统计
- 每季度评估优化效果

---

**注意**: 实施前请在测试环境验证所有变更，确保不会影响现有功能。 