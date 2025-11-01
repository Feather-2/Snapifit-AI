import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { InviteCodeManager } from '@/lib/auth/invite-code-manager'
import { handleApiError } from '@/lib/api/error-handler'

// 使用邀请码
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '用户未登录' },
        { status: 401 }
      )
    }

    const { code } = await request.json()

    if (!code) {
      return NextResponse.json(
        { error: '邀请码不能为空' },
        { status: 400 }
      )
    }

    // 使用邀请码
    const result = await InviteCodeManager.useInviteCode(code, session.user.id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message
    })

  } catch (error) {
    console.error('Use invite code error:', error)
    return handleApiError(error, 500)
  }
}

// 验证邀请码（不使用，只验证）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json(
        { error: '邀请码不能为空' },
        { status: 400 }
      )
    }

    // 验证邀请码
    const result = await InviteCodeManager.validateInviteCode(code)

    return NextResponse.json({
      valid: result.valid,
      error: result.error || null
    })

  } catch (error) {
    console.error('Validate invite code error:', error)
    return handleApiError(error, 500)
  }
}
