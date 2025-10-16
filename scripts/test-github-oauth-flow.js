#!/usr/bin/env node

/**
 * GitHub OAuth 流程测试脚本
 * 模拟完整的 OAuth 流程来诊断问题
 */

const https = require('https')
const fs = require('fs')
const path = require('path')

// 手动读取 .env.local 文件
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    const lines = envContent.split('\n')
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=')
          process.env[key] = value
        }
      }
    }
  }
}

loadEnvFile()

// 测试 GitHub OAuth token 端点
function testGitHubTokenEndpoint() {
  return new Promise((resolve) => {
    console.log('🔍 测试 GitHub OAuth token 端点...')
    
    const postData = JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code: 'test_code_123', // 假的授权码，只是测试连接
    })
    
    const options = {
      hostname: 'github.com',
      port: 443,
      path: '/login/oauth/access_token',
      method: 'POST',
      timeout: 15000, // 15秒超时
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'SnapFit-AI-Test/1.0',
        'Content-Length': Buffer.byteLength(postData)
      }
    }
    
    const startTime = Date.now()
    
    const req = https.request(options, (res) => {
      const responseTime = Date.now() - startTime
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        console.log(`✅ GitHub token 端点响应: ${res.statusCode} (${responseTime}ms)`)
        console.log(`响应头:`, res.headers)
        console.log(`响应体:`, data)
        
        resolve({
          success: true,
          statusCode: res.statusCode,
          responseTime,
          data: data
        })
      })
    })
    
    req.on('error', (error) => {
      const responseTime = Date.now() - startTime
      console.log(`❌ GitHub token 端点错误: ${error.message} (${responseTime}ms)`)
      console.log(`错误类型: ${error.constructor.name}`)
      console.log(`错误代码: ${error.code}`)
      console.log(`错误详情:`, error)
      
      resolve({
        success: false,
        error: error.message,
        responseTime,
        errorCode: error.code
      })
    })
    
    req.on('timeout', () => {
      req.destroy()
      const responseTime = Date.now() - startTime
      console.log(`❌ GitHub token 端点超时 (${responseTime}ms)`)
      
      resolve({
        success: false,
        error: 'Request timeout',
        responseTime
      })
    })
    
    req.write(postData)
    req.end()
  })
}

// 测试 DNS 解析
function testDNSResolution() {
  return new Promise((resolve) => {
    const dns = require('dns')
    
    console.log('🔍 测试 DNS 解析...')
    
    dns.lookup('github.com', (err, address, family) => {
      if (err) {
        console.log(`❌ DNS 解析失败: ${err.message}`)
        resolve({ success: false, error: err.message })
      } else {
        console.log(`✅ DNS 解析成功: github.com -> ${address} (IPv${family})`)
        resolve({ success: true, address, family })
      }
    })
  })
}

// 测试基本连接
function testBasicConnection() {
  return new Promise((resolve) => {
    console.log('🔍 测试基本 HTTPS 连接...')
    
    const options = {
      hostname: 'github.com',
      port: 443,
      path: '/',
      method: 'GET',
      timeout: 10000,
      headers: {
        'User-Agent': 'SnapFit-AI-Test/1.0'
      }
    }
    
    const startTime = Date.now()
    
    const req = https.request(options, (res) => {
      const responseTime = Date.now() - startTime
      console.log(`✅ 基本连接成功: ${res.statusCode} (${responseTime}ms)`)
      
      resolve({
        success: true,
        statusCode: res.statusCode,
        responseTime
      })
    })
    
    req.on('error', (error) => {
      const responseTime = Date.now() - startTime
      console.log(`❌ 基本连接失败: ${error.message} (${responseTime}ms)`)
      
      resolve({
        success: false,
        error: error.message,
        responseTime
      })
    })
    
    req.on('timeout', () => {
      req.destroy()
      const responseTime = Date.now() - startTime
      console.log(`❌ 基本连接超时 (${responseTime}ms)`)
      
      resolve({
        success: false,
        error: 'Connection timeout',
        responseTime
      })
    })
    
    req.end()
  })
}

async function runDiagnostics() {
  console.log('🔍 开始 GitHub OAuth 流程诊断...\n')
  
  // 检查环境变量
  console.log('📋 环境变量检查:')
  console.log(`GITHUB_CLIENT_ID: ${process.env.GITHUB_CLIENT_ID ? '已设置' : '未设置'}`)
  console.log(`GITHUB_CLIENT_SECRET: ${process.env.GITHUB_CLIENT_SECRET ? '已设置' : '未设置'}`)
  console.log(`NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || '未设置'}`)
  console.log('')
  
  // 1. DNS 解析测试
  await testDNSResolution()
  console.log('')
  
  // 2. 基本连接测试
  await testBasicConnection()
  console.log('')
  
  // 3. OAuth token 端点测试
  await testGitHubTokenEndpoint()
  console.log('')
  
  console.log('🎯 诊断建议:')
  console.log('1. 如果 DNS 解析失败，检查网络连接')
  console.log('2. 如果基本连接失败，可能需要代理')
  console.log('3. 如果 token 端点超时，GitHub OAuth 服务可能被阻止')
  console.log('4. 如果收到 400/401 错误，说明连接正常，只是参数问题')
  console.log('5. 如果一切正常但 OAuth 仍然失败，检查 NextAuth 配置')
}

// 运行诊断
runDiagnostics().catch(console.error)
