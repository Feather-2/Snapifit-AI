#!/usr/bin/env node

/**
 * 邮件服务测试脚本
 * 用于测试邮件发送功能是否正常工作
 */

const { EmailService } = require('../lib/email/email-service.ts')

async function testEmailService() {
  console.log('🧪 开始测试邮件服务...\n')

  // 测试邮箱验证邮件
  console.log('📧 测试邮箱验证邮件发送...')
  try {
    const result1 = await EmailService.sendEmailVerification(
      'test@example.com',
      'test-token-123',
      'TestUser'
    )

    if (result1.success) {
      console.log('✅ 邮箱验证邮件发送成功')
      console.log('   邮件ID:', result1.data?.id)
    } else {
      console.log('❌ 邮箱验证邮件发送失败:', result1.error)
    }
  } catch (error) {
    console.log('❌ 邮箱验证邮件发送异常:', error.message)
  }

  console.log('')

  // 测试密码重置邮件
  console.log('🔑 测试密码重置邮件发送...')
  try {
    const result2 = await EmailService.sendPasswordReset(
      'test@example.com',
      'reset-token-456',
      'TestUser'
    )

    if (result2.success) {
      console.log('✅ 密码重置邮件发送成功')
      console.log('   邮件ID:', result2.data?.id)
    } else {
      console.log('❌ 密码重置邮件发送失败:', result2.error)
    }
  } catch (error) {
    console.log('❌ 密码重置邮件发送异常:', error.message)
  }

  console.log('\n🏁 邮件服务测试完成')
}

// 测试频率限制
async function testRateLimit() {
  console.log('⏱️  测试邮件发送频率限制...\n')

  const testEmail = 'ratelimit-test@example.com'

  try {
    // 连续发送多次邮件测试频率限制
    for (let i = 1; i <= 3; i++) {
      console.log(`📧 第 ${i} 次发送测试...`)

      const result = await EmailService.sendEmailVerification(
        testEmail,
        `test-token-${i}`,
        'RateLimitTestUser'
      )

      if (result.success) {
        console.log(`✅ 第 ${i} 次发送成功`)
      } else {
        if (result.rateLimited) {
          console.log(`⏰ 第 ${i} 次发送被限制: ${result.error}`)
          console.log(`   需要等待 ${result.waitMinutes} 分钟`)
        } else {
          console.log(`❌ 第 ${i} 次发送失败: ${result.error}`)
        }
      }

      // 检查频率限制状态
      const status = EmailService.checkEmailRateLimit(testEmail)
      console.log(`   当前状态: ${status.allowed ? '可发送' : '被限制'}`)
      console.log(`   使用情况: 30秒内${status.stats.last30Seconds}次, 5分钟内${status.stats.last5Minutes}次, 24小时内${status.stats.last24Hours}次`)

      if (i < 3) {
        console.log('   等待 1 秒...\n')
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    console.log('\n📊 频率限制测试完成')

    // 清理测试数据
    EmailService.clearEmailHistory(testEmail)
    console.log('🗑️  已清理测试数据')

  } catch (error) {
    console.error('❌ 频率限制测试失败:', error.message)
  }
}

// 检查环境变量
function checkEnvironment() {
  console.log('🔍 检查环境配置...\n')

  const requiredEnvs = [
    'NEXTAUTH_URL',
    'APP_NAME'
  ]

  const optionalEnvs = [
    'RESEND_API_KEY',
    'FROM_EMAIL'
  ]

  console.log('必需的环境变量:')
  requiredEnvs.forEach(env => {
    const value = process.env[env]
    console.log(`  ${env}: ${value ? '✅ 已配置' : '❌ 未配置'}`)
  })

  console.log('\n可选的环境变量:')
  optionalEnvs.forEach(env => {
    const value = process.env[env]
    console.log(`  ${env}: ${value ? '✅ 已配置' : '⚠️  未配置 (将使用开发模式)'}`)
  })

  console.log('')

  if (!process.env.RESEND_API_KEY) {
    console.log('💡 提示: 未配置 RESEND_API_KEY，邮件将输出到控制台而不会实际发送')
    console.log('   如需实际发送邮件，请参考 docs/EMAIL_SETUP.md 配置邮件服务\n')
  }
}

// 主函数
async function main() {
  console.log('📮 Snapifit AI 邮件服务测试工具\n')

  // 加载环境变量
  try {
    require('dotenv').config({ path: '.env.local' })
  } catch (error) {
    // dotenv 可能未安装，忽略错误
  }

  // 检查命令行参数
  const args = process.argv.slice(2)
  const testRateLimitFlag = args.includes('--rate-limit') || args.includes('-r')

  checkEnvironment()
  await testEmailService()

  if (testRateLimitFlag) {
    console.log('\n' + '='.repeat(50))
    await testRateLimit()
  } else {
    console.log('\n💡 提示: 使用 --rate-limit 或 -r 参数测试频率限制功能')
  }
}

// 运行测试
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 测试失败:', error)
    process.exit(1)
  })
}

module.exports = { testEmailService, testRateLimit, checkEnvironment }
