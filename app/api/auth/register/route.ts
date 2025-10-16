import { NextRequest, NextResponse } from 'next/server'
import { UserManager } from '@/lib/auth/user-manager'
import { getClientIP } from '@/lib/utils/ip'
import { PasswordManager } from '@/lib/auth/password'

/**
 * 用户注册 API
 * POST /api/auth/register
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, email, password, displayName, inviteCode } = body

    // 验证必填字段
    if (!username || !email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: username, email, password'
        },
        { status: 400 }
      )
    }

    // 验证输入格式
    if (!PasswordManager.isValidUsername(username)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid username format. Use 2-50 characters, letters, numbers, underscore, and hyphen only.'
        },
        { status: 400 }
      )
    }

    if (!PasswordManager.isValidEmail(email)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email format'
        },
        { status: 400 }
      )
    }

    // 验证密码强度
    const passwordStrength = PasswordManager.checkPasswordStrength(password)
    if (!passwordStrength.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Password is too weak',
          feedback: passwordStrength.feedback
        },
        { status: 400 }
      )
    }

    // 获取客户端IP
    const clientIP = getClientIP(request)

    // 创建用户
    const result = await UserManager.createUserWithPassword({
      username,
      email,
      password,
      displayName,
      inviteCode,
      clientIP
    })

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error
        },
        { status: 400 }
      )
    }

    // 返回成功结果（不包含敏感信息）
    return NextResponse.json({
      success: true,
      message: 'User registered successfully',
      data: {
        userId: result.data?.userId,
        needsEmailVerification: result.data?.needsEmailVerification
      }
    })

  } catch (error) {
    console.error('Registration error:', error)
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
 * 检查用户名/邮箱是否可用
 * GET /api/auth/register?check=username&value=test
 * GET /api/auth/register?check=email&value=test@example.com
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const checkType = searchParams.get('check')
    const value = searchParams.get('value')

    if (!checkType || !value) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing check type or value'
        },
        { status: 400 }
      )
    }

    if (!['username', 'email'].includes(checkType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid check type. Use username or email'
        },
        { status: 400 }
      )
    }

    // 验证格式
    if (checkType === 'username' && !PasswordManager.isValidUsername(value)) {
      return NextResponse.json({
        success: true,
        available: false,
        error: 'Invalid username format'
      })
    }

    if (checkType === 'email' && !PasswordManager.isValidEmail(value)) {
      return NextResponse.json({
        success: true,
        available: false,
        error: 'Invalid email format'
      })
    }

    // 检查是否已存在
    const { getSupabaseAdmin } = await import('@/lib/supabase')
    const supabase = await getSupabaseAdmin()

    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq(checkType, value)
      .limit(1)

    if (error) {
      throw error
    }

    const available = !data || data.length === 0

    return NextResponse.json({
      success: true,
      available,
      message: available
        ? `${checkType} is available`
        : `${checkType} is already taken`
    })

  } catch (error) {
    console.error('Availability check error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}
