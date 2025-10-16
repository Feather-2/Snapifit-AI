#!/usr/bin/env node

/**
 * 测试AI记忆标记功能，验证防重复标记机制
 */

// 加载环境变量
require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

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

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  return pool;
}

async function testMemoryMarking(pool) {
  log(`🧪 测试AI记忆标记功能`, 'blue');

  const testUserId = '00000000-0000-0000-0000-000000000001';
  const testExpertId = 'test_expert';

  try {
    // 1. 清理测试数据
    log(`🧹 清理测试数据...`, 'yellow');
    await pool.query(`DELETE FROM ai_memories WHERE user_id = $1 AND expert_id = $2`, [testUserId, testExpertId]);

    // 2. 插入一个旧记忆（35天前）
    log(`📝 插入测试记忆（35天前）...`, 'cyan');
    await pool.query(`
      INSERT INTO ai_memories (user_id, expert_id, content, version, last_updated, created_at)
      VALUES ($1, $2, $3, 1, NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days')
    `, [testUserId, testExpertId, '用户对乳制品过敏，偏好植物蛋白']);

    // 3. 第一次标记
    log(`🏷️  第一次执行标记...`, 'blue');
    const firstMark = await pool.query(`SELECT * FROM mark_old_ai_memories()`);
    log(`   结果: ${firstMark.rows[0].details}`, 'green');
    log(`   标记数量: ${firstMark.rows[0].marked_count}`, 'green');

    // 4. 检查记忆内容
    const afterFirstMark = await pool.query(`
      SELECT content FROM ai_memories WHERE user_id = $1 AND expert_id = $2
    `, [testUserId, testExpertId]);
    log(`   标记后内容: "${afterFirstMark.rows[0].content}"`, 'cyan');

    // 5. 第二次标记（应该不会重复标记）
    log(`🏷️  第二次执行标记（测试防重复）...`, 'blue');
    const secondMark = await pool.query(`SELECT * FROM mark_old_ai_memories()`);
    log(`   结果: ${secondMark.rows[0].details}`, 'green');
    log(`   标记数量: ${secondMark.rows[0].marked_count}`, 'green');

    // 6. 再次检查记忆内容
    const afterSecondMark = await pool.query(`
      SELECT content FROM ai_memories WHERE user_id = $1 AND expert_id = $2
    `, [testUserId, testExpertId]);
    log(`   二次标记后内容: "${afterSecondMark.rows[0].content}"`, 'cyan');

    // 7. 验证内容没有重复标记
    const content = afterSecondMark.rows[0].content;
    const markerCount = (content.match(/\[该内容距今时间较长，可能会有更新\]/g) || []).length;

    if (markerCount === 1) {
      log(`✅ 防重复标记测试通过！标记只出现1次`, 'green');
    } else {
      log(`❌ 防重复标记测试失败！标记出现${markerCount}次`, 'red');
    }

    // 8. 测试刷新标记功能
    log(`🔄 测试刷新标记功能...`, 'blue');

    // 更新记忆的last_updated为最近时间
    await pool.query(`
      UPDATE ai_memories
      SET last_updated = NOW() - INTERVAL '3 days'
      WHERE user_id = $1 AND expert_id = $2
    `, [testUserId, testExpertId]);

    // 执行刷新标记
    const refresh = await pool.query(`SELECT * FROM refresh_ai_memory_markers()`);
    log(`   刷新结果: ${refresh.rows[0].details}`, 'green');
    log(`   刷新数量: ${refresh.rows[0].refreshed_count}`, 'green');

    // 检查标记是否被移除
    const afterRefresh = await pool.query(`
      SELECT content FROM ai_memories WHERE user_id = $1 AND expert_id = $2
    `, [testUserId, testExpertId]);
    log(`   刷新后内容: "${afterRefresh.rows[0].content}"`, 'cyan');

    if (!afterRefresh.rows[0].content.includes('[该内容距今时间较长，可能会有更新]')) {
      log(`✅ 刷新标记测试通过！标记已被移除`, 'green');
    } else {
      log(`❌ 刷新标记测试失败！标记仍然存在`, 'red');
    }

    // 9. 获取统计信息
    log(`📊 获取统计信息...`, 'blue');
    const stats = await pool.query(`SELECT * FROM get_ai_memory_statistics()`);
    const statsData = stats.rows[0];
    log(`   总记忆数: ${statsData.total_memories}`, 'cyan');
    log(`   旧记忆数: ${statsData.old_memories}`, 'cyan');
    log(`   已标记数: ${statsData.marked_memories}`, 'cyan');
    log(`   未标记旧记忆: ${statsData.unmarked_old_memories}`, 'cyan');
    log(`   最近记忆数: ${statsData.recent_memories}`, 'cyan');

    // 10. 清理测试数据
    log(`🧹 清理测试数据...`, 'yellow');
    await pool.query(`DELETE FROM ai_memories WHERE user_id = $1 AND expert_id = $2`, [testUserId, testExpertId]);

    log(`🎉 所有测试完成！`, 'green');

  } catch (error) {
    log(`❌ 测试失败: ${error.message}`, 'red');
    throw error;
  }
}

async function main() {
  let pool;

  try {
    log(`🚀 AI记忆标记功能测试`, 'blue');
    log(`====================================`, 'blue');

    pool = await createDatabaseConnection();
    await testMemoryMarking(pool);

  } catch (error) {
    log(`💥 测试失败: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

// 运行测试
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
