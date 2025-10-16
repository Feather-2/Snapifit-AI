import { NextRequest, NextResponse } from 'next/server'
import { generateMathCaptcha } from '@/lib/captcha/math-captcha'
import { getClientIP } from '@/lib/utils/ip'

export const runtime = 'nodejs'

/**
 * 生成数学验证码
 * GET /api/captcha/generate
 */
export async function GET(request: NextRequest) {
  try {
    const clientIP = getClientIP(request)
    
    // 生成验证码
    const captcha = generateMathCaptcha()
    
    console.log(`🔢 为IP ${clientIP} 生成验证码: ${captcha.question}`)
    
    return NextResponse.json({
      success: true,
      data: {
        sessionId: captcha.sessionId,
        question: captcha.question
        // 注意：不返回答案给前端
      }
    })
    
  } catch (error) {
    console.error('生成验证码失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '生成验证码失败'
      },
      { status: 500 }
    )
  }
}
