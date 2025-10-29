/**
 * API 路由辅助函数
 *
 * 提供速率限制、安全检查等通用功能
 * 用于在 API 路由中替代中间件的复杂逻辑
 *
 * 使用示例：
 * ```typescript
 * import { withRateLimit } from '@/lib/api/helpers'
 *
 * export async function POST(req: Request) {
 *   // 应用速率限制
 *   const rateLimitResult = await withRateLimit(req, {
 *     category: 'api:chat',
 *     limit: 100,
 *     window: 60
 *   })
 *
 *   if (!rateLimitResult.allowed) {
 *     return rateLimitResult.response
 *   }
 *
 *   // 继续处理请求...
 * }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit-redis';
import { logSecurityEvent, extractSecurityContext } from '@/lib/security-logger';
import { getClientIP } from '@/lib/utils/ip';

// ============================================================================
// 类型定义
// ============================================================================

export interface RateLimitConfig {
  /**
   * 速率限制类别
   */
  category: string;

  /**
   * 时间窗口内允许的最大请求数
   */
  limit: number;

  /**
   * 时间窗口大小（秒）
   */
  window: number;

  /**
   * 自定义标识符（默认使用 IP 地址）
   */
  identifier?: string;

  /**
   * 是否记录违规事件
   */
  logViolation?: boolean;
}

export interface RateLimitResult {
  /**
   * 是否允许请求
   */
  allowed: boolean;

  /**
   * 如果不允许，返回的响应对象
   */
  response?: NextResponse;

  /**
   * 速率限制详情
   */
  details: {
    limit: number;
    remaining: number;
    reset: number;
    retryAfter: number;
  };
}

// ============================================================================
// 速率限制辅助函数
// ============================================================================

/**
 * 在 API 路由中应用速率限制
 */
export async function withRateLimit(
  req: Request,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const {
    category,
    limit,
    window,
    identifier: customIdentifier,
    logViolation = true
  } = config;

  // 获取标识符（用户 ID 或 IP）
  const identifier = customIdentifier || getClientIP(req as any);

  // 检查速率限制
  const result = await rateLimit.check({
    key: category,
    identifier,
    limit,
    window
  });

  if (!result.success) {
    // 记录违规事件
    if (logViolation) {
      const context = extractSecurityContext(req);

      await logSecurityEvent({
        type: 'rate_limit_exceeded',
        severity: 'medium',
        message: `Rate limit exceeded for ${category}`,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        path: context.path,
        method: context.method,
        metadata: {
          category,
          limit,
          window,
          remaining: result.remaining
        }
      });
    }

    // 返回 429 响应
    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests',
          category,
          limit: result.limit,
          retryAfter: result.retryAfter
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.reset.toString(),
            'Retry-After': result.retryAfter.toString()
          }
        }
      ),
      details: {
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
        retryAfter: result.retryAfter
      }
    };
  }

  return {
    allowed: true,
    details: {
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      retryAfter: result.retryAfter
    }
  };
}

// ============================================================================
// 预定义的速率限制配置
// ============================================================================

export const RATE_LIMIT_PRESETS = {
  /**
   * AI API 限制（较严格）
   */
  ai: {
    category: 'api:ai',
    limit: 50,
    window: 60 // 每分钟 50 次
  },

  /**
   * 同步 API 限制（非常严格）
   */
  sync: {
    category: 'api:sync',
    limit: 20,
    window: 60 // 每分钟 20 次
  },

  /**
   * 上传 API 限制（严格）
   */
  upload: {
    category: 'api:upload',
    limit: 10,
    window: 60 // 每分钟 10 次
  },

  /**
   * 管理 API 限制（宽松）
   */
  admin: {
    category: 'api:admin',
    limit: 200,
    window: 60 // 每分钟 200 次
  },

  /**
   * 认证 API 限制（中等）
   */
  auth: {
    category: 'api:auth',
    limit: 30,
    window: 60 // 每分钟 30 次
  },

  /**
   * 一般 API 限制（宽松）
   */
  api: {
    category: 'api:general',
    limit: 100,
    window: 60 // 每分钟 100 次
  }
} as const;

/**
 * 使用预设的速率限制配置
 */
export async function withRateLimitPreset(
  req: Request,
  preset: keyof typeof RATE_LIMIT_PRESETS,
  options?: Partial<RateLimitConfig>
): Promise<RateLimitResult> {
  const config = { ...RATE_LIMIT_PRESETS[preset], ...options };
  return withRateLimit(req, config);
}

// ============================================================================
// 用户级别速率限制
// ============================================================================

/**
 * 基于用户 ID 的速率限制
 *
 * 优先使用用户 ID，如果未登录则使用 IP
 */
export async function withUserRateLimit(
  req: Request,
  userId: string | null | undefined,
  config: Omit<RateLimitConfig, 'identifier'>
): Promise<RateLimitResult> {
  const identifier = userId || getClientIP(req as any);

  return withRateLimit(req, {
    ...config,
    identifier
  });
}

// ============================================================================
// 请求验证辅助函数
// ============================================================================

/**
 * 验证请求方法
 */
export function validateMethod(
  req: Request,
  allowedMethods: string[]
): NextResponse | null {
  if (!allowedMethods.includes(req.method)) {
    return NextResponse.json(
      {
        error: 'METHOD_NOT_ALLOWED',
        message: `Method ${req.method} not allowed`,
        allowedMethods
      },
      {
        status: 405,
        headers: {
          Allow: allowedMethods.join(', ')
        }
      }
    );
  }

  return null;
}

/**
 * 验证 Content-Type
 */
export function validateContentType(
  req: Request,
  expectedType: string = 'application/json'
): NextResponse | null {
  const contentType = req.headers.get('content-type');

  if (!contentType || !contentType.includes(expectedType)) {
    return NextResponse.json(
      {
        error: 'INVALID_CONTENT_TYPE',
        message: `Expected Content-Type: ${expectedType}`,
        received: contentType || 'none'
      },
      { status: 415 }
    );
  }

  return null;
}

// ============================================================================
// 响应辅助函数
// ============================================================================

/**
 * 创建成功响应
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * 创建错误响应
 */
export function errorResponse(
  error: string,
  message: string,
  status: number = 400,
  details?: any
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error,
      message,
      ...(details && { details })
    },
    { status }
  );
}

/**
 * 添加速率限制头到响应
 */
export function addRateLimitHeaders(
  response: NextResponse,
  details: RateLimitResult['details']
): NextResponse {
  response.headers.set('X-RateLimit-Limit', details.limit.toString());
  response.headers.set('X-RateLimit-Remaining', details.remaining.toString());
  response.headers.set('X-RateLimit-Reset', details.reset.toString());

  return response;
}

// ============================================================================
// 组合辅助函数
// ============================================================================

/**
 * 完整的 API 路由保护
 *
 * 包括：方法验证、Content-Type 验证、速率限制
 */
export async function protectApiRoute(
  req: Request,
  options: {
    allowedMethods: string[];
    rateLimit: RateLimitConfig;
    requireContentType?: boolean;
  }
): Promise<{ allowed: true; rateLimitDetails: RateLimitResult['details'] } | { allowed: false; response: NextResponse }> {
  // 1. 验证方法
  const methodError = validateMethod(req, options.allowedMethods);
  if (methodError) {
    return { allowed: false, response: methodError };
  }

  // 2. 验证 Content-Type（POST/PUT/PATCH）
  if (
    options.requireContentType !== false &&
    ['POST', 'PUT', 'PATCH'].includes(req.method)
  ) {
    const contentTypeError = validateContentType(req);
    if (contentTypeError) {
      return { allowed: false, response: contentTypeError };
    }
  }

  // 3. 速率限制
  const rateLimitResult = await withRateLimit(req, options.rateLimit);
  if (!rateLimitResult.allowed) {
    return { allowed: false, response: rateLimitResult.response! };
  }

  return { allowed: true, rateLimitDetails: rateLimitResult.details };
}
