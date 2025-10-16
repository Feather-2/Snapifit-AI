import { NextRequest, NextResponse } from 'next/server'
import { EnvConfig } from '@/lib/env-config'

/**
 * 获取URL验证配置
 * GET /api/config/url-validation
 * 为前端提供URL验证的配置信息
 */
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      config: {
        allowNonThirdPartySources: EnvConfig.allowNonThirdPartySources,
        allowOfficialAPIs: EnvConfig.allowNonThirdPartySources, // 别名，更清晰
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error getting URL validation config:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get URL validation config'
    }, { status: 500 })
  }
}
