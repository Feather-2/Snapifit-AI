import { SharedOpenAIClient } from "@/lib/shared-openai-client"
import { v4 as uuidv4 } from "uuid"
import { checkApiAuth, rollbackUsageIfNeeded } from '@/lib/auth/api-helper'
import { safeJSONParse } from '@/lib/safe-json'

export async function POST(req: Request) {
  let session: any = null
  let usageManager: any = null
  try {
    const { text, type, userWeight, aiConfig, currentTime } = await req.json()

    if (!text) {
      return Response.json({ error: "No text provided" }, { status: 400 })
    }

    // 🔒 统一的身份验证和限制检查（只对共享模式进行限制）
    const authResult = await checkApiAuth(aiConfig, 'conversation_count')

    if (!authResult.success) {
      return Response.json({
        error: authResult.error!.message,
        code: authResult.error!.code
      }, { status: authResult.error!.status })
    }

    ;({ session, usageManager } = authResult)

    // 获取用户选择的工作模型并检查模式
    let selectedModel = "gemini-2.5-flash-preview-05-20" // 默认模型
    let fallbackConfig: { baseUrl: string; apiKey: string } | undefined = undefined
    const isSharedMode = aiConfig?.agentModel?.source === 'shared'

    if (isSharedMode && aiConfig?.agentModel?.sharedKeyConfig?.selectedModel) {
      // 共享模式：使用 selectedModel
      selectedModel = aiConfig.agentModel.sharedKeyConfig.selectedModel
    } else if (!isSharedMode) {
      // 私有模式：使用用户自己的配置
      if (aiConfig?.agentModel?.name) {
        selectedModel = aiConfig.agentModel.name
      }

      // 设置私有配置作为fallback
      if (aiConfig?.agentModel?.baseUrl && aiConfig?.agentModel?.apiKey) {
        fallbackConfig = {
          baseUrl: aiConfig.agentModel.baseUrl,
          apiKey: aiConfig.agentModel.apiKey
        }
      } else {
        return Response.json({
          error: "私有模式需要完整的AI配置（模型名称、API地址、API密钥）",
          code: "INCOMPLETE_AI_CONFIG"
        }, { status: 400 })
      }
    }

    console.log('🔍 Using selected model:', selectedModel)
    console.log('🔍 Model source:', aiConfig?.agentModel?.source)
    console.log('🔍 Fallback config available:', !!fallbackConfig)

    // 创建共享客户端（支持私有模式fallback）
    const sharedClient = new SharedOpenAIClient({
      userId: session.user.id,
      preferredModel: selectedModel,
      fallbackConfig,
      preferPrivate: !isSharedMode // 私有模式优先使用私有配置
    })

    // 根据类型选择不同的提示词和解析逻辑
    if (type === "food") {
      // 食物解析提示词 - 简化版本，只要求AI输出基本信息和每100g营养素
      const prompt = `
        请分析以下文本中描述的食物，并将其转换为结构化的 JSON 格式。
        文本: "${text}"
        ${currentTime ? `当前时间: ${currentTime}` : ""}

        请直接输出 JSON，不要有额外文本。如果无法确定数值，请给出合理估算，并在相应字段标记 is_estimated: true。

        每个食物项应包含以下字段:
        - food_name: 食物名称
        - consumed_grams: 估计消耗的克数
        - meal_type: 餐次类型 (breakfast, lunch, dinner, snack)
        - time_period: 时间段 (morning, noon, afternoon, evening)，根据文本内容推断
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
        response_format: { type: "json_object" },
      })

      // 清理从AI返回的JSON字符串，移除可能的markdown代码块
      const cleanedResultText = resultText.replace(/```json\n|```/g, "").trim();

      // 解析结果
      console.log('🔍 AI返回的原始文本(食物):', resultText.substring(0, 200) + '...')
      console.log('🔍 清理后的文本(食物):', cleanedResultText.substring(0, 200) + '...')
      const result = safeJSONParse(cleanedResultText)
      console.log('🔍 解析后的结果(食物):', JSON.stringify(result, null, 2).substring(0, 300) + '...')

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

      return new Response(JSON.stringify({
        ...result,
        keyInfo // 包含使用的Key信息
      }), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      })
    } else if (type === "exercise") {
      // 运动解析提示词
      const prompt = `
        请分析以下文本中描述的运动，并将其转换为结构化的 JSON 格式。
        文本: "${text}"
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
        response_format: { type: "json_object" },
      })

      // 清理从AI返回的JSON字符串，移除可能的markdown代码块
      const cleanedResultText = resultText.replace(/```json\n|```/g, "").trim();

      // 解析结果
      console.log('🔍 AI返回的原始文本(运动):', resultText.substring(0, 200) + '...')
      console.log('🔍 清理后的文本(运动):', cleanedResultText.substring(0, 200) + '...')
      const result = safeJSONParse(cleanedResultText)
      console.log('🔍 解析后的结果(运动):', JSON.stringify(result, null, 2).substring(0, 300) + '...')

      // 为每个运动项添加唯一 ID
      if (result.exercise && Array.isArray(result.exercise)) {
        result.exercise.forEach((item: any) => {
          item.log_id = uuidv4()
        })
      }

      return new Response(JSON.stringify({
        ...result,
        keyInfo // 包含使用的Key信息
      }), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      })
    } else {
      return Response.json({ error: "Invalid type" }, { status: 400 })
    }
  } catch (error) {
    console.error('Parse shared API error:', error)

    // 回滚使用计数，防止白扣额度
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
