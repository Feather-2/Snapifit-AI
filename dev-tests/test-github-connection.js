/**
 * 测试 GitHub OAuth 连接问题
 * 运行: node test-github-connection.js
 */

const https = require('https')
const http = require('http')

// 从环境变量读取配置
require('dotenv').config()

// 测试配置
const TIMEOUT_MS = 30000 // 30秒超时
const RETRY_COUNT = 3

async function testConnection(url, options = {}) {
  return new Promise((resolve) => {
    const startTime = Date.now()
    
    const requestOptions = {
      timeout: TIMEOUT_MS,
      headers: {
        'User-Agent': 'SnapFit-AI-Test/1.0',
        'Accept': 'application/json',
        ...options.headers
      },
      ...options
    }

    const protocol = url.startsWith('https:') ? https : http
    
    const req = protocol.request(url, requestOptions, (res) => {
      const responseTime = Date.now() - startTime
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        resolve({
          success: true,
          statusCode: res.statusCode,
          responseTime,
          headers: res.headers,
          dataLength: data.length
        })
      })
    })

    req.on('error', (error) => {
      const responseTime = Date.now() - startTime
      resolve({
        success: false,
        error: error.message,
        code: error.code,
        responseTime
      })
    })

    req.on('timeout', () => {
      req.destroy()
      const responseTime = Date.now() - startTime
      resolve({
        success: false,
        error: 'Request timeout',
        code: 'TIMEOUT',
        responseTime
      })
    })

    req.end()
  })
}

async function testWithRetry(url, options = {}, retries = RETRY_COUNT) {
  for (let i = 0; i < retries; i++) {
    console.log(`🔄 尝试 ${i + 1}/${retries}: ${url}`)
    
    const result = await testConnection(url, options)
    
    if (result.success) {
      console.log(`✅ 成功: ${result.statusCode} (${result.responseTime}ms)`)
      return result
    } else {
      console.log(`❌ 失败: ${result.error} (${result.responseTime}ms)`)
      if (i < retries - 1) {
        console.log(`⏳ 等待 2 秒后重试...`)
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
  }
  
  return { success: false, error: 'All retries failed' }
}

async function testGitHubOAuth() {
  console.log('🔍 测试 GitHub OAuth 连接...')
  console.log('=' * 50)

  // 1. 测试基本连接
  console.log('\n1️⃣ 测试基本 GitHub 连接')
  await testWithRetry('https://github.com')

  // 2. 测试 GitHub API
  console.log('\n2️⃣ 测试 GitHub API')
  await testWithRetry('https://api.github.com')

  // 3. 测试 OAuth 授权端点
  console.log('\n3️⃣ 测试 OAuth 授权端点')
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=read:user user:email`
  await testWithRetry(authUrl)

  // 4. 测试 OAuth Token 端点
  console.log('\n4️⃣ 测试 OAuth Token 端点')
  await testWithRetry('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  })

  // 5. 测试本地回调端点
  console.log('\n5️⃣ 测试本地回调端点')
  const callbackUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/callback/github`
  await testWithRetry(callbackUrl)

  // 6. 测试 DNS 解析
  console.log('\n6️⃣ 测试 DNS 解析')
  const dns = require('dns')
  
  try {
    const addresses = await new Promise((resolve, reject) => {
      dns.resolve4('github.com', (err, addresses) => {
        if (err) reject(err)
        else resolve(addresses)
      })
    })
    console.log(`✅ DNS 解析成功: ${addresses.join(', ')}`)
  } catch (error) {
    console.log(`❌ DNS 解析失败: ${error.message}`)
  }

  // 7. 检查环境变量
  console.log('\n7️⃣ 检查环境变量')
  const requiredEnvs = [
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET'
  ]

  requiredEnvs.forEach(env => {
    const value = process.env[env]
    if (value) {
      console.log(`✅ ${env}: ${env.includes('SECRET') ? '***' : value}`)
    } else {
      console.log(`❌ ${env}: 未设置`)
    }
  })

  // 8. 检查代理设置
  console.log('\n8️⃣ 检查代理设置')
  const proxyEnvs = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy']
  let hasProxy = false
  
  proxyEnvs.forEach(env => {
    const value = process.env[env]
    if (value) {
      console.log(`🔗 ${env}: ${value}`)
      hasProxy = true
    }
  })
  
  if (!hasProxy) {
    console.log('ℹ️  未检测到代理设置')
  }

  // 9. 网络诊断建议
  console.log('\n9️⃣ 网络诊断建议')
  console.log('如果连接失败，请尝试以下解决方案:')
  console.log('1. 检查防火墙设置，确保允许 HTTPS 连接')
  console.log('2. 如果在中国大陆，可能需要配置代理:')
  console.log('   在 .env.local 中添加:')
  console.log('   HTTP_PROXY=http://127.0.0.1:7890')
  console.log('   HTTPS_PROXY=http://127.0.0.1:7890')
  console.log('3. 检查 GitHub OAuth 应用配置:')
  console.log(`   - 授权回调 URL: ${callbackUrl}`)
  console.log('   - 应用权限: read:user, user:email')
  console.log('4. 尝试重启网络服务或更换 DNS')
  console.log('5. 检查系统时间是否正确（OAuth 对时间敏感）')
}

// 运行测试
testGitHubOAuth().catch(console.error)
