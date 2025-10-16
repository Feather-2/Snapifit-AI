#!/usr/bin/env node

/**
 * 迁移AI记忆管理函数
 * 从删除旧记忆改为标记旧记忆
 */

// 加载环境变量
require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// 颜色输出函数
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
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

async function executeMigration(pool) {
  log(`🔄 开始执行AI记忆函数迁移...`, 'blue');

  try {
    // 读取迁移SQL文件
    const migrationPath = path.join(__dirname, '..', 'database-migrations', 'replace-cleanup-function.sql');

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    log(`📄 读取迁移文件: ${migrationPath}`, 'cyan');

    // 执行迁移
    const result = await pool.query(migrationSQL);
    log(`✅ 迁移执行成功`, 'green');

    return result;
  } catch (error) {
    log(`❌ 迁移执行失败: ${error.message}`, 'red');
    throw error;
  }
}

async function verifyMigration(pool) {
  log(`🔍 验证迁移结果...`, 'blue');

  try {
    // 检查新函数是否存在
    const functionsCheck = await pool.query(`
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name IN (
          'mark_old_ai_memories',
          'refresh_ai_memory_markers',
          'get_ai_memory_statistics'
        )
      ORDER BY routine_name
    `);

    log(`📊 新函数检查结果:`, 'cyan');
    functionsCheck.rows.forEach(row => {
      log(`  ✅ ${row.routine_name} (${row.routine_type})`, 'green');
    });

    // 检查旧函数是否已删除
    const oldFunctionCheck = await pool.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name = 'cleanup_old_ai_memories'
    `);

    if (oldFunctionCheck.rows.length === 0) {
      log(`  ✅ 旧函数 cleanup_old_ai_memories 已成功删除`, 'green');
    } else {
      log(`  ⚠️  旧函数 cleanup_old_ai_memories 仍然存在`, 'yellow');
    }

    // 获取AI记忆统计
    const statsResult = await pool.query(`SELECT * FROM get_ai_memory_statistics()`);
    if (statsResult.rows.length > 0) {
      const stats = statsResult.rows[0];
      log(`📈 当前AI记忆统计:`, 'cyan');
      log(`  总记忆数: ${stats.total_memories}`, 'blue');
      log(`  旧记忆数: ${stats.old_memories}`, 'yellow');
      log(`  已标记数: ${stats.marked_memories}`, 'green');
      log(`  未标记旧记忆: ${stats.unmarked_old_memories}`, 'red');
      log(`  最近记忆数: ${stats.recent_memories}`, 'blue');
    }

    return true;
  } catch (error) {
    log(`❌ 验证失败: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  let pool;

  try {
    log(`🚀 AI记忆管理函数迁移工具`, 'blue');
    log(`====================================`, 'blue');

    // 创建数据库连接
    pool = await createDatabaseConnection();

    // 执行迁移
    await executeMigration(pool);

    // 验证迁移
    const verified = await verifyMigration(pool);

    if (verified) {
      log(`🎉 迁移完成！`, 'green');
      log(``, 'reset');
      log(`新的AI记忆管理策略:`, 'cyan');
      log(`• 不再删除30天前的记忆`, 'green');
      log(`• 为旧记忆添加时间标记`, 'green');
      log(`• AI会主动确认旧记忆的准确性`, 'green');
      log(`• 用户更新后自动移除标记`, 'green');
      log(``, 'reset');
      log(`可用的新函数:`, 'cyan');
      log(`• mark_old_ai_memories() - 标记旧记忆`, 'blue');
      log(`• refresh_ai_memory_markers() - 刷新标记`, 'blue');
      log(`• get_ai_memory_statistics() - 获取统计`, 'blue');
    } else {
      log(`❌ 迁移验证失败，请检查日志`, 'red');
      process.exit(1);
    }

  } catch (error) {
    log(`💥 迁移失败: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
      log(`🔌 数据库连接已关闭`, 'blue');
    }
  }
}

// 运行迁移
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
