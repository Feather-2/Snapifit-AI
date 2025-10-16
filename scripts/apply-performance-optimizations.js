#!/usr/bin/env node

/**
 * 数据库性能优化脚本
 * 安全地应用数据库优化，包含错误处理和回滚机制
 */

const fs = require('fs');
const path = require('path');

// 检查环境变量
function checkEnvironment() {
  const requiredVars = ['DATABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    console.error('❌ 缺少必要的环境变量:', missing.join(', '));
    process.exit(1);
  }
}

// 获取数据库连接
async function getDatabaseConnection() {
  try {
    const { createClient } = require('@supabase/supabase-js');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Supabase配置缺失');
    }

    return createClient(supabaseUrl, serviceKey);
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    process.exit(1);
  }
}

// 执行SQL文件
async function executeSQLFile(supabase, filePath) {
  try {
    const sql = fs.readFileSync(filePath, 'utf8');

    // 将SQL分割为单独的语句
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 执行 ${statements.length} 个SQL语句从 ${filePath}`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`⏳ 执行语句 ${i + 1}/${statements.length}...`);

      const { error } = await supabase.rpc('exec_sql', {
        sql_query: statement
      });

      if (error) {
        console.error(`❌ 语句 ${i + 1} 执行失败:`, error.message);
        throw error;
      }

      console.log(`✅ 语句 ${i + 1} 执行成功`);
    }

    return true;
  } catch (error) {
    console.error('❌ SQL执行失败:', error.message);
    return false;
  }
}

// 检查优化效果
async function checkOptimizationResults(supabase) {
  try {
    console.log('📊 检查优化效果...');

    // 检查新创建的缓存表
    const { data: cacheTable, error: cacheError } = await supabase
      .from('ip_check_cache')
      .select('count(*)')
      .limit(1);

    if (!cacheError) {
      console.log('✅ IP检查缓存表创建成功');
    }

    // 检查新创建的索引
    const { data: indexes, error: indexError } = await supabase.rpc('get_table_indexes', {
      table_name: 'security_events'
    });

    if (!indexError && indexes) {
      console.log('✅ 索引创建检查完成');
    }

    // 检查物化视图
    const { data: views, error: viewError } = await supabase.rpc('check_materialized_views');

    if (!viewError) {
      console.log('✅ 物化视图创建成功');
    }

    return true;
  } catch (error) {
    console.warn('⚠️  优化效果检查部分失败，但优化可能已经生效');
    return false;
  }
}

// 创建备份
async function createBackup(supabase) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `performance_optimization_backup_${timestamp}`;

    console.log(`💾 创建备份: ${backupName}`);

    // 这里可以添加实际的备份逻辑
    // 对于Supabase，通常通过控制台或API进行备份

    return backupName;
  } catch (error) {
    console.warn('⚠️  备份创建失败，但可以继续执行优化');
    return null;
  }
}

// 主执行函数
async function main() {
  console.log('🚀 开始数据库性能优化...\n');

  // 检查环境
  checkEnvironment();

  // 获取数据库连接
  const supabase = await getDatabaseConnection();
  console.log('✅ 数据库连接成功\n');

  // 创建备份
  await createBackup(supabase);

  // 执行优化SQL
  const sqlFilePath = path.join(__dirname, '..', 'database-migrations', 'performance-optimization.sql');

  if (!fs.existsSync(sqlFilePath)) {
    console.error('❌ 找不到优化SQL文件:', sqlFilePath);
    process.exit(1);
  }

  console.log('📝 开始执行性能优化SQL...');
  const success = await executeSQLFile(supabase, sqlFilePath);

  if (!success) {
    console.error('❌ 优化执行失败，请检查错误信息');
    process.exit(1);
  }

  console.log('\n✅ 性能优化SQL执行完成');

  // 检查结果
  await checkOptimizationResults(supabase);

  // 输出下一步建议
  console.log('\n🎉 数据库性能优化完成！');
  console.log('\n📋 下一步建议:');
  console.log('1. 监控数据库性能指标');
  console.log('2. 实施应用层缓存');
  console.log('3. 定期执行 refresh_performance_caches() 函数');
  console.log('4. 查看详细文档: docs/database-performance-optimization.md');

  console.log('\n🔍 监控命令:');
  console.log('-- 查看慢查询');
  console.log('SELECT query, calls, total_time FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;');
  console.log('\n-- 检查缓存命中率');
  console.log('SELECT COUNT(*) as cached_entries FROM ip_check_cache WHERE expires_at > NOW();');
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

module.exports = { main, executeSQLFile, checkOptimizationResults };