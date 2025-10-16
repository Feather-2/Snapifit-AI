import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

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

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // 获取 Supabase 管理员客户端
    const supabase = await getSupabaseAdmin()

    // 获取安全事件
    const { data: events, error } = await supabase
      .from('security_events')
      .select(`
        id,
        user_id,
        event_type,
        severity,
        description,
        ip_address,
        user_agent,
        created_at,
        metadata
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching security events:', error)
      return NextResponse.json({
        success: false,
        error: '获取安全事件失败'
      }, { status: 500 })
    }

    // 获取相关用户信息
    const userIds = [...new Set(events?.map(event => event.user_id).filter(Boolean) || [])]
    let usersMap: Record<string, any> = {}

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, username, email')
        .in('id', userIds)

      if (users) {
        usersMap = users.reduce((acc, user) => {
          acc[user.id] = user
          return acc
        }, {} as Record<string, any>)
      }
    }

    // 格式化事件数据
    const formattedEvents = events?.map(event => ({
      id: event.id,
      user_id: event.user_id,
      event_type: event.event_type,
      severity: event.severity,
      description: event.description,
      ip_address: event.ip_address,
      user_agent: event.user_agent,
      created_at: event.created_at,
      metadata: event.metadata,
      user_info: event.user_id && usersMap[event.user_id] ? {
        username: usersMap[event.user_id].username,
        email: usersMap[event.user_id].email
      } : null
    })) || []

    return NextResponse.json({
      success: true,
      events: formattedEvents
    })

  } catch (error) {
    console.error('Error in GET /api/admin/security/events:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误'
    }, { status: 500 })
  }
}
