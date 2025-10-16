import { NextRequest, NextResponse } from 'next/server';
import { checkDebugAccess } from '@/lib/debug-utils';

export const runtime = 'nodejs';

/**
 * 性能测试端点 - 测试中间件和安全事件记录的性能影响
 */
export async function GET(request: NextRequest) {
  const accessCheck = checkDebugAccess();
  if (accessCheck) {
    return accessCheck;
  }

  const startTime = performance.now();
  
  try {
    // 模拟一些请求来测试中间件性能
    const testResults = {
      timestamp: new Date().toISOString(),
      tests: []
    };

    // 测试 1: 基本请求处理时间
    const basicStart = performance.now();
    await new Promise(resolve => setTimeout(resolve, 1)); // 模拟基本处理
    const basicEnd = performance.now();
    
    testResults.tests.push({
      name: 'Basic Request Processing',
      duration: basicEnd - basicStart,
      unit: 'ms'
    });

    // 测试 2: 安全事件记录性能（模拟）
    const securityStart = performance.now();
    
    // 模拟安全事件记录（不实际发送请求）
    const mockSecurityEvent = {
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      eventType: 'performance_test',
      severity: 'low',
      description: 'Performance test event'
    };
    
    // 模拟异步调用的开销
    Promise.resolve().then(() => {
      // 这里模拟异步处理
      console.log('Mock security event:', mockSecurityEvent);
    });
    
    const securityEnd = performance.now();
    
    testResults.tests.push({
      name: 'Security Event Logging (Async)',
      duration: securityEnd - securityStart,
      unit: 'ms',
      note: 'This is the synchronous overhead only'
    });

    // 测试 3: 内存使用情况
    const memoryUsage = process.memoryUsage();
    
    testResults.tests.push({
      name: 'Memory Usage',
      data: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`
      }
    });

    const totalTime = performance.now() - startTime;

    return NextResponse.json({
      success: true,
      totalTestTime: `${totalTime.toFixed(2)} ms`,
      results: testResults,
      recommendations: [
        'Monitor middleware response times in production',
        'Check security event API endpoint performance',
        'Consider implementing request batching if security events are frequent',
        'Use APM tools for detailed performance monitoring'
      ]
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      testTime: `${(performance.now() - startTime).toFixed(2)} ms`
    }, { status: 500 });
  }
}
