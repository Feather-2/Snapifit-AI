import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { InviteCodeManager } from '@/lib/auth/invite-code-manager'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      })
    }

    // 测试获取用户配额
    const quotaResult = await InviteCodeManager.getUserQuota(session.user.id)
    
    console.log('🧪 Test quota result:', quotaResult)

    return NextResponse.json({
      success: true,
      userId: session.user.id,
      userRole: (session.user as any)?.role,
      quotaResult
    })

  } catch (error) {
    console.error('Test quota error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
