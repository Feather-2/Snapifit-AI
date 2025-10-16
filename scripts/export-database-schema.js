#!/usr/bin/env node

/**
 * 数据库Schema导出脚本
 * 从当前数据库导出完整的schema（包括结构和数据）
 * 支持PostgreSQL和Supabase
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

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

loadEnvFiles();

console.log('📤 数据库Schema导出脚本');
console.log('='.repeat(50));

// 配置
const CONFIG = {
  outputDir: 'deployment/database',
  schemaFile: 'current_database_schema.sql',
  dataFile: 'current_database_data.sql',
  backupDir: 'backups'
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

// 检查数据库配置
function checkDatabaseConfig() {
  const dbProvider = process.env.DB_PROVIDER || 'supabase';
  
  colorLog('blue', `📊 数据库类型: ${dbProvider}`);
  
  if (dbProvider === 'postgresql') {
    if (!process.env.DATABASE_URL) {
      throw new Error('PostgreSQL配置错误: 缺少DATABASE_URL环境变量');
    }
    colorLog('green', '✅ PostgreSQL配置检查通过');
    return {
      type: 'postgresql',
      connectionString: process.env.DATABASE_URL
    };
  } else {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error('Supabase配置错误: 缺少NEXT_PUBLIC_SUPABASE_URL环境变量');
    }
    
    // 构建Supabase连接字符串
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!serviceKey) {
      throw new Error('Supabase配置错误: 缺少SUPABASE_SERVICE_ROLE_KEY环境变量');
    }
    
    // 从Supabase URL构建PostgreSQL连接字符串
    // 例如: https://abc.supabase.co -> postgresql://postgres:password@db.abc.supabase.co:5432/postgres
    const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    if (!projectId) {
      throw new Error('无法从Supabase URL解析项目ID');
    }
    
    colorLog('green', '✅ Supabase配置检查通过');
    colorLog('yellow', '⚠️  注意: 需要数据库直连URL，请提供完整的PostgreSQL连接字符串');
    
    return {
      type: 'supabase',
      projectId: projectId,
      url: supabaseUrl,
      serviceKey: serviceKey
    };
  }
}

// 执行pg_dump命令
function runPgDump(connectionString, outputFile, options = []) {
  return new Promise((resolve, reject) => {
    const args = [
      connectionString,
      '--no-owner',
      '--no-privileges',
      '--clean',
      '--if-exists',
      '--file=' + outputFile,
      ...options
    ];
    
    colorLog('yellow', `🔄 执行: pg_dump ${args.join(' ')}`);
    
    const pgDump = spawn('pg_dump', args, {
      stdio: ['inherit', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    pgDump.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pgDump.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pgDump.on('close', (code) => {
      if (code === 0) {
        colorLog('green', `✅ 导出成功: ${outputFile}`);
        resolve({ stdout, stderr });
      } else {
        colorLog('red', `❌ 导出失败 (退出码: ${code})`);
        if (stderr) {
          console.error('错误信息:', stderr);
        }
        reject(new Error(`pg_dump failed with code ${code}: ${stderr}`));
      }
    });
    
    pgDump.on('error', (error) => {
      colorLog('red', `❌ 执行pg_dump时出错: ${error.message}`);
      reject(error);
    });
  });
}

// 创建输出目录
function ensureDirectories() {
  const dirs = [CONFIG.outputDir, CONFIG.backupDir];
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      colorLog('blue', `📁 创建目录: ${dir}`);
    }
  }
}

// 主导出函数
async function exportDatabase() {
  try {
    // 1. 检查配置
    const dbConfig = checkDatabaseConfig();
    
    // 2. 创建目录
    ensureDirectories();
    
    // 3. 准备文件路径
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const schemaPath = path.join(CONFIG.outputDir, CONFIG.schemaFile);
    const dataPath = path.join(CONFIG.outputDir, CONFIG.dataFile);
    const backupSchemaPath = path.join(CONFIG.backupDir, `schema_${timestamp}.sql`);
    const backupDataPath = path.join(CONFIG.backupDir, `data_${timestamp}.sql`);
    
    if (dbConfig.type === 'postgresql') {
      colorLog('blue', '📤 开始导出PostgreSQL数据库...');
      
      // 导出schema（结构）
      colorLog('yellow', '📋 导出数据库结构...');
      await runPgDump(dbConfig.connectionString, schemaPath, ['--schema-only']);
      
      // 创建备份
      fs.copyFileSync(schemaPath, backupSchemaPath);
      
      // 询问是否导出数据
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const exportData = await new Promise((resolve) => {
        rl.question('❓ 是否同时导出数据？(y/N): ', (answer) => {
          rl.close();
          resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        });
      });
      
      if (exportData) {
        colorLog('yellow', '📊 导出数据...');
        await runPgDump(dbConfig.connectionString, dataPath, ['--data-only']);
        fs.copyFileSync(dataPath, backupDataPath);
      }
      
    } else {
      colorLog('red', '❌ Supabase直接导出需要完整的PostgreSQL连接字符串');
      colorLog('yellow', '💡 请提供Supabase的数据库直连URL，格式如下:');
      colorLog('blue', '   postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres');
      
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const connectionString = await new Promise((resolve) => {
        rl.question('🔗 请输入完整的PostgreSQL连接字符串: ', (answer) => {
          rl.close();
          resolve(answer.trim());
        });
      });
      
      if (connectionString) {
        colorLog('blue', '📤 开始导出Supabase数据库...');
        
        // 导出schema
        colorLog('yellow', '📋 导出数据库结构...');
        await runPgDump(connectionString, schemaPath, ['--schema-only']);
        fs.copyFileSync(schemaPath, backupSchemaPath);
        
        // 询问是否导出数据
        const rl2 = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const exportData = await new Promise((resolve) => {
          rl2.question('❓ 是否同时导出数据？(y/N): ', (answer) => {
            rl2.close();
            resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
          });
        });
        
        if (exportData) {
          colorLog('yellow', '📊 导出数据...');
          await runPgDump(connectionString, dataPath, ['--data-only']);
          fs.copyFileSync(dataPath, backupDataPath);
        }
      } else {
        throw new Error('未提供数据库连接字符串');
      }
    }
    
    // 4. 生成报告
    colorLog('green', '🎉 数据库导出完成！');
    colorLog('blue', '📁 生成的文件:');
    
    if (fs.existsSync(schemaPath)) {
      const schemaSize = fs.statSync(schemaPath).size;
      colorLog('green', `  📄 ${schemaPath} (${(schemaSize / 1024).toFixed(1)} KB)`);
    }
    
    if (fs.existsSync(dataPath)) {
      const dataSize = fs.statSync(dataPath).size;
      colorLog('green', `  📄 ${dataPath} (${(dataSize / 1024).toFixed(1)} KB)`);
    }
    
    colorLog('blue', '📁 备份文件:');
    colorLog('yellow', `  📄 ${backupSchemaPath}`);
    if (fs.existsSync(backupDataPath)) {
      colorLog('yellow', `  📄 ${backupDataPath}`);
    }
    
    console.log('');
    colorLog('blue', '📝 接下来的步骤:');
    console.log('  1. 运行: node scripts/create-empty-database.js');
    console.log('  2. 使用生成的空数据库schema进行部署');
    
  } catch (error) {
    colorLog('red', `❌ 导出失败: ${error.message}`);
    
    console.log('');
    colorLog('blue', '🔧 故障排除建议:');
    console.log('  1. 确保已安装 pg_dump 工具');
    console.log('  2. 检查数据库连接配置');
    console.log('  3. 验证数据库权限');
    console.log('  4. 确认网络连接正常');
    
    process.exit(1);
  }
}

// 运行导出
if (require.main === module) {
  exportDatabase();
}
