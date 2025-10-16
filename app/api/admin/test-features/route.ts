import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs' // 明确指定使用 Node.js Runtime

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    }

    // 检查管理员权限
    const userRole = (session.user as any)?.role
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.json({ success: false, error: '权限不足' }, { status: 403 })
    }

    // 获取数据库客户端
    const supabase = await getSupabaseAdmin()

    const features = {
      userManagement: false,
      analytics: false,
      systemSettings: false,
      security: false,
      inviteConfigs: true // 这个我们知道是可用的
    }

    const errors = []

    // 测试用户管理
    try {
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, username, role')
        .limit(1)

      if (!userError && users) {
        features.userManagement = true
      } else {
        errors.push(`User management: ${userError?.message}`)
      }
    } catch (error) {
      errors.push(`User management: ${error}`)
    }

    // 测试数据统计
    try {
      const { data: userCount, error: countError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      if (!countError) {
        features.analytics = true
      } else {
        errors.push(`Analytics: ${countError?.message}`)
      }
    } catch (error) {
      errors.push(`Analytics: ${error}`)
    }

    // 测试系统设置
    try {
      const { data: configs, error: configError } = await supabase
        .from('system_configs')
        .select('key, value')
        .limit(1)

      if (!configError) {
        features.systemSettings = true
      } else {
        errors.push(`System settings: ${configError?.message}`)
      }
    } catch (error) {
      errors.push(`System settings: ${error}`)
    }

    // 测试安全功能
    try {
      const { data: events, error: eventError } = await supabase
        .from('security_events')
        .select('id, event_type')
        .limit(1)

      const { data: bans, error: banError } = await supabase
        .from('ip_bans')
        .select('id, ip_address')
        .limit(1)

      if (!eventError && !banError) {
        features.security = true
      } else {
        errors.push(`Security: events=${eventError?.message}, bans=${banError?.message}`)
      }
    } catch (error) {
      errors.push(`Security: ${error}`)
    }

    return NextResponse.json({
      success: true,
      features,
      errors,
      user: {
        id: session.user.id,
        role: userRole,
        name: session.user.name
      }
    })

  } catch (error) {
    console.error('Error in GET /api/admin/test-features:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误'
    }, { status: 500 })
  }
}
