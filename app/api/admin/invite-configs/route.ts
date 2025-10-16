import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { InviteConfigManager } from '@/lib/auth/invite-config-manager'

// 获取所有邀请码配置（管理员功能）
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    console.log('🔍 Admin invite configs - Session check:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userRole: (session?.user as any)?.role,
      userTrustLevel: (session?.user as any)?.trustLevel
    })

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '用户未登录' },
        { status: 401 }
      )
    }

    // 获取配置（管理员查看所有，普通用户查看自己的）
    const result = await InviteConfigManager.getAllConfigs(session.user.id, true)

    console.log('🔍 Admin invite configs - Result:', {
      success: result.success,
      error: result.error,
      dataLength: result.success ? result.data?.length : 0
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data
    })

  } catch (error) {
    console.error('Get invite configs error:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

// 创建或更新用户邀请码配置
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    console.log('🔍 POST invite-configs - Session check:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userRole: (session?.user as any)?.role,
      userTrustLevel: (session?.user as any)?.trustLevel
    })

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '用户未登录' },
        { status: 401 }
      )
    }

    const requestBody = await request.json()
    console.log('🔍 POST invite-configs - Request body:', requestBody)

    const {
      configType,
      userId,
      userEmail,
      intervalDays,
      codesPerBatch,
      maxTotalCodes
    } = requestBody

    // 验证输入
    if (!configType) {
      console.log('❌ Missing configType:', configType)
      return NextResponse.json(
        { error: '缺少配置类型参数' },
        { status: 400 }
      )
    }

    // 验证数值参数
    if (typeof intervalDays !== 'number' || typeof codesPerBatch !== 'number' || typeof maxTotalCodes !== 'number') {
      console.log('❌ Invalid parameter types:', {
        intervalDays: typeof intervalDays,
        codesPerBatch: typeof codesPerBatch,
        maxTotalCodes: typeof maxTotalCodes
      })
      return NextResponse.json(
        { error: '参数类型错误，必须为数字' },
        { status: 400 }
      )
    }

    if (isNaN(intervalDays) || isNaN(codesPerBatch) || isNaN(maxTotalCodes)) {
      console.log('❌ NaN parameter values:', {
        intervalDays,
        codesPerBatch,
        maxTotalCodes
      })
      return NextResponse.json(
        { error: '参数值无效' },
        { status: 400 }
      )
    }

    if (intervalDays < 1 || codesPerBatch < 1 || maxTotalCodes < 1) {
      console.log('❌ Invalid parameter values:', {
        intervalDays,
        codesPerBatch,
        maxTotalCodes
      })
      return NextResponse.json(
        { error: '参数值必须大于0' },
        { status: 400 }
      )
    }

    console.log('🔍 POST invite-configs - Processing config type:', configType)

    // 根据配置类型处理
    let result
    if (configType === "default") {
      // 创建全局默认配置
      console.log('🔍 Creating default config...')
      result = await InviteConfigManager.setDefaultConfig({
        intervalDays,
        codesPerBatch,
        maxTotalCodes,
        createdBy: session.user.id
      })
    } else {
      // 创建用户特定配置
      if (!userId && !userEmail) {
        console.log('❌ User specific config missing user identifier')
        return NextResponse.json(
          { error: '用户特定配置需要提供用户ID或邮箱' },
          { status: 400 }
        )
      }

      console.log('🔍 Creating user specific config...')
      result = await InviteConfigManager.setUserConfig({
        userId,
        userEmail,
        intervalDays,
        codesPerBatch,
        maxTotalCodes,
        createdBy: session.user.id
      })
    }

    console.log('🔍 POST invite-configs - Result:', {
      success: result.success,
      error: result.error,
      hasData: !!result.data
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: '邀请码配置设置成功'
    })

  } catch (error) {
    console.error('Set invite config error:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}
