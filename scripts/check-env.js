#!/usr/bin/env node

/**
 * 环境变量检查脚本
 * 用于验证 Vercel 部署前的环境变量配置
 */

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'KEY_ENCRYPTION_SECRET'
];

// 安全相关的环境变量检查
const securityEnvVars = [
  'NEXTAUTH_SECRET',
  'KEY_ENCRYPTION_SECRET',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const optionalEnvVars = [
  'DB_PROVIDER',
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'DEFAULT_OPENAI_API_KEY',
  'DEFAULT_OPENAI_BASE_URL',
  'ADMIN_USER_IDS',
  'ALLOW_NON_SUPER_ADMIN_SHARE_KEYS',
  'ALLOW_NON_SUPER_ADMIN_CREATE_INVITE_CODES',
  'ALLOW_NON_THIRD_PARTY_SOURCES'
];

console.log('🔍 检查环境变量配置...\n');

let hasErrors = false;
let hasWarnings = false;

// 检查必需的环境变量
console.log('📋 必需的环境变量:');
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`❌ ${varName}: 未设置`);
    hasErrors = true;
  } else {
    const displayValue = varName.includes('SECRET') || varName.includes('KEY')
      ? `${value.substring(0, 8)}...`
      : value.length > 50
        ? `${value.substring(0, 50)}...`
        : value;
    console.log(`✅ ${varName}: ${displayValue}`);
  }
});

console.log('\n📋 可选的环境变量:');
optionalEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`⚠️  ${varName}: 未设置 (可选)`);
    hasWarnings = true;
  } else {
    const displayValue = varName.includes('SECRET') || varName.includes('KEY')
      ? `${value.substring(0, 8)}...`
      : value.length > 50
        ? `${value.substring(0, 50)}...`
        : value;
    console.log(`✅ ${varName}: ${displayValue}`);
  }
});

// 特殊检查
console.log('\n🔍 特殊检查:');

// 检查 Supabase URL 格式
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (supabaseUrl) {
  if (supabaseUrl.includes('supabase.co')) {
    console.log('✅ Supabase URL 格式正确');
  } else {
    console.log('⚠️  Supabase URL 格式可能不正确');
    hasWarnings = true;
  }
}

// 检查 NextAuth URL
const nextAuthUrl = process.env.NEXTAUTH_URL;
if (nextAuthUrl) {
  if (nextAuthUrl.startsWith('https://') || nextAuthUrl.startsWith('http://localhost')) {
    console.log('✅ NEXTAUTH_URL 格式正确');
  } else {
    console.log('⚠️  NEXTAUTH_URL 应该以 https:// 开头 (生产环境)');
    hasWarnings = true;
  }
}

// 检查加密密钥长度
const encryptionSecret = process.env.KEY_ENCRYPTION_SECRET;
if (encryptionSecret && encryptionSecret.length < 32) {
  console.log('⚠️  KEY_ENCRYPTION_SECRET 应该至少 32 个字符');
  hasWarnings = true;
} else if (encryptionSecret) {
  console.log('✅ KEY_ENCRYPTION_SECRET 长度合适');
}

// 检查 NextAuth Secret 强度
const nextAuthSecret = process.env.NEXTAUTH_SECRET;
if (nextAuthSecret) {
  if (nextAuthSecret.length < 32) {
    console.log('⚠️  NEXTAUTH_SECRET 应该至少 32 个字符');
    hasWarnings = true;
  } else if (nextAuthSecret === 'your_nextauth_secret' || nextAuthSecret.includes('example')) {
    console.log('🚨 NEXTAUTH_SECRET 使用了默认值，请更改为安全的随机字符串');
    hasErrors = true;
  } else {
    console.log('✅ NEXTAUTH_SECRET 强度合适');
  }
}

// 检查是否使用了默认的示例值
securityEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value && (value.includes('your_') || value.includes('example') || value.includes('changeme'))) {
    console.log(`🚨 ${varName} 使用了示例值，请更改为安全的值`);
    hasErrors = true;
  }
});

// 检查生产环境的 HTTPS 要求
if (process.env.NODE_ENV === 'production' && nextAuthUrl && !nextAuthUrl.startsWith('https://')) {
  console.log('🚨 生产环境必须使用 HTTPS');
  hasErrors = true;
}

// 总结
console.log('\n📊 检查结果:');
if (hasErrors) {
  console.log('❌ 发现错误: 缺少必需的环境变量');
  console.log('请在 Vercel 项目设置中添加缺失的环境变量');
  process.exit(1);
} else if (hasWarnings) {
  console.log('⚠️  发现警告: 某些配置可能需要调整');
  console.log('建议检查警告项目，但不影响基本功能');
} else {
  console.log('✅ 所有环境变量配置正确');
}

console.log('\n🚀 可以继续部署到 Vercel');
