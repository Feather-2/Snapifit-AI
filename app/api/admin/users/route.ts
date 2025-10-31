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

    // 获取用户列表
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        username,
        email,
        display_name,
        trust_level,
        role,
        is_active,
        is_silenced,
        email_verified,
        provider_type,
        created_at,
        last_login_at
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({
        success: false,
        error: '获取用户列表失败'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      users: users || []
    })

  } catch (error) {
    console.error('Error in GET /api/admin/users:', error)
    const { handleApiError } = await import('@/lib/api/error-handler')
    return handleApiError(error, 500)
  }
}
