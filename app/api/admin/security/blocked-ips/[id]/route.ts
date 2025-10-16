import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs' // 明确指定使用 Node.js Runtime

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const blockId = params.id

    // 获取数据库客户端
    const supabase = await getSupabaseAdmin()

    // 获取封禁记录信息
    const { data: blockRecord, error: fetchError } = await supabase
      .from('ip_bans')
      .select('ip_address, reason')
      .eq('id', blockId)
      .single()

    if (fetchError || !blockRecord) {
      return NextResponse.json({
        success: false,
        error: '封禁记录不存在'
      }, { status: 404 })
    }

    // 更新封禁记录为非活跃状态
    const { error: updateError } = await supabase
      .from('ip_bans')
      .update({
        is_active: false,
        unbanned_at: new Date().toISOString(),
        unban_reason: '管理员手动解封'
      })
      .eq('id', blockId)

    if (updateError) {
      console.error('Error unblocking IP:', updateError)
      return NextResponse.json({
        success: false,
        error: '解封IP失败'
      }, { status: 500 })
    }

    // 记录安全事件
    await supabase
      .from('security_events')
      .insert({
        user_id: session.user.id,
        event_type: 'system_maintenance',
        severity: 'low',
        description: `管理员 ${session.user.name} 解封了IP地址 ${blockRecord.ip_address}`,
        metadata: {
          unblocked_ip: blockRecord.ip_address,
          original_reason: blockRecord.reason
        },
        ip_address: request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'unknown'
      })

    return NextResponse.json({
      success: true,
      message: 'IP地址解封成功'
    })

  } catch (error) {
    console.error('Error in DELETE /api/admin/security/blocked-ips/[id]:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误'
    }, { status: 500 })
  }
}
