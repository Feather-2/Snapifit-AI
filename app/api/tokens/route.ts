import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth' // 使用 next-auth 的 auth 方法
import { ApiTokenManager } from '@/lib/api-token-manager'
import type { CreateTokenRequest } from '@/lib/api-token-manager'

/**
 * GET /api/tokens - 获取用户的所有令牌
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    const tokenManager = new ApiTokenManager()
    const result = await tokenManager.getUserTokens(session.user.id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      tokens: result.tokens
    })
  } catch (error) {
    console.error('获取令牌列表失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/tokens - 创建新的API令牌
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, scope, permissions, usage_limit, expires_in_hours } = body as CreateTokenRequest

    // 验证请求参数
    if (!name || !scope || !permissions || !usage_limit || !expires_in_hours) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    const tokenManager = new ApiTokenManager()
    const result = await tokenManager.createToken(session.user.id, {
      name,
      scope,
      permissions,
      usage_limit,
      expires_in_hours
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      token: result.token,
      tokenInfo: result.tokenInfo
    })
  } catch (error) {
    console.error('创建令牌失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/tokens?id=<token_id> - 撤销指定令牌
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const tokenId = url.searchParams.get('id')

    if (!tokenId) {
      return NextResponse.json(
        { error: '缺少令牌ID参数' },
        { status: 400 }
      )
    }

    const tokenManager = new ApiTokenManager()
    const result = await tokenManager.revokeToken(session.user.id, tokenId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '令牌已成功撤销'
    })
  } catch (error) {
    console.error('撤销令牌失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}