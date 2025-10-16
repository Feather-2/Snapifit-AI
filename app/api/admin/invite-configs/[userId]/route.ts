import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { InviteConfigManager } from '@/lib/auth/invite-config-manager'

// 删除用户的邀请码配置
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '用户未登录' },
        { status: 401 }
      )
    }

    const userId = params.userId

    if (!userId) {
      return NextResponse.json(
        { error: '用户ID不能为空' },
        { status: 400 }
      )
    }

    // 删除配置（支持删除全局默认配置或用户特定配置）
    const result = await InviteConfigManager.removeUserConfig(
      userId as string | 'default',
      session.user.id
    )

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
    console.error('Remove invite config error:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}
