import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale } from './i18n';
import { getClientIP } from './lib/ip-utils';
import { checkRequestSize } from './lib/request-size-limiter';
import { addSecurityHeaders, addCorsHeaders } from './middleware-security-headers';
import { EnvConfig } from './lib/env-config';

// 注意：数据库相关检查已移到各自的 API 路由中处理

// 安全配置
const SECURITY_CONFIG = {
  // 最大请求大小（字节）
  maxRequestSize: 10 * 1024 * 1024, // 10MB
  // 最大 User-Agent 长度
  maxUserAgentLength: 512,
  // 最大 IP 地址长度
  maxIpLength: 45, // IPv6 最大长度
  // 敏感信息过滤
  sensitiveHeaders: ['authorization', 'cookie', 'x-api-key'],
};

// 输入验证和清理函数
function sanitizeInput(input: string, maxLength: number): string {
  if (!input || typeof input !== 'string') return '';

  // 移除潜在的危险字符
  const cleaned = input
    .replace(/[<>'"&]/g, '') // 移除 HTML/JS 注入字符
    .replace(/[\x00-\x1f\x7f-\x9f]/g, '') // 移除控制字符
    .trim();

  // 限制长度
  return cleaned.length > maxLength ? cleaned.substring(0, maxLength) : cleaned;
}

// 验证 IP 地址格式
function isValidIP(ip: string): boolean {
  if (!ip || ip.length > SECURITY_CONFIG.maxIpLength) return false;

  // IPv4 正则
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  // IPv6 正则（简化版）
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip) || ip === '::1' || ip === '127.0.0.1';
}

// 安全的错误响应（不泄露系统信息）
function createSecureErrorResponse(message: string, status: number = 400) {
  return NextResponse.json(
    {
      error: 'Request blocked',
      message: sanitizeInput(message, 100),
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * 异步记录安全事件到数据库（非阻塞）
 */
async function logSecurityEventAsync(event: {
  ipAddress: string;
  userAgent?: string;
  eventType: string;
  severity: string;
  description: string;
  metadata?: Record<string, any>;
  userId?: string;
}) {
  try {
    // 输入验证和清理
    const cleanEvent = {
      ipAddress: sanitizeInput(event.ipAddress, SECURITY_CONFIG.maxIpLength),
      userAgent: event.userAgent ? sanitizeInput(event.userAgent, SECURITY_CONFIG.maxUserAgentLength) : 'unknown',
      eventType: sanitizeInput(event.eventType, 50),
      severity: sanitizeInput(event.severity, 20),
      description: sanitizeInput(event.description, 500),
      userId: event.userId ? sanitizeInput(event.userId, 100) : undefined,
    };

    // 验证 IP 地址
    if (!isValidIP(cleanEvent.ipAddress)) {
      console.warn('Invalid IP address in security event:', event.ipAddress);
      return;
    }

    // 记录到控制台
    console.log('Security Event:', {
      ip: cleanEvent.ipAddress,
      type: cleanEvent.eventType,
      severity: cleanEvent.severity,
      description: cleanEvent.description,
      timestamp: new Date().toISOString()
    });

    // 异步记录到数据库（非阻塞）
    fetch('/api/security/log-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Request': 'true',
      },
      body: JSON.stringify(cleanEvent),
    }).catch(error => {
      console.error('Failed to log security event to database:', error);
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

// 从请求中提取基本信息（不涉及数据库操作）
function extractRequestInfo(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const userAgent = req.headers.get('user-agent') || 'unknown';

  return {
    hasAuthToken: authHeader?.startsWith('Bearer ') || false,
    userAgent: sanitizeInput(userAgent, SECURITY_CONFIG.maxUserAgentLength),
    path: req.nextUrl.pathname,
    method: req.method,
  };
}

// 动态速率限制配置（支持环境变量控制）
function getRateLimitConfig() {
  const rateLimits = EnvConfig.rateLimits;
  return {
    // 同步API限制：每分钟请求数（在专用限制器中还有更细粒度的控制）
    sync: { requests: rateLimits.sync, window: 60 * 1000 },
    // AI API限制：每分钟请求数
    ai: { requests: rateLimits.ai, window: 60 * 1000 },
    // 上传路由限制：每分钟请求数
    upload: { requests: rateLimits.upload, window: 60 * 1000 },
    // 管理API限制：每分钟请求数
    admin: { requests: rateLimits.admin, window: 60 * 1000 },
    // 认证API限制：每分钟请求数（session查询频繁）
    auth: { requests: rateLimits.auth, window: 60 * 1000 },
    // 一般API限制：每分钟请求数
    api: { requests: rateLimits.api, window: 60 * 1000 },
    // 全局限制：每分钟请求数
    global: { requests: rateLimits.global, window: 60 * 1000 }
  };
}

// 内存中的速率限制存储（生产环境建议使用Redis）
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// 用户级别的速率限制存储
const userRateLimitStore = new Map<string, { count: number; resetTime: number }>();

// 清理过期的速率限制记录
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
  for (const [key, value] of userRateLimitStore.entries()) {
    if (now > value.resetTime) {
      userRateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // 每分钟清理一次



// 注意：维护模式和 IP 封禁检查已移到 API 路由中处理
// 中间件现在只处理基本的速率限制和请求验证

function getApiCategory(path: string): keyof typeof RATE_LIMIT_CONFIG {
  if (path.startsWith('/api/sync/')) return 'sync';
  if (path.startsWith('/api/ai/') || path.startsWith('/api/openai/')) return 'ai';
  if (path.startsWith('/api/admin/')) return 'admin';
  if (path.startsWith('/api/auth/')) return 'auth';
  if (path.includes('upload') || path.includes('image')) return 'upload';
  if (path.startsWith('/api/')) return 'api';
  return 'global';
}

// getClientIP 函数已移动到 lib/ip-utils.ts

async function checkRateLimit(req: NextRequest): Promise<NextResponse | null> {
  // 🔧 检查是否启用速率限制
  if (!EnvConfig.enableRateLimit) {
    return null; // 速率限制被禁用，直接通过
  }

  const ip = getClientIP(req);
  const path = req.nextUrl.pathname;

  // 验证 IP 地址
  if (!isValidIP(ip)) {
    logSecurityEventAsync({
      ipAddress: ip,
      eventType: 'invalid_ip',
      severity: 'high',
      description: 'Invalid IP address detected',
      userAgent: req.headers.get('user-agent') || 'unknown'
    });
    return createSecureErrorResponse('Invalid request', 400);
  }

  // 🔒 进行速率限制检查
  const category = getApiCategory(path);
  const rateLimitConfig = getRateLimitConfig();
  const config = rateLimitConfig[category];

  // 创建更精确的限制键：IP + 具体路径
  const limitKey = `${ip}:${path}`;
  const now = Date.now();

  // 检查IP级别限制
  const ipRecord = rateLimitStore.get(limitKey);

  if (!ipRecord || now > ipRecord.resetTime) {
    // 创建新记录或重置过期记录
    rateLimitStore.set(limitKey, {
      count: 1,
      resetTime: now + config.window
    });
  } else {
    if (ipRecord.count >= config.requests) {
      // 获取请求信息
      const requestInfo = extractRequestInfo(req);

      // 记录速率限制违规
      logSecurityEventAsync({
        ipAddress: ip,
        userAgent: requestInfo.userAgent,
        eventType: 'rate_limit_exceeded',
        severity: 'medium',
        description: `Rate limit exceeded for ${category} API: ${path}`,
        metadata: {
          path,
          category,
          limit: config.requests,
          window: config.window,
          attempts: ipRecord.count + 1,
          hasAuthToken: requestInfo.hasAuthToken
        }
      });

      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((ipRecord.resetTime - now) / 1000),
          category,
          limit: config.requests
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': config.requests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(ipRecord.resetTime / 1000).toString(),
            'X-RateLimit-Category': category,
            'Retry-After': Math.ceil((ipRecord.resetTime - now) / 1000).toString()
          }
        }
      );
    }

    // 增加计数
    ipRecord.count++;
    rateLimitStore.set(limitKey, ipRecord);
  }

  return null;
}

const intlMiddleware = createMiddleware({
  // 支持的语言列表
  locales,
  // 默认语言
  defaultLocale,
  // 始终显示语言前缀，确保语言状态稳定
  localePrefix: 'always',
  // 语言检测策略
  localeDetection: true
});

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // 🔒 第一层：请求大小检查（防止超大请求攻击）
  const sizeCheckResponse = await checkRequestSize(req);
  if (sizeCheckResponse) {
    return sizeCheckResponse;
  }

  // 🔒 第二层：IP级别的速率限制（保护认证端点）
  const securityResponse = await checkRateLimit(req);
  if (securityResponse) {
    return securityResponse;
  }

  // 🚫 API路由不需要国际化处理，但需要添加安全头
  // 注意：数据库相关的检查（IP封禁、用户封禁、维护模式）已移到各自的 API 路由中处理
  if (path.startsWith('/api/')) {
    const response = NextResponse.next();
    const origin = req.headers.get('origin') || undefined;
    return addCorsHeaders(addSecurityHeaders(response), origin);
  }

  // 🌐 对非API路由进行国际化处理并添加安全头
  const response = intlMiddleware(req);
  return addSecurityHeaders(response);
}

// 注意：公共API路径的判断已移到各自的 API 路由中处理

export const config = {
  // 匹配所有路径，除了以下路径：
  // - _next 静态文件
  // - _vercel 部署文件
  // - 静态资源文件
  matcher: ['/((?!_next|_vercel|.*\\..*).*)', '/api/(.*)']
};
