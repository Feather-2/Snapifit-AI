#!/usr/bin/env node

/**
 * 创建空数据库脚本
 * 基于现有的数据库schema，生成一个保留所有结构但清空数据的版本
 * 保留：表结构、函数、触发器、索引、约束、视图
 * 清除：所有数据行、重置序列
 */

const fs = require('fs');
const path = require('path');

console.log('🏗️  创建空数据库脚本');
console.log('='.repeat(60));
console.log('📋 此脚本将：');
console.log('   ✅ 保留所有表结构');
console.log('   ✅ 保留所有函数和触发器');
console.log('   ✅ 保留所有索引和约束');
console.log('   ✅ 保留所有视图');
console.log('   🧹 清除所有数据行');
console.log('   🔄 重置所有序列');
console.log('');

// 配置
const CONFIG = {
  // 输入文件（优先使用最新导出的文件）
  inputFile: fs.existsSync('deployment/database/current_database_schema.sql')
    ? 'deployment/database/current_database_schema.sql'
    : 'deployment/database/supabase_schema.sql',
  // 输出文件
  outputFile: 'deployment/database/empty_database_schema.sql',
  // 备份文件
  backupFile: 'deployment/database/schema_backup.sql',
  // 核心表列表（用于验证）
  coreTables: [
    'users', 'user_profiles', 'shared_keys', 'daily_logs',
    'ai_memories', 'security_events', 'invite_codes', 'invite_configs',
    'ip_bans', 'user_bans', 'system_configs'
  ],
  // 需要重置的序列
  sequences: [
    'users_id_seq', 'shared_keys_id_seq', 'daily_logs_id_seq',
    'ai_memories_id_seq', 'security_events_id_seq', 'invite_codes_id_seq',
    'ip_bans_id_seq', 'user_bans_id_seq'
  ]
};

// 颜色输出
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 主函数
async function main() {
  try {
    // 1. 检查输入文件
    if (!fs.existsSync(CONFIG.inputFile)) {
      throw new Error(`输入文件不存在: ${CONFIG.inputFile}`);
    }

    colorLog('blue', `📖 读取输入文件: ${CONFIG.inputFile}`);

    // 2. 读取原始schema文件
    const originalContent = fs.readFileSync(CONFIG.inputFile, 'utf8');

    // 3. 创建备份
    colorLog('yellow', `💾 创建备份文件: ${CONFIG.backupFile}`);
    fs.writeFileSync(CONFIG.backupFile, originalContent);

    // 4. 处理schema内容
    colorLog('blue', '🔄 处理schema内容...');
    const processedContent = processSchemaContent(originalContent);

    // 5. 写入输出文件
    colorLog('blue', `📝 写入输出文件: ${CONFIG.outputFile}`);
    fs.writeFileSync(CONFIG.outputFile, processedContent);

    // 6. 验证结果
    colorLog('blue', '🔍 验证处理结果...');
    validateResult(processedContent);

    // 7. 生成统计信息
    generateStatistics(originalContent, processedContent);

    colorLog('green', '✅ 空数据库schema生成完成！');
    colorLog('blue', '📁 生成的文件:');
    colorLog('green', `  📄 ${CONFIG.outputFile} - 空数据库schema`);
    colorLog('yellow', `  📄 ${CONFIG.backupFile} - 原始文件备份`);

    console.log('');
    colorLog('blue', '💡 使用方法:');
    console.log(`  psql -U postgres -d your_database -f ${CONFIG.outputFile}`);

  } catch (error) {
    colorLog('red', `❌ 错误: ${error.message}`);
    process.exit(1);
  }
}

// 处理schema内容
function processSchemaContent(content) {
  colorLog('yellow', '  - 移除INSERT语句...');
  colorLog('yellow', '  - 移除COPY语句...');
  colorLog('yellow', '  - 添加数据清理语句...');
  colorLog('yellow', '  - 添加序列重置语句...');

  let processed = content;

  // 1. 移除所有INSERT语句
  processed = processed.replace(/^INSERT INTO.*?;$/gm, '');

  // 2. 移除所有COPY语句（包括多行的COPY数据）
  processed = processed.replace(/^COPY .*?FROM stdin;[\s\S]*?^\\\.$/gm, '');

  // 3. 移除SELECT pg_catalog.setval语句（序列设置）
  processed = processed.replace(/^SELECT pg_catalog\.setval\(.*?;$/gm, '');

  // 4. 清理多余的空行
  processed = processed.replace(/\n\s*\n\s*\n/g, '\n\n');

  // 5. 在文件末尾添加数据清理和序列重置语句
  const cleanupStatements = generateCleanupStatements();
  processed += '\n\n' + cleanupStatements;

  return processed;
}

// 生成清理语句
function generateCleanupStatements() {
  const statements = [];

  statements.push('--');
  statements.push('-- 数据清理和序列重置');
  statements.push('-- 此部分由 create-empty-database.js 自动生成');
  statements.push('--');
  statements.push('');

  // 按依赖关系顺序清空表（避免外键约束错误）
  const tablesToClear = [
    'security_events',
    'ai_memories',
    'daily_logs',
    'user_bans',
    'ip_bans',
    'invite_codes',
    'invite_configs',
    'shared_keys',
    'user_profiles',
    'users',
    'system_configs'
  ];

  statements.push('-- 清空数据表（按依赖关系顺序）');
  for (const table of tablesToClear) {
    statements.push(`DELETE FROM public.${table};`);
  }

  statements.push('');
  statements.push('-- 重置序列');
  for (const seq of CONFIG.sequences) {
    statements.push(`SELECT setval('public.${seq}', 1, false);`);
  }

  statements.push('');
  statements.push('-- 清理完成');
  statements.push(`-- 数据库已重置为空状态，保留所有结构`);
  statements.push(`-- 生成时间: ${new Date().toISOString()}`);

  return statements.join('\n');
}

// 验证处理结果
function validateResult(content) {
  colorLog('yellow', '  - 验证核心表...');

  let missingTables = [];
  for (const table of CONFIG.coreTables) {
    if (!content.includes(`CREATE TABLE public.${table}`)) {
      missingTables.push(table);
    }
  }

  if (missingTables.length > 0) {
    colorLog('red', `  ❌ 缺失表: ${missingTables.join(', ')}`);
  } else {
    colorLog('green', '  ✅ 所有核心表都存在');
  }

  // 验证函数
  colorLog('yellow', '  - 验证核心函数...');
  const coreFunctions = [
    'upsert_ai_memories',
    'atomic_usage_check_and_increment',
    'create_user_with_password',
    'get_user_profile',
    'increment_shared_key_usage'
  ];

  let missingFunctions = [];
  for (const func of coreFunctions) {
    if (!content.includes(`CREATE FUNCTION public.${func}`)) {
      missingFunctions.push(func);
    }
  }

  if (missingFunctions.length > 0) {
    colorLog('red', `  ❌ 缺失函数: ${missingFunctions.join(', ')}`);
  } else {
    colorLog('green', '  ✅ 所有核心函数都存在');
  }

  // 验证是否移除了数据
  colorLog('yellow', '  - 验证数据清理...');
  const hasInserts = /^INSERT INTO/m.test(content);
  const hasCopyData = /^COPY.*FROM stdin;/m.test(content);

  if (hasInserts || hasCopyData) {
    colorLog('red', '  ❌ 仍然包含数据语句');
  } else {
    colorLog('green', '  ✅ 所有数据语句已移除');
  }
}

// 生成统计信息
function generateStatistics(originalContent, processedContent) {
  colorLog('blue', '📊 处理统计:');

  const originalLines = originalContent.split('\n').length;
  const processedLines = processedContent.split('\n').length;
  const removedLines = originalLines - processedLines;

  console.log(`  原始文件行数: ${colors.yellow}${originalLines}${colors.reset}`);
  console.log(`  处理后行数: ${colors.green}${processedLines}${colors.reset}`);
  console.log(`  移除行数: ${colors.red}${removedLines}${colors.reset}`);

  // 统计移除的语句
  const originalInserts = (originalContent.match(/^INSERT INTO/gm) || []).length;
  const originalCopies = (originalContent.match(/^COPY.*FROM stdin;/gm) || []).length;
  const originalSetvals = (originalContent.match(/^SELECT pg_catalog\.setval/gm) || []).length;

  console.log(`  移除的INSERT语句: ${colors.red}${originalInserts}${colors.reset}`);
  console.log(`  移除的COPY语句: ${colors.red}${originalCopies}${colors.reset}`);
  console.log(`  移除的SETVAL语句: ${colors.red}${originalSetvals}${colors.reset}`);

  // 统计保留的结构
  const tables = (processedContent.match(/^CREATE TABLE/gm) || []).length;
  const functions = (processedContent.match(/^CREATE FUNCTION/gm) || []).length;
  const indexes = (processedContent.match(/^CREATE.*INDEX/gm) || []).length;
  const triggers = (processedContent.match(/^CREATE TRIGGER/gm) || []).length;

  console.log('');
  colorLog('blue', '📋 保留的数据库结构:');
  console.log(`  表: ${colors.green}${tables}${colors.reset}`);
  console.log(`  函数: ${colors.green}${functions}${colors.reset}`);
  console.log(`  索引: ${colors.green}${indexes}${colors.reset}`);
  console.log(`  触发器: ${colors.green}${triggers}${colors.reset}`);
}

// 询问用户确认
function askConfirmation() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('❓ 确定要生成空数据库schema吗？(y/N): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// 运行主函数
if (require.main === module) {
  (async () => {
    console.log('');

    // 检查是否有命令行参数跳过确认
    const skipConfirm = process.argv.includes('--yes') || process.argv.includes('-y');

    if (!skipConfirm) {
      const confirmed = await askConfirmation();

      if (!confirmed) {
        colorLog('yellow', '❌ 操作已取消');
        process.exit(0);
      }
    } else {
      colorLog('blue', '✅ 自动确认模式');
    }

    console.log('');
    await main();
  })();
}
