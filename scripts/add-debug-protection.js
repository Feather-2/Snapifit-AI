#!/usr/bin/env node

/**
 * 为所有调试 API 路由添加生产环境保护
 */

const fs = require('fs');
const path = require('path');

const debugApiDir = path.join(__dirname, '../app/api/debug');

function addDebugProtection(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  文件不存在: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  
  // 检查是否已经有保护
  if (content.includes('checkDebugAccess')) {
    console.log(`✅ 已有保护: ${path.basename(filePath)}`);
    return false;
  }

  // 添加导入
  if (!content.includes("import { checkDebugAccess } from '@/lib/debug-guard';")) {
    content = content.replace(
      /import { NextRequest, NextResponse } from 'next\/server';?/,
      `import { NextRequest, NextResponse } from 'next/server';
import { checkDebugAccess } from '@/lib/debug-guard';`
    );
  }

  // 为 GET 方法添加保护
  content = content.replace(
    /export async function GET\(request: NextRequest\) \{/g,
    `export async function GET(request: NextRequest) {
  // 检查调试访问权限
  const debugCheck = checkDebugAccess();
  if (debugCheck) return debugCheck;`
  );

  // 为 POST 方法添加保护
  content = content.replace(
    /export async function POST\(request: NextRequest\) \{/g,
    `export async function POST(request: NextRequest) {
  // 检查调试访问权限
  const debugCheck = checkDebugAccess();
  if (debugCheck) return debugCheck;`
  );

  // 为 PUT 方法添加保护
  content = content.replace(
    /export async function PUT\(request: NextRequest\) \{/g,
    `export async function PUT(request: NextRequest) {
  // 检查调试访问权限
  const debugCheck = checkDebugAccess();
  if (debugCheck) return debugCheck;`
  );

  // 为 DELETE 方法添加保护
  content = content.replace(
    /export async function DELETE\(request: NextRequest\) \{/g,
    `export async function DELETE(request: NextRequest) {
  // 检查调试访问权限
  const debugCheck = checkDebugAccess();
  if (debugCheck) return debugCheck;`
  );

  fs.writeFileSync(filePath, content);
  console.log(`✅ 已添加保护: ${path.basename(filePath)}`);
  return true;
}

function processDirectory(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`❌ 目录不存在: ${dir}`);
    return;
  }

  const items = fs.readdirSync(dir);
  let processedCount = 0;

  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);

    if (stat.isDirectory()) {
      // 递归处理子目录
      processDirectory(itemPath);
    } else if (item === 'route.ts') {
      // 处理路由文件
      if (addDebugProtection(itemPath)) {
        processedCount++;
      }
    }
  }

  return processedCount;
}

console.log('🔒 为调试 API 添加生产环境保护...');
console.log('=====================================');

const processedCount = processDirectory(debugApiDir);

console.log('=====================================');
console.log(`🎉 处理完成！共处理了 ${processedCount} 个文件`);
console.log('');
console.log('💡 提示:');
console.log('- 所有调试 API 现在在生产环境中会返回 404');
console.log('- 开发环境中调试功能仍然可用');
console.log('- 可以通过 NODE_ENV=development 启用调试功能');
