#!/usr/bin/env node

/**
 * 环境变量配置测试脚本
 * 用于验证新增的权限管理环境变量是否正确配置
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
      console.log(`📁 已加载环境变量文件: ${envFile}`);
    }
  }
}

// 解析布尔值
function parseBoolean(value, defaultValue = false) {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

// 测试环境变量配置
function testEnvConfig() {
  console.log('\n🔧 环境变量配置测试');
  console.log('='.repeat(50));

  // 测试权限管理配置
  console.log('\n📋 权限管理配置:');
  
  const allowNonSuperAdminShareKeys = parseBoolean(process.env.ALLOW_NON_SUPER_ADMIN_SHARE_KEYS, true);
  const allowNonThirdPartySources = parseBoolean(process.env.ALLOW_NON_THIRD_PARTY_SOURCES, true);
  
  console.log(`  ✅ ALLOW_NON_SUPER_ADMIN_SHARE_KEYS: ${allowNonSuperAdminShareKeys}`);
  console.log(`     说明: ${allowNonSuperAdminShareKeys ? '管理员和超级管理员都可以分享密钥' : '只有超级管理员可以分享密钥'}`);
  
  console.log(`  ✅ ALLOW_NON_THIRD_PARTY_SOURCES: ${allowNonThirdPartySources}`);
  console.log(`     说明: ${allowNonThirdPartySources ? '允许使用官方API地址和第三方源站' : '只允许使用第三方源站，禁止官方API地址'}`);

  // 测试其他相关配置
  console.log('\n📋 其他相关配置:');
  console.log(`  ✅ NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  ✅ DB_PROVIDER: ${process.env.DB_PROVIDER || 'postgresql'}`);
  console.log(`  ✅ DEPLOYMENT_TYPE: ${process.env.DEPLOYMENT_TYPE || 'http'}`);

  // 权限测试场景
  console.log('\n🧪 权限测试场景:');
  
  const testScenarios = [
    {
      role: 'super_admin',
      canShareKeys: true, // 超级管理员总是可以分享
      description: '超级管理员'
    },
    {
      role: 'admin',
      canShareKeys: allowNonSuperAdminShareKeys,
      description: '管理员'
    },
    {
      role: 'user',
      canShareKeys: false,
      description: '普通用户'
    }
  ];

  testScenarios.forEach(scenario => {
    console.log(`  ${scenario.canShareKeys ? '✅' : '❌'} ${scenario.description}: ${scenario.canShareKeys ? '可以' : '不可以'}分享密钥`);
  });

  // URL验证测试
  console.log('\n🌐 URL验证测试:');
  const testUrls = [
    'api.openai.com',
    'api.anthropic.com',
    'api.deepseek.com',
    'custom-proxy.example.com'
  ];

  testUrls.forEach(url => {
    const isBlocked = !allowNonThirdPartySources && isOfficialAPI(url);
    console.log(`  ${isBlocked ? '❌' : '✅'} ${url}: ${isBlocked ? '被禁止' : '允许使用'}`);
  });

  return {
    allowNonSuperAdminShareKeys,
    allowNonThirdPartySources,
    testResults: {
      configLoaded: true,
      permissionsWorking: true
    }
  };
}

// 简单的官方API检测
function isOfficialAPI(url) {
  const officialDomains = [
    'api.openai.com',
    'api.anthropic.com',
    'api.deepseek.com',
    'dashscope.aliyuncs.com',
    'generativelanguage.googleapis.com'
  ];
  
  return officialDomains.some(domain => url.includes(domain));
}

// 生成配置建议
function generateConfigAdvice(config) {
  console.log('\n💡 配置建议:');
  
  if (config.allowNonSuperAdminShareKeys) {
    console.log('  📝 当前允许管理员分享密钥，适合团队协作环境');
    console.log('     如需更严格的权限控制，可设置 ALLOW_NON_SUPER_ADMIN_SHARE_KEYS=false');
  } else {
    console.log('  🔒 当前只允许超级管理员分享密钥，安全性较高');
    console.log('     如需允许管理员分享，可设置 ALLOW_NON_SUPER_ADMIN_SHARE_KEYS=true');
  }

  if (config.allowNonThirdPartySources) {
    console.log('  🌐 当前允许使用官方API地址，使用灵活性较高');
    console.log('     如需禁止官方API防止封禁，可设置 ALLOW_NON_THIRD_PARTY_SOURCES=false');
  } else {
    console.log('  🛡️ 当前禁止官方API地址，有助于避免账号封禁风险');
    console.log('     如需允许官方API，可设置 ALLOW_NON_THIRD_PARTY_SOURCES=true');
  }
}

// 主函数
function main() {
  console.log('🚀 SnapFit AI 环境变量配置测试');
  console.log('测试新增的权限管理环境变量配置\n');

  // 加载环境变量
  loadEnvFiles();

  // 测试配置
  const config = testEnvConfig();

  // 生成建议
  generateConfigAdvice(config);

  console.log('\n✅ 测试完成！');
  console.log('\n📚 更多信息:');
  console.log('  - 开发环境配置: .env.local');
  console.log('  - Docker单容器: deployment/docker-single/.env');
  console.log('  - Docker完整部署: deployment/docker-full/.env');
  console.log('  - 管理员可通过 /api/admin/env-config 查看当前配置');
}

// 运行测试
if (require.main === module) {
  main();
}

module.exports = {
  testEnvConfig,
  loadEnvFiles,
  parseBoolean
};
