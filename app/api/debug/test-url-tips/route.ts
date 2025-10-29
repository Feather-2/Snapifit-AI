import { NextRequest, NextResponse } from 'next/server'
import { EnvConfig } from '@/lib/config/environment'

/**
 * 测试URL提示信息的显示
 * GET /api/debug/test-url-tips
 */
export async function GET(request: NextRequest) {
  try {
    const allowOfficialAPIs = EnvConfig.allowNonThirdPartySources

    // 模拟不同配置下的提示信息
    const tips = {
      common: "支持第三方API代理服务",
      conditional: allowOfficialAPIs 
        ? "当前配置允许使用官方API地址和第三方代理服务"
        : "为出于管理方便，已屏蔽官方API地址"
    }

    return NextResponse.json({
      success: true,
      config: {
        allowOfficialAPIs,
        envValue: process.env.ALLOW_NON_THIRD_PARTY_SOURCES
      },
      tips,
      explanation: {
        behavior: allowOfficialAPIs 
          ? "当前允许官方API，显示允许提示"
          : "当前禁止官方API，显示屏蔽提示",
        expectedDisplay: [
          "• 支持第三方API代理服务",
          allowOfficialAPIs 
            ? "• 当前配置允许使用官方API地址和第三方代理服务"
            : "• 为出于管理方便，已屏蔽官方API地址"
        ]
      }
    })
  } catch (error) {
    console.error('Error in URL tips test:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
