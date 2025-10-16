import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs' // 明确指定使用 Node.js Runtime

export async function PUT(
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

    const { trustLevel, role, isActive, isSilenced } = await request.json()
    const userId = params.id

    // 防止修改自己的权限
    if (userId === session.user.id) {
      return NextResponse.json({
        success: false,
        error: '不能修改自己的权限'
      }, { status: 400 })
    }

    // 只有超级管理员可以设置超级管理员权限
    if (role === 'super_admin' && userRole !== 'super_admin') {
      return NextResponse.json({
        success: false,
        error: '只有超级管理员可以设置超级管理员权限'
      }, { status: 403 })
    }

    // 获取数据库客户端
    const supabase = await getSupabaseAdmin()

    // 获取目标用户信息
    const { data: targetUser, error: fetchError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (fetchError || !targetUser) {
      return NextResponse.json({
        success: false,
        error: '用户不存在'
      }, { status: 404 })
    }

    // 防止普通管理员修改超级管理员
    if (targetUser.role === 'super_admin' && userRole !== 'super_admin') {
      return NextResponse.json({
        success: false,
        error: '只有超级管理员可以修改超级管理员'
      }, { status: 403 })
    }

    // 更新用户信息
    const { error: updateError } = await supabase
      .from('users')
      .update({
        trust_level: trustLevel,
        role: role,
        is_active: isActive,
        is_silenced: isSilenced,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating user:', updateError)
      return NextResponse.json({
        success: false,
        error: '更新用户信息失败'
      }, { status: 500 })
    }

    // 清除被修改用户的缓存，因为用户信息已更新
    try {
      const { invalidateAfterAdminUpdate } = await import('@/lib/cache/cache-manager')
      invalidateAfterAdminUpdate(userId, session.user.id)
    } catch (cacheError) {
      console.warn('⚠️ Failed to invalidate cache after admin update:', cacheError)
      // 缓存失效失败不影响主要功能
    }

    // 记录管理操作日志
    await supabase
      .from('security_events')
      .insert({
        user_id: session.user.id,
        event_type: 'system_maintenance',
        severity: 'medium',
        description: `管理员 ${session.user.name} 更新了用户 ${userId} 的信息`,
        metadata: {
          target_user_id: userId,
          changes: {
            trust_level: trustLevel,
            role: role,
            is_active: isActive,
            is_silenced: isSilenced
          }
        },
        ip_address: request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'unknown'
      })

    return NextResponse.json({
      success: true,
      message: '用户信息更新成功'
    })

  } catch (error) {
    console.error('Error in PUT /api/admin/users/[id]:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误'
    }, { status: 500 })
  }
}
