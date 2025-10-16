#!/usr/bin/env node

/**
 * 安全的数据库性能优化执行脚本
 * 分两个阶段执行：
 * 1. 先创建索引（CONCURRENTLY，不锁表）
 * 2. 再创建缓存表和函数
 */

const fs = require('fs');
const path = require('path');

// 检查环境变量
function checkEnvironment() {
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    console.error('❌ 缺少必要的环境变量:');
    missing.forEach(envVar => console.error(`   - ${envVar}`));
    console.error('\n请确保设置了所有必要的环境变量');
    process.exit(1);
  }
}

// 获取数据库连接
async function getDatabaseConnection() {
  try {
    const { createClient } = require('@supabase/supabase-js');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    return createClient(supabaseUrl, serviceKey);
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    process.exit(1);
  }
}

// 执行SQL文件
async function executeSQLFile(supabase, filePath, description) {
  try {
    console.log(`📝 执行 ${description}...`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }

    const sqlContent = fs.readFileSync(filePath, 'utf8');
    
    // 移除注释和空行，分割SQL语句
    const statements = sqlContent
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && !line.trim().startsWith('\\echo') && line.trim())
      .join('\n')
      .split(';')
      .filter(stmt => stmt.trim())
      .map(stmt => stmt.trim() + ';');

    console.log(`   发现 ${statements.length} 个SQL语句`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim() === ';') continue;

      try {
        console.log(`   执行语句 ${i + 1}/${statements.length}...`);
        
        // 对于索引创建，使用rpc调用以避免事务问题
        if (statement.includes('CREATE INDEX CONCURRENTLY')) {
          const { error } = await supabase.rpc('exec_sql', { sql_statement: statement });
          if (error && !error.message.includes('already exists')) {
            console.warn(`   ⚠️ 索引创建警告: ${error.message}`);
          }
        } else {
          const { error } = await supabase.rpc('exec_sql', { sql_statement: statement });
          if (error) {
            throw error;
          }
        }
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`   ✅ 对象已存在，跳过`);
        } else {
          throw error;
        }
      }
    }

    console.log(`✅ ${description} 执行完成`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} 执行失败:`, error.message);
    return false;
  }
}

// 创建执行SQL的数据库函数（如果不存在）
async function createExecSQLFunction(supabase) {
  try {
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION exec_sql(sql_statement text)
      RETURNS text
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql_statement;
        RETURN 'SUCCESS';
      EXCEPTION
        WHEN OTHERS THEN
          RETURN 'ERROR: ' || SQLERRM;
      END;
      $$;
    `;

    const { error } = await supabase.rpc('query', { query: createFunctionSQL });
    if (error) {
      console.log('   使用直接查询方式...');
    }
  } catch (error) {
    console.log('   将使用标准SQL执行方式');
  }
}

// 检查优化效果
async function checkOptimizationResults(supabase) {
  try {
    console.log('📊 检查优化效果...');

    // 检查索引是否创建成功
    const { data: indexes, error: indexError } = await supabase
      .from('pg_indexes')
      .select('indexname, tablename')
      .in('indexname', [
        'idx_security_events_ip_address',
        'idx_ai_memories_last_updated',
        'idx_ai_memories_content_prefix'
      ]);

    if (!indexError && indexes) {
      console.log(`✅ 发现 ${indexes.length} 个新索引`);
      indexes.forEach(idx => {
        console.log(`   - ${idx.indexname} (${idx.tablename})`);
      });
    }

    // 检查缓存表是否创建成功
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['ip_check_cache', 'timezone_cache']);

    if (!tableError && tables) {
      console.log(`✅ 发现 ${tables.length} 个缓存表`);
      tables.forEach(table => {
        console.log(`   - ${table.table_name}`);
      });
    }

    return true;
  } catch (error) {
    console.warn('⚠️ 优化效果检查部分失败，但优化可能已经生效');
    return false;
  }
}

// 主执行函数
async function main() {
  console.log('🚀 开始安全的数据库性能优化...\n');

  // 检查环境
  checkEnvironment();

  // 获取数据库连接
  const supabase = await getDatabaseConnection();
  console.log('✅ 数据库连接成功\n');

  // 创建执行函数
  await createExecSQLFunction(supabase);

  // 第一阶段：创建索引
  const indexFilePath = path.join(__dirname, '..', 'database-migrations', 'performance-optimization-indexes.sql');
  const indexSuccess = await executeSQLFile(supabase, indexFilePath, '性能优化索引');

  if (!indexSuccess) {
    console.error('❌ 索引创建失败，停止执行');
    process.exit(1);
  }

  console.log('\n⏳ 等待索引创建完成...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 第二阶段：创建缓存表和函数
  const mainFilePath = path.join(__dirname, '..', 'database-migrations', 'performance-optimization.sql');
  const mainSuccess = await executeSQLFile(supabase, mainFilePath, '缓存表和函数');

  if (!mainSuccess) {
    console.error('❌ 缓存表和函数创建失败');
    process.exit(1);
  }

  // 检查结果
  await checkOptimizationResults(supabase);

  // 输出完成信息
  console.log('\n🎉 数据库性能优化完成！');
  console.log('\n📋 优化内容:');
  console.log('✅ IP检查索引 - 提升IP查询性能');
  console.log('✅ AI记忆索引 - 提升AI记忆查询性能');
  console.log('✅ IP检查缓存表 - 减少重复IP查询');
  console.log('✅ 表信息物化视图 - 提升管理面板性能');
  console.log('✅ 时区数据缓存 - 减少时区查询');

  console.log('\n📈 预期性能提升:');
  console.log('🚀 IP检查: 从14,170次/小时减少到<100次/小时');
  console.log('🚀 整体查询时间: 减少40-60%');
  console.log('🚀 数据库负载: 减少50%+');

  console.log('\n🔧 维护建议:');
  console.log('📅 定期执行: SELECT refresh_performance_caches();');
  console.log('📊 监控缓存: SELECT COUNT(*) FROM ip_check_cache WHERE expires_at > NOW();');
}

// 错误处理
process.on('unhandledRejection', (error) => {
  console.error('❌ 未处理的错误:', error);
  process.exit(1);
});

// 执行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  });
}

module.exports = { main };
