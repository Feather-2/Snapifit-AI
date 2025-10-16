import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs' // 明确指定使用 Node.js Runtime

// 更新共享密钥状态
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({
        success: false,
        error: '未授权访问'
      }, { status: 401 })
    }

    // 检查管理员权限
    const userRole = (session.user as any)?.role
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.json({
        success: false,
        error: '权限不足'
      }, { status: 403 })
    }

    const { action } = await request.json()
    const keyId = params.id

    if (!action || !['pause', 'resume'].includes(action)) {
      return NextResponse.json({
        success: false,
        error: '无效的操作类型'
      }, { status: 400 })
    }

    // 获取数据库客户端
    const supabaseAdmin = await getSupabaseAdmin()

    // 更新共享密钥状态
    const { data, error } = await supabaseAdmin
      .from('shared_keys')
      .update({
        is_active: action === 'resume',
        updated_at: new Date().toISOString()
      })
      .eq('id', keyId)
      .select('name, is_active')
      .single()

    if (error) {
      console.error('Error updating shared key:', error)
      return NextResponse.json({
        success: false,
        error: '更新失败'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `共享服务 "${data.name}" 已${action === 'pause' ? '暂停' : '恢复'}`,
      data
    })

  } catch (error) {
    console.error('Error in PATCH /api/admin/shared-keys/[id]:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误'
    }, { status: 500 })
  }
}

// 删除共享密钥
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({
        success: false,
        error: '未授权访问'
      }, { status: 401 })
    }

    // 检查管理员权限
    const userRole = (session.user as any)?.role
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.json({
        success: false,
        error: '权限不足'
      }, { status: 403 })
    }

    const keyId = params.id

    // 获取数据库客户端
    const supabaseAdmin = await getSupabaseAdmin()

    // 先获取服务名称用于返回消息
    const { data: keyData } = await supabaseAdmin
      .from('shared_keys')
      .select('name')
      .eq('id', keyId)
      .single()

    // 删除共享密钥
    const { error } = await supabaseAdmin
      .from('shared_keys')
      .delete()
      .eq('id', keyId)

    if (error) {
      console.error('Error deleting shared key:', error)
      return NextResponse.json({
        success: false,
        error: '删除失败'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `共享服务 "${keyData?.name || '未知服务'}" 已删除`
    })

  } catch (error) {
    console.error('Error in DELETE /api/admin/shared-keys/[id]:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误'
    }, { status: 500 })
  }
}
