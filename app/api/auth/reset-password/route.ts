import { NextRequest, NextResponse } from 'next/server'
import { UserManager } from '@/lib/auth/user-manager'
import { getClientIP } from '@/lib/utils/ip'
import { PasswordManager } from '@/lib/auth/password'
import { verifyCaptcha } from '@/lib/captcha/math-captcha'

/**
 * 发起密码重置
 * POST /api/auth/reset-password
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, captcha } = body

    // 验证必填字段
    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email is required'
        },
        { status: 400 }
      )
    }

    // 验证人机验证码
    if (!captcha || !captcha.answer || !captcha.sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please complete the captcha verification'
        },
        { status: 400 }
      )
    }

    const isValidCaptcha = verifyCaptcha(captcha.sessionId, captcha.answer)
    if (!isValidCaptcha) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid captcha, please try again'
        },
        { status: 400 }
      )
    }

    // 验证邮箱格式
    if (!PasswordManager.isValidEmail(email)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email format'
        },
        { status: 400 }
      )
    }

    // 发起密码重置
    // 获取客户端IP
    const clientIP = getClientIP(request)

    const result = await UserManager.initiatePasswordReset(email, clientIP)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent',
      data: {
        // 在开发环境下返回令牌用于测试
        ...(process.env.NODE_ENV === 'development' && result.data && {
          resetToken: result.data.resetToken,
          expiresAt: result.data.expiresAt
        })
      }
    })

  } catch (error) {
    console.error('Password reset initiation error:', error)
    const { handleApiError } = await import('@/lib/api/error-handler')
    return handleApiError(error, 500)
  }
}

/**
 * 执行密码重置
 * PUT /api/auth/reset-password
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, token, newPassword } = body

    // 验证必填字段
    if (!email || !token || !newPassword) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: email, token, newPassword'
        },
        { status: 400 }
      )
    }

    // 验证邮箱格式
    if (!PasswordManager.isValidEmail(email)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email format'
        },
        { status: 400 }
      )
    }

    // 验证新密码强度
    const passwordStrength = PasswordManager.checkPasswordStrength(newPassword)
    if (!passwordStrength.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'New password is too weak',
          feedback: passwordStrength.feedback
        },
        { status: 400 }
      )
    }

    // 重置密码
    const result = await UserManager.resetPassword(email, token, newPassword)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully'
    })

  } catch (error) {
    console.error('Password reset error:', error)
    const { handleApiError } = await import('@/lib/api/error-handler')
    return handleApiError(error, 500)
  }
}

/**
 * 验证重置令牌
 * GET /api/auth/reset-password?email=test@example.com&token=abc123
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing token'
        },
        { status: 400 }
      )
    }

    // 验证令牌是否有效
    const { getSupabaseAdmin } = await import('@/lib/supabase')
    const supabase = await getSupabaseAdmin()

    // 如果提供了email，通过email查找；否则通过token查找
    let user, error
    if (email) {
      const result = await supabase
        .from('users')
        .select('id, email, password_reset_token, password_reset_expires')
        .eq('email', email)
        .single()
      user = result.data
      error = result.error
    } else {
      // 通过token查找用户
      const result = await supabase
        .from('users')
        .select('id, email, password_reset_token, password_reset_expires')
        .eq('password_reset_token', token)
        .single()
      user = result.data
      error = result.error
    }

    if (error || !user) {
      return NextResponse.json({
        success: false,
        valid: false,
        error: 'Invalid reset link'
      })
    }

    // 检查令牌和过期时间
    const isValid = user.password_reset_token === token &&
                   user.password_reset_expires &&
                   new Date(user.password_reset_expires) > new Date()

    return NextResponse.json({
      success: true,
      valid: isValid,
      email: user.email, // 返回邮箱地址给前端
      message: isValid ? 'Reset token is valid' : 'Reset token is invalid or expired'
    })

  } catch (error) {
    console.error('Reset token validation error:', error)
    const { handleApiError } = await import('@/lib/api/error-handler')
    return handleApiError(error, 500)
  }
}
