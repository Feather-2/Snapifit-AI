import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { InviteConfigManager } from '@/lib/auth/invite-config-manager'

// 获取用户自己的邀请码配置
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    console.log('🔍 User invite configs - Session check:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userRole: (session?.user as any)?.role,
      userTrustLevel: (session?.user as any)?.trustLevel
    })

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '用户未登录' },
        { status: 401 }
      )
    }

    // 获取用户的配置（普通用户只能看自己的）
    const result = await InviteConfigManager.getAllConfigs(session.user.id, false)

    console.log('🔍 User invite configs - Result:', {
      success: result.success,
      error: result.error,
      dataLength: result.success ? result.data?.length : 0
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data
    })

  } catch (error) {
    console.error('Error getting user invite configs:', error)
    return NextResponse.json(
      { error: '获取邀请码配置失败' },
      { status: 500 }
    )
  }
}
