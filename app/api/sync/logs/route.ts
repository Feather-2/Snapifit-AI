import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { syncRateLimiter } from '@/lib/sync-rate-limiter';
import { logSecurityEvent } from '@/lib/security-monitor';
import { getClientIP } from '@/lib/ip-utils';
import { securityEventEnhancer } from '@/lib/security-event-enhancer';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs' // 明确指定使用 Node.js Runtime

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const supabaseAdmin = await getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from('daily_logs')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    console.log(`[API/SYNC/GET] Successfully fetched ${data.length} logs for user: ${userId}`);

    return NextResponse.json(data);
  } catch (error) {
    console.error('[API/SYNC/GET] An unexpected error occurred:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const ip = getClientIP(request);
    const supabaseAdmin = await getSupabaseAdmin();

    // 🔒 检查同步速率限制
    const limitCheck = syncRateLimiter.checkSyncLimit(userId, ip);
    if (!limitCheck.allowed) {
      // 记录速率限制违规
      await logSecurityEvent({
        userId,
        ipAddress: ip,
        userAgent: request.headers.get('user-agent') || 'unknown',
        eventType: 'rate_limit_exceeded',
        severity: 'medium',
        description: `Sync rate limit exceeded: ${limitCheck.reason}`,
        metadata: {
          api: 'sync/logs',
          retryAfter: limitCheck.retryAfter
        }
      });

      return NextResponse.json(
        {
          error: limitCheck.reason,
          code: 'SYNC_RATE_LIMIT_EXCEEDED',
          retryAfter: limitCheck.retryAfter,
          limitType: limitCheck.limitType,
          details: {
            message: 'Sync rate limit exceeded',
            limitType: limitCheck.limitType,
            retryAfter: limitCheck.retryAfter,
            limits: {
              perSecond: 3,
              perMinute: 30,
              perHour: 300
            }
          }
        },
        {
          status: 429,
          headers: {
            'Retry-After': limitCheck.retryAfter?.toString() || '10',
            'X-RateLimit-Type': 'sync',
            'X-RateLimit-Limit-Type': limitCheck.limitType || 'unknown'
          }
        }
      );
    }

    const logsToSync = await request.json();

    // 🔗 增强最近的安全事件，关联用户ID
    // 这样可以将之前缺少用户ID的安全事件与当前用户关联
    setImmediate(async () => {
      try {
        await securityEventEnhancer.enhanceRecentEvents(userId, ip, 5);
      } catch (error) {
        console.error('Error enhancing security events:', error);
      }
    });

    if (!Array.isArray(logsToSync) || logsToSync.length === 0) {
      return NextResponse.json({ error: 'Invalid or empty data provided.' }, { status: 400 });
    }

    // 🔍 验证日志数据
    const maxLogsPerRequest = 100; // 限制每次同步的日志数量
    if (logsToSync.length > maxLogsPerRequest) {
      await logSecurityEvent({
        userId,
        ipAddress: ip,
        userAgent: request.headers.get('user-agent') || 'unknown',
        eventType: 'invalid_input',
        severity: 'medium',
        description: `Too many logs in sync request: ${logsToSync.length} (max: ${maxLogsPerRequest})`,
        metadata: {
          logCount: logsToSync.length,
          maxAllowed: maxLogsPerRequest,
          api: 'sync/logs'
        }
      });

      return NextResponse.json({
        error: 'Too many logs in single request',
        details: {
          provided: logsToSync.length,
          maximum: maxLogsPerRequest
        }
      }, { status: 400 });
    }

    // 验证每个日志条目的内容大小
    for (let i = 0; i < logsToSync.length; i++) {
      const log = logsToSync[i];
      const logSize = JSON.stringify(log).length;
      const maxLogSize = 50 * 1024; // 50KB per log entry

      if (logSize > maxLogSize) {
        await logSecurityEvent({
          userId,
          ipAddress: ip,
          userAgent: request.headers.get('user-agent') || 'unknown',
          eventType: 'invalid_input',
          severity: 'medium',
          description: `Log entry too large: ${logSize} bytes (max: ${maxLogSize} bytes)`,
          metadata: {
            logIndex: i,
            logSize,
            maxLogSize,
            api: 'sync/logs'
          }
        });

        return NextResponse.json({
          error: 'Log entry too large',
          details: {
            logIndex: i,
            size: logSize,
            maximum: maxLogSize
          }
        }, { status: 400 });
      }

      // 验证文本字段长度
      if (log.log_data) {
        const validateTextFields = (data: any, path = '') => {
          if (typeof data === 'string' && data.length > 10000) {
            throw new Error(`Text field too long at ${path}: ${data.length} characters (max: 10000)`);
          }
          if (typeof data === 'object' && data !== null) {
            for (const [key, value] of Object.entries(data)) {
              validateTextFields(value, path ? `${path}.${key}` : key);
            }
          }
        };

        try {
          validateTextFields(log.log_data);
        } catch (error) {
          await logSecurityEvent({
            userId,
            ipAddress: ip,
            userAgent: request.headers.get('user-agent') || 'unknown',
            eventType: 'invalid_input',
            severity: 'low',
            description: `Invalid text field in log data: ${error.message}`,
            metadata: {
              logIndex: i,
              error: error.message,
              api: 'sync/logs'
            }
          });

          return NextResponse.json({
            error: 'Invalid text field in log data',
            details: {
              logIndex: i,
              message: error.message
            }
          }, { status: 400 });
        }
      }
    }

    console.log(`[API/SYNC/POST] Attempting to upsert ${logsToSync.length} logs for user: ${userId}`);

    const errors = [];
    for (const log of logsToSync) {
      // 检查是补丁更新还是完整更新
      if (log.log_data_patch) {
        // 调用RPC函数处理补丁
        const { error: rpcError } = await supabaseAdmin.rpc('upsert_log_patch', {
          p_user_id: userId,
          p_date: log.date,
          p_log_data_patch: log.log_data_patch,
          p_last_modified: log.last_modified,
          p_based_on_modified: log.based_on_modified || null, // 新增参数
        });
        if (rpcError) errors.push(rpcError);
      } else {
        // 处理完整的日志对象（保持旧的逻辑作为备用）
        const { error: upsertError } = await supabaseAdmin
          .from('daily_logs')
          .upsert({ ...log, user_id: userId }, { onConflict: 'user_id, date' });
        if (upsertError) errors.push(upsertError);
      }
    }

    if (errors.length > 0) {
      console.error('[API/SYNC/POST] Supabase errors occurred during sync:', errors);
      // 将第一个错误信息抛出，也可以选择更复杂的错误处理
      throw errors[0];
    }

    console.log(`[API/SYNC/POST] Successfully processed ${logsToSync.length} logs for user: ${userId}`);

    return NextResponse.json({ message: 'Sync successful', count: logsToSync.length });
  } catch (error: any) {
    console.error('[API/SYNC/POST] An unexpected error occurred:', error);
    const errorMessage = error.message || 'An unexpected error occurred.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}