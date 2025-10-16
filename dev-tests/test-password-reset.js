/**
 * 测试密码重置功能
 * 运行: node test-password-reset.js
 */

async function testPasswordReset() {
  const testEmail = 'vcdfhkkitedfhj@gmail.com' // 使用实际存在的用户邮箱
  const testCaptcha = {
    sessionId: 'test-session-123',
    answer: 42
  }

  console.log('🧪 测试密码重置功能...')
  console.log('📧 测试邮箱:', testEmail)

  try {
    // 首先生成验证码
    console.log('\n1️⃣ 生成验证码...')
    const captchaResponse = await fetch('http://localhost:3000/api/captcha/generate')
    const captchaResult = await captchaResponse.json()

    if (!captchaResult.success) {
      console.error('❌ 验证码生成失败:', captchaResult.error)
      return
    }

    console.log('✅ 验证码生成成功:', captchaResult.data.question)

    // 使用生成的验证码信息
    const realCaptcha = {
      sessionId: captchaResult.data.sessionId,
      answer: 10 // 这里需要手动计算答案，或者使用简单的数学
    }

    console.log('\n2️⃣ 发送密码重置请求...')
    console.log('🔢 验证码问题:', captchaResult.data.question)
    console.log('🔢 验证码答案:', realCaptcha.answer)

    // 发送密码重置请求
    const resetResponse = await fetch('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testEmail,
        captcha: realCaptcha
      })
    })

    const resetResult = await resetResponse.json()

    console.log('\n📋 密码重置响应:')
    console.log('状态码:', resetResponse.status)
    console.log('响应内容:', JSON.stringify(resetResult, null, 2))

    if (resetResult.success) {
      console.log('✅ 密码重置请求成功！')
      if (resetResult.data?.resetToken) {
        console.log('🔑 重置令牌:', resetResult.data.resetToken)
        console.log('⏰ 过期时间:', resetResult.data.expiresAt)
      }
    } else {
      console.log('❌ 密码重置请求失败:', resetResult.error)
    }

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message)
  }
}

// 运行测试
testPasswordReset()
