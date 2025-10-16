#!/usr/bin/env node

/**
 * 安全检查脚本
 * 用于检查应用的安全配置和潜在漏洞
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
            // 只设置未设置的环境变量
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      }
      console.log(`📁 已加载环境变量文件: ${envFile}`);
    }
  }
}

// 加载环境变量
loadEnvFiles();

console.log('🔒 SnapFit AI 安全检查');
console.log('='.repeat(50));

let hasErrors = false;
let hasWarnings = false;
let checksTotal = 0;
let checksPassed = 0;

function checkItem(name, condition, errorMessage, warningMessage = null) {
  checksTotal++;
  console.log(`\n🔍 检查: ${name}`);

  if (condition) {
    console.log('✅ 通过');
    checksPassed++;
  } else if (warningMessage) {
    console.log(`⚠️  ${warningMessage}`);
    hasWarnings = true;
  } else {
    console.log(`❌ ${errorMessage}`);
    hasErrors = true;
  }
}

// 1. 环境变量安全检查
console.log('\n📋 环境变量安全检查');
console.log('-'.repeat(30));

const requiredSecurityVars = [
  'NEXTAUTH_SECRET',
  'KEY_ENCRYPTION_SECRET',
  'SUPABASE_SERVICE_ROLE_KEY'
];

requiredSecurityVars.forEach(varName => {
  const value = process.env[varName];

  checkItem(
    `${varName} 存在性`,
    !!value,
    `${varName} 未设置`
  );

  if (value) {
    checkItem(
      `${varName} 长度`,
      value.length >= 32,
      `${varName} 长度不足32字符`,
      `${varName} 长度较短，建议使用更长的密钥`
    );

    checkItem(
      `${varName} 不是默认值`,
      !value.includes('your_') && !value.includes('example') && !value.includes('changeme'),
      `${varName} 使用了默认示例值`
    );
  }
});

// 2. HTTPS 配置检查
console.log('\n🔐 HTTPS 配置检查');
console.log('-'.repeat(30));

const nextAuthUrl = process.env.NEXTAUTH_URL;
const isProduction = process.env.NODE_ENV === 'production';

checkItem(
  'NEXTAUTH_URL 配置',
  !!nextAuthUrl,
  'NEXTAUTH_URL 未设置'
);

if (nextAuthUrl) {
  checkItem(
    '生产环境 HTTPS',
    !isProduction || nextAuthUrl.startsWith('https://'),
    '生产环境必须使用 HTTPS'
  );
}

// 3. 文件权限检查
console.log('\n📁 文件权限检查');
console.log('-'.repeat(30));

const sensitiveFiles = [
  '.env',
  '.env.local',
  '.env.production',
  'package.json',
  'next.config.mjs'
];

sensitiveFiles.forEach(fileName => {
  const filePath = path.join(process.cwd(), fileName);
  if (fs.existsSync(filePath)) {
    try {
      const stats = fs.statSync(filePath);
      const mode = stats.mode & parseInt('777', 8);

      checkItem(
        `${fileName} 权限`,
        mode <= parseInt('644', 8),
        `${fileName} 权限过于宽松 (${mode.toString(8)})`,
        `${fileName} 权限可以更严格`
      );
    } catch (error) {
      checkItem(
        `${fileName} 权限检查`,
        false,
        `无法检查 ${fileName} 权限: ${error.message}`
      );
    }
  }
});

// 4. 依赖安全检查
console.log('\n📦 依赖安全检查');
console.log('-'.repeat(30));

try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

  // 检查已知的不安全包
  const unsafePackages = [
    'lodash', // 建议使用 lodash-es
    'moment', // 建议使用 dayjs
    'request', // 已废弃
  ];

  const foundUnsafePackages = unsafePackages.filter(pkg => dependencies[pkg]);

  checkItem(
    '不安全依赖包',
    foundUnsafePackages.length === 0,
    `发现不安全的依赖包: ${foundUnsafePackages.join(', ')}`,
    foundUnsafePackages.length > 0 ? `建议更新这些包: ${foundUnsafePackages.join(', ')}` : null
  );

  // 检查 Next.js 版本
  const nextVersion = dependencies['next'];
  if (nextVersion) {
    const versionNumber = nextVersion.replace(/[^\d.]/g, '');
    const majorVersion = parseInt(versionNumber.split('.')[0]);

    checkItem(
      'Next.js 版本',
      majorVersion >= 14,
      `Next.js 版本过低 (${nextVersion})，建议升级到最新版本`
    );
  }

} catch (error) {
  checkItem(
    'package.json 读取',
    false,
    `无法读取 package.json: ${error.message}`
  );
}

// 5. 配置文件安全检查
console.log('\n⚙️  配置文件安全检查');
console.log('-'.repeat(30));

// 检查 next.config.mjs
try {
  const nextConfigPath = path.join(process.cwd(), 'next.config.mjs');
  if (fs.existsSync(nextConfigPath)) {
    const nextConfigContent = fs.readFileSync(nextConfigPath, 'utf8');

    checkItem(
      'Next.js 配置安全',
      !nextConfigContent.includes('dangerouslyAllowSVG') &&
      !nextConfigContent.includes('unoptimized: false'),
      '发现潜在的不安全配置'
    );

    checkItem(
      '生产环境调试路由禁用',
      nextConfigContent.includes('debug') && nextConfigContent.includes('production'),
      '未发现生产环境调试路由禁用配置',
      '建议在生产环境禁用调试路由'
    );
  }
} catch (error) {
  console.log(`⚠️  无法检查 next.config.mjs: ${error.message}`);
}

// 6. 数据库安全检查
console.log('\n🗄️  数据库安全检查');
console.log('-'.repeat(30));

const dbUrl = process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

if (dbUrl) {
  checkItem(
    '数据库连接加密',
    dbUrl.includes('ssl=true') || dbUrl.startsWith('postgres://') || dbUrl.includes('sslmode=require'),
    '数据库连接未启用 SSL',
    '建议启用数据库 SSL 连接'
  );

  checkItem(
    '数据库密码强度',
    !dbUrl.includes('password=123') && !dbUrl.includes('password=admin'),
    '数据库使用弱密码'
  );
}

// 7. API 安全检查
console.log('\n🔌 API 安全检查');
console.log('-'.repeat(30));

// 检查是否有公开的 API 密钥
const envContent = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
const envLocalContent = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '';
const allEnvContent = envContent + envLocalContent;

checkItem(
  'API 密钥保护',
  !allEnvContent.includes('sk-') || !allEnvContent.includes('NEXT_PUBLIC'),
  '发现可能暴露的 API 密钥'
);

// 8. 生产环境特定检查
if (isProduction) {
  console.log('\n🏭 生产环境特定检查');
  console.log('-'.repeat(30));

  checkItem(
    '调试模式关闭',
    !process.env.DEBUG && !process.env.NODE_DEBUG,
    '生产环境启用了调试模式'
  );

  checkItem(
    '源码映射禁用',
    !process.env.GENERATE_SOURCEMAP || process.env.GENERATE_SOURCEMAP === 'false',
    '生产环境启用了源码映射',
    '建议在生产环境禁用源码映射'
  );
}

// 总结
console.log('\n📊 检查总结');
console.log('='.repeat(50));
console.log(`总检查项: ${checksTotal}`);
console.log(`通过检查: ${checksPassed}`);
console.log(`警告数量: ${hasWarnings ? '有' : '无'}`);
console.log(`错误数量: ${hasErrors ? '有' : '无'}`);

if (hasErrors) {
  console.log('\n🚨 发现安全问题，请立即修复！');
  process.exit(1);
} else if (hasWarnings) {
  console.log('\n⚠️  发现一些建议改进的地方');
  process.exit(0);
} else {
  console.log('\n✅ 所有安全检查通过！');
  process.exit(0);
}
