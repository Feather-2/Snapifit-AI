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

    // 获取封禁IP列表
    const { data: blockedIPs, error } = await supabase
      .from('ip_bans')
      .select('*')
      .order('banned_at', { ascending: false })

    if (error) {
      console.error('Error fetching blocked IPs:', error)
      return NextResponse.json({
        success: false,
        error: '获取封禁IP列表失败'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      blockedIPs: blockedIPs || []
    })

  } catch (error) {
    console.error('Error in GET /api/admin/security/blocked-ips:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误'
    }, { status: 500 })
  }
}
