import { SharedOpenAIClient } from "@/lib/ai/shared"
import { v4 as uuidv4 } from "uuid"
import { checkApiAuth, rollbackUsageIfNeeded } from '@/lib/auth/api-helper'
import { safeJSONParse } from '@/lib/safe-json'

export async function POST(req: Request) {
  let session: any = null
  let usageManager: any = null
  try {
    const formData = await req.formData()
    const text = (formData.get("text") as string) || ""
    const type = formData.get("type") as string
    const userWeight = formData.get("userWeight") as string
    const aiConfigStr = formData.get("aiConfig") as string
    const currentTime = formData.get("currentTime") as string // 用户浏览器当前时间 HH:MM 格式

    // 收集所有图片
    const images: File[] = []
    for (let i = 0; i < 5; i++) {
      const image = formData.get(`image${i}`) as File
      if (image) {
        images.push(image)
      }
    }

    if (images.length === 0) {
      return Response.json({ error: "No images provided" }, { status: 400 })
    }

    if (!aiConfigStr) {
      return Response.json({ error: "AI configuration not found" }, { status: 400 })
    }

    const aiConfig = JSON.parse(aiConfigStr)

    // 🔒 统一的身份验证和限制检查（只对共享模式进行限制）
    console.log('🔍 Starting auth check for parse-with-images API')
    const authResult = await checkApiAuth(aiConfig, 'conversation_count')

    if (!authResult.success) {
      console.log('❌ Auth check failed:', authResult.error)
      return Response.json({
        error: authResult.error!.message,
        code: authResult.error!.code,
        ...((authResult.error as any)?.details && { details: (authResult.error as any).details })
      }, { status: authResult.error!.status })
    }

    console.log('✅ Auth check passed, proceeding with AI request')

    ;({ session, usageManager } = authResult)

    // 获取用户选择的视觉模型并检查模式
    let selectedModel = "gemini-2.5-flash-preview-05-20" // 默认视觉模型
    let fallbackConfig: { baseUrl: string; apiKey: string } | undefined = undefined
    const isSharedMode = aiConfig?.visionModel?.source === 'shared'

    if (isSharedMode && aiConfig?.visionModel?.sharedKeyConfig?.selectedModel) {
      // 共享模式：使用 selectedModel
      selectedModel = aiConfig.visionModel.sharedKeyConfig.selectedModel
    } else if (!isSharedMode) {
      // 私有模式：使用用户自己的配置
      if (aiConfig?.visionModel?.name) {
        selectedModel = aiConfig.visionModel.name
      }

      // 设置私有配置作为fallback
      if (aiConfig?.visionModel?.baseUrl && aiConfig?.visionModel?.apiKey) {
        fallbackConfig = {
          baseUrl: aiConfig.visionModel.baseUrl,
          apiKey: aiConfig.visionModel.apiKey
        }
      } else {
        // 私有配置不完整，回滚已计数的使用量
        await rollbackUsageIfNeeded(usageManager || null, session.user.id, 'conversation_count')
        return Response.json({
          error: "私有模式需要完整的AI配置（模型名称、API地址、API密钥）",
          code: "INCOMPLETE_AI_CONFIG"
        }, { status: 400 })
      }
    }

    console.log('🔍 Using selected vision model:', selectedModel)
    console.log('🔍 Vision model source:', aiConfig?.visionModel?.source)
    console.log('🔍 Fallback config available:', !!fallbackConfig)

    // 创建共享客户端（支持私有模式fallback）
    const sharedClient = new SharedOpenAIClient({
      userId: session.user.id,
      preferredModel: selectedModel,
      fallbackConfig,
      preferPrivate: !isSharedMode // 私有模式优先使用私有配置
    })

    // 将图片转换为 base64
    const imageDataURIs = await Promise.all(
      images.map(async (image, index) => {
        const imageBuffer = await image.arrayBuffer()
        const imageBase64 = Buffer.from(imageBuffer).toString("base64")
        const dataURI = `data:${image.type};base64,${imageBase64}`

        // 🐛 调试日志 - 只显示前50个字符避免控制台污染
        console.log(`📸 Image ${index + 1}: ${image.name} (${image.type}, ${Math.round(image.size / 1024)}KB)`)
        console.log(`📸 Base64 preview: ${dataURI.substring(0, 50)}...`)

        return dataURI
      }),
    )

    // 根据类型选择不同的提示词和解析逻辑
    if (type === "food") {
      // 食物图片解析提示词 - 简化版本，只要求AI输出基本信息和每100g营养素
      const prompt = `
        请分析${images.length > 1 ? "这些" : "这张"}食物图片${text ? "和文本描述" : ""}，识别图中的食物，并将其转换为结构化的 JSON 格式。
        ${text ? `用户文本描述: "${text}"` : ""}
        ${currentTime ? `当前时间: ${currentTime}` : ""}

        请直接输出 JSON，不要有额外文本。如果无法确定数值，请给出合理估算，并在相应字段标记 is_estimated: true。

        每个食物项应包含以下字段:
        - food_name: 食物名称
        - consumed_grams: 估计消耗的克数
        - meal_type: 餐次类型 (breakfast, lunch, dinner, snack)
        - time_period: 时间段 (morning, noon, afternoon, evening)，根据图片内容和文本描述推断
        - timestamp: 具体时间，格式为 HH:MM (24小时制)。如果用户提到具体时间如"8点"、"下午3点"等，请转换为24小时制；如果提到"刚刚"、"刚才"或没有时间信息，使用当前时间
        - nutritional_info_per_100g: 每100克的营养成分，包括 calories, carbohydrates, protein, fat, fiber 等
        - is_estimated: 是否为估算值

        注意：只需要提供每100g的营养成分和估计克数，不需要计算总营养成分。

        示例输出格式:
        {
          "food": [
            {
              "food_name": "全麦面包",
              "consumed_grams": 80,
              "meal_type": "breakfast",
              "time_period": "morning",
              "timestamp": "08:30",
              "nutritional_info_per_100g": {
                "calories": 265,
                "carbohydrates": 48.5,
                "protein": 9.0,
                "fat": 3.2,
                "fiber": 7.4
              },
              "is_estimated": true
            }
          ]
        }
      `

      const { text: resultText, keyInfo } = await sharedClient.generateText({
        model: selectedModel,
        prompt,
        images: imageDataURIs,
        response_format: { type: "json_object" },
      })

      // 解析结果
      const result = safeJSONParse(resultText)

      // 为每个食物项添加唯一 ID 并自动计算总营养成分
      if (result.food && Array.isArray(result.food)) {
        result.food.forEach((item: any) => {
          item.log_id = uuidv4()

          // 自动计算总营养成分
          if (item.nutritional_info_per_100g && item.consumed_grams) {
            const ratio = item.consumed_grams / 100
            item.total_nutritional_info_consumed = {}

            Object.entries(item.nutritional_info_per_100g).forEach(([key, value]) => {
              if (typeof value === 'number') {
                item.total_nutritional_info_consumed[key] = value * ratio
              }
            })
          }
        })
      }

      return Response.json({
        ...result,
        keyInfo // 包含使用的Key信息
      })
    } else if (type === "exercise") {
      // 运动图片解析提示词
      const prompt = `
        请分析${images.length > 1 ? "这些" : "这张"}运动相关的图片${text ? "和文本描述" : ""}，识别图中的运动类型，并将其转换为结构化的 JSON 格式。
        ${text ? `用户文本描述: "${text}"` : ""}
        用户体重: ${userWeight || 70} kg

        请直接输出 JSON，不要有额外文本。如果无法确定数值，请给出合理估算，并在相应字段标记 is_estimated: true。

        每个运动项应包含以下字段:
        - exercise_name: 运动名称
        - exercise_type: 运动类型 (cardio, strength, flexibility, other)
        - duration_minutes: 持续时间(分钟)
        - time_period: 时间段 (morning, noon, afternoon, evening，可选)
        - distance_km: 距离(公里，仅适用于有氧运动)
        - sets: 组数(仅适用于力量训练)
        - reps: 次数(仅适用于力量训练)
        - weight_kg: 重量(公斤，仅适用于力量训练)
        - estimated_mets: 代谢当量(MET值)
        - user_weight: 用户体重(公斤)
        - calories_burned_estimated: 估算的卡路里消耗
        - muscle_groups: 锻炼的肌肉群
        - is_estimated: 是否为估算值

        示例输出格式:
        {
          "exercise": [
            {
              "exercise_name": "跑步",
              "exercise_type": "cardio",
              "duration_minutes": 30,
              "time_period": "morning",
              "distance_km": 5,
              "estimated_mets": 8.3,
              "user_weight": 70,
              "calories_burned_estimated": 290.5,
              "muscle_groups": ["腿部", "核心"],
              "is_estimated": true
            }
          ]
        }
      `

      const { text: resultText, keyInfo } = await sharedClient.generateText({
        model: selectedModel,
        prompt,
        images: imageDataURIs,
        response_format: { type: "json_object" },
      })

      // 解析结果
      const result = safeJSONParse(resultText)

      // 为每个运动项添加唯一 ID
      if (result.exercise && Array.isArray(result.exercise)) {
        result.exercise.forEach((item: any) => {
          item.log_id = uuidv4()
        })
      }

      return Response.json({
        ...result,
        keyInfo // 包含使用的Key信息
      })
    } else {
      return Response.json({ error: "Invalid type" }, { status: 400 })
    }
  } catch (error) {
    console.error('Parse with images API error:', error)

    if (session?.user?.id) {
      await rollbackUsageIfNeeded(usageManager || null, session.user.id, 'conversation_count')
    }

    // 检查是否是共享密钥限额问题
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('No available shared keys') || errorMessage.includes('达到每日调用限制')) {
      return Response.json({
        error: "共享AI服务暂时不可用，所有密钥已达到每日使用限制。请稍后重试或联系管理员。",
        code: "SHARED_KEYS_EXHAUSTED",
        details: errorMessage
      }, { status: 503 }) // Service Unavailable
    }

    return Response.json({
      error: "AI服务处理失败，请稍后重试",
      code: "AI_SERVICE_ERROR",
      details: errorMessage
    }, { status: 500 })
  }
}
