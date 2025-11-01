import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { handleApiError } from '@/lib/api/error-handler'

// 获取系统状态信息
export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = await getSupabaseAdmin()

    // 检查用户总数
    const { count: userCount, error: userError } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })

    if (userError) {
      throw userError
    }

    // 检查管理员数量
    const { count: adminCount, error: adminError } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .in('role', ['admin', 'super_admin'])

    if (adminError) {
      throw adminError
    }

    return NextResponse.json({
      success: true,
      data: {
        userCount: userCount || 0,
        adminCount: adminCount || 0,
        hasUsers: (userCount || 0) > 0,
        hasAdmins: (adminCount || 0) > 0,
        isFirstUser: (userCount || 0) === 0
      }
    })

  } catch (error) {
    console.error('Get system status error:', error)
    return handleApiError(error, 500)
  }
}
