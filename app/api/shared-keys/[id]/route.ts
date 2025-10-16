import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { KeyManager } from '@/lib/key-manager'
import { UserManager } from '@/lib/user-manager'
import { PermissionHelper } from '@/lib/env-config'

// 删除共享Key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Await params to fix Next.js 15 warning
    const resolvedParams = await params

    // 检查用户信任等级权限
    const userManager = new UserManager()
    const userResult = await userManager.getUserById(session.user.id)
    if (!userResult.success || !userResult.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!userManager.canUseSharedService(userResult.user.trustLevel)) {
      return NextResponse.json({
        error: '您的信任等级不足，只有LV1-4用户可以使用共享服务'
      }, { status: 403 })
    }

    // 使用统一权限检查（考虑环境变量配置）
    if (!PermissionHelper.canShareKeysUnified(userResult.user.role, userResult.user.trustLevel)) {
      return NextResponse.json({
        error: '您没有管理密钥的权限。根据当前系统配置，只有超级管理员可以管理密钥。'
      }, { status: 403 })
    }

    const keyManager = new KeyManager()
    const result = await keyManager.deleteSharedKey(resolvedParams.id, session.user.id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to delete key' },
        { status: result.error?.includes('not found') ? 404 : 403 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting shared key:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 更新共享Key
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Await params to fix Next.js 15 warning
    const resolvedParams = await params

    // 检查用户信任等级权限
    const userManager = new UserManager()
    const userResult = await userManager.getUserById(session.user.id)
    if (!userResult.success || !userResult.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!userManager.canUseSharedService(userResult.user.trustLevel)) {
      return NextResponse.json({
        error: '您的信任等级不足，只有LV1-4用户可以使用共享服务'
      }, { status: 403 })
    }

    // 使用统一权限检查（考虑环境变量配置）
    if (!PermissionHelper.canShareKeysUnified(userResult.user.role, userResult.user.trustLevel)) {
      return NextResponse.json({
        error: '您没有管理密钥的权限。根据当前系统配置，只有超级管理员可以管理密钥。'
      }, { status: 403 })
    }

    const body = await request.json()
    const keyManager = new KeyManager()
    const result = await keyManager.updateSharedKey(resolvedParams.id, session.user.id, body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update key' },
        { status: result.error?.includes('not found') ? 404 : 403 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating shared key:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
