/**
 * Next.js Middleware - 轻量级版本
 *
 * 设计原则：
 * 1. 保持中间件轻量，避免重计算
 * 2. 不进行数据库操作
 * 3. 不调用内部 API (fetch)
 * 4. 将复杂逻辑移至 API 路由
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware#best-practices
 */

import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale } from './i18n';
import { getVersion } from './config/features';

// ============================================================================
// 安全头辅助函数
// ============================================================================

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
  ].join('; ');
  response.headers.set('Content-Security-Policy', csp);

  return response;
}

function addCorsHeaders(response: NextResponse, origin?: string): NextResponse {
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else {
    response.headers.set('Access-Control-Allow-Origin', '*');
  }
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}

// ============================================================================
// 配置
// ============================================================================

const SECURITY_CONFIG = {
  // 最大请求体大小（字节）
  maxRequestSize: 10 * 1024 * 1024, // 10MB
  // 最大 User-Agent 长度
  maxUserAgentLength: 512,
} as const;

// ============================================================================
// 国际化中间件
// ============================================================================

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
  localeDetection: true
});

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 输入清理 - 防止 XSS 和日志注入
 */
function sanitizeInput(input: string, maxLength: number): string {
  if (!input || typeof input !== 'string') return '';

  const cleaned = input
    .replace(/[<>'"&]/g, '') // 移除 HTML/JS 危险字符
    .replace(/[\x00-\x1f\x7f-\x9f]/g, '') // 移除控制字符
    .trim();

  return cleaned.length > maxLength ? cleaned.substring(0, maxLength) : cleaned;
}

/**
 * 快速请求体大小检查
 */
function checkRequestSize(req: NextRequest): NextResponse | null {
  const contentLength = req.headers.get('content-length');

  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (size > SECURITY_CONFIG.maxRequestSize) {
      console.warn('[MIDDLEWARE] Request size exceeded', {
        size,
        maxSize: SECURITY_CONFIG.maxRequestSize,
        path: req.nextUrl.pathname,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
      });

      return NextResponse.json(
        {
          error: 'REQUEST_TOO_LARGE',
          message: 'Request body too large',
          maxSize: SECURITY_CONFIG.maxRequestSize
        },
        { status: 413 }
      );
    }
  }

  return null;
}

/**
 * 记录安全事件（仅输出日志，不调用 API）
 *
 * 依赖外部日志收集系统（Vercel、AWS CloudWatch、Datadog 等）
 */
function logSecurityEvent(event: {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metadata?: Record<string, any>;
}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    source: 'middleware',
    ...event
  };

  // 使用不同的日志级别
  switch (event.severity) {
    case 'critical':
    case 'high':
      console.error('[SECURITY]', JSON.stringify(logEntry));
      break;
    case 'medium':
      console.warn('[SECURITY]', JSON.stringify(logEntry));
      break;
    default:
      console.info('[SECURITY]', JSON.stringify(logEntry));
  }
}

// ============================================================================
// 主中间件
// ============================================================================

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const method = req.method;

  // 跳过内部请求
  const isInternal = req.headers.get('X-Internal-Request') === 'true';
  if (isInternal) {
    return NextResponse.next();
  }

  // ============================================================================
  // 1. 请求体大小检查（轻量级，必要的安全措施）
  // ============================================================================

  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    const sizeCheckResponse = checkRequestSize(req);
    if (sizeCheckResponse) {
      return sizeCheckResponse;
    }
  }

  // ============================================================================
  // 2. API 路由处理
  // ============================================================================

  if (path.startsWith('/api/')) {
    // 2.1 版本特定逻辑：个人体验版（IndexedDB）拦截所有 API
    const version = getVersion();
    const personalMode = process.env.PERSONAL_DB_MODE || 'indexeddb';

    if (version === 'personal' && personalMode === 'indexeddb') {
      logSecurityEvent({
        type: 'api_blocked_personal_mode',
        severity: 'low',
        message: 'API blocked in personal IndexedDB mode',
        metadata: { path, method }
      });

      return NextResponse.json(
        {
          error: 'SERVER_DB_DISABLED',
          message: '个人体验版（IndexedDB）不提供服务端接口，请使用前端本地存储或导入/导出功能',
          version,
          mode: personalMode
        },
        { status: 405 }
      );
    }

    // 2.2 添加安全头和 CORS
    const response = NextResponse.next();
    const origin = req.headers.get('origin') || undefined;
    return addCorsHeaders(addSecurityHeaders(response), origin);
  }

  // ============================================================================
  // 3. 非 API 路由：国际化处理 + 安全头
  // ============================================================================

  const response = intlMiddleware(req);
  return addSecurityHeaders(response);
}

// ============================================================================
// 路由匹配配置
// ============================================================================

export const config = {
  matcher: [
    // 匹配所有路径，排除：
    // - _next 内部文件
    // - _vercel 内部文件
    // - 静态资源文件（带扩展名）
    '/((?!_next|_vercel|.*\\..*).*)',
    '/api/(.*)'
  ]
};
