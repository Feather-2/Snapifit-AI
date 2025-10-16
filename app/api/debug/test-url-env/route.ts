import { NextRequest, NextResponse } from 'next/server'
import { EnvConfig } from '@/lib/env-config'
import { validateBaseURL } from '@/lib/url-validator'

/**
 * 测试URL环境变量配置
 * GET /api/debug/test-url-env
 */
export async function GET(request: NextRequest) {
  try {
    // 获取环境变量的原始值
    const rawEnvValue = process.env.ALLOW_NON_THIRD_PARTY_SOURCES
    const configValue = EnvConfig.allowNonThirdPartySources
    
    // 测试几个URL
    const testUrls = [
      'api.deepseek.com',
      'api.openai.com',
      'custom-proxy.example.com',
      'https://api.deepseek.com/v1/chat/completions'
    ]
    
    const testResults = testUrls.map(url => {
      const validation = validateBaseURL(url)
      return {
        url,
        validation,
        isBlocked: validation.isBlocked,
        reason: validation.reason
      }
    })

    return NextResponse.json({
      success: true,
      debug: {
        environment: {
          rawEnvValue,
          configValue,
          nodeEnv: process.env.NODE_ENV,
          timestamp: new Date().toISOString()
        },
        testResults,
        explanation: {
          expectedBehavior: configValue 
            ? '当 ALLOW_NON_THIRD_PARTY_SOURCES=true 时，所有URL都应该被允许'
            : '当 ALLOW_NON_THIRD_PARTY_SOURCES=false 时，官方API应该被禁止',
          actualBehavior: testResults.map(r => `${r.url}: ${r.isBlocked ? '被禁止' : '允许'}`).join(', ')
        }
      }
    })
  } catch (error) {
    console.error('Error in URL env test:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * 测试特定URL
 * POST /api/debug/test-url-env
 */
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // 获取环境变量状态
    const rawEnvValue = process.env.ALLOW_NON_THIRD_PARTY_SOURCES
    const configValue = EnvConfig.allowNonThirdPartySources
    
    // 验证URL
    const validation = validateBaseURL(url)
    
    // 详细分析
    const analysis = {
      url,
      environment: {
        rawEnvValue,
        configValue,
        shouldAllow: configValue,
        nodeEnv: process.env.NODE_ENV
      },
      validation,
      analysis: {
        isOfficialAPI: ['api.openai.com', 'api.anthropic.com', 'api.deepseek.com', 'dashscope.aliyuncs.com', 'generativelanguage.googleapis.com'].some(domain => url.includes(domain)),
        shouldBeBlocked: !configValue,
        actuallyBlocked: validation.isBlocked,
        consistent: validation.isBlocked === !configValue
      }
    }

    return NextResponse.json({
      success: true,
      ...analysis,
      recommendation: analysis.analysis.consistent 
        ? '✅ 行为符合预期' 
        : '❌ 行为不符合预期，可能需要重启应用'
    })
  } catch (error) {
    console.error('Error in URL test:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
