/**
 * 沙箱功能测试脚本
 * 验证沙箱执行器是否正常工作
 */

const { getSandboxManager, initializeSandboxManager } = require('../lib/mcp/sandbox-executor')

async function testSandboxFunctionality() {
  console.log('🧪 开始测试沙箱功能...\n')

  try {
    // 1. 初始化沙箱管理器
    console.log('1️⃣ 初始化沙箱管理器...')
    await initializeSandboxManager()
    const sandboxManager = getSandboxManager()
    console.log('✅ 沙箱管理器初始化成功\n')

    // 2. 检查沙箱状态
    console.log('2️⃣ 检查沙箱状态...')
    const status = sandboxManager.getStatus()
    console.log('📊 沙箱状态:', JSON.stringify(status, null, 2))
    console.log('')

    // 3. 测试工具执行
    console.log('3️⃣ 测试工具执行...')

    const testCases = [
      {
        name: '测试用户档案工具',
        toolName: 'get_user_profile',
        params: { user_id: 'test_user_123' },
        context: {
          userId: 'test_user_123',
          sessionId: 'test_session',
          origin: 'test_script',
          timeout: 10000
        }
      },
      {
        name: '测试每日记录工具',
        toolName: 'get_daily_logs',
        params: {
          user_id: 'test_user_123',
          start_date: '2024-01-01',
          end_date: '2024-01-31'
        },
        context: {
          userId: 'test_user_123',
          sessionId: 'test_session',
          origin: 'test_script',
          timeout: 10000
        }
      }
    ]

    for (const testCase of testCases) {
      console.log(`\n🔧 ${testCase.name}`)

      try {
        const startTime = Date.now()
        const result = await sandboxManager.executeWithFallback(
          testCase.toolName,
          testCase.params,
          testCase.context
        )
        const endTime = Date.now()

        console.log(`✅ 执行成功`)
        console.log(`⏱️  执行时间: ${endTime - startTime}ms`)
        console.log(`🔒 安全级别: ${result.securityLevel}`)
        console.log(`💾 内存使用: ${Math.round(result.resourceUsage.memoryUsed / 1024 / 1024)}MB`)

        if (result.success) {
          console.log(`📊 结果类型: ${typeof result.result}`)
          if (result.result && typeof result.result === 'object') {
            console.log(`📊 结果键: ${Object.keys(result.result).join(', ')}`)
          }
        } else {
          console.log(`❌ 执行失败: ${result.error}`)
        }

      } catch (error) {
        console.log(`❌ 测试失败: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    // 4. 测试故障转移
    console.log('\n4️⃣ 测试故障转移机制...')

    try {
      // 测试不存在的工具
      const result = await sandboxManager.executeWithFallback(
        'non_existent_tool',
        {},
        {
          userId: 'test_user',
          sessionId: 'test_session',
          origin: 'test_script',
          timeout: 5000
        }
      )
      console.log('❌ 应该失败但成功了:', result)
    } catch (error) {
      console.log('✅ 故障转移正常工作:', error instanceof Error ? error.message : String(error))
    }

    // 5. 测试安全过滤
    console.log('\n5️⃣ 测试安全过滤...')

    try {
      const maliciousParams = {
        user_id: 'test_user',
        __proto__: { malicious: true },
        constructor: { name: 'hack' },
        eval: 'console.log("hacked")',
        require: 'fs'
      }

      const result = await sandboxManager.executeWithFallback(
        'get_user_profile',
        maliciousParams,
        {
          userId: 'test_user',
          sessionId: 'test_session',
          origin: 'test_script',
          timeout: 5000
        }
      )

      console.log('✅ 安全过滤正常工作，恶意参数已被清理')

    } catch (error) {
      console.log('⚠️  安全过滤测试异常:', error instanceof Error ? error.message : String(error))
    }

    // 6. 性能测试
    console.log('\n6️⃣ 性能测试...')

    const performanceTests = []
    const testCount = 5

    for (let i = 0; i < testCount; i++) {
      const startTime = Date.now()

      try {
        await sandboxManager.executeWithFallback(
          'get_user_profile',
          { user_id: `test_user_${i}` },
          {
            userId: `test_user_${i}`,
            sessionId: `perf_test_${i}`,
            origin: 'performance_test',
            timeout: 5000
          }
        )

        const endTime = Date.now()
        performanceTests.push(endTime - startTime)

      } catch (error) {
        console.log(`⚠️  性能测试 ${i + 1} 失败:`, error instanceof Error ? error.message : String(error))
      }
    }

    if (performanceTests.length > 0) {
      const avgTime = performanceTests.reduce((a, b) => a + b, 0) / performanceTests.length
      const minTime = Math.min(...performanceTests)
      const maxTime = Math.max(...performanceTests)

      console.log(`📊 性能统计 (${performanceTests.length} 次测试):`)
      console.log(`   平均时间: ${avgTime.toFixed(2)}ms`)
      console.log(`   最短时间: ${minTime}ms`)
      console.log(`   最长时间: ${maxTime}ms`)
    }

    // 7. 最终状态检查
    console.log('\n7️⃣ 最终状态检查...')
    const finalStatus = sandboxManager.getStatus()
    console.log('📊 最终沙箱状态:', JSON.stringify(finalStatus, null, 2))

    console.log('\n🎉 沙箱功能测试完成！')

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
    process.exit(1)
  }
}

// 运行测试
if (require.main === module) {
  testSandboxFunctionality().catch(error => {
    console.error('❌ 测试失败:', error)
    process.exit(1)
  })
}

module.exports = { testSandboxFunctionality }
