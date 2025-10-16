#!/usr/bin/env node

/**
 * 部署环境变量检查脚本
 * 检查部署目录中的环境变量配置是否完整
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 检查部署环境变量配置...\n');

// 部署配置文件
const deploymentConfigs = [
  {
    name: 'Docker Full (PostgreSQL)',
    path: 'deployment/docker-full/.env',
    type: 'docker-full'
  },
  {
    name: 'Docker Single (Supabase)',
    path: 'deployment/docker-single/.env',
    type: 'docker-single'
  }
];

// 必需的环境变量（按类别）
const requiredVariables = {
  security: [
    'NEXTAUTH_SECRET',
    'KEY_ENCRYPTION_SECRET'
  ],
  database: {
    'docker-full': [
      'DB_PROVIDER',
      'POSTGRES_DB',
      'POSTGRES_USER', 
      'POSTGRES_PASSWORD',
      'DATABASE_URL'
    ],
    'docker-single': [
      'DB_PROVIDER',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ]
  },
  deployment: [
    'NEXTAUTH_URL',
    'APP_NAME',
    'APP_VERSION',
    'NODE_ENV',
    'AUTH_TRUST_HOST'
  ]
};

// 推荐的环境变量
const recommendedVariables = [
  'EMAIL_PROVIDER',
  'FROM_EMAIL',
  'ENABLE_RATE_LIMIT',
  'ALLOW_NON_THIRD_PARTY_SOURCES',
  'LOG_LEVEL',
  'TZ'
];

/**
 * 解析环境变量文件
 */
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const variables = {};
  
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        variables[key] = valueParts.join('=');
      }
    }
  });
  
  return variables;
}

/**
 * 检查变量安全性
 */
function checkVariableSecurity(key, value) {
  const issues = [];
  
  // 检查密钥长度
  if (key.includes('SECRET') || key.includes('KEY')) {
    if (value.length < 32) {
      issues.push(`${key} 长度不足32字符`);
    }
    
    // 检查是否使用默认值
    if (value.includes('your_') || value.includes('example') || value.includes('changeme')) {
      issues.push(`${key} 使用了默认示例值`);
    }
  }
  
  // 检查 URL 格式
  if (key.includes('URL') && value) {
    try {
      new URL(value);
    } catch {
      issues.push(`${key} URL 格式不正确`);
    }
  }
  
  return issues;
}

/**
 * 检查单个部署配置
 */
function checkDeploymentConfig(config) {
  console.log(`📋 检查: ${config.name}`);
  console.log(`📁 文件: ${config.path}`);
  
  const variables = parseEnvFile(config.path);
  
  if (!variables) {
    console.log('❌ 配置文件不存在\n');
    return { errors: 1, warnings: 0 };
  }
  
  let errors = 0;
  let warnings = 0;
  
  // 检查必需的安全变量
  console.log('\n🔐 安全配置:');
  for (const varName of requiredVariables.security) {
    const value = variables[varName];
    if (!value) {
      console.log(`❌ ${varName}: 未设置`);
      errors++;
    } else {
      const securityIssues = checkVariableSecurity(varName, value);
      if (securityIssues.length > 0) {
        console.log(`⚠️  ${varName}: ${securityIssues.join(', ')}`);
        warnings++;
      } else {
        console.log(`✅ ${varName}: 已配置`);
      }
    }
  }
  
  // 检查数据库配置
  console.log('\n🗄️ 数据库配置:');
  const dbVars = requiredVariables.database[config.type] || [];
  for (const varName of dbVars) {
    const value = variables[varName];
    if (!value) {
      console.log(`❌ ${varName}: 未设置`);
      errors++;
    } else {
      const securityIssues = checkVariableSecurity(varName, value);
      if (securityIssues.length > 0) {
        console.log(`⚠️  ${varName}: ${securityIssues.join(', ')}`);
        warnings++;
      } else {
        const displayValue = varName.includes('KEY') || varName.includes('PASSWORD')
          ? `${value.substring(0, 8)}...`
          : value.length > 50
            ? `${value.substring(0, 50)}...`
            : value;
        console.log(`✅ ${varName}: ${displayValue}`);
      }
    }
  }
  
  // 检查部署配置
  console.log('\n🚀 部署配置:');
  for (const varName of requiredVariables.deployment) {
    const value = variables[varName];
    if (!value) {
      console.log(`❌ ${varName}: 未设置`);
      errors++;
    } else {
      console.log(`✅ ${varName}: ${value}`);
    }
  }
  
  // 检查推荐配置
  console.log('\n💡 推荐配置:');
  for (const varName of recommendedVariables) {
    const value = variables[varName];
    if (!value) {
      console.log(`⚠️  ${varName}: 未设置 (推荐)`);
      warnings++;
    } else {
      console.log(`✅ ${varName}: ${value}`);
    }
  }
  
  // 特殊检查
  console.log('\n🔍 特殊检查:');
  
  // 检查生产环境配置
  if (variables.NODE_ENV === 'production') {
    if (variables.NEXTAUTH_URL && !variables.NEXTAUTH_URL.startsWith('https://')) {
      console.log('⚠️  生产环境建议使用 HTTPS');
      warnings++;
    } else {
      console.log('✅ 生产环境配置正确');
    }
  }
  
  // 检查数据库提供商匹配
  const expectedDbProvider = config.type === 'docker-full' ? 'postgresql' : 'supabase';
  if (variables.DB_PROVIDER !== expectedDbProvider) {
    console.log(`⚠️  DB_PROVIDER 应该是 ${expectedDbProvider}`);
    warnings++;
  } else {
    console.log(`✅ 数据库提供商配置正确: ${variables.DB_PROVIDER}`);
  }
  
  console.log(`\n📊 结果: ${errors} 个错误, ${warnings} 个警告\n`);
  console.log('='.repeat(60) + '\n');
  
  return { errors, warnings };
}

/**
 * 主检查函数
 */
function checkAllDeployments() {
  let totalErrors = 0;
  let totalWarnings = 0;
  
  for (const config of deploymentConfigs) {
    const result = checkDeploymentConfig(config);
    totalErrors += result.errors;
    totalWarnings += result.warnings;
  }
  
  // 总结
  console.log('📊 总体检查结果:');
  console.log(`❌ 总错误数: ${totalErrors}`);
  console.log(`⚠️  总警告数: ${totalWarnings}`);
  
  if (totalErrors === 0 && totalWarnings === 0) {
    console.log('\n🎉 所有部署配置都正确！');
  } else if (totalErrors === 0) {
    console.log('\n✅ 基本配置正确，建议处理警告项目');
  } else {
    console.log('\n❌ 发现配置错误，请修复后再部署');
  }
  
  // 提供修复建议
  if (totalErrors > 0 || totalWarnings > 0) {
    console.log('\n💡 修复建议:');
    console.log('1. 运行 node scripts/sync-deployment-env.js 同步配置');
    console.log('2. 手动设置缺失的环境变量');
    console.log('3. 使用强随机密钥替换默认值');
    console.log('4. 检查 URL 格式是否正确');
  }
  
  return totalErrors === 0;
}

// 执行检查
if (require.main === module) {
  const success = checkAllDeployments();
  process.exit(success ? 0 : 1);
}

module.exports = { checkAllDeployments, checkDeploymentConfig };
