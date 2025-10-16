#!/usr/bin/env node

/**
 * 部署环境变量同步脚本
 * 将根目录的 .env 文件同步到部署目录
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 同步部署环境变量...\n');

// 源文件和目标文件映射
const syncMappings = [
  {
    source: '.env',
    targets: [
      'deployment/docker-full/.env',
      'deployment/docker-single/.env'
    ]
  },
  {
    source: '.env.local',
    targets: [
      'deployment/docker-full/.env.local',
      'deployment/docker-single/.env.local'
    ]
  }
];

// 需要替换的变量映射（针对不同部署环境）
const variableReplacements = {
  'docker-full': {
    'DB_PROVIDER': 'postgresql',
    'NODE_ENV': 'production',
    'DEPLOYMENT_TYPE': 'http',
    'AUTH_TRUST_HOST': 'true'
  },
  'docker-single': {
    'DB_PROVIDER': 'supabase',
    'NODE_ENV': 'production',
    'DEPLOYMENT_TYPE': 'http',
    'AUTH_TRUST_HOST': 'true'
  }
};

/**
 * 读取环境变量文件
 */
function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  源文件不存在: ${filePath}`);
    return null;
  }
  
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * 应用变量替换
 */
function applyReplacements(content, deploymentType) {
  const replacements = variableReplacements[deploymentType];
  if (!replacements) return content;
  
  let modifiedContent = content;
  
  for (const [key, value] of Object.entries(replacements)) {
    // 替换已存在的变量
    const regex = new RegExp(`^${key}=.*$`, 'gm');
    if (modifiedContent.match(regex)) {
      modifiedContent = modifiedContent.replace(regex, `${key}=${value}`);
    } else {
      // 如果变量不存在，添加到相应的部分
      modifiedContent += `\n${key}=${value}`;
    }
  }
  
  return modifiedContent;
}

/**
 * 同步单个文件
 */
function syncFile(sourceFile, targetFile) {
  const sourceContent = readEnvFile(sourceFile);
  if (!sourceContent) return false;
  
  // 确保目标目录存在
  const targetDir = path.dirname(targetFile);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  // 确定部署类型
  const deploymentType = targetFile.includes('docker-full') ? 'docker-full' : 'docker-single';
  
  // 应用特定于部署类型的替换
  const modifiedContent = applyReplacements(sourceContent, deploymentType);
  
  // 写入目标文件
  fs.writeFileSync(targetFile, modifiedContent);
  
  console.log(`✅ 已同步: ${sourceFile} → ${targetFile}`);
  return true;
}

/**
 * 比较文件差异
 */
function compareFiles(sourceFile, targetFile) {
  const sourceContent = readEnvFile(sourceFile);
  const targetContent = readEnvFile(targetFile);
  
  if (!sourceContent || !targetContent) return false;
  
  // 简单的行数比较
  const sourceLines = sourceContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  const targetLines = targetContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  
  return sourceLines.length === targetLines.length;
}

/**
 * 主同步函数
 */
function syncDeploymentEnv() {
  let totalSynced = 0;
  let totalSkipped = 0;
  
  for (const mapping of syncMappings) {
    const { source, targets } = mapping;
    
    console.log(`📁 处理源文件: ${source}`);
    
    if (!fs.existsSync(source)) {
      console.log(`⚠️  源文件不存在，跳过: ${source}\n`);
      continue;
    }
    
    for (const target of targets) {
      const success = syncFile(source, target);
      if (success) {
        totalSynced++;
      } else {
        totalSkipped++;
      }
    }
    
    console.log('');
  }
  
  // 总结
  console.log('📊 同步结果:');
  console.log(`✅ 成功同步: ${totalSynced} 个文件`);
  if (totalSkipped > 0) {
    console.log(`⚠️  跳过: ${totalSkipped} 个文件`);
  }
  
  // 提示
  console.log('\n💡 提示:');
  console.log('1. 请检查同步后的文件内容是否正确');
  console.log('2. 根据实际部署环境调整配置');
  console.log('3. 确保敏感信息（密钥、密码）已正确设置');
  
  return totalSynced > 0;
}

/**
 * 验证部署配置
 */
function validateDeploymentConfig() {
  console.log('\n🔍 验证部署配置...');
  
  const deploymentFiles = [
    'deployment/docker-full/.env',
    'deployment/docker-single/.env'
  ];
  
  for (const file of deploymentFiles) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      
      // 检查关键变量
      const requiredVars = ['DB_PROVIDER', 'NEXTAUTH_SECRET', 'KEY_ENCRYPTION_SECRET'];
      const missingVars = [];
      
      for (const varName of requiredVars) {
        const found = lines.some(line => line.startsWith(`${varName}=`) && !line.startsWith('#'));
        if (!found) {
          missingVars.push(varName);
        }
      }
      
      if (missingVars.length === 0) {
        console.log(`✅ ${file}: 配置完整`);
      } else {
        console.log(`⚠️  ${file}: 缺少变量 ${missingVars.join(', ')}`);
      }
    } else {
      console.log(`❌ ${file}: 文件不存在`);
    }
  }
}

// 执行同步
if (require.main === module) {
  const success = syncDeploymentEnv();
  
  if (success) {
    validateDeploymentConfig();
    console.log('\n🚀 部署环境变量同步完成！');
  } else {
    console.log('\n❌ 同步失败，请检查源文件');
    process.exit(1);
  }
}

module.exports = { syncDeploymentEnv, validateDeploymentConfig };
