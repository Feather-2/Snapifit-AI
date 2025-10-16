#!/usr/bin/env node

/**
 * SnapFit AI 部署环境检测脚本
 * 自动检测部署环境并应用相应的安全配置
 */

const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkItem(name, condition, errorMsg, warningMsg = null) {
  if (condition) {
    colorLog('green', `✅ ${name}`);
    return true;
  } else if (warningMsg) {
    colorLog('yellow', `⚠️  ${name}: ${warningMsg}`);
    return false;
  } else {
    colorLog('red', `❌ ${name}: ${errorMsg}`);
    return false;
  }
}

// 检测部署环境
function detectDeploymentEnvironment() {
  const env = process.env;
  
  // 检测容器环境
  const isDocker = fs.existsSync('/.dockerenv') || env.DOCKER_BUILD === 'true';
  
  // 检测HTTPS配置
  const nextAuthUrl = env.NEXTAUTH_URL || '';
  const isHttpsConfigured = nextAuthUrl.startsWith('https://');
  
  // 检测生产环境
  const isProduction = env.NODE_ENV === 'production';
  
  // 检测强制HTTPS设置
  const forceHttps = env.FORCE_HTTPS;
  
  return {
    isDocker,
    isHttpsConfigured,
    isProduction,
    forceHttps,
    nextAuthUrl,
    deploymentType: env.DEPLOYMENT_TYPE || 'auto'
  };
}

// 生成推荐配置
function generateRecommendedConfig(environment) {
  const { isDocker, isHttpsConfigured, isProduction, deploymentType } = environment;
  
  const config = {
    // 基础配置
    NODE_ENV: isProduction ? 'production' : 'development',
    
    // 部署类型配置
    DEPLOYMENT_TYPE: deploymentType === 'auto' 
      ? (isHttpsConfigured ? 'https' : 'http') 
      : deploymentType,
    
    // HTTPS强制配置
    FORCE_HTTPS: isHttpsConfigured ? 'true' : 'false',
    
    // 数据库SSL配置
    DB_SSL: isHttpsConfigured && isProduction ? 'true' : 'false',
    
    // Docker特定配置
    ...(isDocker && {
      HOSTNAME: '0.0.0.0',
      PORT: '3000'
    })
  };
  
  return config;
}

// 主检测函数
function main() {
  console.log('🔍 SnapFit AI 部署环境检测');
  console.log('='.repeat(50));
  
  // 1. 环境检测
  colorLog('blue', '\n📋 环境信息检测');
  console.log('-'.repeat(30));
  
  const environment = detectDeploymentEnvironment();
  
  console.log(`环境类型: ${environment.isProduction ? '生产环境' : '开发环境'}`);
  console.log(`容器环境: ${environment.isDocker ? 'Docker' : '本地'}`);
  console.log(`HTTPS配置: ${environment.isHttpsConfigured ? '已配置' : '未配置'}`);
  console.log(`认证URL: ${environment.nextAuthUrl || '未设置'}`);
  console.log(`部署类型: ${environment.deploymentType}`);
  
  // 2. 安全配置检查
  colorLog('blue', '\n🔒 安全配置检查');
  console.log('-'.repeat(30));
  
  let securityScore = 0;
  let totalChecks = 0;
  
  // 检查必要的环境变量
  const requiredVars = ['NEXTAUTH_SECRET', 'KEY_ENCRYPTION_SECRET'];
  requiredVars.forEach(varName => {
    totalChecks++;
    const value = process.env[varName];
    if (checkItem(
      `${varName} 配置`,
      !!value && value.length >= 32,
      `${varName} 未设置或长度不足32字符`
    )) {
      securityScore++;
    }
  });
  
  // 检查HTTPS配置一致性
  totalChecks++;
  if (checkItem(
    'HTTPS配置一致性',
    environment.forceHttps === undefined || 
    (environment.forceHttps === 'true') === environment.isHttpsConfigured,
    'FORCE_HTTPS设置与NEXTAUTH_URL不一致',
    environment.forceHttps === undefined ? 'FORCE_HTTPS未明确设置，将自动检测' : null
  )) {
    securityScore++;
  }
  
  // 检查生产环境安全性
  if (environment.isProduction) {
    totalChecks++;
    if (checkItem(
      '生产环境HTTPS',
      environment.isHttpsConfigured,
      '生产环境建议使用HTTPS',
      !environment.isHttpsConfigured ? '生产环境未启用HTTPS，安全性较低' : null
    )) {
      securityScore++;
    }
  }
  
  // 3. 推荐配置
  colorLog('blue', '\n⚙️  推荐配置');
  console.log('-'.repeat(30));
  
  const recommendedConfig = generateRecommendedConfig(environment);
  
  console.log('建议的环境变量配置:');
  Object.entries(recommendedConfig).forEach(([key, value]) => {
    const currentValue = process.env[key];
    const isMatch = currentValue === value;
    const status = isMatch ? '✅' : '⚠️ ';
    console.log(`${status} ${key}=${value}${!isMatch && currentValue ? ` (当前: ${currentValue})` : ''}`);
  });
  
  // 4. 部署建议
  colorLog('blue', '\n💡 部署建议');
  console.log('-'.repeat(30));
  
  if (!environment.isHttpsConfigured && environment.isProduction) {
    colorLog('yellow', '⚠️  生产环境建议启用HTTPS:');
    console.log('   1. 获取SSL证书 (Let\'s Encrypt, CloudFlare等)');
    console.log('   2. 配置反向代理 (Nginx, Apache等)');
    console.log('   3. 更新NEXTAUTH_URL为https://');
    console.log('   4. 设置FORCE_HTTPS=true');
  }
  
  if (environment.isDocker) {
    colorLog('cyan', '🐳 Docker部署建议:');
    console.log('   1. 使用docker-compose管理服务');
    console.log('   2. 配置健康检查');
    console.log('   3. 设置资源限制');
    console.log('   4. 配置日志轮转');
  }
  
  if (!environment.isHttpsConfigured) {
    colorLog('green', '🌐 HTTP部署配置:');
    console.log('   1. 设置FORCE_HTTPS=false');
    console.log('   2. 设置DB_SSL=false (如果数据库不支持SSL)');
    console.log('   3. 确保NEXTAUTH_URL使用http://');
    console.log('   4. 考虑在反向代理层添加HTTPS');
  }
  
  // 5. 安全评分
  colorLog('blue', '\n📊 安全评分');
  console.log('-'.repeat(30));
  
  const scorePercentage = Math.round((securityScore / totalChecks) * 100);
  const scoreColor = scorePercentage >= 80 ? 'green' : scorePercentage >= 60 ? 'yellow' : 'red';
  
  colorLog(scoreColor, `安全评分: ${securityScore}/${totalChecks} (${scorePercentage}%)`);
  
  if (scorePercentage < 80) {
    colorLog('yellow', '建议解决上述安全问题后再部署到生产环境');
  } else {
    colorLog('green', '安全配置良好，可以部署');
  }
  
  console.log('\n' + '='.repeat(50));
  colorLog('cyan', '检测完成！请根据建议调整配置。');
}

// 运行检测
if (require.main === module) {
  main();
}

module.exports = {
  detectDeploymentEnvironment,
  generateRecommendedConfig,
  main
};
