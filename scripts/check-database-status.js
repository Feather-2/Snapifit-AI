#!/usr/bin/env node

/**
 * 数据库状态检查脚本
 * 检查当前 PostgreSQL 数据库的表、函数、触发器等状态
 */

// 检查是否安装了 pg 模块
let Pool;
try {
  Pool = require('pg').Pool;
} catch (error) {
  console.log('❌ 缺少 pg 模块，请运行: pnpm install pg');
  process.exit(1);
}

// 手动加载环境变量
const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#') && line.includes('=')) {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=');
        if (key && value) {
          process.env[key.trim()] = value.trim();
        }
      }
    });
    
    console.log('✅ 已加载 .env.local 文件');
  } else {
    console.log('⚠️  未找到 .env.local 文件，使用系统环境变量');
  }
}

// 加载环境变量
loadEnvFile();

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function createDatabaseConnection() {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  log(`🔗 连接数据库...`, 'blue');
  
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  // 测试连接
  try {
    const client = await pool.connect();
    log(`✅ 数据库连接成功`, 'green');
    client.release();
    return pool;
  } catch (error) {
    log(`❌ 数据库连接失败: ${error.message}`, 'red');
    throw error;
  }
}

async function checkTables(pool) {
  log(`\n📋 检查数据库表...`, 'yellow');
  
  const query = `
    SELECT 
      table_name,
      table_type,
      CASE 
        WHEN table_type = 'BASE TABLE' THEN 
          (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public')
        ELSE NULL
      END as column_count
    FROM information_schema.tables t
    WHERE table_schema = 'public'
    ORDER BY table_type, table_name;
  `;

  try {
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      log(`⚠️  未找到任何表`, 'yellow');
      return [];
    }

    log(`📊 找到 ${result.rows.length} 个表/视图:`, 'cyan');
    result.rows.forEach((row, index) => {
      const typeIcon = row.table_type === 'BASE TABLE' ? '📄' : '👁️';
      const columnInfo = row.column_count ? ` (${row.column_count} 列)` : '';
      log(`  ${index + 1}. ${typeIcon} ${row.table_name}${columnInfo}`, 'cyan');
    });

    return result.rows;
  } catch (error) {
    log(`❌ 检查表失败: ${error.message}`, 'red');
    throw error;
  }
}

async function checkFunctions(pool) {
  log(`\n🔧 检查数据库函数...`, 'yellow');
  
  const query = `
    SELECT 
      proname as function_name,
      pg_get_function_arguments(oid) as arguments,
      pg_get_function_result(oid) as return_type,
      prosrc as source_code
    FROM pg_proc 
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND prokind = 'f'
    ORDER BY proname;
  `;

  try {
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      log(`⚠️  未找到任何自定义函数`, 'yellow');
      return [];
    }

    log(`⚙️  找到 ${result.rows.length} 个函数:`, 'cyan');
    result.rows.forEach((row, index) => {
      log(`  ${index + 1}. ${row.function_name}(${row.arguments})`, 'cyan');
      log(`     返回: ${row.return_type}`, 'cyan');
    });

    return result.rows;
  } catch (error) {
    log(`❌ 检查函数失败: ${error.message}`, 'red');
    throw error;
  }
}

async function checkTriggers(pool) {
  log(`\n🎯 检查触发器...`, 'yellow');
  
  const query = `
    SELECT 
      t.trigger_name,
      t.event_manipulation,
      t.event_object_table,
      t.action_timing,
      t.action_statement
    FROM information_schema.triggers t
    WHERE t.trigger_schema = 'public'
    ORDER BY t.event_object_table, t.trigger_name;
  `;

  try {
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      log(`⚠️  未找到任何触发器`, 'yellow');
      return [];
    }

    log(`🎯 找到 ${result.rows.length} 个触发器:`, 'cyan');
    result.rows.forEach((row, index) => {
      log(`  ${index + 1}. ${row.trigger_name} on ${row.event_object_table}`, 'cyan');
      log(`     事件: ${row.action_timing} ${row.event_manipulation}`, 'cyan');
    });

    return result.rows;
  } catch (error) {
    log(`❌ 检查触发器失败: ${error.message}`, 'red');
    throw error;
  }
}

async function checkConstraints(pool) {
  log(`\n🔒 检查约束...`, 'yellow');
  
  const query = `
    SELECT 
      tc.table_name,
      tc.constraint_name,
      tc.constraint_type,
      CASE 
        WHEN tc.constraint_type = 'FOREIGN KEY' THEN
          (SELECT ccu.table_name FROM information_schema.constraint_column_usage ccu 
           WHERE ccu.constraint_name = tc.constraint_name)
        ELSE NULL
      END as referenced_table,
      pg_get_constraintdef(pgc.oid) as constraint_definition
    FROM information_schema.table_constraints tc
    LEFT JOIN pg_constraint pgc ON pgc.conname = tc.constraint_name
    WHERE tc.table_schema = 'public'
    AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE', 'CHECK')
    ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;
  `;

  try {
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      log(`⚠️  未找到任何约束`, 'yellow');
      return [];
    }

    log(`🔒 找到 ${result.rows.length} 个约束:`, 'cyan');
    
    const groupedConstraints = {};
    result.rows.forEach(row => {
      if (!groupedConstraints[row.table_name]) {
        groupedConstraints[row.table_name] = [];
      }
      groupedConstraints[row.table_name].push(row);
    });

    Object.entries(groupedConstraints).forEach(([tableName, constraints]) => {
      log(`  📄 ${tableName}:`, 'cyan');
      constraints.forEach(constraint => {
        const refInfo = constraint.referenced_table ? ` -> ${constraint.referenced_table}` : '';
        log(`    - ${constraint.constraint_name} (${constraint.constraint_type})${refInfo}`, 'cyan');
      });
    });

    return result.rows;
  } catch (error) {
    log(`❌ 检查约束失败: ${error.message}`, 'red');
    throw error;
  }
}

async function checkIndexes(pool) {
  log(`\n📇 检查索引...`, 'yellow');
  
  const query = `
    SELECT 
      schemaname,
      tablename,
      indexname,
      indexdef
    FROM pg_indexes 
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname;
  `;

  try {
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      log(`⚠️  未找到任何索引`, 'yellow');
      return [];
    }

    log(`📇 找到 ${result.rows.length} 个索引:`, 'cyan');
    
    const groupedIndexes = {};
    result.rows.forEach(row => {
      if (!groupedIndexes[row.tablename]) {
        groupedIndexes[row.tablename] = [];
      }
      groupedIndexes[row.tablename].push(row);
    });

    Object.entries(groupedIndexes).forEach(([tableName, indexes]) => {
      log(`  📄 ${tableName}:`, 'cyan');
      indexes.forEach(index => {
        log(`    - ${index.indexname}`, 'cyan');
      });
    });

    return result.rows;
  } catch (error) {
    log(`❌ 检查索引失败: ${error.message}`, 'red');
    throw error;
  }
}

async function main() {
  log(`🔍 数据库状态检查工具`, 'bright');
  log(`================================`, 'bright');
  
  let pool;
  
  try {
    // 连接数据库
    pool = await createDatabaseConnection();
    
    // 检查各种数据库对象
    const tables = await checkTables(pool);
    const functions = await checkFunctions(pool);
    const triggers = await checkTriggers(pool);
    const constraints = await checkConstraints(pool);
    const indexes = await checkIndexes(pool);
    
    // 生成总结报告
    log(`\n📊 总结报告`, 'bright');
    log(`================================`, 'bright');
    log(`📄 表/视图: ${tables.length}`, 'green');
    log(`⚙️  函数: ${functions.length}`, 'green');
    log(`🎯 触发器: ${triggers.length}`, 'green');
    log(`🔒 约束: ${constraints.length}`, 'green');
    log(`📇 索引: ${indexes.length}`, 'green');
    
  } catch (error) {
    log(`\n❌ 执行失败: ${error.message}`, 'red');
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
      log(`\n🔌 数据库连接已关闭`, 'blue');
    }
  }
  
  log(`\n✅ 检查完成`, 'green');
}

// 运行主函数
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
