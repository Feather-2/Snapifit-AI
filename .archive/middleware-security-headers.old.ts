// 安全头配置中间件
import { NextRequest, NextResponse } from 'next/server';
import { SECURITY_CONFIG } from './security-config';

/**
 * 添加安全头到响应
 * 根据环境配置动态调整安全策略
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // 防止点击劫持
  response.headers.set('X-Frame-Options', 'DENY');

  // 防止 MIME 类型嗅探
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // XSS 保护
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // 强制 HTTPS（仅在启用HTTPS强制时）
  if (SECURITY_CONFIG.enforceHttps) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // 推荐人策略
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 权限策略
  response.headers.set('Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  );

  // 内容安全策略 (CSP) - 根据HTTPS配置动态调整
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.gstatic.com https://*.google.com",
    "font-src 'self' https://fonts.gstatic.com https://*.gstatic.com https://*.google.com",
    "img-src 'self' data: https: blob: https://*.githubusercontent.com https://*.github.com",
    // 允许连接任何 HTTPS 源
    "connect-src 'self' https: wss: ws:",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ];

  // 仅在强制HTTPS时添加upgrade-insecure-requests指令
  if (SECURITY_CONFIG.enforceHttps) {
    cspDirectives.push("upgrade-insecure-requests");
  }

  response.headers.set('Content-Security-Policy', cspDirectives.join('; '));

  return response;
}

/**
 * 为 API 路由添加 CORS 头
 */
export function addCorsHeaders(response: NextResponse, origin?: string): NextResponse {
  // 允许的源
  const allowedOrigins = [
    'http://localhost:3000',
    'https://localhost:3000',
    process.env.NEXTAUTH_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined
  ].filter(Boolean);

  // 检查请求源是否被允许
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // 对于同源请求
    response.headers.set('Access-Control-Allow-Origin', '*');
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24小时

  return response;
}
