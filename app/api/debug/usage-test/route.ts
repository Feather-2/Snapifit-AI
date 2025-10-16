import { NextRequest, NextResponse } from 'next/server';
import { checkDebugAccess } from '@/lib/debug-guard';
import { auth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  // 检查调试访问权限
  const debugCheck = checkDebugAccess();
  if (debugCheck) return debugCheck;
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 })
    }

    // 模拟usage check的响应
    const mockUsageData = {
      allowed: true,
      currentUsage: 5,
      dailyLimit: 150,
      remaining: 145,
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }

    return NextResponse.json({
      success: true,
      usage: mockUsageData,
      debug: {
        timestamp: new Date().toISOString(),
        userId: session.user.id,
        message: 'Mock usage data for testing'
      }
    })
  } catch (error) {
    console.error('Usage test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
