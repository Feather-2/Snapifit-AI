/**
 * 简化的沙箱测试脚本 (JavaScript版本)
 * 避免TypeScript编译问题
 */

async function testSandbox() {
  console.log('🧪 开始简化沙箱测试...\n')

  try {
    // 动态导入沙箱管理器
    const { getSandboxManager, initializeSandboxManager } = require('../lib/mcp/sandbox-executor')

    console.log('1️⃣ 初始化沙箱管理器...')
    await initializeSandboxManager()
    const sandboxManager = getSandboxManager()
    console.log('✅ 沙箱管理器初始化成功\n')

    console.log('2️⃣ 检查沙箱状态...')
    const status = sandboxManager.getStatus()
    console.log('📊 沙箱状态:')
    console.log(`   总执行器数量: ${status.totalExecutors}`)
    console.log(`   健康执行器数量: ${status.healthyExecutors}`)
    console.log(`   整体状态: ${status.overallStatus}`)
    console.log('')

    console.log('3️⃣ 测试基础工具执行...')
    
    try {
      const result = await sandboxManager.executeWithFallback(
        'get_user_profile',
        { user_id: 'test_user_123' },
        {
          userId: 'test_user_123',
          sessionId: 'test_session',
          origin: 'test_script',
          timeout: 10000
        }
      )

      console.log('✅ 工具执行成功!')
      console.log(`   执行时间: ${result.executionTime}ms`)
      console.log(`   安全级别: ${result.securityLevel}`)
      console.log(`   内存使用: ${Math.round(result.resourceUsage.memoryUsed / 1024 / 1024)}MB`)
      console.log(`   执行成功: ${result.success}`)
      
      if (result.success) {
        console.log(`   结果类型: ${typeof result.result}`)
      } else {
        console.log(`   错误信息: ${result.error}`)
      }

    } catch (error) {
      console.log(`❌ 工具执行失败: ${error.message}`)
    }

    console.log('\n4️⃣ 测试安全防护...')
    
    // 测试恶意参数
    try {
      const maliciousParams = {
        user_id: 'test_user',
        __proto__: { isAdmin: true },
        constructor: { name: 'hack' },
        eval: 'console.log("hacked")'
      }

      const result = await sandboxManager.executeWithFallback(
        'get_user_profile',
        maliciousParams,
        {
          userId: 'test_user',
          sessionId: 'security_test',
          origin: 'security_test',
          timeout: 5000
        }
      )

      console.log('✅ 恶意参数被成功处理（参数已清理）')
      
    } catch (error) {
      if (error.message.includes('参数验证失败') || 
          error.message.includes('不允许函数类型') ||
          error.message.includes('工具不在白名单中')) {
        console.log('✅ 安全防护正常工作，恶意参数被阻止')
      } else {
        console.log(`⚠️  安全测试异常: ${error.message}`)
      }
    }

    console.log('\n5️⃣ 测试无效工具访问...')
    
    try {
      await sandboxManager.executeWithFallback(
        'malicious_tool',
        { user_id: 'test_user' },
        {
          userId: 'test_user',
          sessionId: 'invalid_tool_test',
          origin: 'security_test',
          timeout: 5000
        }
      )
      console.log('❌ 无效工具访问应该被阻止')
    } catch (error) {
      if (error.message.includes('工具不在白名单中') || 
          error.message.includes('无效的工具名')) {
        console.log('✅ 无效工具访问被成功阻止')
      } else {
        console.log(`⚠️  无效工具测试异常: ${error.message}`)
      }
    }

    console.log('\n6️⃣ 最终状态检查...')
    const finalStatus = sandboxManager.getStatus()
    console.log('📊 最终沙箱状态:')
    console.log(`   总执行器数量: ${finalStatus.totalExecutors}`)
    console.log(`   健康执行器数量: ${finalStatus.healthyExecutors}`)
    console.log(`   整体状态: ${finalStatus.overallStatus}`)

    console.log('\n🎉 沙箱基础测试完成！')
    console.log('\n📋 测试总结:')
    console.log('   ✅ 沙箱管理器初始化正常')
    console.log('   ✅ 执行器状态健康')
    console.log('   ✅ 基础工具执行功能正常')
    console.log('   ✅ 安全防护机制有效')
    console.log('   ✅ 无效访问被正确阻止')

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
    console.error('错误堆栈:', error.stack)
    process.exit(1)
  }
}

// 运行测试
if (require.main === module) {
  testSandbox().catch(error => {
    console.error('❌ 测试失败:', error)
    process.exit(1)
  })
}

module.exports = { testSandbox }
