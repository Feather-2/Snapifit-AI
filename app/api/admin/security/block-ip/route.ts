import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs' // 明确指定使用 Node.js Runtime

export async function POST(request: NextRequest) {
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

    const { ipAddress, reason } = await request.json()

    if (!ipAddress || !reason) {
      return NextResponse.json({
        success: false,
        error: 'IP地址和封禁原因都是必填项'
      }, { status: 400 })
    }

    // 验证IP地址格式
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    if (!ipRegex.test(ipAddress)) {
      return NextResponse.json({
        success: false,
        error: 'IP地址格式不正确'
      }, { status: 400 })
    }

    // 获取数据库客户端
    const supabase = await getSupabaseAdmin()

    // 检查IP是否已被封禁
    const { data: existingBlock } = await supabase
      .from('ip_bans')
      .select('id')
      .eq('ip_address', ipAddress)
      .eq('is_active', true)
      .single()

    if (existingBlock) {
      return NextResponse.json({
        success: false,
        error: '该IP地址已被封禁'
      }, { status: 400 })
    }

    // 添加到封禁列表
    const { error: insertError } = await supabase
      .from('ip_bans')
      .insert({
        ip_address: ipAddress,
        reason: reason,
        severity: 'medium',
        ban_type: 'manual',
        created_by: session.user.id,
        banned_at: new Date().toISOString(),
        is_active: true
      })

    if (insertError) {
      console.error('Error blocking IP:', insertError)
      return NextResponse.json({
        success: false,
        error: '封禁IP失败'
      }, { status: 500 })
    }

    // 记录安全事件
    await supabase
      .from('security_events')
      .insert({
        user_id: session.user.id,
        event_type: 'system_maintenance',
        severity: 'medium',
        description: `管理员 ${session.user.name} 封禁了IP地址 ${ipAddress}，原因：${reason}`,
        metadata: {
          blocked_ip: ipAddress,
          reason: reason
        },
        ip_address: request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'unknown'
      })

    return NextResponse.json({
      success: true,
      message: 'IP地址封禁成功'
    })

  } catch (error) {
    console.error('Error in POST /api/admin/security/block-ip:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误'
    }, { status: 500 })
  }
}
