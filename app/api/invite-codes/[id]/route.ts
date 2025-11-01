import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { InviteCodeManager } from '@/lib/auth/invite-code-manager'
import { handleApiError } from '@/lib/api/error-handler'

// 禁用邀请码
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '用户未登录' },
        { status: 401 }
      )
    }

    const codeId = params.id

    if (!codeId) {
      return NextResponse.json(
        { error: '邀请码ID不能为空' },
        { status: 400 }
      )
    }

    // 禁用邀请码
    const result = await InviteCodeManager.deactivateInviteCode(codeId, session.user.id)

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
    console.error('Deactivate invite code error:', error)
    return handleApiError(error, 500)
  }
}
