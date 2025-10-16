#!/usr/bin/env node

/**
 * 清空加密相关数据脚本
 * 当 KEY_ENCRYPTION_SECRET 更改时，需要清空所有加密的数据
 * 只清空数据行，保留表结构、函数、触发器等
 */

const fs = require('fs');
const path = require('path');

// 加载环境变量
function loadEnvFiles() {
  const envFiles = ['.env.local', '.env', '.env.production'];
  
  for (const envFile of envFiles) {
    const envPath = path.join(process.cwd(), envFile);
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const lines = envContent.split('\n');
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=');
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      }
    }
  }
}

loadEnvFiles();

console.log('🧹 清空加密数据脚本');
console.log('='.repeat(50));
console.log('⚠️  警告：此操作将清空所有用户数据！');
console.log('📋 将要清空的表：');
console.log('   - users (用户表)');
console.log('   - user_profiles (用户配置)');
console.log('   - shared_keys (共享密钥)');
console.log('   - daily_logs (日志数据)');
console.log('   - ai_memories (AI记忆)');
console.log('   - security_events (安全事件)');
console.log('   - invite_codes (邀请码)');
console.log('   - ip_bans (IP封禁)');
console.log('   - user_bans (用户封禁)');
console.log('');

// 检查数据库配置
const dbProvider = process.env.DB_PROVIDER || 'supabase';
console.log(`📊 数据库类型: ${dbProvider}`);

if (dbProvider === 'postgresql') {
  console.log(`🔗 数据库连接: ${process.env.DATABASE_URL ? '已配置' : '未配置'}`);
} else {
  console.log(`🔗 Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '已配置' : '未配置'}`);
}

console.log('');

// 询问用户确认
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('❓ 确定要清空所有数据吗？这个操作不可逆！(输入 "CONFIRM" 确认): ', async (answer) => {
  if (answer !== 'CONFIRM') {
    console.log('❌ 操作已取消');
    rl.close();
    return;
  }

  console.log('');
  console.log('🚀 开始清空数据...');

  try {
    if (dbProvider === 'postgresql') {
      await clearPostgreSQLData();
    } else {
      await clearSupabaseData();
    }
    
    console.log('');
    console.log('✅ 数据清空完成！');
    console.log('📝 建议接下来的操作：');
    console.log('   1. 重新注册管理员账户');
    console.log('   2. 配置共享密钥');
    console.log('   3. 设置邀请码');
    
  } catch (error) {
    console.error('❌ 清空数据时出错:', error.message);
    console.log('');
    console.log('🔧 可能的解决方案：');
    console.log('   1. 检查数据库连接配置');
    console.log('   2. 确认数据库权限');
    console.log('   3. 手动执行 SQL 清理脚本');
  }
  
  rl.close();
});

// PostgreSQL 数据清理
async function clearPostgreSQLData() {
  const { Client } = require('pg');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('🔗 已连接到 PostgreSQL 数据库');

    // 按依赖关系顺序清空表
    const tables = [
      'security_events',
      'ai_memories', 
      'daily_logs',
      'user_bans',
      'ip_bans',
      'invite_codes',
      'shared_keys',
      'user_profiles',
      'users'
    ];

    for (const table of tables) {
      try {
        const result = await client.query(`DELETE FROM ${table}`);
        console.log(`✅ 已清空表 ${table} (删除了 ${result.rowCount} 行)`);
      } catch (error) {
        if (error.code === '42P01') {
          console.log(`⚠️  表 ${table} 不存在，跳过`);
        } else {
          console.log(`❌ 清空表 ${table} 失败: ${error.message}`);
        }
      }
    }

    // 重置序列（如果存在）
    const sequences = [
      'users_id_seq',
      'shared_keys_id_seq',
      'daily_logs_id_seq',
      'ai_memories_id_seq',
      'security_events_id_seq',
      'invite_codes_id_seq',
      'ip_bans_id_seq',
      'user_bans_id_seq'
    ];

    for (const seq of sequences) {
      try {
        await client.query(`ALTER SEQUENCE ${seq} RESTART WITH 1`);
        console.log(`🔄 已重置序列 ${seq}`);
      } catch (error) {
        // 序列可能不存在，忽略错误
      }
    }

  } finally {
    await client.end();
  }
}

// Supabase 数据清理
async function clearSupabaseData() {
  const { createClient } = require('@supabase/supabase-js');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('🔗 已连接到 Supabase 数据库');

  // 按依赖关系顺序清空表
  const tables = [
    'security_events',
    'ai_memories', 
    'daily_logs',
    'user_bans',
    'ip_bans',
    'invite_codes',
    'shared_keys',
    'user_profiles',
    'users'
  ];

  for (const table of tables) {
    try {
      const { error, count } = await supabase
        .from(table)
        .delete()
        .neq('id', 0); // 删除所有记录

      if (error) {
        if (error.code === 'PGRST116') {
          console.log(`⚠️  表 ${table} 不存在，跳过`);
        } else {
          console.log(`❌ 清空表 ${table} 失败: ${error.message}`);
        }
      } else {
        console.log(`✅ 已清空表 ${table}`);
      }
    } catch (error) {
      console.log(`❌ 清空表 ${table} 时出错: ${error.message}`);
    }
  }
}
