import { NextRequest, NextResponse } from 'next/server'
import { secureCache } from '@/lib/cache/secure-cache'

export const runtime = 'nodejs' // 明确指定使用 Node.js Runtime

export async function GET(request: NextRequest) {
  try {
    console.log('🔧 [API/SYSTEM/MESSAGE] Fetching system message...')

    // 使用缓存获取系统消息配置
    const systemMessageValue = await secureCache.getSystemConfig('system_message')

    if (!systemMessageValue) {
      console.log('🔧 [API/SYSTEM/MESSAGE] No system message configured')
      return NextResponse.json({
        success: true,
        message: '',
        type: 'info'
      })
    }

    // 解析消息内容
    let message = ''
    let type = 'info'

    try {
      // 尝试解析JSON格式的消息（支持类型）
      const parsed = JSON.parse(systemMessageValue)
      if (typeof parsed === 'object' && parsed.message) {
        message = parsed.message
        type = parsed.type || 'info'
      } else if (typeof parsed === 'string') {
        message = parsed
      }
    } catch {
      // 如果不是JSON，直接使用字符串
      message = systemMessageValue
    }

    return NextResponse.json({
      success: true,
      message: message.trim(),
      type
    })
  } catch (error) {
    console.error('Error in system message API:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
