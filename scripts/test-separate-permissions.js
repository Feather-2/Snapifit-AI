#!/usr/bin/env node

/**
 * 独立权限控制测试脚本
 * 测试邀请码和分享密钥的独立环境变量控制
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

// 解析布尔值
function parseBoolean(value, defaultValue = false) {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

// 模拟权限检查逻辑
function canShareKeysUnified(userRole, trustLevel) {
  const allowNonSuperAdminShareKeys = parseBoolean(process.env.ALLOW_NON_SUPER_ADMIN_SHARE_KEYS, true);
  
  // 超级管理员总是可以分享（不受环境变量限制）
  if (userRole === 'super_admin') {
    return true;
  }

  // 其他情况都受环境变量控制
  if (!allowNonSuperAdminShareKeys) {
    return false;
  }

  // 如果允许非超级管理员分享
  if (userRole === 'admin') {
    return true;
  }

  // 信任等级用户
  return trustLevel >= 1 && trustLevel <= 4;
}

function canCreateInviteCodesUnified(userRole, trustLevel) {
  const allowNonSuperAdminCreateInviteCodes = parseBoolean(process.env.ALLOW_NON_SUPER_ADMIN_CREATE_INVITE_CODES, true);
  
  // 超级管理员总是可以创建邀请码（不受环境变量限制）
  if (userRole === 'super_admin') {
    return true;
  }

  // 其他情况都受环境变量控制
  if (!allowNonSuperAdminCreateInviteCodes) {
    return false;
  }

  // 如果允许非超级管理员创建邀请码
  if (userRole === 'admin') {
    return true;
  }

  // 信任等级用户
  return trustLevel >= 1 && trustLevel <= 4;
}

// 测试独立权限控制
function testSeparatePermissions() {
  console.log('\n🔐 独立权限控制测试');
  console.log('='.repeat(50));

  const allowNonSuperAdminShareKeys = parseBoolean(process.env.ALLOW_NON_SUPER_ADMIN_SHARE_KEYS, true);
  const allowNonSuperAdminCreateInviteCodes = parseBoolean(process.env.ALLOW_NON_SUPER_ADMIN_CREATE_INVITE_CODES, true);
  const allowNonThirdPartySources = parseBoolean(process.env.ALLOW_NON_THIRD_PARTY_SOURCES, true);

  console.log('\n📋 当前环境变量配置:');
  console.log(`  ALLOW_NON_SUPER_ADMIN_SHARE_KEYS: ${allowNonSuperAdminShareKeys}`);
  console.log(`  ALLOW_NON_SUPER_ADMIN_CREATE_INVITE_CODES: ${allowNonSuperAdminCreateInviteCodes}`);
  console.log(`  ALLOW_NON_THIRD_PARTY_SOURCES: ${allowNonThirdPartySources}`);

  console.log('\n🧪 权限测试结果:');
  
  const testCases = [
    { role: 'super_admin', trustLevel: 4, description: '超级管理员' },
    { role: 'admin', trustLevel: 3, description: '管理员' },
    { role: null, trustLevel: 3, description: '3级用户' },
    { role: null, trustLevel: 1, description: '1级用户' },
    { role: null, trustLevel: 0, description: '0级用户' }
  ];

  testCases.forEach(testCase => {
    const canShare = canShareKeysUnified(testCase.role || 'user', testCase.trustLevel);
    const canInvite = canCreateInviteCodesUnified(testCase.role || 'user', testCase.trustLevel);

    console.log(`\n  👤 ${testCase.description}:`);
    console.log(`     🔑 分享密钥: ${canShare ? '✅ 允许' : '❌ 禁止'}`);
    console.log(`     📧 创建邀请码: ${canInvite ? '✅ 允许' : '❌ 禁止'}`);
    
    if (canShare !== canInvite) {
      console.log(`     ⚠️  权限不一致！分享密钥和邀请码权限不同`);
    } else {
      console.log(`     ✅ 权限一致`);
    }
  });

  return {
    allowNonSuperAdminShareKeys,
    allowNonSuperAdminCreateInviteCodes,
    allowNonThirdPartySources,
    testResults: testCases.map(testCase => ({
      ...testCase,
      canShare: canShareKeysUnified(testCase.role || 'user', testCase.trustLevel),
      canInvite: canCreateInviteCodesUnified(testCase.role || 'user', testCase.trustLevel)
    }))
  };
}

// 测试不同配置组合
function testConfigurationCombinations() {
  console.log('\n🔄 配置组合测试');
  console.log('='.repeat(50));

  const combinations = [
    { shareKeys: true, inviteCodes: true, description: '都允许' },
    { shareKeys: true, inviteCodes: false, description: '只允许分享密钥' },
    { shareKeys: false, inviteCodes: true, description: '只允许创建邀请码' },
    { shareKeys: false, inviteCodes: false, description: '都禁止' }
  ];

  combinations.forEach(combo => {
    console.log(`\n📋 配置: ${combo.description}`);
    console.log(`  ALLOW_NON_SUPER_ADMIN_SHARE_KEYS=${combo.shareKeys}`);
    console.log(`  ALLOW_NON_SUPER_ADMIN_CREATE_INVITE_CODES=${combo.inviteCodes}`);
    
    // 临时设置环境变量
    const originalShareKeys = process.env.ALLOW_NON_SUPER_ADMIN_SHARE_KEYS;
    const originalInviteCodes = process.env.ALLOW_NON_SUPER_ADMIN_CREATE_INVITE_CODES;
    
    process.env.ALLOW_NON_SUPER_ADMIN_SHARE_KEYS = combo.shareKeys.toString();
    process.env.ALLOW_NON_SUPER_ADMIN_CREATE_INVITE_CODES = combo.inviteCodes.toString();

    // 测试管理员权限
    const adminCanShare = canShareKeysUnified('admin', 3);
    const adminCanInvite = canCreateInviteCodesUnified('admin', 3);
    
    console.log(`  管理员: 分享密钥=${adminCanShare ? '✅' : '❌'}, 邀请码=${adminCanInvite ? '✅' : '❌'}`);

    // 测试3级用户权限
    const userCanShare = canShareKeysUnified(null, 3);
    const userCanInvite = canCreateInviteCodesUnified(null, 3);
    
    console.log(`  3级用户: 分享密钥=${userCanShare ? '✅' : '❌'}, 邀请码=${userCanInvite ? '✅' : '❌'}`);

    // 恢复原始环境变量
    process.env.ALLOW_NON_SUPER_ADMIN_SHARE_KEYS = originalShareKeys;
    process.env.ALLOW_NON_SUPER_ADMIN_CREATE_INVITE_CODES = originalInviteCodes;
  });
}

// 生成配置建议
function generateConfigAdvice(config) {
  console.log('\n💡 配置建议:');
  
  if (config.allowNonSuperAdminShareKeys && config.allowNonSuperAdminCreateInviteCodes) {
    console.log('  🔓 当前配置较为宽松，管理员和信任等级用户都可以分享密钥和创建邀请码');
    console.log('     适合团队协作环境，但需要注意安全风险');
  } else if (!config.allowNonSuperAdminShareKeys && !config.allowNonSuperAdminCreateInviteCodes) {
    console.log('  🔒 当前配置最为严格，只有超级管理员可以进行所有操作');
    console.log('     安全性最高，适合严格管控的环境');
  } else {
    console.log('  ⚖️  当前配置采用差异化权限控制');
    if (config.allowNonSuperAdminShareKeys) {
      console.log('     ✅ 允许分享密钥，❌ 禁止创建邀请码');
      console.log('     适合需要API访问但限制用户增长的场景');
    } else {
      console.log('     ❌ 禁止分享密钥，✅ 允许创建邀请码');
      console.log('     适合控制API使用但允许用户邀请的场景');
    }
  }

  console.log('\n🎯 最佳实践:');
  console.log('  1. 生产环境建议设置为 false，只允许超级管理员操作');
  console.log('  2. 开发环境可以设置为 true，方便测试');
  console.log('  3. 可以根据业务需求独立控制两个权限');
  console.log('  4. 定期审查权限配置，确保符合安全要求');
}

// 主函数
function main() {
  console.log('🚀 SnapFit AI 独立权限控制测试');
  console.log('验证邀请码和分享密钥的独立环境变量控制\n');

  // 加载环境变量
  loadEnvFiles();

  // 测试独立权限控制
  const config = testSeparatePermissions();

  // 测试配置组合
  testConfigurationCombinations();

  // 生成建议
  generateConfigAdvice(config);

  console.log('\n✅ 测试完成！');
  console.log('\n📚 相关文件:');
  console.log('  - 权限配置: lib/env-config.ts');
  console.log('  - 管理员权限: lib/auth/admin-manager.ts');
  console.log('  - 邀请码管理: lib/auth/invite-code-manager.ts');
  console.log('  - 分享密钥API: app/api/shared-keys/route.ts');
  console.log('  - 邀请码API: app/api/auth/invite-codes/route.ts');
}

// 运行测试
if (require.main === module) {
  main();
}

module.exports = {
  testSeparatePermissions,
  testConfigurationCombinations,
  canShareKeysUnified,
  canCreateInviteCodesUnified
};
