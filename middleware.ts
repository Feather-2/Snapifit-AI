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
import { logInfo, logWarn, logError } from '@/lib/logging'
import { EnvConfig } from '@/lib/config/environment'

// ============================================================================
// 安全头辅助函数
// ============================================================================

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  // 现代浏览器已忽略 X-XSS-Protection，保留对旧环境的兼容
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 环境可配置的 CSP 允许列表（以逗号分隔）
  const envList = (v?: string) => (v || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const connectAllow = [
    "'self'",
    'https://*.supabase.co',
    'https://api.openai.com',
    'https://api.github.com',
    ...envList(process.env.CSP_CONNECT_SRC),
  ];

  // img-src：若未配置，保留 https: 以减少破坏面；配置后使用白名单
  const hasImgEnv = !!envList(process.env.CSP_IMG_SRC).length;
  const imgAllow = hasImgEnv
    ? ["'self'", 'data:', ...envList(process.env.CSP_IMG_SRC)]
    : ["'self'", 'data:', 'https:'];

  // 生成 style 的 CSP nonce（为后续移除 unsafe-inline 做准备）
  let styleNonce = ''
  try {
    const bytes = new Uint8Array(16)
    // @ts-ignore - Edge runtime 提供 getRandomValues
    globalThis.crypto.getRandomValues(bytes)
    // @ts-ignore - Edge runtime 提供 btoa
    styleNonce = btoa(String.fromCharCode(...Array.from(bytes)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  } catch {
    styleNonce = (globalThis.crypto && 'randomUUID' in globalThis.crypto)
      ? (globalThis.crypto as any).randomUUID().replace(/-/g, '')
      : Math.random().toString(36).slice(2)
  }

  // 更严格的 CSP（逐步移除 style inline）
  const csp = [
    "default-src 'self'",
    // 开发环境需要 unsafe-eval (Webpack) 和 unsafe-inline (Next.js HMR/Scripts)
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    // 开发环境优先使用 unsafe-inline，移除 nonce 以避免 unsafe-inline 被忽略
    `style-src 'self' 'unsafe-inline'`,
    `img-src ${imgAllow.join(' ')}`,
    "font-src 'self' data:",
    `connect-src ${connectAllow.join(' ')}`,
    "frame-ancestors 'none'",
  ].join('; ');
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Style-Nonce', styleNonce);

  // 收敛权限策略，关闭不需要的硬件能力
  response.headers.set(
    'Permissions-Policy',
    [
      'geolocation=()',
      'microphone=()',
      'camera=()',
      'accelerometer=()',
      'autoplay=(self)',
      'fullscreen=(self)'
    ].join(', ')
  );

  return response;
}

function addCorsHeaders(response: NextResponse, origin?: string, allowedOrigins?: string[]): NextResponse {
  const allowed = (allowedOrigins || [
    process.env.NEXT_PUBLIC_APP_URL || '',
    'http://localhost:3000',
    'https://localhost:3000',
  ]).filter(Boolean);

  const nodeEnv = process.env.NODE_ENV || 'development';

  if (origin && allowed.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else if (nodeEnv === 'development') {
    // 开发环境允许通配符以减少阻断
    response.headers.set('Access-Control-Allow-Origin', origin || '*');
  }

  response.headers.set('Vary', 'Origin');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
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
      logWarn('middleware_request_size_exceeded', {
        size,
        maxSize: SECURITY_CONFIG.maxRequestSize,
        path: req.nextUrl.pathname,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
      } as any)

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
      logError('SECURITY', logEntry as any)
      break;
    case 'medium':
      logWarn('SECURITY', logEntry as any)
      break;
    default:
      logInfo('SECURITY', logEntry as any)
  }
}

// ============================================================================
// 主中间件
// ============================================================================

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const method = req.method;
  const requestId = req.headers.get('x-request-id') || (globalThis.crypto && 'randomUUID' in globalThis.crypto ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

  // 跳过内部请求
  const isInternal = req.headers.get('X-Internal-Request') === 'true';
  if (isInternal) {
    return NextResponse.next();
  }

  // ============================================================================
  // 0. 生产环境环境变量校验（一次性缓存结果，避免每请求重复计算）
  // ============================================================================
  // 模块级缓存（Edge runtime 冷启动后复用同一实例）
  // @ts-ignore
  const g: any = globalThis as any
  if (!g.__envValidation) {
    const nodeEnv = process.env.NODE_ENV || 'development'
    const validation = EnvConfig.validateConfig()
    g.__envValidation = { nodeEnv, ...validation }
    if (nodeEnv === 'production' && !validation.isValid) {
      logError('env_config_invalid', { errors: validation.errors as any })
    }
  }

  const envValidation = (globalThis as any).__envValidation as { nodeEnv: string; isValid: boolean; errors: string[] } | undefined
  if (envValidation && envValidation.nodeEnv === 'production' && !envValidation.isValid) {
    // 对 API 路由直接返回 500，页面路由返回简单错误提示
    const origin = req.headers.get('origin') || undefined;
    const allowedOrigins = (process.env.ALLOWED_CORS_ORIGINS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    if (path.startsWith('/api/')) {
      const resp = NextResponse.json({
        error: 'ENV_CONFIG_INVALID',
        message: '环境变量配置不完整或不安全，请检查部署环境',
        errors: envValidation.errors,
      }, { status: 500 })
      resp.headers.set('X-Request-ID', requestId)
      resp.headers.set('X-Config-Invalid', 'true')
      return addCorsHeaders(addSecurityHeaders(resp), origin, allowedOrigins)
    }

    const html = `<!doctype html><html lang="zh"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>配置错误</title></head><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;padding:24px;line-height:1.6"><h1>环境配置错误</h1><p>生产环境下检测到必需的环境变量未正确配置。请联系管理员或检查部署环境。</p><details><summary>查看错误详情</summary><pre style="white-space:pre-wrap">${envValidation.errors.map(e=>`- ${e}`).join('\n')}</pre></details></body></html>`
    const resp = new NextResponse(html, { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
    resp.headers.set('X-Request-ID', requestId)
    resp.headers.set('X-Config-Invalid', 'true')
    return addSecurityHeaders(resp)
  }

  // ============================================================================
  // 1. 请求体大小检查（轻量级，必要的安全措施）
  // ============================================================================

  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    const sizeCheckResponse = checkRequestSize(req);
    if (sizeCheckResponse) {
      // 早返回也需要统一注入安全头、CORS 与请求 ID
      const origin = req.headers.get('origin') || undefined;
      const allowedOrigins = (process.env.ALLOWED_CORS_ORIGINS || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      sizeCheckResponse.headers.set('X-Request-ID', requestId);
      return addCorsHeaders(addSecurityHeaders(sizeCheckResponse), origin, allowedOrigins);
    }
  }

  // ============================================================================
  // 2. API 路由处理
  // ============================================================================

  if (path.startsWith('/api/')) {
    // 预检请求直接放行（附带 CORS 头）
    if (method === 'OPTIONS') {
      const preflight = new NextResponse(null, { status: 204 });
      preflight.headers.set('X-Request-ID', requestId);
      const origin = req.headers.get('origin') || undefined;
      const allowedOrigins = (process.env.ALLOWED_CORS_ORIGINS || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      return addCorsHeaders(addSecurityHeaders(preflight), origin, allowedOrigins);
    }
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

      const blocked = NextResponse.json(
        {
          error: 'SERVER_DB_DISABLED',
          message: '个人体验版（IndexedDB）不提供服务端接口，请使用前端本地存储或导入/导出功能',
          version,
          mode: personalMode
        },
        { status: 405 }
      );
      const origin = req.headers.get('origin') || undefined;
      const allowedOrigins = (process.env.ALLOWED_CORS_ORIGINS || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      blocked.headers.set('X-Request-ID', requestId);
      return addCorsHeaders(addSecurityHeaders(blocked), origin, allowedOrigins);
    }

    // 2.2 添加安全头和 CORS
    const response = NextResponse.next();
    response.headers.set('X-Request-ID', requestId);
    const origin = req.headers.get('origin') || undefined;
    const allowedOrigins = (process.env.ALLOWED_CORS_ORIGINS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    return addCorsHeaders(addSecurityHeaders(response), origin, allowedOrigins);
  }

  // ============================================================================
  // 3. 非 API 路由：国际化处理 + 安全头
  // ============================================================================

  const response = intlMiddleware(req);
  response.headers.set('X-Request-ID', requestId);
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
