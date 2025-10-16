import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { InviteCodeManager } from '@/lib/auth/invite-code-manager'

// 获取用户的邀请码列表和额度信息
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '用户未登录' },
        { status: 401 }
      )
    }

    // 获取用户额度信息
    const quotaResult = await InviteCodeManager.getUserQuota(session.user.id)

    // 获取用户创建的邀请码
    const codesResult = await InviteCodeManager.getUserInviteCodes(session.user.id)

    if (!quotaResult.success) {
      return NextResponse.json({
        quota: null,
        codes: [],
        canCreate: false,
        error: quotaResult.error
      })
    }

    return NextResponse.json({
      quota: quotaResult.data,
      codes: codesResult.success ? codesResult.data : [],
      canCreate: (quotaResult.data?.remaining || 0) > 0
    })

  } catch (error) {
    console.error('Get invite codes error:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

// 创建新的邀请码批次
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '用户未登录' },
        { status: 401 }
      )
    }

    const { description, expiresInDays, count } = await request.json()

    // 计算过期时间
    let expiresAt: Date | undefined
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + expiresInDays)
    }

    // 创建邀请码批次
    const result = await InviteCodeManager.createInviteCodeBatch({
      createdBy: session.user.id,
      count,
      expiresAt,
      description
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: `成功创建 ${result.data.created_count} 个邀请码`
    })

  } catch (error) {
    console.error('Create invite code batch error:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}
