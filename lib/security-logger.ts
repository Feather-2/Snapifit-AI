/**
 * 安全日志记录服务
 *
 * 用于替代中间件中的 fetch 调用，直接记录安全事件到数据库
 * 可在 API 路由或服务器组件中使用
 */

import { createDatabaseClient } from '@/lib/database';

// ============================================================================
// 类型定义
// ============================================================================

export type SecurityEventType =
  | 'rate_limit_exceeded'
  | 'invalid_ip'
  | 'suspicious_request'
  | 'authentication_failed'
  | 'authorization_failed'
  | 'input_validation_failed'
  | 'api_blocked_personal_mode'
  | 'request_too_large'
  | 'ip_banned'
  | 'user_banned'
  | 'csrf_validation_failed'
  | 'cors_violation'
  | 'other';

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityEvent {
  type: SecurityEventType;
  severity: SecuritySeverity;
  message: string;
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
  path?: string;
  method?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// 日志记录函数
// ============================================================================

/**
 * 记录安全事件到数据库
 *
 * 注意：此函数会进行数据库操作，不应在中间件中调用
 * 应在 API 路由或服务器组件中使用
 */
export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  try {
    // 1. 输出到控制台（立即可见）
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...event
    };

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

    // 2. 异步写入数据库（不阻塞主流程）
    // 使用 setImmediate 或 Promise 确保不影响响应速度
    setImmediate(async () => {
      try {
        const db = await createDatabaseClient();

        // 检查是否支持数据库操作
        if (!db || typeof db.query !== 'function') {
          console.warn('[SecurityLogger] Database not available, skipping DB log');
          return;
        }

        await db.query(
          `INSERT INTO security_events
           (event_type, severity, message, ip_address, user_agent, user_id, path, method, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
          [
            event.type,
            event.severity,
            event.message,
            event.ipAddress || null,
            event.userAgent || null,
            event.userId || null,
            event.path || null,
            event.method || null,
            event.metadata ? JSON.stringify(event.metadata) : null
          ]
        );
      } catch (dbError) {
        // 数据库写入失败不应影响主流程
        console.error('[SecurityLogger] Failed to write to database:', dbError);
      }
    });
  } catch (error) {
    // 日志记录失败不应影响主流程
    console.error('[SecurityLogger] Failed to log security event:', error);
  }
}

/**
 * 批量记录安全事件
 *
 * 用于高频事件的批量处理，提高性能
 */
export async function logSecurityEventsBatch(events: SecurityEvent[]): Promise<void> {
  if (events.length === 0) return;

  try {
    // 1. 输出到控制台
    events.forEach(event => {
      const logEntry = {
        timestamp: new Date().toISOString(),
        ...event
      };

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
    });

    // 2. 批量写入数据库
    setImmediate(async () => {
      try {
        const db = await createDatabaseClient();

        if (!db || typeof db.query !== 'function') {
          console.warn('[SecurityLogger] Database not available, skipping batch log');
          return;
        }

        const values = events.map(event => [
          event.type,
          event.severity,
          event.message,
          event.ipAddress || null,
          event.userAgent || null,
          event.userId || null,
          event.path || null,
          event.method || null,
          event.metadata ? JSON.stringify(event.metadata) : null
        ]);

        // 使用批量插入
        const placeholders = values.map((_, i) => {
          const start = i * 9 + 1;
          return `($${start}, $${start + 1}, $${start + 2}, $${start + 3}, $${start + 4}, $${start + 5}, $${start + 6}, $${start + 7}, $${start + 8}, NOW())`;
        }).join(', ');

        await db.query(
          `INSERT INTO security_events
           (event_type, severity, message, ip_address, user_agent, user_id, path, method, metadata, created_at)
           VALUES ${placeholders}`,
          values.flat()
        );
      } catch (dbError) {
        console.error('[SecurityLogger] Failed to write batch to database:', dbError);
      }
    });
  } catch (error) {
    console.error('[SecurityLogger] Failed to log security events batch:', error);
  }
}

/**
 * 简化的日志函数 - 仅输出到控制台
 *
 * 用于中间件或其他不能执行异步操作的场景
 */
export function logSecurityEventSync(event: SecurityEvent): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    ...event
  };

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
// 辅助函数
// ============================================================================

/**
 * 从 Request 对象提取安全相关信息
 */
export function extractSecurityContext(req: Request): {
  ipAddress: string;
  userAgent: string;
  path: string;
  method: string;
} {
  const headers = req.headers;

  // 提取 IP 地址
  const ipAddress =
    headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') || // Cloudflare
    'unknown';

  // 提取 User-Agent
  const userAgent = headers.get('user-agent') || 'unknown';

  // 提取路径和方法
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  return {
    ipAddress,
    userAgent,
    path,
    method
  };
}

/**
 * 创建安全事件构建器（链式调用）
 */
export class SecurityEventBuilder {
  private event: Partial<SecurityEvent> = {};

  type(type: SecurityEventType): this {
    this.event.type = type;
    return this;
  }

  severity(severity: SecuritySeverity): this {
    this.event.severity = severity;
    return this;
  }

  message(message: string): this {
    this.event.message = message;
    return this;
  }

  ip(ipAddress: string): this {
    this.event.ipAddress = ipAddress;
    return this;
  }

  userAgent(userAgent: string): this {
    this.event.userAgent = userAgent;
    return this;
  }

  user(userId: string): this {
    this.event.userId = userId;
    return this;
  }

  request(path: string, method: string): this {
    this.event.path = path;
    this.event.method = method;
    return this;
  }

  metadata(metadata: Record<string, any>): this {
    this.event.metadata = metadata;
    return this;
  }

  fromRequest(req: Request): this {
    const context = extractSecurityContext(req);
    this.event.ipAddress = context.ipAddress;
    this.event.userAgent = context.userAgent;
    this.event.path = context.path;
    this.event.method = context.method;
    return this;
  }

  async log(): Promise<void> {
    if (!this.event.type || !this.event.severity || !this.event.message) {
      throw new Error('SecurityEvent must have type, severity, and message');
    }

    await logSecurityEvent(this.event as SecurityEvent);
  }

  logSync(): void {
    if (!this.event.type || !this.event.severity || !this.event.message) {
      throw new Error('SecurityEvent must have type, severity, and message');
    }

    logSecurityEventSync(this.event as SecurityEvent);
  }
}

/**
 * 创建安全事件构建器
 */
export function createSecurityEvent(): SecurityEventBuilder {
  return new SecurityEventBuilder();
}
