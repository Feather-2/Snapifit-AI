import { OpenAICompatibleClient } from "@/lib/ai/openai"

export async function POST(req: Request) {
  try {
    const { modelConfig, modelType } = await req.json()

    // 调试日志：确认API被调用
    console.log("🔧 /api/test-model called for private config test")
    console.log("📍 Model type:", modelType)
    console.log("🌐 Base URL:", modelConfig?.baseUrl)

    if (!modelConfig || !modelConfig.name || !modelConfig.baseUrl || !modelConfig.apiKey) {
      return Response.json({ error: "Invalid model configuration" }, { status: 400 })
    }

    // ✅ 注意：此API用于测试私有配置，不进行URL验证
    // ✅ 私有配置允许用户使用任何URL，包括官方API
    // 🚫 只有共享服务(/api/shared-keys/*)才需要URL验证
    console.log("✅ Private config test - URL validation SKIPPED")

    // 创建客户端
    const client = new OpenAICompatibleClient(modelConfig.baseUrl, modelConfig.apiKey)

    // 根据模型类型选择测试内容
    let testPrompt = "Hello, this is a test message. Please respond with 'Test successful'."

    if (modelType === "visionModel") {
      // 对于视觉模型，我们只测试文本能力，因为测试图片会比较复杂
      testPrompt =
        "This is a test for vision model text capabilities. Please respond with 'Vision model test successful'."
    } else if (modelType === "agentModel") {
      testPrompt = "This is a test for agent model. Please respond with 'Agent model test successful'."
    } else if (modelType === "chatModel") {
      testPrompt = "This is a test for chat model. Please respond with 'Chat model test successful'."
    }

    // 发送测试请求
    console.log("🚀 Sending test request to:", modelConfig.baseUrl)
    const { text } = await client.generateText({
      model: modelConfig.name,
      prompt: testPrompt,
    })

    console.log("✅ Test request successful, response received")

    // 检查响应是否包含预期内容
    if (text && text.toLowerCase().includes("test successful")) {
      console.log("✅ Test completed successfully")
      return Response.json({ success: true, message: "Model test successful" })
    } else {
      console.log("⚠️ Test completed but with unexpected content")
      return Response.json({ success: true, message: "Model responded but with unexpected content", response: text })
    }
  } catch (error) {
    console.error("❌ Model test error:", error)

    // 检查是否是URL验证错误
    if (error instanceof Error && error.message.includes("封禁")) {
      console.error("🚨 UNEXPECTED: URL validation error in private config test!")
      console.error("🚨 This should NOT happen - private configs should allow any URL")
    }

    return Response.json({
      error: "Model test failed",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
