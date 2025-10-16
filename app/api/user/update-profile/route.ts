import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '用户未登录' },
        { status: 401 }
      )
    }

    const { displayName, email, currentPassword, newPassword } = await request.json()

    // 验证邮箱格式
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: '邮箱格式不正确' },
          { status: 400 }
        )
      }
    }

    // 验证新密码
    if (newPassword) {
      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: '密码至少需要8个字符' },
          { status: 400 }
        )
      }
    }

    // 获取 Supabase 管理员客户端
    const supabaseAdmin = await getSupabaseAdmin()

    // 获取当前用户信息，包括登录方式
    const { data: currentUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('password_hash, provider_type')
      .eq('id', session.user.id)
      .single()

    if (fetchError) {
      console.error('Error fetching user:', fetchError)
      return NextResponse.json(
        { error: '获取用户信息失败' },
        { status: 500 }
      )
    }

    // 判断是否是OAuth用户（非credentials且没有密码）
    const isOAuthUser = currentUser.provider_type !== 'credentials' && !currentUser.password_hash

    // 如果要修改密码，验证当前密码（OAuth用户首次设置密码除外）
    if (newPassword && currentUser.password_hash && !isOAuthUser) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: '请输入当前密码' },
          { status: 400 }
        )
      }

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, currentUser.password_hash)
      if (!isCurrentPasswordValid) {
        return NextResponse.json(
          { error: '当前密码不正确' },
          { status: 400 }
        )
      }
    }

    // 准备更新数据
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (displayName !== undefined) {
      updateData.display_name = displayName
    }

    if (email !== undefined) {
      updateData.email = email
    }

    if (newPassword) {
      const saltRounds = 12
      updateData.password_hash = await bcrypt.hash(newPassword, saltRounds)
    }

    // 更新用户信息
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', session.user.id)

    if (updateError) {
      console.error('Error updating user:', updateError)
      return NextResponse.json(
        { error: '更新用户信息失败' },
        { status: 500 }
      )
    }

    // 清除用户缓存，因为用户信息已更新
    try {
      const { invalidateAfterProfileUpdate } = await import('@/lib/cache/cache-manager')
      invalidateAfterProfileUpdate(session.user.id)
    } catch (cacheError) {
      console.warn('⚠️ Failed to invalidate cache after profile update:', cacheError)
      // 缓存失效失败不影响主要功能
    }

    return NextResponse.json({
      success: true,
      message: '账户信息更新成功'
    })

  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}
