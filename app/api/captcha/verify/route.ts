import { NextRequest, NextResponse } from 'next/server'
import { verifyCaptcha } from '@/lib/captcha/math-captcha'
import { getClientIP } from '@/lib/utils/ip'
import { handleApiError } from '@/lib/api/error-handler'

export const runtime = 'nodejs'

/**
 * 验证数学验证码
 * POST /api/captcha/verify
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, answer } = body
    
    if (!sessionId || answer === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少必要参数'
        },
        { status: 400 }
      )
    }
    
    const clientIP = getClientIP(request)
    
    // 验证验证码
    const isValid = verifyCaptcha(sessionId, parseInt(answer))
    
    console.log(`🔢 IP ${clientIP} 验证码验证结果: ${isValid ? '成功' : '失败'}`)
    
    if (isValid) {
      return NextResponse.json({
        success: true,
        message: '验证码验证成功'
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: '验证码错误或已过期'
        },
        { status: 400 }
      )
    }
    
  } catch (error) {
    console.error('验证码验证失败:', error)
    return handleApiError(error, 500)
  }
}
