#!/usr/bin/env node

// 测试双数据库支持的脚本
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 测试双数据库支持...\n');

// 备份原始环境文件
const envPath = '.env.local';
const backupPath = '.env.local.backup';

if (fs.existsSync(envPath)) {
  fs.copyFileSync(envPath, backupPath);
  console.log('✅ 已备份原始环境配置');
}

async function testSupabaseMode() {
  console.log('\n📊 测试 Supabase 模式...');
  
  // 设置 Supabase 模式
  const supabaseEnv = `# 测试 Supabase 模式
DB_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=https://zvjmcihslxlahvovhiye.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2am1jaWhzbHhsYWh2b3ZoaXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MjAxODksImV4cCI6MjA2NTM5NjE4OX0.WBC8I2zxLqi77sS9bM7m4c2-FmoR3fDwP4F54fOkmwk
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2am1jaWhzbHhsYWh2b3ZoaXllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTgyMDE4OSwiZXhwIjoyMDY1Mzk2MTg5fQ.FerazFHCRElSQTzCIDLJrmSUViQSVmWtQ9t5Mo6MLP8
`;
  
  fs.writeFileSync(envPath, supabaseEnv);
  
  try {
    // 测试导入
    const testCode = `
      const { getSupabase, getSupabaseAdmin } = require('./lib/supabase.ts');
      console.log('✅ Supabase 客户端导入成功');
      
      const client = getSupabase();
      console.log('✅ Supabase 客户端创建成功');
      
      const adminClient = getSupabaseAdmin();
      console.log('✅ Supabase Admin 客户端创建成功');
    `;
    
    execSync(`node -e "${testCode}"`, { stdio: 'inherit' });
    console.log('✅ Supabase 模式测试通过');
    return true;
  } catch (error) {
    console.error('❌ Supabase 模式测试失败:', error.message);
    return false;
  }
}

async function testPostgreSQLMode() {
  console.log('\n🐘 测试 PostgreSQL 模式...');
  
  // 设置 PostgreSQL 模式
  const postgresEnv = `# 测试 PostgreSQL 模式
DB_PROVIDER=postgresql
DATABASE_URL=postgresql://test:test@localhost:5432/test_db
`;
  
  fs.writeFileSync(envPath, postgresEnv);
  
  try {
    // 测试导入（不实际连接数据库）
    const testCode = `
      process.env.DB_PROVIDER = 'postgresql';
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
      
      const { getSupabase, getSupabaseAdmin } = require('./lib/supabase.ts');
      console.log('✅ PostgreSQL 兼容性客户端导入成功');
      
      // 测试客户端创建（返回 Proxy）
      const client = getSupabase();
      console.log('✅ PostgreSQL 兼容性客户端创建成功');
      
      const adminClient = getSupabaseAdmin();
      console.log('✅ PostgreSQL 兼容性 Admin 客户端创建成功');
    `;
    
    execSync(`node -e "${testCode}"`, { stdio: 'inherit' });
    console.log('✅ PostgreSQL 模式测试通过');
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL 模式测试失败:', error.message);
    return false;
  }
}

async function restoreEnv() {
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, envPath);
    fs.unlinkSync(backupPath);
    console.log('✅ 已恢复原始环境配置');
  }
}

async function main() {
  try {
    const supabaseResult = await testSupabaseMode();
    const postgresResult = await testPostgreSQLMode();
    
    console.log('\n📋 测试结果总结:');
    console.log(`Supabase 模式: ${supabaseResult ? '✅ 通过' : '❌ 失败'}`);
    console.log(`PostgreSQL 模式: ${postgresResult ? '✅ 通过' : '❌ 失败'}`);
    
    if (supabaseResult && postgresResult) {
      console.log('\n🎉 双数据库支持完全正常！');
    } else {
      console.log('\n⚠️  部分功能存在问题，需要进一步调试');
    }
    
  } finally {
    await restoreEnv();
  }
}

main().catch(console.error);
