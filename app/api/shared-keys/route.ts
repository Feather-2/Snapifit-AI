import { NextRequest, NextResponse } from 'next/server'
import { KeyManager } from '@/lib/auth/key-manager'
import { UserManager } from '@/lib/user/manager'
import { auth } from '@/lib/auth' // 引入 next-auth 的 auth 方法
import { validateBaseURL } from '@/lib/url-validator'
import { logSecurityEvent } from '@/lib/security-logger'
import { getClientIP } from '@/lib/utils/ip'
import { secureCache } from '@/lib/cache/secure-cache'
import { PermissionHelper } from '@/lib/config/environment'

export const runtime = 'nodejs' // 明确指定使用 Node.js Runtime

// 获取用户的共享Key列表
export async function GET(request: NextRequest) {
  try {
    const session = await auth() // 使用 next-auth 获取会话
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const keyManager = new KeyManager()
    const { keys, error } = await keyManager.getUserKeys(session.user.id)

    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    // 不返回完整的API Key，只返回部分信息用于显示
    const safeKeys = keys.map(key => ({
      ...key,
      apiKey: key.apiKey.substring(0, 8) + '...' // 只显示前8位
    }))

    return NextResponse.json({ keys: safeKeys })
  } catch (error) {
    console.error('Get shared keys error:', error)
    const { handleApiError } = await import('@/lib/api/error-handler')
    return handleApiError(error, 500)
  }
}

// 添加新的共享Key
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id

    // 检查用户信任等级权限（使用缓存）
    console.log('🔧 [API/SHARED-KEYS] POST - Getting user info for:', userId)

    const securityContext = {
      userId: userId,
      sessionId: userId,
      permissions: ['user']
    }

    const userInfo = await secureCache.getUserBasicInfo(userId, securityContext)

    if (!userInfo) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userManager = new UserManager()
    if (!userManager.canUseSharedService(userInfo.trust_level)) {
      return NextResponse.json({
        error: '您的信任等级不足，只有LV1-4用户可以使用共享服务'
      }, { status: 403 })
    }

    // 使用统一权限检查（考虑环境变量配置）
    if (!PermissionHelper.canShareKeysUnified(userInfo.role, userInfo.trust_level)) {
      return NextResponse.json({
        error: '您没有分享密钥的权限。根据当前系统配置，只有超级管理员可以分享密钥。'
      }, { status: 403 })
    }

    const body = await request.json()
    const { name, baseUrl, apiKey, availableModels, dailyLimit, description, tags } = body

    // 验证必填字段
    if (!name || !baseUrl || !apiKey || !availableModels || !Array.isArray(availableModels) || availableModels.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: name, baseUrl, apiKey, and availableModels (non-empty array)' },
        { status: 400 }
      )
    }

    // 🚫 验证URL格式和黑名单
    const urlValidation = validateBaseURL(baseUrl)
    if (!urlValidation.isValid) {
      // 记录安全事件
      if (urlValidation.isBlocked) {
        await logSecurityEvent({
          userId,
          ipAddress: getClientIP(request),
          userAgent: request.headers.get('user-agent') || 'unknown',
          eventType: 'invalid_input',
          severity: 'medium',
          description: `Attempted to use blocked official API URL: ${baseUrl}`,
          metadata: {
            blockedUrl: baseUrl,
            blockedDomain: urlValidation.blockedDomain,
            reason: urlValidation.reason,
            api: 'shared-keys'
          }
        })
      }

      return NextResponse.json({
        error: urlValidation.reason,
        code: urlValidation.isBlocked ? 'URL_BLOCKED' : 'URL_INVALID',
        details: {
          blockedDomain: urlValidation.blockedDomain
        }
      }, { status: 400 })
    }

    // 验证每日限制
    if (dailyLimit && dailyLimit !== 999999 && (dailyLimit < 150 || dailyLimit > 99999)) {
      return NextResponse.json(
        { error: 'Daily limit must be between 150 and 99999, or 999999 for unlimited' },
        { status: 400 }
      )
    }

    const keyManager = new KeyManager()

    // 检查是否已经存在相同的配置
    const existingKey = await keyManager.checkDuplicateKey(userId, baseUrl, apiKey)
    if (existingKey.exists) {
      return NextResponse.json(
        { error: '您已经分享过相同的API配置，请勿重复上传' },
        { status: 400 }
      )
    }

    // 先测试Key是否有效（使用第一个模型进行测试）
    const testResult = await keyManager.testApiKey(baseUrl, apiKey, availableModels[0])
    if (!testResult.success) {
      return NextResponse.json(
        { error: `API Key测试失败: ${testResult.error}` },
        { status: 400 }
      )
    }

    // 添加Key
    const result = await keyManager.addSharedKey({
      userId: userId,
      name,
      baseUrl,
      apiKey,
      availableModels,
      dailyLimit: dailyLimit || 150,
      description: description || '',
      tags: tags || [],
      isActive: true,
      usageCountToday: 0,
      totalUsageCount: 0
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      id: result.id,
      message: 'API Key添加成功，感谢您的分享！'
    })
  } catch (error) {
    console.error('Add shared key error:', error)
    const { handleApiError } = await import('@/lib/api/error-handler')
    return handleApiError(error, 500)
  }
}

// 更新共享Key
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id

    // 检查用户信任等级权限（使用缓存）
    console.log('🔧 [API/SHARED-KEYS] PUT - Getting user info for:', userId)

    const securityContext = {
      userId: userId,
      sessionId: userId,
      permissions: ['user']
    }

    const userInfo = await secureCache.getUserBasicInfo(userId, securityContext)

    if (!userInfo) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userManager = new UserManager()
    if (!userManager.canUseSharedService(userInfo.trust_level)) {
      return NextResponse.json({
        error: '您的信任等级不足，只有LV1-4用户可以使用共享服务'
      }, { status: 403 })
    }

    // 使用统一权限检查（考虑环境变量配置）
    if (!PermissionHelper.canShareKeysUnified(userInfo.role, userInfo.trust_level)) {
      return NextResponse.json({
        error: '您没有管理密钥的权限。根据当前系统配置，只有超级管理员可以管理密钥。'
      }, { status: 403 })
    }

    const body = await request.json()
    const { id, isActive, dailyLimit } = body

    if (!id) {
      return NextResponse.json({ error: 'Key ID is required' }, { status: 400 })
    }

    const keyManager = new KeyManager()
    const isOwner = await keyManager.verifyKeyOwner(id, userId)

    if (!isOwner) {
      return NextResponse.json({ error: 'Unauthorized to update this key' }, { status: 403 })
    }

    const result = await keyManager.updateSharedKey(id, userId, {
      is_active: isActive,
      daily_limit: dailyLimit
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Key updated successfully' })
  } catch (error) {
    console.error('Update shared key error:', error)
    const { handleApiError } = await import('@/lib/api/error-handler')
    return handleApiError(error, 500)
  }
}

// 删除共享Key
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id

    // 检查用户信任等级权限（使用缓存）
    console.log('🔧 [API/SHARED-KEYS] DELETE - Getting user info for:', userId)

    const securityContext = {
      userId: userId,
      sessionId: userId,
      permissions: ['user']
    }

    const userInfo = await secureCache.getUserBasicInfo(userId, securityContext)

    if (!userInfo) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userManager = new UserManager()
    if (!userManager.canUseSharedService(userInfo.trust_level)) {
      return NextResponse.json({
        error: '您的信任等级不足，只有LV1-4用户可以使用共享服务'
      }, { status: 403 })
    }

    // 使用统一权限检查（考虑环境变量配置）
    if (!PermissionHelper.canShareKeysUnified(userInfo.role, userInfo.trust_level)) {
      return NextResponse.json({
        error: '您没有管理密钥的权限。根据当前系统配置，只有超级管理员可以管理密钥。'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const keyId = searchParams.get('id')

    if (!keyId) {
      return NextResponse.json({ error: 'Key ID is required' }, { status: 400 })
    }

    const keyManager = new KeyManager()
    const isOwner = await keyManager.verifyKeyOwner(keyId, userId)

    if (!isOwner) {
      return NextResponse.json({ error: 'Unauthorized to delete this key' }, { status: 403 })
    }

    const result = await keyManager.deleteSharedKey(keyId)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Key deleted successfully' })
  } catch (error) {
    console.error('Delete shared key error:', error)
    const { handleApiError } = await import('@/lib/api/error-handler')
    return handleApiError(error, 500)
  }
}
