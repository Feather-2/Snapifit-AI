#!/usr/bin/env node

/**
 * OAuth 配置诊断脚本
 * 检查 Google OAuth 配置是否正确
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 OAuth 配置诊断');
console.log('=====================================');
console.log('');

// 检查环境变量文件
const envFiles = ['.env.local', '.env'];
let envFound = false;

for (const envFile of envFiles) {
  const envPath = path.join(process.cwd(), envFile);
  if (fs.existsSync(envPath)) {
    console.log(`✅ 找到环境变量文件: ${envFile}`);
    envFound = true;
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    // 检查必要的环境变量
    const requiredVars = [
      'NEXTAUTH_URL',
      'NEXTAUTH_SECRET',
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET'
    ];
    
    console.log('\n📋 环境变量检查:');
    
    for (const varName of requiredVars) {
      const regex = new RegExp(`^${varName}=(.+)$`, 'm');
      const match = envContent.match(regex);
      
      if (match) {
        const value = match[1].trim();
        if (value && value !== 'your_' + varName.toLowerCase()) {
          console.log(`✅ ${varName}: 已设置`);
          
          // 特殊检查
          if (varName === 'GOOGLE_CLIENT_ID' && !value.includes('.apps.googleusercontent.com')) {
            console.log(`⚠️  ${varName}: 格式可能不正确 (应包含 .apps.googleusercontent.com)`);
          }
          if (varName === 'GOOGLE_CLIENT_SECRET' && !value.startsWith('GOCSPX-')) {
            console.log(`⚠️  ${varName}: 格式可能不正确 (应以 GOCSPX- 开头)`);
          }
          if (varName === 'NEXTAUTH_URL' && !value.startsWith('http')) {
            console.log(`⚠️  ${varName}: 格式可能不正确 (应以 http:// 或 https:// 开头)`);
          }
          if (varName === 'NEXTAUTH_SECRET' && value.length < 32) {
            console.log(`⚠️  ${varName}: 长度可能不够 (建议至少32字符)`);
          }
        } else {
          console.log(`❌ ${varName}: 未设置或使用默认值`);
        }
      } else {
        console.log(`❌ ${varName}: 未找到`);
      }
    }
    break;
  }
}

if (!envFound) {
  console.log('❌ 未找到环境变量文件 (.env.local 或 .env)');
  console.log('');
  console.log('🔧 解决方案:');
  console.log('1. 复制 .env.example 到 .env.local');
  console.log('2. 运行: pnpm run setup-google-oauth');
  console.log('3. 或手动配置环境变量');
}

console.log('');
console.log('🔧 推荐的解决步骤:');
console.log('1. 确保 Google Cloud Console 中已正确配置 OAuth 客户端');
console.log('2. 检查重定向 URI: http://localhost:3000/api/auth/callback/google');
console.log('3. 运行: pnpm run setup-google-oauth (自动配置)');
console.log('4. 重启开发服务器: pnpm dev');
console.log('5. 测试登录: http://localhost:3000/debug/oauth-test');
console.log('');

// 检查 NextAuth 配置文件
const authConfigPath = path.join(process.cwd(), 'lib', 'auth.ts');
if (fs.existsSync(authConfigPath)) {
  console.log('✅ NextAuth 配置文件存在: lib/auth.ts');
  
  const authContent = fs.readFileSync(authConfigPath, 'utf8');
  if (authContent.includes('Google({')) {
    console.log('✅ Google Provider 已配置');
  } else {
    console.log('❌ Google Provider 未找到');
  }
} else {
  console.log('❌ NextAuth 配置文件不存在');
}

console.log('');
console.log('📞 如果问题仍然存在:');
console.log('- 检查浏览器开发者工具的网络请求');
console.log('- 查看服务器控制台的详细错误信息');
console.log('- 确认 Google Cloud Console 配置正确');
console.log('- 参考: docs/google-oauth-setup.md');
