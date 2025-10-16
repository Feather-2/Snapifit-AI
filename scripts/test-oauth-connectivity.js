#!/usr/bin/env node

/**
 * OAuth 连接测试脚本
 * 用于诊断和测试 OAuth 提供商的网络连接问题
 */

const https = require('https')
const http = require('http')
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

// 测试URL列表
const testUrls = [
  {
    name: 'GitHub API',
    url: 'https://api.github.com',
    path: '/user',
    description: 'GitHub OAuth 用户信息端点'
  },
  {
    name: 'GitHub OAuth',
    url: 'https://github.com',
    path: '/login/oauth/access_token',
    description: 'GitHub OAuth 令牌端点'
  },
  {
    name: 'Google OAuth',
    url: 'https://oauth2.googleapis.com',
    path: '/token',
    description: 'Google OAuth 令牌端点'
  },
  {
    name: 'Google API',
    url: 'https://www.googleapis.com',
    path: '/oauth2/v2/userinfo',
    description: 'Google OAuth 用户信息端点'
  }
]

function testConnection(testConfig) {
  return new Promise((resolve) => {
    const url = new URL(testConfig.url + testConfig.path)
    const isHttps = url.protocol === 'https:'
    const client = isHttps ? https : http

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'GET',
      timeout: 10000, // 10秒超时
      headers: {
        'User-Agent': 'SnapFit-AI-Test/1.0'
      }
    }

    // 如果设置了代理，使用代理
    if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) {
      const proxyUrl = new URL(process.env.HTTPS_PROXY || process.env.HTTP_PROXY)
      options.hostname = proxyUrl.hostname
      options.port = proxyUrl.port
      options.path = testConfig.url + testConfig.path
      options.headers.Host = url.hostname
    }

    const startTime = Date.now()

    const req = client.request(options, (res) => {
      const responseTime = Date.now() - startTime
      resolve({
        success: true,
        statusCode: res.statusCode,
        responseTime,
        error: null
      })
    })

    req.on('error', (error) => {
      const responseTime = Date.now() - startTime
      resolve({
        success: false,
        statusCode: null,
        responseTime,
        error: error.message
      })
    })

    req.on('timeout', () => {
      req.destroy()
      const responseTime = Date.now() - startTime
      resolve({
        success: false,
        statusCode: null,
        responseTime,
        error: 'Request timeout'
      })
    })

    req.end()
  })
}

async function testOAuthConnectivity() {
  console.log('🔍 开始 OAuth 连接测试...\n')

  // 检查环境变量
  console.log('📋 环境变量检查:')
  console.log(`GITHUB_CLIENT_ID: ${process.env.GITHUB_CLIENT_ID ? '已设置' : '未设置'}`)
  console.log(`GITHUB_CLIENT_SECRET: ${process.env.GITHUB_CLIENT_SECRET ? '已设置' : '未设置'}`)
  console.log(`GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? '已设置' : '未设置'}`)
  console.log(`GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? '已设置' : '未设置'}`)
  console.log(`NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || '未设置'}`)
  console.log('')

  // 检查代理设置
  if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
    console.log('🌐 代理设置:')
    console.log(`HTTP_PROXY: ${process.env.HTTP_PROXY || '未设置'}`)
    console.log(`HTTPS_PROXY: ${process.env.HTTPS_PROXY || '未设置'}`)
    console.log(`NO_PROXY: ${process.env.NO_PROXY || '未设置'}`)
    console.log('')
  }

  console.log('🔌 测试 OAuth 端点连接性...\n')

  let allSuccess = true

  for (const testConfig of testUrls) {
    process.stdout.write(`测试 ${testConfig.name}... `)

    try {
      const result = await testConnection(testConfig)

      if (result.success) {
        console.log(`✅ 成功 (${result.responseTime}ms, HTTP ${result.statusCode})`)
      } else {
        console.log(`❌ 失败 (${result.responseTime}ms)`)
        console.log(`   错误: ${result.error}`)
        allSuccess = false
      }
    } catch (error) {
      console.log(`❌ 异常`)
      console.log(`   错误: ${error.message}`)
      allSuccess = false
    }
  }

  console.log('')

  if (allSuccess) {
    console.log('🎉 所有 OAuth 端点连接正常!')
  } else {
    console.log('⚠️  部分 OAuth 端点连接失败')
    console.log('\n💡 可能的解决方案:')
    console.log('- 检查网络连接')
    console.log('- 检查防火墙设置')
    console.log('- 如果在中国大陆，可能需要配置代理:')
    console.log('  在 .env.local 中取消注释代理配置:')
    console.log('  HTTP_PROXY=http://127.0.0.1:7890')
    console.log('  HTTPS_PROXY=http://127.0.0.1:7890')
    console.log('- 检查 OAuth 应用配置是否正确')
    console.log('- 尝试重启网络服务')
  }

  // 测试回调URL可达性
  console.log('\n🔄 测试回调URL配置...')
  const callbackUrls = [
    `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/callback/github`,
    `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/callback/google`
  ]

  for (const url of callbackUrls) {
    console.log(`回调URL: ${url}`)
  }

  console.log('\n📝 确保在 OAuth 应用设置中配置了正确的回调URL')
}

// 运行测试
testOAuthConnectivity().catch(console.error)
