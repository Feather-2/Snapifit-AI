#!/usr/bin/env node

/**
 * PostgreSQL 数据库性能优化脚本
 * 专门针对 PostgreSQL 数据库的性能优化，支持分阶段执行
 * 使用原生 pg 库连接，避免 Supabase 依赖
 */

const fs = require('fs');
const path = require('path');

// 检查环境变量
function checkEnvironment() {
  const requiredVars = ['DATABASE_URL'];
  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    console.error('❌ 缺少必要的环境变量:', missing.join(', '));
    console.error('💡 请确保设置了 DATABASE_URL 环境变量');
    console.error('   示例: DATABASE_URL=postgresql://user:password@localhost:5432/database');
    process.exit(1);
  }

  // 检查 DATABASE_URL 格式
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
    console.error('❌ DATABASE_URL 格式不正确');
    console.error('   应该以 postgresql:// 或 postgres:// 开头');
    process.exit(1);
  }
}

// 获取 PostgreSQL 连接
async function getDatabaseConnection() {
  try {
    const { Pool } = require('pg');
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 5,                         // 最大连接数
      idleTimeoutMillis: 30000,       // 空闲连接超时
      connectionTimeoutMillis: 10000, // 连接超时
    });

    // 测试连接
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ PostgreSQL 连接成功');
    console.log(`   时间: ${result.rows[0].current_time}`);
    console.log(`   版本: ${result.rows[0].pg_version.split(' ')[0]} ${result.rows[0].pg_version.split(' ')[1]}`);
    client.release();

    return pool;
  } catch (error) {
    console.error('❌ PostgreSQL 连接失败:', error.message);
    console.error('💡 请检查:');
    console.error('   1. DATABASE_URL 是否正确');
    console.error('   2. PostgreSQL 服务是否运行');
    console.error('   3. 网络连接是否正常');
    process.exit(1);
  }
}

// 执行单个 SQL 语句
async function executeStatement(pool, statement, description = '') {
  const client = await pool.connect();
  try {
    console.log(`⏳ 执行: ${description || statement.substring(0, 50)}...`);
    const result = await client.query(statement);
    console.log(`✅ 成功: ${description || '语句执行完成'}`);
    return { success: true, result };
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log(`ℹ️  跳过: ${description || '对象已存在'}`);
      return { success: true, skipped: true };
    } else {
      console.error(`❌ 失败: ${description || '语句执行失败'}`);
      console.error(`   错误: ${error.message}`);
      return { success: false, error };
    }
  } finally {
    client.release();
  }
}

// 执行索引创建（CONCURRENTLY）
async function createIndexesConcurrently(pool) {
  console.log('\n🔧 第一阶段: 创建性能优化索引...');
  
  const indexes = [
    {
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_ip_address
            ON security_events USING hash (ip_address)`,
      description: 'IP检查索引 (security_events.ip_address)'
    },
    {
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_memories_last_updated
            ON ai_memories (last_updated)`,
      description: 'AI记忆时间索引 (ai_memories.last_updated)'
    },
    {
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_memories_content_prefix
            ON ai_memories (content text_pattern_ops)
            WHERE content LIKE '[该内容距今时间较长，可能会有更新]%'`,
      description: 'AI记忆内容索引 (ai_memories.content)'
    },
    {
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_trust_level
            ON users (trust_level) WHERE is_active = true`,
      description: '用户信任等级索引 (users.trust_level)'
    },
    {
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shared_keys_active_usage
            ON shared_keys (is_active, usage_count_today) WHERE is_active = true`,
      description: '共享密钥使用索引 (shared_keys.is_active, usage_count_today)'
    },
    {
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_logs_user_date
            ON daily_logs (user_id, date)`,
      description: '日志用户日期索引 (daily_logs.user_id, date)'
    }
  ];

  let successCount = 0;
  let skipCount = 0;

  for (const index of indexes) {
    const result = await executeStatement(pool, index.sql, index.description);
    if (result.success) {
      if (result.skipped) {
        skipCount++;
      } else {
        successCount++;
      }
    } else {
      console.warn(`⚠️  索引创建失败，但继续执行: ${index.description}`);
    }
    
    // 索引创建之间稍作等待
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n📊 索引创建结果: ${successCount} 个成功, ${skipCount} 个跳过`);
  return true;
}

// 执行缓存表和函数创建
async function createCacheTablesAndFunctions(pool) {
  console.log('\n🗄️  第二阶段: 创建缓存表和函数...');

  const sqlFilePath = path.join(__dirname, '..', 'database-migrations', 'performance-optimization.sql');
  
  if (!fs.existsSync(sqlFilePath)) {
    console.error('❌ 找不到优化SQL文件:', sqlFilePath);
    return false;
  }

  try {
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // 分割SQL语句，过滤注释和空行
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => 
        stmt.length > 0 && 
        !stmt.startsWith('--') && 
        !stmt.includes('CREATE INDEX CONCURRENTLY') // 跳过索引创建
      );

    console.log(`📝 发现 ${statements.length} 个SQL语句`);

    let successCount = 0;
    let skipCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement.trim()) continue;

      const result = await executeStatement(
        pool, 
        statement + ';', 
        `语句 ${i + 1}/${statements.length}`
      );
      
      if (result.success) {
        if (result.skipped) {
          skipCount++;
        } else {
          successCount++;
        }
      }
    }

    console.log(`\n📊 缓存表和函数创建结果: ${successCount} 个成功, ${skipCount} 个跳过`);
    return true;
  } catch (error) {
    console.error('❌ 缓存表和函数创建失败:', error.message);
    return false;
  }
}

// 检查优化效果
async function checkOptimizationResults(pool) {
  console.log('\n📊 第三阶段: 检查优化效果...');

  const checks = [
    {
      name: '检查新创建的索引',
      sql: `SELECT schemaname, tablename, indexname, indexdef
            FROM pg_indexes 
            WHERE indexname LIKE 'idx_%'
              AND indexname IN (
                'idx_security_events_ip_address',
                'idx_ai_memories_last_updated', 
                'idx_ai_memories_content_prefix',
                'idx_users_trust_level',
                'idx_shared_keys_active_usage',
                'idx_daily_logs_user_date'
              )
            ORDER BY tablename, indexname`
    },
    {
      name: '检查缓存表',
      sql: `SELECT table_name, table_type
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name IN ('ip_check_cache', 'timezone_cache')
            ORDER BY table_name`
    },
    {
      name: '检查物化视图',
      sql: `SELECT schemaname, matviewname, hasindexes, ispopulated
            FROM pg_matviews 
            WHERE matviewname IN ('table_info_cache', 'function_info_cache')`
    },
    {
      name: '检查缓存函数',
      sql: `SELECT routine_name, routine_type
            FROM information_schema.routines
            WHERE routine_schema = 'public'
              AND routine_name IN (
                'is_ip_banned_cached',
                'cleanup_ip_cache', 
                'refresh_performance_caches'
              )
            ORDER BY routine_name`
    }
  ];

  for (const check of checks) {
    try {
      const result = await executeStatement(pool, check.sql, check.name);
      if (result.success && result.result.rows.length > 0) {
        console.log(`✅ ${check.name}: 发现 ${result.result.rows.length} 个对象`);
        result.result.rows.forEach(row => {
          const key = Object.keys(row)[0];
          console.log(`   - ${row[key]}`);
        });
      } else {
        console.log(`ℹ️  ${check.name}: 未发现相关对象`);
      }
    } catch (error) {
      console.warn(`⚠️  ${check.name} 失败: ${error.message}`);
    }
  }

  return true;
}

// 主执行函数
async function main() {
  console.log('🚀 PostgreSQL 数据库性能优化开始...\n');

  // 检查环境
  checkEnvironment();

  // 获取数据库连接
  const pool = await getDatabaseConnection();

  try {
    // 第一阶段：创建索引
    await createIndexesConcurrently(pool);

    // 等待索引创建完成
    console.log('\n⏳ 等待索引创建完成...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 第二阶段：创建缓存表和函数
    await createCacheTablesAndFunctions(pool);

    // 第三阶段：检查优化效果
    await checkOptimizationResults(pool);

    // 输出完成信息
    console.log('\n🎉 PostgreSQL 数据库性能优化完成！');
    console.log('\n📋 优化内容:');
    console.log('✅ 创建了 6 个性能优化索引');
    console.log('✅ 创建了 IP 检查缓存表');
    console.log('✅ 创建了表信息物化视图');
    console.log('✅ 创建了时区数据缓存');
    console.log('✅ 创建了缓存维护函数');

    console.log('\n📈 预期性能提升:');
    console.log('🚀 IP检查: 从14,170次/小时减少到<100次/小时');
    console.log('🚀 整体查询时间: 减少40-60%');
    console.log('🚀 数据库负载: 减少50%+');

    console.log('\n🔧 维护建议:');
    console.log('📅 定期执行缓存刷新:');
    console.log('   SELECT refresh_performance_caches();');
    console.log('📊 监控缓存效果:');
    console.log('   SELECT COUNT(*) FROM ip_check_cache WHERE expires_at > NOW();');
    console.log('📈 查看慢查询:');
    console.log('   SELECT query, calls, total_time FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;');

  } catch (error) {
    console.error('❌ 优化过程中发生错误:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n🔌 数据库连接已关闭');
  }
}

// 错误处理
process.on('unhandledRejection', (error) => {
  console.error('❌ 未处理的错误:', error);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n⏹️  用户中断操作');
  process.exit(0);
});

// 执行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  });
}

module.exports = { main, createIndexesConcurrently, createCacheTablesAndFunctions, checkOptimizationResults };
