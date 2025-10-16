// 安全的聚合 API - 一次请求获取仪表板初始化数据
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { secureCache } from '@/lib/cache/secure-cache'
import { UsageManager } from '@/lib/usage-manager'

export const runtime = 'nodejs' // 明确指定使用 Node.js Runtime

interface DashboardInitResponse {
  user: {
    id: string
    email: string
    displayName: string
    trustLevel: number
    role: string
    isActive: boolean
  }
  systemMessage?: string
  usageStats?: any
  usageCheck?: any
  // 不包含敏感数据如 memories, logs, profile
}

export async function GET(request: NextRequest) {
  try {
    // 1. 验证会话 - 不能缓存
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const securityContext = {
      userId: session.user.id,
      sessionId: session.user.id, // 简化示例
      permissions: (session.user as any).role === 'admin' ? ['admin'] : ['user']
    }

    // 2. 并行获取数据，但每个都有独立的权限验证
    const [userInfo, systemMessage, usageStats, usageCheck] = await Promise.allSettled([
      // 用户基本信息 - 可以缓存
      secureCache.getUserBasicInfo(session.user.id, securityContext),

      // 系统消息 - 可以缓存
      secureCache.getSystemConfig('system_message'),

      // 使用统计 - 需要权限验证但可以短时间缓存
      getUserUsageStatsSecure(session.user.id, securityContext),

      // 使用检查 - 需要实时验证
      getUserUsageCheckSecure(session.user.id, { ...securityContext, trustLevel: session.user.trustLevel || 0 })
    ])

    // 3. 构建响应，只包含成功的数据
    const response: DashboardInitResponse = {
      user: {
        id: session.user.id,
        email: session.user.email || '',
        displayName: session.user.name || '',
        trustLevel: session.user.trustLevel || 0,
        role: (session.user as any).role || 'user',
        isActive: session.user.isActive !== false
      }
    }

    // 添加可选数据
    if (systemMessage.status === 'fulfilled' && systemMessage.value) {
      response.systemMessage = systemMessage.value
    }

    if (usageStats.status === 'fulfilled' && usageStats.value?.success) {
      response.usageStats = usageStats.value.stats
    }

    if (usageCheck.status === 'fulfilled' && usageCheck.value?.allowed !== undefined) {
      response.usageCheck = {
        allowed: usageCheck.value.allowed,
        currentUsage: usageCheck.value.currentUsage,
        dailyLimit: usageCheck.value.dailyLimit,
        remaining: usageCheck.value.remaining
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('[API/DASHBOARD/INIT] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 安全的使用统计获取
async function getUserUsageStatsSecure(userId: string, context: any) {
  // 验证用户只能访问自己的数据
  if (context.userId !== userId && !context.permissions.includes('admin')) {
    throw new Error('Unauthorized access to usage stats')
  }

  const usageManager = new UsageManager()
  return await usageManager.getUserUsageStats(userId, 7)
}

// 安全的使用检查
async function getUserUsageCheckSecure(userId: string, context: any) {
  // 验证用户只能访问自己的数据
  if (context.userId !== userId && !context.permissions.includes('admin')) {
    throw new Error('Unauthorized access to usage check')
  }

  const usageManager = new UsageManager()
  // 使用正确的方法名和参数
  return await usageManager.checkConversationLimit(userId, context.trustLevel || 0)
}

// 敏感数据需要单独的 API 端点
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { operations } = await request.json()

    // 对于敏感操作，每个都需要单独验证
    const results: Record<string, any> = {}

    for (const operation of operations) {
      try {
        switch (operation) {
          case 'memories':
            // 需要特殊权限验证
            results.memories = await getSensitiveMemories(session.user.id, session)
            break
          case 'logs':
            // 需要特殊权限验证
            results.logs = await getSensitiveLogs(session.user.id, session)
            break
          case 'profile':
            // 需要特殊权限验证
            results.profile = await getSensitiveProfile(session.user.id, session)
            break
          default:
            results[operation] = { error: 'Unknown operation' }
        }
      } catch (error) {
        results[operation] = { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }

    return NextResponse.json(results)

  } catch (error) {
    console.error('[API/DASHBOARD/INIT] POST Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 敏感数据获取函数 - 每次都验证权限
async function getSensitiveMemories(userId: string, session: any) {
  // 实时权限验证
  if (!session.user.permissions?.includes('read_memories')) {
    throw new Error('Permission denied for memories')
  }

  // 获取数据（不缓存）
  return await fetchMemoriesFromDB(userId)
}

async function getSensitiveLogs(userId: string, session: any) {
  // 实时权限验证
  if (!session.user.permissions?.includes('read_logs')) {
    throw new Error('Permission denied for logs')
  }

  return await fetchLogsFromDB(userId)
}

async function getSensitiveProfile(userId: string, session: any) {
  // 实时权限验证
  if (!session.user.permissions?.includes('read_profile')) {
    throw new Error('Permission denied for profile')
  }

  return await fetchProfileFromDB(userId)
}

// 数据库查询函数（示例）
async function fetchMemoriesFromDB(userId: string) {
  // 实际的数据库查询
  return []
}

async function fetchLogsFromDB(userId: string) {
  return []
}

async function fetchProfileFromDB(userId: string) {
  return null
}
