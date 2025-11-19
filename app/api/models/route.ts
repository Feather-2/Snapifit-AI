import { NextRequest, NextResponse } from 'next/server'
import { OpenAICompatibleClient } from '@/lib/ai/openai'
import { logInfo, logError } from '@/lib/logging'
import { handleApiError } from '@/lib/api/error-handler'

export async function POST(request: NextRequest) {
  try {
    const { baseUrl, apiKey } = await request.json()

    // 调试日志：确认API被调用
    logInfo('api_models_fetch_called', { baseUrl })

    if (!baseUrl || !apiKey) {
      return NextResponse.json({ 
        success: false, 
        error: "Base URL and API Key are required" 
      }, { status: 400 })
    }

    // ✅ 注意：此API用于获取私有配置的模型列表，不进行URL验证
    // ✅ 私有配置允许用户使用任何URL，包括官方API
    // 🚫 只有共享服务(/api/shared-keys/*)才需要URL验证
    logInfo('api_models_skip_url_validation', { reason: 'private_config' })

    // 创建客户端
    const client = new OpenAICompatibleClient(baseUrl, apiKey)

    logInfo('api_models_fetch_start', { baseUrl })
    
    // 获取模型列表
    const result = await client.listModels()
    
    logInfo('api_models_fetch_done', { count: (result.data?.length || 0) as any })

    return NextResponse.json({
      success: true,
      models: result.data || [],
      message: `Successfully fetched ${result.data?.length || 0} models`
    })

  } catch (error) {
    logError('api_models_fetch_error', { error: error instanceof Error ? error.message : String(error) })
    
    // 检查是否是URL验证错误
    if (error instanceof Error && error.message.includes("封禁")) {
      logError('api_models_unexpected_url_validation', { note: 'private configs should allow any URL' })
    }

    // 提供更详细的错误信息
    let errorMessage = "Failed to fetch models"
    if (error instanceof Error) {
      if (error.message.includes("获取模型列表超时")) {
        errorMessage = "请求超时：API服务响应时间过长，请检查网络连接或稍后重试"
      } else if (error.message.includes("网络连接失败")) {
        errorMessage = "网络连接失败：无法连接到API服务，请检查URL和网络连接"
      } else if (error.message.includes("Failed to fetch models")) {
        errorMessage = "API调用失败：请检查API Key是否正确，或API服务是否可用"
      } else {
        errorMessage = error.message
      }
    }

    return handleApiError(new Error(errorMessage), 500)
  }
}

// GET方法用于API文档
export async function GET() {
  return NextResponse.json({
    message: 'Models API',
    description: 'Fetch available models from AI API endpoints',
    usage: 'POST with { "baseUrl": "https://api.example.com", "apiKey": "your-key" }',
    note: 'This API is for private configurations and does not perform URL validation'
  })
}
