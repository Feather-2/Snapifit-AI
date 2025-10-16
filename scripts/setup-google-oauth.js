#!/usr/bin/env node

/**
 * Google OAuth 快速配置脚本
 * 帮助用户快速配置 Google OAuth 环境变量
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('🚀 Google OAuth 配置助手');
  console.log('=====================================');
  console.log('');
  console.log('此脚本将帮助您配置 Google OAuth 登录功能。');
  console.log('');
  console.log('📋 准备工作:');
  console.log('1. 访问 Google Cloud Console: https://console.cloud.google.com/');
  console.log('2. 创建或选择一个项目');
  console.log('3. 启用 Google+ API 或 People API');
  console.log('4. 创建 OAuth 2.0 客户端 ID');
  console.log('');

  const proceed = await question('是否已完成上述准备工作？(y/N): ');
  if (proceed.toLowerCase() !== 'y' && proceed.toLowerCase() !== 'yes') {
    console.log('');
    console.log('请先完成准备工作，然后重新运行此脚本。');
    console.log('详细配置指南请参考: docs/google-oauth-setup.md');
    rl.close();
    return;
  }

  console.log('');
  console.log('📝 请输入您的 Google OAuth 配置信息:');
  console.log('');

  // 获取 Google Client ID
  const googleClientId = await question('Google Client ID (格式: xxxxx.apps.googleusercontent.com): ');
  if (!googleClientId || !googleClientId.includes('.apps.googleusercontent.com')) {
    console.log('❌ 无效的 Google Client ID 格式');
    rl.close();
    return;
  }

  // 获取 Google Client Secret
  const googleClientSecret = await question('Google Client Secret (格式: GOCSPX-xxxxx): ');
  if (!googleClientSecret || !googleClientSecret.startsWith('GOCSPX-')) {
    console.log('❌ 无效的 Google Client Secret 格式');
    rl.close();
    return;
  }

  // 获取应用 URL
  const defaultUrl = 'http://localhost:3000';
  const nextAuthUrl = await question(`NextAuth URL (默认: ${defaultUrl}): `) || defaultUrl;

  // 生成 NextAuth Secret
  const crypto = require('crypto');
  const nextAuthSecret = crypto.randomBytes(32).toString('hex');

  console.log('');
  console.log('🔧 配置信息确认:');
  console.log(`Google Client ID: ${googleClientId}`);
  console.log(`Google Client Secret: ${googleClientSecret.substring(0, 10)}...`);
  console.log(`NextAuth URL: ${nextAuthUrl}`);
  console.log(`NextAuth Secret: ${nextAuthSecret.substring(0, 10)}... (自动生成)`);
  console.log('');

  const confirm = await question('确认配置信息正确？(y/N): ');
  if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
    console.log('配置已取消。');
    rl.close();
    return;
  }

  // 读取现有的 .env.local 文件
  const envPath = path.join(process.cwd(), '.env.local');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    console.log('');
    console.log('📄 发现现有的 .env.local 文件，将更新配置...');
  } else {
    console.log('');
    console.log('📄 创建新的 .env.local 文件...');
  }

  // 更新或添加环境变量
  const envVars = {
    'GOOGLE_CLIENT_ID': googleClientId,
    'GOOGLE_CLIENT_SECRET': googleClientSecret,
    'NEXTAUTH_URL': nextAuthUrl,
    'NEXTAUTH_SECRET': nextAuthSecret
  };

  let updatedContent = envContent;
  
  for (const [key, value] of Object.entries(envVars)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    const newLine = `${key}=${value}`;
    
    if (regex.test(updatedContent)) {
      // 更新现有变量
      updatedContent = updatedContent.replace(regex, newLine);
    } else {
      // 添加新变量
      if (updatedContent && !updatedContent.endsWith('\n')) {
        updatedContent += '\n';
      }
      updatedContent += `${newLine}\n`;
    }
  }

  // 写入文件
  try {
    fs.writeFileSync(envPath, updatedContent);
    console.log('✅ 环境变量配置成功！');
    console.log('');
    console.log('📋 重要提醒:');
    console.log('1. 请确保在 Google Cloud Console 中配置了正确的重定向 URI:');
    console.log(`   ${nextAuthUrl}/api/auth/callback/google`);
    console.log('2. 重启开发服务器以使配置生效');
    console.log('3. 访问测试页面验证配置: /debug/oauth-test');
    console.log('');
    console.log('🔗 相关链接:');
    console.log('- 配置指南: docs/google-oauth-setup.md');
    console.log('- Google Cloud Console: https://console.cloud.google.com/');
    console.log('');
  } catch (error) {
    console.log('❌ 写入环境变量文件失败:', error.message);
  }

  rl.close();
}

// 检查是否在项目根目录
if (!fs.existsSync('package.json')) {
  console.log('❌ 请在项目根目录运行此脚本');
  process.exit(1);
}

main().catch(console.error);
