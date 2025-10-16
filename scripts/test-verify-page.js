#!/usr/bin/env node

/**
 * 快速测试邮箱验证页面
 */

const { spawn } = require('child_process')

async function testVerifyPage() {
  console.log('🧪 测试邮箱验证页面...\n')

  // 测试URL
  const testUrls = [
    'http://localhost:3000/zh/verify-email?token=test-token-123',
    'http://localhost:3000/zh/verify-email',
    'http://localhost:3000/verify-email?token=test-token-123'
  ]

  for (const url of testUrls) {
    console.log(`🔍 测试URL: ${url}`)
    
    try {
      const fetch = (await import('node-fetch')).default
      const response = await fetch(url)
      
      console.log(`   状态码: ${response.status}`)
      console.log(`   状态: ${response.status === 200 ? '✅ 成功' : response.status === 404 ? '❌ 404 Not Found' : '⚠️  其他'}`)
      
      if (response.status === 200) {
        const html = await response.text()
        if (html.includes('邮箱验证')) {
          console.log(`   内容: ✅ 包含邮箱验证页面`)
        } else {
          console.log(`   内容: ❌ 不是邮箱验证页面`)
        }
      }
    } catch (error) {
      console.log(`   错误: ❌ ${error.message}`)
    }
    
    console.log('')
  }

  console.log('💡 如果看到404错误，请确保:')
  console.log('1. 开发服务器正在运行 (pnpm dev)')
  console.log('2. 邮箱验证页面文件存在: app/[locale]/verify-email/page.tsx')
  console.log('3. 使用正确的URL格式: /zh/verify-email?token=xxx')
}

// 运行测试
testVerifyPage().catch(console.error)
