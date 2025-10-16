#!/usr/bin/env node

/**
 * 权限检查测试脚本
 * 测试环境变量控制的权限检查是否正确工作
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

// 模拟权限检查逻辑
function parseBoolean(value, defaultValue = false) {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

function canShareKeys(userRole) {
  const allowNonSuperAdminShareKeys = parseBoolean(process.env.ALLOW_NON_SUPER_ADMIN_SHARE_KEYS, true);
  
  // 超级管理员总是可以分享
  if (userRole === 'super_admin') {
    return true;
  }

  // 如果允许非超级管理员分享，则管理员也可以分享
  if (allowNonSuperAdminShareKeys && userRole === 'admin') {
    return true;
  }

  return false;
}

function canUseNonThirdPartySources() {
  return parseBoolean(process.env.ALLOW_NON_THIRD_PARTY_SOURCES, true);
}

// 测试权限检查
function testPermissionCheck() {
  console.log('\n🔐 权限检查测试');
  console.log('='.repeat(50));

  const allowNonSuperAdminShareKeys = parseBoolean(process.env.ALLOW_NON_SUPER_ADMIN_SHARE_KEYS, true);
  const allowNonThirdPartySources = parseBoolean(process.env.ALLOW_NON_THIRD_PARTY_SOURCES, true);

  console.log('\n📋 当前环境变量配置:');
  console.log(`  ALLOW_NON_SUPER_ADMIN_SHARE_KEYS: ${allowNonSuperAdminShareKeys}`);
  console.log(`  ALLOW_NON_THIRD_PARTY_SOURCES: ${allowNonThirdPartySources}`);

  console.log('\n🧪 权限测试结果:');
  
  const testRoles = ['super_admin', 'admin', 'moderator', 'user'];
  
  testRoles.forEach(role => {
    const canShare = canShareKeys(role);
    const status = canShare ? '✅ 允许' : '❌ 禁止';
    console.log(`  ${status} ${role.padEnd(12)} 分享密钥`);
  });

  console.log('\n🌐 URL验证测试:');
  const testUrls = [
    { url: 'api.openai.com', isOfficial: true },
    { url: 'api.anthropic.com', isOfficial: true },
    { url: 'custom-proxy.example.com', isOfficial: false }
  ];

  testUrls.forEach(({ url, isOfficial }) => {
    const isAllowed = allowNonThirdPartySources || !isOfficial;
    const status = isAllowed ? '✅ 允许' : '❌ 禁止';
    const type = isOfficial ? '(官方API)' : '(第三方)';
    console.log(`  ${status} ${url.padEnd(25)} ${type}`);
  });

  return {
    allowNonSuperAdminShareKeys,
    allowNonThirdPartySources,
    permissionResults: testRoles.map(role => ({
      role,
      canShare: canShareKeys(role)
    }))
  };
}

// 生成修复建议
function generateFixSuggestions(config) {
  console.log('\n🔧 修复建议:');
  
  if (config.allowNonSuperAdminShareKeys) {
    console.log('  📝 当前配置允许管理员分享密钥');
    console.log('     如果你发现管理员仍然可以分享，请检查:');
    console.log('     1. 确保应用已重启以加载新的环境变量');
    console.log('     2. 检查是否有其他API路由绕过了权限检查');
    console.log('     3. 验证用户的实际角色是否为 admin 而不是 super_admin');
  } else {
    console.log('  🔒 当前配置只允许超级管理员分享密钥');
    console.log('     如果管理员仍然可以分享，可能的原因:');
    console.log('     1. 应用未重启，环境变量未生效');
    console.log('     2. 某些API路由使用了旧的权限检查逻辑');
    console.log('     3. 用户实际角色是 super_admin');
    console.log('     4. 数据库中的权限配置覆盖了环境变量设置');
  }

  console.log('\n🛠️ 调试步骤:');
  console.log('  1. 重启应用: npm run dev 或 docker-compose restart');
  console.log('  2. 检查用户角色: 在管理面板查看用户的实际角色');
  console.log('  3. 查看API日志: 检查权限检查的执行路径');
  console.log('  4. 测试API端点: 直接调用 /api/admin/env-config 查看配置');
}

// 主函数
function main() {
  console.log('🚀 SnapFit AI 权限检查测试');
  console.log('验证环境变量控制的权限是否正确工作\n');

  // 加载环境变量
  loadEnvFiles();

  // 测试权限检查
  const config = testPermissionCheck();

  // 生成修复建议
  generateFixSuggestions(config);

  console.log('\n✅ 测试完成！');
  console.log('\n📚 相关文件:');
  console.log('  - 权限检查逻辑: lib/env-config.ts');
  console.log('  - 管理员权限: lib/auth/admin-manager.ts');
  console.log('  - 邀请码管理: lib/auth/invite-code-manager.ts');
  console.log('  - API路由: app/api/auth/invite-codes/route.ts');
}

// 运行测试
if (require.main === module) {
  main();
}

module.exports = {
  testPermissionCheck,
  canShareKeys,
  canUseNonThirdPartySources
};
