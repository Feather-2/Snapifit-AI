import { NextRequest, NextResponse } from 'next/server'
import { ApiTokenManager } from '@/lib/auth/token-manager'
import type { TokenScope, TokenPermission } from '@/lib/auth/token-manager'

export interface ApiTokenAuthOptions {
  requiredScope?: TokenScope[]
  requiredPermissions?: TokenPermission[]
  allowSessionAuth?: boolean // 是否允许session认证作为备选
}

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string
    tokenId?: string
    scopes: TokenScope[]
    permissions: TokenPermission[]
    remainingUsage: number
  }
}

/**
 * API令牌认证中间件
 */
export async function withApiTokenAuth(
  request: NextRequest,
  options: ApiTokenAuthOptions = {}
): Promise<{
  success: boolean
  request?: AuthenticatedRequest
  response?: NextResponse
  tokenId?: string
}> {
  try {
    const startTime = Date.now()

    // 从请求头获取令牌
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : request.headers.get('x-api-token')

    if (!token) {
      return {
        success: false,
        response: NextResponse.json(
          {
            error: '缺少访问令牌',
            code: 'MISSING_TOKEN',
            message: '请在Authorization头中提供Bearer令牌或在x-api-token头中提供令牌'
          },
          { status: 401 }
        )
      }
    }

    // 验证令牌
    const tokenManager = new ApiTokenManager()
    const endpoint = new URL(request.url).pathname
    const ipAddress = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown'

    const validation = await tokenManager.validateToken(token, endpoint, ipAddress)

    if (!validation.valid || !validation.token) {
      return {
        success: false,
        response: NextResponse.json(
          {
            error: validation.error || '无效的访问令牌',
            code: 'INVALID_TOKEN'
          },
          { status: 401 }
        )
      }
    }

    // 检查作用域权限
    if (options.requiredScope && options.requiredScope.length > 0) {
      const hasRequiredScope = options.requiredScope.some(scope =>
        validation.token!.scope.includes(scope)
      )

      if (!hasRequiredScope) {
        return {
          success: false,
          response: NextResponse.json(
            {
              error: '令牌权限不足',
              code: 'INSUFFICIENT_SCOPE',
              required: options.requiredScope,
              available: validation.token.scope
            },
            { status: 403 }
          )
        }
      }
    }

    // 检查操作权限
    if (options.requiredPermissions && options.requiredPermissions.length > 0) {
      const hasRequiredPermission = options.requiredPermissions.some(permission =>
        validation.token!.permissions.includes(permission)
      )

      if (!hasRequiredPermission) {
        return {
          success: false,
          response: NextResponse.json(
            {
              error: '令牌权限不足',
              code: 'INSUFFICIENT_PERMISSION',
              required: options.requiredPermissions,
              available: validation.token.permissions
            },
            { status: 403 }
          )
        }
      }
    }

    // 记录令牌使用 (异步执行，不阻塞请求)
    const responseTime = Date.now() - startTime
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // 不等待记录完成，避免影响响应时间
    tokenManager.recordTokenUsage(
      validation.token.id,
      endpoint,
      200, // 预设成功状态码，实际状态码由调用方处理
      responseTime,
      ipAddress,
      userAgent
    ).catch(error => {
      console.error('记录令牌使用失败:', error)
    })

    // 创建认证请求对象
    const authenticatedRequest = request as AuthenticatedRequest
    authenticatedRequest.user = {
      id: validation.token.user_id,
      tokenId: validation.token.id,
      scopes: validation.token.scope,
      permissions: validation.token.permissions,
      remainingUsage: validation.remaining_usage || 0
    }

    return {
      success: true,
      request: authenticatedRequest,
      tokenId: validation.token.id
    }

  } catch (error) {
    console.error('API令牌认证错误:', error)
    return {
      success: false,
      response: NextResponse.json(
        {
          error: '认证服务错误',
          code: 'AUTH_SERVICE_ERROR'
        },
        { status: 500 }
      )
    }
  }
}

/**
 * 创建API令牌认证装饰器
 */
export function requireApiToken(options: ApiTokenAuthOptions = {}) {
  return function <T extends (...args: any[]) => Promise<NextResponse>>(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const [request] = args

      const authResult = await withApiTokenAuth(request, options)

      if (!authResult.success) {
        return authResult.response!
      }

      // 替换请求对象为认证后的请求
      args[0] = authResult.request

      return originalMethod.apply(this, args)
    }

    return descriptor
  }
}

/**
 * 简化的API令牌验证函数，用于快速验证
 */
export async function validateApiTokenQuick(token: string): Promise<{
  valid: boolean
  userId?: string
  scopes?: TokenScope[]
  permissions?: TokenPermission[]
  remainingUsage?: number
  error?: string
}> {
  try {
    const tokenManager = new ApiTokenManager()
    const validation = await tokenManager.validateToken(token)

    if (!validation.valid || !validation.token) {
      return {
        valid: false,
        error: validation.error || '无效令牌'
      }
    }

    return {
      valid: true,
      userId: validation.token.user_id,
      scopes: validation.token.scope,
      permissions: validation.token.permissions,
      remainingUsage: validation.remaining_usage
    }
  } catch (error) {
    console.error('快速令牌验证错误:', error)
    return {
      valid: false,
      error: '验证服务错误'
    }
  }
}

/**
 * 中间件工厂函数，用于创建特定权限要求的中间件
 */
export const createApiTokenMiddleware = (options: ApiTokenAuthOptions) => {
  return async (request: NextRequest) => {
    return withApiTokenAuth(request, options)
  }
}

// 预定义的常用中间件
export const requireApiScope = createApiTokenMiddleware({
  requiredScope: ['api']
})

export const requireMcpScope = createApiTokenMiddleware({
  requiredScope: ['mcp']
})

export const requireWebhookScope = createApiTokenMiddleware({
  requiredScope: ['webhook']
})

export const requireExportScope = createApiTokenMiddleware({
  requiredScope: ['export']
})

export const requireReadPermission = createApiTokenMiddleware({
  requiredPermissions: ['read']
})

export const requireWritePermission = createApiTokenMiddleware({
  requiredPermissions: ['write']
})

export const requireAdminPermission = createApiTokenMiddleware({
  requiredPermissions: ['admin']
})