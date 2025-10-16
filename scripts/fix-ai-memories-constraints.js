#!/usr/bin/env node

/**
 * AI Memories 约束修复脚本
 * 直接连接数据库修复 ai_memories 表的重复约束问题
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

async function checkConstraints(pool) {
  log(`\n🔍 检查 ai_memories 表约束...`, 'yellow');

  const query = `
    SELECT
      conname as constraint_name,
      contype as constraint_type,
      pg_get_constraintdef(oid) as constraint_definition
    FROM pg_constraint
    WHERE conrelid = 'ai_memories'::regclass
    AND contype = 'u'
    ORDER BY conname;
  `;

  try {
    const result = await pool.query(query);

    if (result.rows.length === 0) {
      log(`⚠️  未找到 ai_memories 表的唯一约束`, 'yellow');
      return [];
    }

    log(`📋 找到 ${result.rows.length} 个唯一约束:`, 'cyan');
    result.rows.forEach((row, index) => {
      log(`  ${index + 1}. ${row.constraint_name} (${row.constraint_type})`, 'cyan');
      log(`     ${row.constraint_definition}`, 'cyan');
    });

    return result.rows;
  } catch (error) {
    log(`❌ 检查约束失败: ${error.message}`, 'red');
    throw error;
  }
}

async function checkTableExists(pool) {
  log(`🔍 检查 ai_memories 表是否存在...`, 'yellow');

  const query = `
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'ai_memories' AND table_schema = 'public'
    ) as table_exists;
  `;

  try {
    const result = await pool.query(query);
    const exists = result.rows[0].table_exists;

    if (exists) {
      log(`✅ ai_memories 表存在`, 'green');
    } else {
      log(`❌ ai_memories 表不存在`, 'red');
    }

    return exists;
  } catch (error) {
    log(`❌ 检查表存在性失败: ${error.message}`, 'red');
    throw error;
  }
}

async function fixConstraints(pool) {
  log(`\n🔧 开始修复约束...`, 'yellow');

  try {
    // 步骤 1: 删除重复的约束
    log(`  1. 删除重复的约束 ai_memories_user_id_expert_id_key...`, 'blue');
    await pool.query(`
      ALTER TABLE ai_memories DROP CONSTRAINT IF EXISTS ai_memories_user_id_expert_id_key;
    `);
    log(`     ✅ 完成`, 'green');

    // 步骤 2: 确保正确的约束存在
    log(`  2. 确保正确的唯一约束存在...`, 'blue');
    await pool.query(`
      ALTER TABLE ai_memories DROP CONSTRAINT IF EXISTS ai_memories_user_expert_unique;
      ALTER TABLE ai_memories ADD CONSTRAINT ai_memories_user_expert_unique UNIQUE (user_id, expert_id);
    `);
    log(`     ✅ 完成`, 'green');

    log(`🎉 约束修复完成!`, 'green');

  } catch (error) {
    log(`❌ 修复约束失败: ${error.message}`, 'red');
    throw error;
  }
}

async function testUpsertFunction(pool) {
  log(`\n🧪 测试 upsert_ai_memories 函数...`, 'yellow');

  try {
    // 检查函数是否存在
    const functionCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'upsert_ai_memories'
      ) as function_exists;
    `);

    if (!functionCheck.rows[0].function_exists) {
      log(`⚠️  upsert_ai_memories 函数不存在`, 'yellow');
      return;
    }

    // 测试函数调用
    const testData = {
      general: {
        content: "测试记忆内容",
        version: 1,
        lastUpdated: new Date().toISOString()
      }
    };

    const testUserId = '00000000-0000-0000-0000-000000000000'; // 测试用的 UUID

    const result = await pool.query(`
      SELECT * FROM upsert_ai_memories($1, $2);
    `, [testUserId, JSON.stringify(testData)]);

    log(`✅ 函数测试成功`, 'green');
    log(`   结果: ${JSON.stringify(result.rows)}`, 'cyan');

    // 清理测试数据
    await pool.query(`
      DELETE FROM ai_memories WHERE user_id = $1;
    `, [testUserId]);

  } catch (error) {
    log(`❌ 函数测试失败: ${error.message}`, 'red');
    log(`   这可能是正常的，如果测试用户不存在的话`, 'yellow');
  }
}

async function main() {
  log(`🚀 AI Memories 约束修复工具`, 'bright');
  log(`================================`, 'bright');

  let pool;

  try {
    // 连接数据库
    pool = await createDatabaseConnection();

    // 检查表是否存在
    const tableExists = await checkTableExists(pool);
    if (!tableExists) {
      log(`❌ ai_memories 表不存在，无法继续`, 'red');
      return;
    }

    // 检查当前约束
    const constraints = await checkConstraints(pool);

    // 检查是否有重复约束
    const hasDuplicateConstraint = constraints.some(c =>
      c.constraint_name === 'ai_memories_user_id_expert_id_key'
    );

    // 检查是否缺少必要的约束
    const hasRequiredConstraint = constraints.some(c =>
      c.constraint_name === 'ai_memories_user_expert_unique'
    );

    if (hasDuplicateConstraint) {
      log(`\n⚠️  检测到重复约束，需要修复`, 'yellow');

      // 询问是否修复
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise((resolve) => {
        rl.question('是否要修复约束? (y/N): ', resolve);
      });
      rl.close();

      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        await fixConstraints(pool);

        // 重新检查约束
        log(`\n🔍 重新检查约束状态...`, 'yellow');
        await checkConstraints(pool);

        // 测试函数
        await testUpsertFunction(pool);
      } else {
        log(`⏭️  跳过修复`, 'yellow');
      }
    } else if (!hasRequiredConstraint) {
      log(`\n⚠️  缺少必要的唯一约束，需要添加`, 'yellow');

      // 询问是否添加约束
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise((resolve) => {
        rl.question('是否要添加缺失的约束? (y/N): ', resolve);
      });
      rl.close();

      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        await fixConstraints(pool);

        // 重新检查约束
        log(`\n🔍 重新检查约束状态...`, 'yellow');
        await checkConstraints(pool);

        // 测试函数
        await testUpsertFunction(pool);
      } else {
        log(`⏭️  跳过修复`, 'yellow');
      }
    } else {
      log(`\n✅ 约束状态正常，无需修复`, 'green');

      // 测试函数
      await testUpsertFunction(pool);
    }

  } catch (error) {
    log(`\n❌ 执行失败: ${error.message}`, 'red');
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
      log(`\n🔌 数据库连接已关闭`, 'blue');
    }
  }

  log(`\n✅ 脚本执行完成`, 'green');
}

// 运行主函数
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
