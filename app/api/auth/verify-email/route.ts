import { NextRequest, NextResponse } from 'next/server'
import { UserManager } from '@/lib/auth/user-manager'
import { getClientIP } from '@/lib/utils/ip'

export const runtime = 'nodejs' // 明确指定使用 Node.js Runtime

/**
 * 邮箱验证 API
 * POST /api/auth/verify-email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, token } = body

    // 支持两种验证方式：
    // 1. 通过 userId + token (旧方式，向后兼容)
    // 2. 仅通过 token (新方式，用于邮件链接)

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: token'
        },
        { status: 400 }
      )
    }

    let result
    if (userId) {
      // 旧方式：通过用户ID和令牌验证
      result = await UserManager.verifyEmail(userId, token)
    } else {
      // 新方式：仅通过令牌验证
      result = await UserManager.verifyEmailByToken(token)
    }

    if (!result.success) {
      const statusCode = result.expired ? 410 : 400 // 410 Gone for expired tokens
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          expired: result.expired,
          data: result.data
        },
        { status: statusCode }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message || 'Email verified successfully',
      data: result.data
    })

  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}

/**
 * 重新发送验证邮件
 * PUT /api/auth/verify-email
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email is required'
        },
        { status: 400 }
      )
    }

    // 查找用户并生成新的验证令牌
    const { getSupabaseAdmin } = await import('@/lib/supabase')
    const { PasswordManager } = await import('@/lib/auth/password')
    const supabase = await getSupabaseAdmin()

    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, email, email_verified, registration_type')
      .eq('email', email)
      .single()

    if (findError || !user) {
      // 为了安全，即使用户不存在也返回成功
      return NextResponse.json({
        success: true,
        message: 'If the email exists and needs verification, a new verification email has been sent'
      })
    }

    // 检查是否需要验证
    if (user.email_verified) {
      return NextResponse.json({
        success: true,
        message: 'Email is already verified'
      })
    }

    // 检查是否支持邮箱验证
    if (!['email', 'invite'].includes(user.registration_type)) {
      return NextResponse.json({
        success: true,
        message: 'If the email exists and needs verification, a new verification email has been sent'
      })
    }

    // 生成新的验证令牌
    const newToken = PasswordManager.generateEmailVerificationToken()

    // 更新用户记录
    const { error: updateError } = await supabase
      .from('users')
      .update({
        email_verification_token: newToken,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      throw updateError
    }

    // 发送验证邮件
    try {
      const { EmailService } = await import('@/lib/email/email-service')
      // 获取用户名
      const { data: userInfo } = await supabase
        .from('users')
        .select('username')
        .eq('id', user.id)
        .single()

      // 获取客户端IP
      const clientIP = getClientIP(request)

      const emailResult = await EmailService.sendEmailVerification(user.email, newToken, userInfo?.username || 'User', clientIP)

      if (!emailResult.success) {
        // 如果是频率限制错误，返回特殊响应
        if (emailResult.rateLimited) {
          return NextResponse.json({
            success: false,
            error: emailResult.error,
            rateLimited: true,
            waitMinutes: emailResult.waitMinutes,
            nextAllowedTime: emailResult.nextAllowedTime
          }, { status: 429 })
        }

        // 其他邮件发送错误
        console.error('❌ 重新发送验证邮件失败:', emailResult.error)
        return NextResponse.json({
          success: false,
          error: '邮件发送失败，请稍后重试'
        }, { status: 500 })
      }

      console.log('✅ 重新发送验证邮件成功')
    } catch (emailError) {
      console.error('❌ 重新发送验证邮件异常:', emailError)
      return NextResponse.json({
        success: false,
        error: '邮件发送服务异常，请稍后重试'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Verification email sent successfully',
      data: {
        // 在开发环境下返回令牌用于测试
        ...(process.env.NODE_ENV === 'development' && { token: newToken })
      }
    })

  } catch (error) {
    console.error('Resend verification email error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}
