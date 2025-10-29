import { formatDailyStatusForAI } from "@/lib/utils"
import { checkApiAuth, rollbackUsageIfNeeded } from '@/lib/auth/api-helper'
import type { DailyLog, UserProfile, AIConfig } from "@/lib/types"
import { getHealthToolExecutor } from '@/lib/function-calling/health-tools'
import { getHealthDataRAG } from '@/lib/rag/health-data-rag'
// 本地直接使用健康MCP服务器工厂（如需调用）
// import { createHealthMCPServer } from '@/lib/mcp/server'

export async function POST(req: Request) {
  let session: any = null
  let usageManager: any = null

  try {
    // 获取AI配置和专家角色
    const aiConfigStr = req.headers.get("x-ai-config")
    const expertRoleId = req.headers.get("x-expert-role")

    if (!aiConfigStr) {
      return Response.json({ error: "AI configuration not found" }, { status: 400 })
    }

    let aiConfig
    try {
      aiConfig = JSON.parse(aiConfigStr)
    } catch (e) {
      return Response.json({ error: "Invalid AI configuration format" }, { status: 400 })
    }

    // 身份验证和限制检查
    const authResult = await checkApiAuth(aiConfig, 'conversation_count')

    if (!authResult.success) {
      return Response.json({
        error: authResult.error!.message,
        code: authResult.error!.code
      }, { status: authResult.error!.status })
    }

    ;({ session, usageManager } = authResult)

    const body = await req.json()
    const { messages, userProfile, healthData, recentHealthData, systemPrompt: customSystemPrompt, expertRole, aiMemory, images, useEnhancedMode } = body

    console.log("=== 增强 Chat API 请求 ===")
    console.log("Enhanced mode:", useEnhancedMode)
    console.log("Messages count:", messages?.length || 0)
    console.log("Has health data:", !!healthData)

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: "Invalid messages format" }, { status: 400 })
    }

    // 🚀 增强模式：使用 MCP 和 RAG 系统
    let enhancedSystemPrompt = customSystemPrompt || "你是Snapifit AI健康助手，一个专业的健康管理AI。"
    let toolDefinitions: any[] = []
    let ragContext: string = ""

    if (useEnhancedMode) {
      console.log("🚀 启用增强模式")

      // 1. 获取可用工具
      const toolExecutor = getHealthToolExecutor()
      const userPermissions = ['read_profile', 'read_health_data'] // 简化权限获取
      toolDefinitions = toolExecutor.getToolDefinitions(userPermissions)

      console.log(`📋 加载了 ${toolDefinitions.length} 个工具`)

      // 2. 如果有最新的用户消息，尝试RAG查询
      const lastUserMessage = messages.filter(m => m.role === 'user').pop()
      if (lastUserMessage && lastUserMessage.content) {
        try {
          const rag = getHealthDataRAG()

          // 首先索引用户数据（如果有的话）
          if (userProfile && recentHealthData?.length > 0) {
            const healthContext = {
              userId: session.user.id,
              dateRange: {
                start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0]
              },
              dataTypes: ['weight', 'food', 'exercise', 'sleep', 'mood'] as const,
              aggregationLevel: 'daily' as const,
              includeAnalysis: true,
              includePredictions: false
            }

            await rag.indexUserData(session.user.id, userProfile, recentHealthData, healthContext)
            console.log("📊 用户数据已索引")
          }

          // 执行RAG查询
          const ragQuery = {
            query: lastUserMessage.content,
            context: {
              userId: session.user.id,
              dateRange: {
                start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0]
              },
              dataTypes: ['weight', 'food', 'exercise', 'sleep', 'mood'] as const,
              aggregationLevel: 'daily' as const,
              includeAnalysis: true,
              includePredictions: false
            },
            vectorThreshold: 0.6,
            maxResults: 5,
            includeMetadata: true
          }

          const ragResult = await rag.query(ragQuery)

          if (ragResult.documents.length > 0) {
            ragContext = `\n\n🔍 相关健康数据（RAG检索）：\n${ragResult.documents.map(doc =>
              `• ${doc.content} (相关度: ${doc.score.toFixed(2)})`
            ).join('\n')}`

            console.log(`🔍 RAG检索到 ${ragResult.documents.length} 个相关文档`)
          }
        } catch (error) {
          console.error('RAG查询失败:', error)
        }
      }

      // 3. 增强系统提示词
      enhancedSystemPrompt += `

🚀 增强模式已启用

你现在拥有以下能力：
1. 📋 工具调用：可以调用 ${toolDefinitions.length} 个专业健康工具
2. 🔍 智能检索：可以搜索和分析用户的历史健康数据
3. 📊 实时分析：可以获取最新的健康指标和趋势

可用工具包括：
${toolDefinitions.map(tool => `• ${tool.function.name}: ${tool.function.description}`).join('\n')}

使用工具的时机：
- 当用户询问具体的健康数据时，使用 get_recent_health_data 或 get_nutrition_analysis
- 当用户询问健康指标时，使用 calculate_health_metrics
- 当用户询问复杂问题时，使用 rag_query_health_data 进行智能搜索
- 当用户需要综合分析时，使用 get_health_summary

${ragContext}

请根据用户的问题智能选择合适的工具来获取准确的数据，然后基于这些数据提供专业的建议。
`
    }

    // 构建完整的系统提示词（包含原有的健康数据）
    let fullSystemPrompt = enhancedSystemPrompt

    // 添加用户资料和健康数据（保持原有逻辑）
    if (userProfile || healthData || (recentHealthData && recentHealthData.length > 0)) {
      if (userProfile) {
        fullSystemPrompt += `\n\n用户资料:\n- 体重: ${userProfile.weight || "未知"} kg\n- 身高: ${userProfile.height || "未知"} cm\n- 年龄: ${userProfile.age || "未知"} 岁\n- 性别: ${userProfile.gender === "male" ? "男" : userProfile.gender === "female" ? "女" : userProfile.gender || "未知"}\n- 活动水平: ${userProfile.activityLevel || "未知"}\n- 健康目标: ${userProfile.goal || "未知"}`
      }

      if (healthData) {
        fullSystemPrompt += `\n\n今日健康数据 (${healthData.date || "今日"}):\n- 当日体重: ${healthData.weight ? `${healthData.weight} kg` : "未记录"}\n- 基础代谢率(BMR): ${healthData.calculatedBMR?.toFixed(0) || "未计算"} kcal\n- 总能量消耗(TDEE): ${healthData.calculatedTDEE?.toFixed(0) || "未计算"} kcal\n- 总卡路里摄入: ${healthData.summary?.totalCaloriesConsumed?.toFixed(0) || "0"} kcal\n- 总卡路里消耗: ${healthData.summary?.totalCaloriesBurned?.toFixed(0) || "0"} kcal`
      }

      if (recentHealthData && recentHealthData.length > 0) {
        const historicalData = recentHealthData.filter((_: any, index: number) => index > 0)
        if (historicalData.length > 0) {
          fullSystemPrompt += `\n\n历史健康数据趋势 (最近${historicalData.length}天):\n${historicalData.map((dayLog: any, index: number) => {
            const dayLabel = index === 0 ? "昨天" : `${index + 1}天前`
            return `${dayLabel} (${dayLog.date}): 体重 ${dayLog.weight || "未记录"}kg, 摄入 ${dayLog.summary?.totalCaloriesConsumed?.toFixed(0) || "0"}kcal`
          }).join('\n')}`
        }
      }
    }

    // 添加AI记忆
    if (aiMemory) {
      if (typeof aiMemory === 'object' && !aiMemory.content) {
        const memories = Object.entries(aiMemory).filter(([_, memory]: [string, any]) => memory?.content)
        if (memories.length > 0) {
          fullSystemPrompt += `\n\n团队记忆:\n${memories.map(([expertId, memory]: [string, any]) => {
            const expertNames: Record<string, string> = {
              general: "通用助手",
              nutrition: "营养师",
              fitness: "健身教练",
              psychology: "心理咨询师",
              medical: "医疗顾问",
              sleep: "睡眠专家"
            }
            return `【${expertNames[expertId] || expertId}】${memory.content}`
          }).join('\n')}`
        }
      } else if (aiMemory.content) {
        fullSystemPrompt += `\n\n我的记忆:\n${aiMemory.content}`
      }
    }

    // 获取模型配置
    const modelConfig = aiConfig.chatModel
    let selectedModel = "gemini-2.5-flash-preview-05-20"
    let fallbackConfig: { baseUrl: string; apiKey: string } | undefined = undefined

    if (modelConfig?.source === 'shared' && modelConfig?.sharedKeyConfig?.selectedModel) {
      selectedModel = modelConfig.sharedKeyConfig.selectedModel
    } else if (modelConfig?.source === 'private' || !modelConfig?.source) {
      if (modelConfig?.name) {
        selectedModel = modelConfig.name
      }
      if (modelConfig?.baseUrl && modelConfig?.apiKey) {
        fallbackConfig = {
          baseUrl: modelConfig.baseUrl,
          apiKey: modelConfig.apiKey
        }
      } else {
        await rollbackUsageIfNeeded(usageManager || null, session.user.id, 'conversation_count')
        return Response.json({
          error: "私有模式需要完整的AI配置",
          code: "INCOMPLETE_AI_CONFIG"
        }, { status: 400 })
      }
    }

    console.log(`🤖 使用模型: ${selectedModel}`)
    console.log(`🔧 工具数量: ${toolDefinitions.length}`)

    // 使用 SharedOpenAIClient
    const { SharedOpenAIClient } = await import('@/lib/ai/shared')
    const isSharedMode = modelConfig?.source === 'shared'
    const sharedClient = new SharedOpenAIClient({
      userId: session.user.id,
      preferredModel: selectedModel,
      fallbackConfig,
      preferPrivate: !isSharedMode
    })

    // 清理消息格式
    const cleanMessages = messages.map((msg: any) => {
      const cleanMsg: any = {
        role: msg.role,
        content: msg.content,
      }
      if (msg.images && Array.isArray(msg.images) && msg.images.length > 0) {
        cleanMsg.images = msg.images
      }
      return cleanMsg
    })

    // 准备工具调用上下文
    const toolContext = {
      userId: session.user.id,
      sessionId: session.user.id,
      userProfile: userProfile || {
        id: session.user.id,
        age: 30,
        gender: 'unknown' as const,
        height: 170,
        weight: 70,
        activityLevel: 'moderate',
        goal: 'maintain',
        targetWeight: 70,
        targetCalories: 2000,
        notes: '',
        bmrFormula: 'mifflin-st-jeor' as const,
        bmrCalculationBasis: 'totalWeight' as const,
        bodyFatPercentage: undefined,
        professionalMode: false
      },
      healthData: recentHealthData || [],
      permissions: ['read_profile', 'read_health_data'],
      rateLimits: {}
    }

    // 输出上下文信息
    console.log("=== AI 上下文信息 ===")
    console.log("1. 增强模式:", useEnhancedMode)
    console.log("2. 工具数量:", toolDefinitions.length)
    console.log("3. 系统提示词长度:", fullSystemPrompt.length)
    console.log("4. 消息数量:", cleanMessages.length)
    console.log("5. RAG上下文:", ragContext ? "已启用" : "未启用")
    console.log("=== 上下文信息结束 ===")

    // 创建流式响应
    const { stream, keyInfo } = await sharedClient.streamText({
      model: selectedModel,
      messages: cleanMessages,
      system: fullSystemPrompt,
      tools: useEnhancedMode ? toolDefinitions : undefined,
      tool_choice: useEnhancedMode ? 'auto' : undefined,
      onToolCall: useEnhancedMode ? async (toolCall: any) => {
        console.log(`🔧 工具调用: ${toolCall.name}`, toolCall.arguments)

        try {
          const toolExecutor = getHealthToolExecutor()
          const result = await toolExecutor.executeTool(
            toolCall.name,
            toolCall.arguments,
            toolContext
          )

          console.log(`✅ 工具执行成功: ${toolCall.name}`)
          return result
        } catch (error) {
          console.error(`❌ 工具执行失败: ${toolCall.name}`, error)
          return { error: `工具执行失败: ${error}` }
        }
      } : undefined
    })

    console.log("Stream created successfully with key:", keyInfo?.id)

    // 转换 SSE 流为 AI SDK 兼容格式
    const encoder = new TextEncoder()
    const transformedStream = new ReadableStream({
      async start(controller) {
        let isControllerClosed = false

        const closeController = () => {
          if (!isControllerClosed) {
            isControllerClosed = true
            controller.close()
          }
        }

        const enqueueData = (data: Uint8Array) => {
          if (!isControllerClosed) {
            controller.enqueue(data)
          }
        }

        try {
          const reader = stream.body?.getReader()
          if (!reader) {
            throw new Error('No stream reader available')
          }

          const decoder = new TextDecoder('utf-8')
          let buffer = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') {
                  const finishChunk = `d:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`
                  enqueueData(encoder.encode(finishChunk))
                  closeController()
                  return
                }

                try {
                  const parsed = JSON.parse(data)
                  const content = parsed.choices?.[0]?.delta?.content
                  if (content) {
                    const textChunk = `0:"${content.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"\n`
                    enqueueData(encoder.encode(textChunk))
                  }
                } catch (e) {
                  console.warn('Failed to parse SSE data:', data)
                }
              }
            }
          }

          const finishChunk = `d:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`
          enqueueData(encoder.encode(finishChunk))
          closeController()
        } catch (error) {
          console.error('Stream transformation error:', error)
          if (!isControllerClosed) {
            controller.error(error)
          }
        }
      }
    })

    return new Response(transformedStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (error) {
    console.error('Enhanced Chat API error:', error)

    if (session?.user?.id) {
      await rollbackUsageIfNeeded(usageManager || null, session.user.id, 'conversation_count')
    }

    return Response.json(
      {
        error: "Failed to process enhanced chat request",
        code: "AI_SERVICE_ERROR",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}