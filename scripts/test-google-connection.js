#!/usr/bin/env node

/**
 * Google 连接测试脚本
 * 测试是否能正常访问 Google OAuth 服务
 */

const https = require('https');
const { URL } = require('url');

console.log('🔍 Google OAuth 连接测试');
console.log('=====================================');
console.log('');

// 测试的 Google 服务端点
const testEndpoints = [
  'https://accounts.google.com/.well-known/openid_configuration',
  'https://oauth2.googleapis.com/token',
  'https://www.googleapis.com/oauth2/v2/userinfo'
];

async function testConnection(url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      timeout: 10000, // 10秒超时
      headers: {
        'User-Agent': 'SnapFit-AI-Test/1.0'
      }
    };

    const startTime = Date.now();
    
    const req = https.request(options, (res) => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      resolve({
        success: true,
        status: res.statusCode,
        duration: duration,
        url: url
      });
    });

    req.on('error', (error) => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      resolve({
        success: false,
        error: error.message,
        code: error.code,
        duration: duration,
        url: url
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Connection timeout',
        code: 'TIMEOUT',
        duration: 10000,
        url: url
      });
    });

    req.end();
  });
}

async function testAllEndpoints() {
  console.log('📡 测试 Google OAuth 服务连接...');
  console.log('');
  
  let successCount = 0;
  let totalCount = testEndpoints.length;
  
  for (const endpoint of testEndpoints) {
    process.stdout.write(`测试 ${endpoint}... `);
    
    const result = await testConnection(endpoint);
    
    if (result.success) {
      console.log(`✅ 成功 (${result.duration}ms, HTTP ${result.status})`);
      successCount++;
    } else {
      console.log(`❌ 失败 (${result.duration}ms)`);
      console.log(`   错误: ${result.error}`);
      if (result.code) {
        console.log(`   代码: ${result.code}`);
      }
    }
  }
  
  console.log('');
  console.log(`📊 测试结果: ${successCount}/${totalCount} 成功`);
  console.log('');
  
  if (successCount === 0) {
    console.log('❌ 所有连接测试失败');
    console.log('');
    console.log('🔧 可能的解决方案:');
    console.log('1. 检查网络连接');
    console.log('2. 配置代理服务器:');
    console.log('   - 取消注释 .env.local 中的代理配置');
    console.log('   - 设置正确的代理地址和端口');
    console.log('3. 检查防火墙设置');
    console.log('4. 尝试使用 VPN 或其他网络环境');
    console.log('');
    console.log('💡 代理配置示例:');
    console.log('   HTTP_PROXY=http://127.0.0.1:7890');
    console.log('   HTTPS_PROXY=http://127.0.0.1:7890');
    console.log('');
  } else if (successCount < totalCount) {
    console.log('⚠️  部分连接成功，可能存在网络不稳定');
    console.log('   建议配置代理以提高稳定性');
    console.log('');
  } else {
    console.log('✅ 所有连接测试成功！');
    console.log('   Google OAuth 应该可以正常工作');
    console.log('');
  }
}

// 检查代理配置
function checkProxyConfig() {
  const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
  const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  
  if (httpProxy || httpsProxy) {
    console.log('🔧 检测到代理配置:');
    if (httpProxy) console.log(`   HTTP_PROXY: ${httpProxy}`);
    if (httpsProxy) console.log(`   HTTPS_PROXY: ${httpsProxy}`);
    console.log('');
  } else {
    console.log('ℹ️  未检测到代理配置');
    console.log('   如果连接失败，请考虑配置代理');
    console.log('');
  }
}

async function main() {
  checkProxyConfig();
  await testAllEndpoints();
  
  console.log('🔗 相关链接:');
  console.log('- Google OAuth 配置指南: docs/google-oauth-setup.md');
  console.log('- 环境变量配置: .env.local');
  console.log('- 测试页面: http://localhost:3000/zh/debug/oauth-test');
}

main().catch(console.error);
