#!/usr/bin/env node

/**
 * 域名配置检查脚本
 * 用于验证邮件域名的 DNS 记录是否正确配置
 */

const { exec } = require('child_process')
const { promisify } = require('util')
const execAsync = promisify(exec)

// 从环境变量获取域名
function getDomainFromEmail() {
  try {
    require('dotenv').config({ path: '.env.local' })
  } catch (error) {
    // dotenv 可能未安装，忽略错误
  }

  const fromEmail = process.env.FROM_EMAIL
  if (!fromEmail) {
    console.log('❌ 未找到 FROM_EMAIL 环境变量')
    console.log('请在 .env.local 中设置 FROM_EMAIL=noreply@yourdomain.com')
    return null
  }

  const domain = fromEmail.split('@')[1]
  if (!domain) {
    console.log('❌ FROM_EMAIL 格式不正确:', fromEmail)
    return null
  }

  return domain
}

// 检查 DNS 记录
async function checkDNSRecord(domain, recordType, name, expectedContent) {
  try {
    const fullName = name === '@' ? domain : `${name}.${domain}`
    const { stdout } = await execAsync(`nslookup -type=${recordType} ${fullName}`)

    console.log(`\n🔍 检查 ${recordType} 记录: ${fullName}`)

    if (expectedContent) {
      const found = stdout.includes(expectedContent)
      console.log(`   期望内容: ${expectedContent}`)
      console.log(`   检查结果: ${found ? '✅ 找到' : '❌ 未找到'}`)
      return found
    } else {
      console.log(`   查询结果:`)
      console.log(`   ${stdout.split('\n').filter(line => line.trim()).slice(-3).join('\n   ')}`)
      return true
    }
  } catch (error) {
    console.log(`   ❌ 查询失败: ${error.message}`)
    return false
  }
}

// 检查所有必需的记录
async function checkAllRecords(domain) {
  console.log(`🌐 检查域名: ${domain}`)
  console.log('=' * 50)

  const checks = [
    {
      name: 'SPF 记录',
      type: 'TXT',
      record: '@',
      expected: 'v=spf1 include:_spf.resend.com'
    },
    {
      name: 'DKIM 记录',
      type: 'CNAME',
      record: 'resend._domainkey',
      expected: 'resend._domainkey.resend.com'
    },
    {
      name: 'DMARC 记录',
      type: 'TXT',
      record: '_dmarc',
      expected: 'v=DMARC1'
    }
  ]

  const results = []

  for (const check of checks) {
    console.log(`\n📋 ${check.name}`)
    const result = await checkDNSRecord(domain, check.type, check.record, check.expected)
    results.push({ ...check, passed: result })
  }

  return results
}

// 生成配置建议
function generateConfigSuggestions(domain, results) {
  console.log('\n📝 DNS 配置建议:')
  console.log('=' * 50)

  const failedChecks = results.filter(r => !r.passed)

  if (failedChecks.length === 0) {
    console.log('🎉 所有 DNS 记录都已正确配置！')
    return
  }

  console.log('请在您的 DNS 服务商添加以下记录:\n')

  failedChecks.forEach(check => {
    console.log(`${check.name}:`)
    console.log(`  类型: ${check.type}`)
    console.log(`  名称: ${check.record === '@' ? '@ (根域名)' : check.record}`)

    switch (check.name) {
      case 'SPF 记录':
        console.log(`  值: v=spf1 include:_spf.resend.com ~all`)
        break
      case 'DKIM 记录':
        console.log(`  值: resend._domainkey.resend.com`)
        break
      case 'DMARC 记录':
        console.log(`  值: v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}`)
        break
    }
    console.log(`  TTL: 3600\n`)
  })
}

// 检查 Resend API 配置
function checkResendConfig() {
  console.log('\n🔑 检查 Resend 配置:')
  console.log('=' * 30)

  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.FROM_EMAIL

  console.log(`RESEND_API_KEY: ${apiKey ? '✅ 已配置' : '❌ 未配置'}`)
  console.log(`FROM_EMAIL: ${fromEmail ? `✅ ${fromEmail}` : '❌ 未配置'}`)

  if (!apiKey) {
    console.log('\n💡 请在 .env.local 中设置:')
    console.log('RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx')
  }

  if (!fromEmail) {
    console.log('\n💡 请在 .env.local 中设置:')
    console.log('FROM_EMAIL=noreply@yourdomain.com')
  }
}

// 提供帮助信息
function showHelp() {
  console.log(`
📧 域名配置检查工具

用法:
  node scripts/check-domain.js [domain]

参数:
  domain    要检查的域名 (可选，默认从 FROM_EMAIL 获取)

示例:
  node scripts/check-domain.js
  node scripts/check-domain.js yourdomain.com

功能:
  ✅ 检查 SPF 记录
  ✅ 检查 DKIM 记录
  ✅ 检查 DMARC 记录
  ✅ 验证 Resend 配置
  ✅ 提供配置建议

注意:
  - 需要安装 nslookup 工具
  - DNS 记录可能需要时间传播 (5-30分钟)
  - 某些网络环境可能影响 DNS 查询
`)
}

// 主函数
async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--help') || args.includes('-h')) {
    showHelp()
    return
  }

  console.log('🔍 Snapifit AI 域名配置检查工具\n')

  // 获取要检查的域名
  let domain = args[0]
  if (!domain) {
    domain = getDomainFromEmail()
    if (!domain) {
      console.log('\n💡 使用方法: node scripts/check-domain.js yourdomain.com')
      return
    }
  }

  try {
    // 检查 Resend 配置
    checkResendConfig()

    // 检查 DNS 记录
    const results = await checkAllRecords(domain)

    // 生成配置建议
    generateConfigSuggestions(domain, results)

    // 总结
    const passedCount = results.filter(r => r.passed).length
    const totalCount = results.length

    console.log('\n📊 检查总结:')
    console.log('=' * 20)
    console.log(`通过: ${passedCount}/${totalCount}`)

    if (passedCount === totalCount) {
      console.log('🎉 域名配置完成！可以开始发送邮件了。')
    } else {
      console.log('⚠️  请完成 DNS 配置后重新检查。')
      console.log('\n💡 配置完成后，请等待 5-30 分钟让 DNS 记录传播。')
    }

    console.log('\n📚 详细配置指南: docs/DOMAIN_SETUP.md')

  } catch (error) {
    console.error('❌ 检查过程中出现错误:', error.message)
    console.log('\n💡 请确保:')
    console.log('1. 网络连接正常')
    console.log('2. 系统已安装 nslookup 工具')
    console.log('3. 域名格式正确')
  }
}

// 运行检查
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 程序执行失败:', error)
    process.exit(1)
  })
}

module.exports = { checkAllRecords, getDomainFromEmail }
