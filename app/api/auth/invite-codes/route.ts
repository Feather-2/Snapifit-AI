import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { InviteCodeManager } from '@/lib/auth/invite-codes'
import { AdminManager, Permission } from '@/lib/auth/admin-manager'

/**
 * 获取邀请码列表
 * GET /api/auth/invite-codes
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const onlyMine = searchParams.get('mine') === 'true'

    // 检查权限
    const canViewAll = await AdminManager.hasPermission(session.user.id, Permission.MANAGE_INVITE_CODES)
    
    if (!onlyMine && !canViewAll) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // 获取邀请码列表
    const result = await InviteCodeManager.getInviteCodes(
      onlyMine || !canViewAll ? session.user.id : undefined
    )

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data
    })

  } catch (error) {
    console.error('Get invite codes error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * 创建邀请码
 * POST /api/auth/invite-codes
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // 检查权限
    const hasPermission = await AdminManager.hasPermission(session.user.id, Permission.CREATE_INVITE_CODES)
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { description, maxUses, expiresInDays, customCode } = body

    // 验证输入
    if (maxUses && (maxUses < 1 || maxUses > 1000)) {
      return NextResponse.json(
        { success: false, error: 'Max uses must be between 1 and 1000' },
        { status: 400 }
      )
    }

    if (expiresInDays && (expiresInDays < 1 || expiresInDays > 365)) {
      return NextResponse.json(
        { success: false, error: 'Expiration must be between 1 and 365 days' },
        { status: 400 }
      )
    }

    // 创建邀请码
    const result = await InviteCodeManager.createInviteCode({
      createdBy: session.user.id,
      description,
      maxUses: maxUses || 1,
      expiresInDays,
      customCode
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Invite code created successfully'
    })

  } catch (error) {
    console.error('Create invite code error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * 批量创建邀请码
 * POST /api/auth/invite-codes/batch
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // 检查权限
    const hasPermission = await AdminManager.hasPermission(session.user.id, Permission.MANAGE_INVITE_CODES)
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { count, description, maxUses, expiresInDays, prefix } = body

    // 验证输入
    if (!count || count < 1 || count > 100) {
      return NextResponse.json(
        { success: false, error: 'Count must be between 1 and 100' },
        { status: 400 }
      )
    }

    if (maxUses && (maxUses < 1 || maxUses > 1000)) {
      return NextResponse.json(
        { success: false, error: 'Max uses must be between 1 and 1000' },
        { status: 400 }
      )
    }

    if (expiresInDays && (expiresInDays < 1 || expiresInDays > 365)) {
      return NextResponse.json(
        { success: false, error: 'Expiration must be between 1 and 365 days' },
        { status: 400 }
      )
    }

    // 批量创建邀请码
    const result = await InviteCodeManager.createBatchInviteCodes(count, {
      createdBy: session.user.id,
      description,
      maxUses: maxUses || 1,
      expiresInDays,
      prefix
    })

    return NextResponse.json({
      success: result.success,
      data: {
        created: result.created,
        failed: result.failed,
        codes: result.data,
        errors: result.errors
      },
      message: `Created ${result.created} invite codes, ${result.failed} failed`
    })

  } catch (error) {
    console.error('Batch create invite codes error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
