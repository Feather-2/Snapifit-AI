import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ApiTokenManager } from '@/lib/api-token-manager'
import { logSecurityEvent } from '@/lib/security-logger'
import { getClientIP } from '@/lib/ip-utils'

/**
 * POST /api/admin/cleanup-tokens - 清理过期的API令牌
 * 仅管理员可访问
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    // 检查管理员权限（这里需要根据您的用户管理系统调整）
    // 假设有一个检查管理员权限的方法
    const isAdmin = await checkAdminPermission(session.user.id)

    if (!isAdmin) {
      await logSecurityEvent({
        eventType: 'unauthorized_access',
        severity: 'high',
        userId: session.user.id,
        ipAddress: getClientIP(request) || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined,
        description: '非管理员尝试访问令牌清理功能'
      })

      return NextResponse.json(
        { error: '权限不足' },
        { status: 403 }
      )
    }

    const tokenManager = new ApiTokenManager()
    const result = await tokenManager.cleanupExpiredTokens()

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    // 记录管理操作
    await logSecurityEvent({
      eventType: 'system_maintenance',
      severity: 'low',
      userId: session.user.id,
      ipAddress: getClientIP(request) || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      description: `管理员清理了 ${result.cleaned} 个过期令牌`
    })

    return NextResponse.json({
      success: true,
      message: `成功清理了 ${result.cleaned} 个过期令牌`,
      cleanedCount: result.cleaned
    })

  } catch (error) {
    console.error('清理过期令牌失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/cleanup-tokens - 获取过期令牌统计信息
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    const isAdmin = await checkAdminPermission(session.user.id)

    if (!isAdmin) {
      return NextResponse.json(
        { error: '权限不足' },
        { status: 403 }
      )
    }

    // 这里应该实现获取过期令牌统计的逻辑
    // 由于时间关系，先返回基本信息
    return NextResponse.json({
      success: true,
      stats: {
        message: '令牌清理统计功能开发中',
        availableActions: ['POST: 执行清理']
      }
    })

  } catch (error) {
    console.error('获取令牌统计失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

/**
 * 检查用户是否有管理员权限
 * 这个函数需要根据您的具体权限系统实现
 */
async function checkAdminPermission(userId: string): Promise<boolean> {
  try {
    // 这里应该根据您的用户管理系统检查权限
    // 例如检查用户的 trust_level 或特定的管理员角色

    // 临时实现：检查用户是否在管理员列表中
    const adminUsers = process.env.ADMIN_USER_IDS?.split(',') || []
    return adminUsers.includes(userId)

    // 或者通过数据库查询用户权限
    // const userManager = new UserManager()
    // const user = await userManager.getUserById(userId)
    // return user && user.trust_level >= 4 // 假设4级以上为管理员

  } catch (error) {
    console.error('检查管理员权限失败:', error)
    return false
  }
}