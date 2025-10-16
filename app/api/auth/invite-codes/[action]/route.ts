import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { InviteCodeManager } from '@/lib/auth/invite-codes'
import { AdminManager, Permission } from '@/lib/auth/admin-manager'

/**
 * 邀请码操作 API
 * POST /api/auth/invite-codes/validate - 验证邀请码
 * POST /api/auth/invite-codes/disable - 禁用邀请码
 * POST /api/auth/invite-codes/delete - 删除邀请码
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const { action } = await params
    const body = await request.json()

    switch (action) {
      case 'validate':
        return await validateInviteCode(body)
      
      case 'disable':
        return await disableInviteCode(request, body)
      
      case 'delete':
        return await deleteInviteCode(request, body)
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Invite code action error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * 验证邀请码
 */
async function validateInviteCode(body: any) {
  const { code } = body

  if (!code) {
    return NextResponse.json(
      { success: false, error: 'Invite code is required' },
      { status: 400 }
    )
  }

  // 验证邀请码
  const result = await InviteCodeManager.validateInviteCode(code)

  if (!result.valid) {
    return NextResponse.json(
      { success: false, error: result.error || 'Invalid invite code' },
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    valid: true,
    data: {
      description: result.description,
      remainingUses: result.remaining_uses
    },
    message: 'Invite code is valid'
  })
}

/**
 * 禁用邀请码
 */
async function disableInviteCode(request: NextRequest, body: any) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    )
  }

  const { codeId } = body

  if (!codeId) {
    return NextResponse.json(
      { success: false, error: 'Code ID is required' },
      { status: 400 }
    )
  }

  // 检查权限
  const hasPermission = await AdminManager.hasPermission(session.user.id, Permission.MANAGE_INVITE_CODES)
  
  // 禁用邀请码
  const result = await InviteCodeManager.disableInviteCode(
    codeId,
    hasPermission ? undefined : session.user.id // 如果没有管理权限，只能操作自己的
  )

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    message: 'Invite code disabled successfully'
  })
}

/**
 * 删除邀请码
 */
async function deleteInviteCode(request: NextRequest, body: any) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    )
  }

  const { codeId } = body

  if (!codeId) {
    return NextResponse.json(
      { success: false, error: 'Code ID is required' },
      { status: 400 }
    )
  }

  // 检查权限
  const hasPermission = await AdminManager.hasPermission(session.user.id, Permission.MANAGE_INVITE_CODES)
  
  // 删除邀请码
  const result = await InviteCodeManager.deleteInviteCode(
    codeId,
    hasPermission ? undefined : session.user.id // 如果没有管理权限，只能操作自己的
  )

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    message: 'Invite code deleted successfully'
  })
}
