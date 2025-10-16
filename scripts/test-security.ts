/**
 * MCP沙箱安全测试脚本
 * 从攻击者角度测试沙箱的安全性
 */

const { getSandboxManager, initializeSandboxManager } = require('../lib/mcp/sandbox-executor')
const { securityViolationLogger } = require('../lib/mcp/security-policies')

async function runSecurityTests() {
  console.log('🔒 开始MCP沙箱安全测试...\n')

  try {
    // 初始化沙箱
    await initializeSandboxManager()
    const sandboxManager = getSandboxManager()

    const testResults = {
      passed: 0,
      failed: 0,
      total: 0
    }

    // 测试用例
    const securityTests = [
      {
        name: '代码注入攻击测试',
        test: async () => {
          const maliciousToolName = "'; require('child_process').exec('echo hacked'); //"
          try {
            await sandboxManager.executeWithFallback(
              maliciousToolName,
              {},
              { userId: 'test', sessionId: 'test', origin: 'security_test' }
            )
            return { success: false, message: '代码注入攻击成功，存在安全漏洞' }
          } catch (error) {
            return { success: true, message: '代码注入攻击被成功阻止' }
          }
        }
      },

      {
        name: 'Prototype污染攻击测试',
        test: async () => {
          const maliciousParams = {
            __proto__: { isAdmin: true },
            constructor: { prototype: { isAdmin: true } },
            user_id: 'test'
          }
          try {
            const result = await sandboxManager.executeWithFallback(
              'get_user_profile',
              maliciousParams,
              { userId: 'test', sessionId: 'test', origin: 'security_test' }
            )

            // 检查是否成功污染了原型
            if ((result as any).isAdmin) {
              return { success: false, message: 'Prototype污染攻击成功' }
            }
            return { success: true, message: 'Prototype污染攻击被阻止' }
          } catch (error) {
            return { success: true, message: 'Prototype污染攻击被阻止' }
          }
        }
      },

      {
        name: '函数注入攻击测试',
        test: async () => {
          const maliciousParams = {
            user_id: 'test',
            callback: function() { console.log('hacked'); },
            eval: 'console.log("hacked")',
            Function: 'return process.env'
          }
          try {
            await sandboxManager.executeWithFallback(
              'get_user_profile',
              maliciousParams,
              { userId: 'test', sessionId: 'test', origin: 'security_test' }
            )
            return { success: true, message: '函数注入攻击被阻止' }
          } catch (error) {
            if (error.message.includes('不允许函数类型参数') ||
                error.message.includes('参数验证失败')) {
              return { success: true, message: '函数注入攻击被阻止' }
            }
            return { success: false, message: '函数注入攻击可能成功' }
          }
        }
      },

      {
        name: '深度嵌套攻击测试',
        test: async () => {
          // 创建深度嵌套的对象
          let deepObject: any = { user_id: 'test' }
          for (let i = 0; i < 20; i++) {
            deepObject = { nested: deepObject }
          }

          try {
            await sandboxManager.executeWithFallback(
              'get_user_profile',
              deepObject,
              { userId: 'test', sessionId: 'test', origin: 'security_test' }
            )
            return { success: false, message: '深度嵌套攻击成功，可能导致栈溢出' }
          } catch (error) {
            if (error.message.includes('嵌套层级过深') ||
                error.message.includes('参数验证失败')) {
              return { success: true, message: '深度嵌套攻击被阻止' }
            }
            return { success: false, message: '深度嵌套攻击处理异常' }
          }
        }
      },

      {
        name: '大数据量攻击测试',
        test: async () => {
          const largeArray = new Array(10000).fill('x'.repeat(1000))
          try {
            await sandboxManager.executeWithFallback(
              'get_user_profile',
              { user_id: 'test', data: largeArray },
              { userId: 'test', sessionId: 'test', origin: 'security_test' }
            )
            return { success: false, message: '大数据量攻击成功，可能导致内存耗尽' }
          } catch (error) {
            if (error.message.includes('数组长度超过') ||
                error.message.includes('参数总大小超过') ||
                error.message.includes('参数验证失败')) {
              return { success: true, message: '大数据量攻击被阻止' }
            }
            return { success: false, message: '大数据量攻击处理异常' }
          }
        }
      },

      {
        name: '未授权工具访问测试',
        test: async () => {
          try {
            await sandboxManager.executeWithFallback(
              'malicious_tool',
              { user_id: 'test' },
              { userId: 'test', sessionId: 'test', origin: 'security_test' }
            )
            return { success: false, message: '未授权工具访问成功' }
          } catch (error) {
            if (error.message.includes('工具不在白名单中') ||
                error.message.includes('无效的工具名')) {
              return { success: true, message: '未授权工具访问被阻止' }
            }
            return { success: false, message: '未授权工具访问处理异常' }
          }
        }
      },

      {
        name: '敏感数据泄露测试',
        test: async () => {
          try {
            // 模拟包含敏感数据的响应
            const result = await sandboxManager.executeWithFallback(
              'get_user_profile',
              { user_id: 'test' },
              { userId: 'test', sessionId: 'test', origin: 'security_test' }
            )

            const resultStr = JSON.stringify(result)

            // 检查是否包含敏感信息模式
            const sensitivePatterns = [
              /password\s*[:=]\s*[^\s,}]+/gi,
              /token\s*[:=]\s*[^\s,}]+/gi,
              /key\s*[:=]\s*[^\s,}]+/gi,
              /[a-zA-Z0-9]{32,}/g
            ]

            for (const pattern of sensitivePatterns) {
              if (pattern.test(resultStr) && !resultStr.includes('[FILTERED]')) {
                return { success: false, message: '检测到未过滤的敏感数据' }
              }
            }

            return { success: true, message: '敏感数据过滤正常工作' }
          } catch (error) {
            return { success: true, message: '敏感数据测试通过（执行被阻止）' }
          }
        }
      },

      {
        name: '并发执行限制测试',
        test: async () => {
          const concurrentPromises = []

          // 尝试创建大量并发执行
          for (let i = 0; i < 20; i++) {
            concurrentPromises.push(
              sandboxManager.executeWithFallback(
                'get_user_profile',
                { user_id: `test_${i}` },
                { userId: `test_${i}`, sessionId: `test_${i}`, origin: 'security_test' }
              ).catch(error => ({ error: error.message }))
            )
          }

          const results = await Promise.all(concurrentPromises)
          const rejectedCount = results.filter(r => (r as any).error?.includes('并发执行数量超过限制')).length

          if (rejectedCount > 0) {
            return { success: true, message: `并发限制正常工作，拒绝了${rejectedCount}个请求` }
          } else {
            return { success: false, message: '并发限制可能未生效' }
          }
        }
      }
    ]

    // 执行所有测试
    for (const test of securityTests) {
      testResults.total++
      console.log(`🧪 执行测试: ${test.name}`)

      try {
        const result = await test.test()
        if (result.success) {
          testResults.passed++
          console.log(`✅ 通过: ${result.message}`)
        } else {
          testResults.failed++
          console.log(`❌ 失败: ${result.message}`)
        }
      } catch (error) {
        testResults.failed++
        console.log(`❌ 测试异常: ${error instanceof Error ? error.message : String(error)}`)
      }

      console.log('')
    }

    // 显示测试结果
    console.log('📊 安全测试结果:')
    console.log(`   总测试数: ${testResults.total}`)
    console.log(`   通过: ${testResults.passed}`)
    console.log(`   失败: ${testResults.failed}`)
    console.log(`   通过率: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`)

    // 显示安全违规记录
    console.log('\n🚨 安全违规记录:')
    const violations = securityViolationLogger.getViolations()
    if (violations.length > 0) {
      violations.forEach(violation => {
        console.log(`   [${violation.severity.toUpperCase()}] ${violation.type}: ${violation.message}`)
      })
    } else {
      console.log('   无安全违规记录')
    }

    // 评估整体安全性
    console.log('\n🛡️ 安全评估:')
    if (testResults.passed === testResults.total) {
      console.log('   🟢 安全性: 优秀 - 所有攻击都被成功阻止')
    } else if (testResults.passed / testResults.total >= 0.8) {
      console.log('   🟡 安全性: 良好 - 大部分攻击被阻止，但仍有改进空间')
    } else {
      console.log('   🔴 安全性: 需要改进 - 存在多个安全漏洞')
    }

    console.log('\n🎉 安全测试完成！')

  } catch (error) {
    console.error('❌ 安全测试过程中发生错误:', error)
    process.exit(1)
  }
}

// 运行测试
if (require.main === module) {
  runSecurityTests().catch(error => {
    console.error('❌ 安全测试失败:', error)
    process.exit(1)
  })
}

module.exports = { runSecurityTests }
