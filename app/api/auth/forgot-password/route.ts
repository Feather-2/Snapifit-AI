import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { PasswordManager } from '@/lib/auth/password'
import { getClientIP } from '@/lib/utils/ip'
import { verifyCaptcha } from '@/lib/captcha/math-captcha'

export const runtime = 'nodejs' // 明确指定使用 Node.js Runtime

export async function POST(request: NextRequest) {
  try {
    const { email, captcha } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: '邮箱地址不能为空' },
        { status: 400 }
      )
    }

    // 简单的数学验证码验证
    if (!captcha || !captcha.answer || !captcha.sessionId) {
      return NextResponse.json(
        { error: '请完成人机验证' },
        { status: 400 }
      )
    }

    // 验证数学验证码（这里可以扩展为更复杂的验证）
    const isValidCaptcha = verifyCaptcha(captcha.sessionId, captcha.answer)
    if (!isValidCaptcha) {
      return NextResponse.json(
        { error: '验证码错误，请重试' },
        { status: 400 }
      )
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '邮箱格式不正确' },
        { status: 400 }
      )
    }

    // 获取数据库客户端
    const supabaseAdmin = await getSupabaseAdmin()

    // 查找用户
    const { data: user, error: findError } = await supabaseAdmin
      .from('users')
      .select('id, username, email')
      .eq('email', email)
      .single()

    if (findError || !user) {
      // 为了安全，即使用户不存在也返回成功消息
      return NextResponse.json({
        success: true,
        message: '如果该邮箱地址存在，我们已发送重置密码链接'
      })
    }

    // 生成密码重置令牌
    const resetToken = PasswordManager.generatePasswordResetToken()
    const resetExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24小时后过期

    // 保存重置令牌
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        password_reset_token: resetToken,
        password_reset_expires: resetExpires.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error saving reset token:', updateError)
      return NextResponse.json(
        { error: '生成重置令牌失败' },
        { status: 500 }
      )
    }

    // 发送密码重置邮件
    try {
      const { EmailService } = await import('@/lib/email/email-service')
      const clientIP = getClientIP(request)

      await EmailService.sendPasswordReset(email, resetToken, user.username || 'User', clientIP)
      console.log('✅ 密码重置邮件发送成功')
    } catch (emailError) {
      console.error('❌ 密码重置邮件发送失败:', emailError)
      // 邮件发送失败不影响重置流程，继续返回成功
    }

    console.log(`Password reset token for ${email}: ${resetToken}`)
    console.log(`Reset link: http://localhost:3000/reset-password?token=${resetToken}`)

    return NextResponse.json({
      success: true,
      message: '如果该邮箱地址存在，我们已发送重置密码链接',
      // 开发环境下返回令牌（生产环境应移除）
      ...(process.env.NODE_ENV === 'development' && {
        resetToken,
        resetLink: `http://localhost:3000/reset-password?token=${resetToken}`
      })
    })

  } catch (error) {
    console.error('Forgot password error:', error)
    const { handleApiError } = await import('@/lib/api/error-handler')
    return handleApiError(error, 500)
  }
}
