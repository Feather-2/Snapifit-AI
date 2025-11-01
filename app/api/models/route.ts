import { NextRequest, NextResponse } from 'next/server'
import { OpenAICompatibleClient } from '@/lib/ai/openai'
import { handleApiError } from '@/lib/api/error-handler'

export async function POST(request: NextRequest) {
  try {
    const { baseUrl, apiKey } = await request.json()

    // 调试日志：确认API被调用
    console.log("🔧 /api/models called for fetching model list")
    console.log("🌐 Base URL:", baseUrl)

    if (!baseUrl || !apiKey) {
      return NextResponse.json({ 
        success: false, 
        error: "Base URL and API Key are required" 
      }, { status: 400 })
    }

    // ✅ 注意：此API用于获取私有配置的模型列表，不进行URL验证
    // ✅ 私有配置允许用户使用任何URL，包括官方API
    // 🚫 只有共享服务(/api/shared-keys/*)才需要URL验证
    console.log("✅ Private config model fetch - URL validation SKIPPED")

    // 创建客户端
    const client = new OpenAICompatibleClient(baseUrl, apiKey)

    console.log("🚀 Fetching models from:", baseUrl)
    
    // 获取模型列表
    const result = await client.listModels()
    
    console.log("✅ Models fetched successfully, count:", result.data?.length || 0)

    return NextResponse.json({
      success: true,
      models: result.data || [],
      message: `Successfully fetched ${result.data?.length || 0} models`
    })

  } catch (error) {
    console.error("❌ Models fetch error:", error)
    
    // 检查是否是URL验证错误
    if (error instanceof Error && error.message.includes("封禁")) {
      console.error("🚨 UNEXPECTED: URL validation error in private config model fetch!")
      console.error("🚨 This should NOT happen - private configs should allow any URL")
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
