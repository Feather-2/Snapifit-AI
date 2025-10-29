import { NextRequest, NextResponse } from 'next/server';
import { logSecurityEvent } from '@/lib/security-logger';
import { getClientIP } from '@/lib/utils/ip';

export const runtime = 'nodejs' // 明确指定使用 Node.js Runtime

/**
 * 内部安全事件记录端点
 * 专门用于中间件和其他组件异步记录安全事件到数据库
 */
export async function POST(request: NextRequest) {
  try {
    // 验证这是内部请求
    const internalHeader = request.headers.get('X-Internal-Request');
    if (internalHeader !== 'true') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 解析请求体
    const eventData = await request.json();

    // 验证必需字段
    if (!eventData.ipAddress || !eventData.eventType || !eventData.severity || !eventData.description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 记录安全事件到数据库
    await logSecurityEvent({
      ipAddress: eventData.ipAddress,
      userAgent: eventData.userAgent || 'unknown',
      eventType: eventData.eventType,
      severity: eventData.severity,
      description: eventData.description,
      metadata: eventData.metadata || {},
      userId: eventData.userId
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Failed to log security event:', error);
    
    // 即使失败也返回成功，避免影响主要流程
    return NextResponse.json({ success: true });
  }
}
