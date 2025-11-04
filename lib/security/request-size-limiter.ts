/**
 * 请求大小限制器
 * 防止超大请求体攻击
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClientIP } from '@/lib/utils/ip';
import { logInfo, logWarn } from '@/lib/logging'

/**
 * 异步记录安全事件到数据库（非阻塞）
 * 通过内部 API 调用来避免在中间件中直接使用数据库
 */
async function logSecurityEventAsync(event: {
  ipAddress: string;
  userAgent: string;
  eventType: string;
  severity: string;
  description: string;
  metadata?: Record<string, any>;
}) {
  try {
    // 非阻塞的内部 API 调用（使用绝对 URL 避免中间件循环）
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
    fetch(`${baseUrl}/api/security/log-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Request': 'true', // 标记为内部请求
      },
      body: JSON.stringify(event),
    }).catch(error => {
      // 静默处理错误，不影响主要流程
      logWarn('security_event_log_db_failed', { error: error instanceof Error ? error.message : String(error) } as any)
    });
  } catch (error) {
    // 静默处理错误
    logWarn('security_event_log_initiate_failed', { error: error instanceof Error ? error.message : String(error) } as any)
  }
}

// 不同API的大小限制配置（字节）
const toNum = (v: string | undefined, def: number) => {
  const n = v ? parseInt(v, 10) : NaN
  return Number.isFinite(n) && n >= 0 ? n : def
}

const SIZE_LIMITS = {
  // 默认限制：1MB
  default: toNum(process.env.REQUEST_SIZE_LIMIT_DEFAULT, 1 * 1024 * 1024),

  // 设置相关API：较小限制
  settings: toNum(process.env.REQUEST_SIZE_LIMIT_SETTINGS, 100 * 1024),

  // 共享密钥API：中等限制
  'shared-keys': toNum(process.env.REQUEST_SIZE_LIMIT_SHARED_KEYS, 50 * 1024),

  // 聊天API：较大限制（支持图片）
  chat: toNum(process.env.REQUEST_SIZE_LIMIT_CHAT, 10 * 1024 * 1024),

  // 上传API：最大限制
  upload: toNum(process.env.REQUEST_SIZE_LIMIT_UPLOAD, 50 * 1024 * 1024),

  // 管理API：小限制
  admin: toNum(process.env.REQUEST_SIZE_LIMIT_ADMIN, 200 * 1024),

  // 同步API：小限制
  sync: toNum(process.env.REQUEST_SIZE_LIMIT_SYNC, 500 * 1024),

  // AI API：大限制
  ai: toNum(process.env.REQUEST_SIZE_LIMIT_AI, 5 * 1024 * 1024),
} as const;

/**
 * 获取API路径对应的大小限制
 */
function getSizeLimit(pathname: string): number {
  if (pathname.includes('/settings')) return SIZE_LIMITS.settings;
  if (pathname.includes('/shared-keys')) return SIZE_LIMITS['shared-keys'];
  if (pathname.includes('/chat') || pathname.includes('/openai')) return SIZE_LIMITS.chat;
  if (pathname.includes('/upload')) return SIZE_LIMITS.upload;
  if (pathname.includes('/admin')) return SIZE_LIMITS.admin;
  if (pathname.includes('/sync')) return SIZE_LIMITS.sync;
  if (pathname.includes('/ai/')) return SIZE_LIMITS.ai;

  return SIZE_LIMITS.default;
}

/**
 * 检查请求体大小
 */
export async function checkRequestSize(req: NextRequest): Promise<NextResponse | null> {
  try {
    const pathname = req.nextUrl.pathname;
    const method = req.method;

    // 只检查有请求体的方法
    if (!['POST', 'PUT', 'PATCH'].includes(method)) {
      return null;
    }

    // 获取Content-Length头
    const contentLength = req.headers.get('content-length');
    if (!contentLength) {
      // 如果没有Content-Length头，尝试读取请求体来检查大小
      return await checkRequestBodySize(req, pathname);
    }

    const size = parseInt(contentLength, 10);
    const limit = getSizeLimit(pathname);

    if (size > limit) {
      const ip = getClientIP(req);

      const userAgent = req.headers.get('user-agent') || 'unknown';

      // 记录安全事件到控制台
      logWarn('Security Event - Request Too Large', {
        ip,
        userAgent,
        eventType: 'invalid_input',
        severity: 'medium',
        description: `Request body too large: ${size} bytes (limit: ${limit} bytes)`,
        requestSize: size,
        sizeLimit: limit,
        path: pathname,
        method,
        sizeLimitType: getSizeLimitType(pathname),
        timestamp: new Date().toISOString()
      });

      // 异步记录到数据库（非阻塞）
      logSecurityEventAsync({
        ipAddress: ip,
        userAgent,
        eventType: 'invalid_input',
        severity: 'medium',
        description: `Request body too large: ${size} bytes (limit: ${limit} bytes)`,
        metadata: {
          requestSize: size,
          sizeLimit: limit,
          path: pathname,
          method,
          sizeLimitType: getSizeLimitType(pathname)
        }
      });

      return NextResponse.json({
        error: 'Request body too large',
        code: 'REQUEST_TOO_LARGE',
        details: {
          size,
          limit,
          limitType: getSizeLimitType(pathname)
        }
      }, {
        status: 413,
        headers: {
          'X-Size-Limit': limit.toString(),
          'X-Size-Limit-Type': getSizeLimitType(pathname)
        }
      });
    }

    return null;
  } catch (error) {
    logWarn('request_size_check_error', { error: error instanceof Error ? error.message : String(error) } as any)
    return null; // 出错时不阻止请求
  }
}

/**
 * 检查请求体实际大小（当没有Content-Length时）
 */
async function checkRequestBodySize(req: NextRequest, pathname: string): Promise<NextResponse | null> {
  try {
    const limit = getSizeLimit(pathname);
    const chunks: Uint8Array[] = [];
    let totalSize = 0;

    // 创建一个可读流来检查大小
    const reader = req.body?.getReader();
    if (!reader) return null;

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      if (value) {
        totalSize += value.length;

        // 如果超过限制，立即停止
        if (totalSize > limit) {
          const ip = getClientIP(req);

          const userAgent = req.headers.get('user-agent') || 'unknown';

          // 记录安全事件到控制台
          logWarn('Security Event - Streaming Request Too Large', {
            ip,
            userAgent,
            eventType: 'invalid_input',
            severity: 'medium',
            description: `Streaming request body too large: ${totalSize}+ bytes (limit: ${limit} bytes)`,
            requestSize: totalSize,
            sizeLimit: limit,
            path: pathname,
            method: req.method,
            sizeLimitType: getSizeLimitType(pathname),
            streamingCheck: true,
            timestamp: new Date().toISOString()
          });

          // 异步记录到数据库（非阻塞）
          logSecurityEventAsync({
            ipAddress: ip,
            userAgent,
            eventType: 'invalid_input',
            severity: 'medium',
            description: `Streaming request body too large: ${totalSize}+ bytes (limit: ${limit} bytes)`,
            metadata: {
              requestSize: totalSize,
              sizeLimit: limit,
              path: pathname,
              method: req.method,
              sizeLimitType: getSizeLimitType(pathname),
              streamingCheck: true
            }
          });

          return NextResponse.json({
            error: 'Request body too large',
            code: 'REQUEST_TOO_LARGE',
            details: {
              size: totalSize,
              limit,
              limitType: getSizeLimitType(pathname)
            }
          }, {
            status: 413,
            headers: {
              'X-Size-Limit': limit.toString(),
              'X-Size-Limit-Type': getSizeLimitType(pathname)
            }
          });
        }

        chunks.push(value);
      }
    }

    return null;
  } catch (error) {
    logWarn('request_size_stream_check_error', { error: error instanceof Error ? error.message : String(error) } as any)
    return null;
  }
}

/**
 * 获取大小限制类型名称
 */
function getSizeLimitType(pathname: string): string {
  if (pathname.includes('/settings')) return 'settings';
  if (pathname.includes('/shared-keys')) return 'shared-keys';
  if (pathname.includes('/chat') || pathname.includes('/openai')) return 'chat';
  if (pathname.includes('/upload')) return 'upload';
  if (pathname.includes('/admin')) return 'admin';
  if (pathname.includes('/sync')) return 'sync';
  if (pathname.includes('/ai/')) return 'ai';

  return 'default';
}

/**
 * 格式化字节大小为可读格式
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 获取所有大小限制配置（用于调试）
 */
export function getSizeLimits(): Record<string, string> {
  const limits: Record<string, string> = {};

  for (const [key, value] of Object.entries(SIZE_LIMITS)) {
    limits[key] = formatBytes(value);
  }

  return limits;
}
