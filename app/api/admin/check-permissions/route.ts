import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs' // 明确指定使用 Node.js Runtime

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({
        success: false,
        error: '未登录',
        session: null
      }, { status: 401 })
    }

    // 获取数据库客户端
    const supabase = await getSupabaseAdmin()

    // 获取用户详细信息
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, username, email, role, trust_level, is_active')
      .eq('id', session.user.id)
      .single()

    return NextResponse.json({
      success: true,
      session: {
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          role: (session.user as any)?.role,
          trustLevel: (session.user as any)?.trustLevel
        }
      },
      database: {
        user: userData,
        error: userError
      },
      permissions: {
        isAdmin: (session.user as any)?.role === 'admin',
        isSuperAdmin: (session.user as any)?.role === 'super_admin',
        canAccessAdmin: ['admin', 'super_admin'].includes((session.user as any)?.role),
        canCreateTables: (session.user as any)?.role === 'super_admin'
      }
    })

  } catch (error) {
    console.error('Error in GET /api/admin/check-permissions:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
