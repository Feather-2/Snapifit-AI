import { NextRequest, NextResponse } from 'next/server';
import { checkDebugAccess } from '@/lib/debug-guard';
import { getSupabaseAdmin } from '@/lib/supabase'
import { auth } from '@/lib/auth'

export const runtime = 'nodejs' // 明确指定使用 Node.js Runtime

export async function GET(request: NextRequest) {
  // 检查调试访问权限
  const debugCheck = checkDebugAccess();
  if (debugCheck) return debugCheck;
  try {
    const session = await auth()

    console.log('🔍 Debug - Session:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userRole: (session?.user as any)?.role,
      userTrustLevel: (session?.user as any)?.trustLevel
    })

    // 获取数据库客户端
    const supabaseAdmin = await getSupabaseAdmin()

    // 1. 测试基本的数据库连接
    const { data: testQuery, error: testError } = await supabaseAdmin
      .from('users')
      .select('count')
      .limit(1)

    if (testError) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: testError
      })
    }

    // 2. 检查管理员用户
    const { data: admins, error: adminError } = await supabaseAdmin
      .from('users')
      .select('id, username, role, trust_level')
      .in('role', ['admin', 'super_admin'])

    console.log('🔍 Debug - Admins:', { admins, adminError })

    // 3. 检查invite_configs表
    const { data: configs, error: configError } = await supabaseAdmin
      .from('invite_configs')
      .select('*')
      .eq('is_active', true)

    console.log('🔍 Debug - Configs:', { configs, configError })

    // 4. 如果有session，测试权限检查
    let permissionCheck = null
    if (session?.user?.id) {
      const { data: userCheck, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, username, role, trust_level')
        .eq('id', session.user.id)
        .single()

      permissionCheck = {
        userCheck,
        userError,
        isAdmin: userCheck?.role === 'admin' || userCheck?.role === 'super_admin'
      }
    }

    return NextResponse.json({
      success: true,
      debug: {
        session: session ? {
          userId: session.user?.id,
          userRole: (session.user as any)?.role,
          userTrustLevel: (session.user as any)?.trustLevel
        } : null,
        admins: {
          data: admins,
          error: adminError?.message,
          count: admins?.length || 0
        },
        configs: {
          data: configs,
          error: configError?.message,
          count: configs?.length || 0
        },
        permissionCheck
      }
    })

  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
  }
}
