// 移除不再需要的导入，现在统一使用 SharedOpenAIClient
import { formatDailyStatusForAI } from "@/lib/utils"
import { checkApiAuth, rollbackUsageIfNeeded } from '@/lib/auth/api-helper'
import type { DailyLog, UserProfile, AIConfig } from "@/lib/types"
import { z } from 'zod'
import { streamText, tool } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { KeyManager } from '@/lib/auth/key-manager'

export async function POST(req: Request) {
  // 提前声明，便于在 catch 中访问并回滚
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

    // 🔒 统一的身份验证和限制检查（禁用private模式）
    const authResult = await checkApiAuth(aiConfig, 'conversation_count')

    if (!authResult.success) {
      return Response.json({
        error: authResult.error!.message,
        code: authResult.error!.code
      }, { status: authResult.error!.status })
    }

    ;({ session, usageManager } = authResult)

    const body = await req.json()
    //console.log("=== API接收到的完整请求体 ===")
    //console.log("Request body keys:", Object.keys(body))
    //console.log("Messages count:", body.messages?.length || 0)
    //console.log("Has userProfile:", !!body.userProfile)
    //console.log("Has healthData:", !!body.healthData)
    //console.log("Has recentHealthData:", !!body.recentHealthData)
    //console.log("Recent health data count:", body.recentHealthData?.length || 0)
    //console.log("Has aiMemory:", !!body.aiMemory)
    if (body.aiMemory && typeof body.aiMemory === 'object') {
      // 处理多个专家的记忆
      const memoryCount = Object.keys(body.aiMemory).length
      //console.log("AI Memory experts count:", memoryCount)
      Object.entries(body.aiMemory).forEach(([expertId, memory]: [string, any]) => {
        //console.log(`- ${expertId}: ${memory?.content?.length || 0} chars`)
      })
    } else {
      //console.log("AI Memory content length:", body.aiMemory?.content?.length || 0)
    }

    const { messages, userProfile, healthData, recentHealthData, systemPrompt: customSystemPrompt, expertRole, aiMemory, images, allowedTools: allowedToolsRaw } = body
    const allowedTools: string[] = Array.isArray(allowedToolsRaw) ? allowedToolsRaw.filter((n: unknown) => typeof n === 'string') as string[] : []

    // 详细记录接收到的健康数据
    //console.log("=== 接收到的健康数据详情 ===")
    if (userProfile) {
      //console.log("用户资料:", {
      //  weight: userProfile.weight,
      //  height: userProfile.height,
      //  age: userProfile.age,
      //  gender: userProfile.gender,
      //  activityLevel: userProfile.activityLevel,
      //  goal: userProfile.goal,
      //  targetWeight: userProfile.targetWeight,
      //  targetCalories: userProfile.targetCalories,
      //  professionalMode: userProfile.professionalMode,
      //  hasNotes: !!userProfile.notes,
      //  hasMedicalHistory: !!userProfile.medicalHistory,
      //  hasLifestyle: !!userProfile.lifestyle,
      //  hasHealthAwareness: !!userProfile.healthAwareness,
      //})
    }

    if (healthData) {
      //console.log("今日健康数据:", {
      //  date: healthData.date,
      //  weight: healthData.weight,
      //  calculatedBMR: healthData.calculatedBMR,
      //  calculatedTDEE: healthData.calculatedTDEE,
      //  foodEntriesCount: healthData.foodEntries?.length || 0,
      //  exerciseEntriesCount: healthData.exerciseEntries?.length || 0,
      //  summary: healthData.summary,
      //  dailyStatus: healthData.dailyStatus,
      //  tefAnalysis: healthData.tefAnalysis,
      //})

      if (healthData.foodEntries?.length > 0) {
        //console.log("今日食物记录:", healthData.foodEntries.map((entry, index) => ({
        //  序号: index + 1,
        //  食物名称: entry.food_name,
        //  重量: `${entry.consumed_grams}g`,
        //  卡路里: entry.total_nutritional_info_consumed?.calories,
        //  蛋白质: entry.total_nutritional_info_consumed?.protein,
        //  碳水: entry.total_nutritional_info_consumed?.carbohydrates,
        //  脂肪: entry.total_nutritional_info_consumed?.fat,
        //  餐次: entry.meal_type,
        //  时间段: entry.time_period,
        //})))
      }

      if (healthData.exerciseEntries?.length > 0) {
        //console.log("今日运动记录:", healthData.exerciseEntries.map((entry, index) => ({
        //  序号: index + 1,
        //  运动名称: entry.exercise_name,
        //  时长: `${entry.duration_minutes}分钟`,
        //  卡路里消耗: entry.calories_burned_estimated,
        //  运动类型: entry.exercise_type,
        //  肌肉群: entry.muscle_groups,
        //})))
      }
    }

    if (recentHealthData?.length > 0) {
      console.log("近期健康数据概览:", recentHealthData.map((log: any, index: number) => ({
        天数: index === 0 ? "今天" : index === 1 ? "昨天" : `${index}天前`,
        日期: log.date,
        体重: log.weight,
        BMR: log.calculatedBMR,
        TDEE: log.calculatedTDEE,
        摄入卡路里: log.summary?.totalCaloriesConsumed,
        消耗卡路里: log.summary?.totalCaloriesBurned,
        净卡路里: log.summary ? (log.summary.totalCaloriesConsumed - log.summary.totalCaloriesBurned) : 0,
        热量缺口: log.summary && log.calculatedTDEE ?
          (log.calculatedTDEE - (log.summary.totalCaloriesConsumed - log.summary.totalCaloriesBurned)) : null,
        食物记录数: log.foodEntries?.length || 0,
        运动记录数: log.exerciseEntries?.length || 0,
        有每日状态: !!log.dailyStatus,
        有TEF分析: !!log.tefAnalysis,
      })))
    }

    //console.log("专家角色信息:", {
    //  id: expertRole?.id,
    //  name: expertRole?.name,
    //  title: expertRole?.title,
    //  systemPromptLength: customSystemPrompt?.length || 0,
    //})
    //console.log("=== 健康数据接收完成 ===")

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: "Invalid messages format" }, { status: 400 })
    }

    // AI配置已在开始时解析，这里直接使用

    const modelConfig = aiConfig.chatModel
    //console.log("Chat model config:", {
    //  name: modelConfig?.name,
    //  baseUrl: modelConfig?.baseUrl,
    //  hasApiKey: !!modelConfig?.apiKey,
    //  source: modelConfig?.source,
    //})

    // 获取用户选择的对话模型
    let selectedModel = "gemini-2.5-flash-preview-05-20" // 默认模型
    let fallbackConfig: { baseUrl: string; apiKey: string } | undefined = undefined

    if (modelConfig?.source === 'shared' && modelConfig?.sharedKeyConfig?.selectedModel) {
      // 共享模式：使用 selectedModel
      selectedModel = modelConfig.sharedKeyConfig.selectedModel
    } else if (modelConfig?.source === 'private' || !modelConfig?.source) {
      // 私有模式：使用用户自己的配置
      if (modelConfig?.name) {
        selectedModel = modelConfig.name
      }

      // 设置私有配置作为fallback
      if (modelConfig?.baseUrl && modelConfig?.apiKey) {
        fallbackConfig = {
          baseUrl: modelConfig.baseUrl,
          apiKey: modelConfig.apiKey
        }
      } else {
        // 🔄 私有配置不完整，回滚使用计数（如果需要）
        await rollbackUsageIfNeeded(usageManager || null, session.user.id, 'conversation_count')
        return Response.json({
          error: "私有模式需要完整的AI配置（模型名称、API地址、API密钥）",
          code: "INCOMPLETE_AI_CONFIG"
        }, { status: 400 })
      }
    }

    //console.log('🔍 Using selected chat model:', selectedModel)
    //console.log('🔍 Chat model source:', modelConfig?.source)
    //console.log('🔍 Fallback config available:', !!fallbackConfig)

    // 构建系统提示词
    let systemPrompt = customSystemPrompt ||
      "你是Snapifit AI健康助手，一个专业的健康管理AI。你可以基于用户的健康数据提供个性化的建议，包括营养、运动、生活方式等各个方面。请用专业但易懂的语言回答用户问题。"

    // === 计算 BMI 与体重变化预测（供后续插入 systemPrompt） ===
    const heightCmForBMI = userProfile?.height;
    const currentWeightForBMI = healthData?.weight ?? userProfile?.weight;

    let bmiValue: number | undefined = undefined;
    if (heightCmForBMI && currentWeightForBMI) {
      const h = heightCmForBMI / 100;
      bmiValue = currentWeightForBMI / (h * h);
    }

    let weightChangePrediction: { dailyCalorieDiff: number; weeklyKg: number; monthlyKg: number } | undefined;
    if (healthData?.summary && typeof healthData.calculatedTDEE === 'number') {
      const net = (healthData.summary.totalCaloriesConsumed || 0) - (healthData.summary.totalCaloriesBurned || 0);
      const diff = net - healthData.calculatedTDEE; // 正值=盈余，负值=缺口
      const kgPerKcal = 1 / 7700; // 7700kcal ≈ 1kg
      weightChangePrediction = {
        dailyCalorieDiff: diff,
        weeklyKg: -(diff * 7 * kgPerKcal),
        monthlyKg: -(diff * 30 * kgPerKcal)
      };
    }

    //console.log("Using expert role:", expertRole?.name || "通用助手")
    //console.log("System prompt length:", systemPrompt.length)

    // 使用传递过来的近期健康数据
    //console.log("Recent health data received:", recentHealthData?.length || 0, "days")

    // 如果有用户资料和健康数据，添加到系统提示词中
    if (userProfile || healthData || (recentHealthData && recentHealthData.length > 0)) {
      //console.log("=== 开始构建系统提示词 ===")
      //console.log("将要添加到系统提示词的数据:", {
      //  userProfile: userProfile ? {
      //    weight: userProfile.weight,
      //    height: userProfile.height,
      //    age: userProfile.age,
      //    gender: userProfile.gender,
      //    activityLevel: userProfile.activityLevel,
      //    goal: userProfile.goal,
      //    targetWeight: userProfile.targetWeight,
      //    targetCalories: userProfile.targetCalories,
      //    professionalMode: userProfile.professionalMode,
      //  } : null,
      //  healthData: healthData ? {
      //    date: healthData.date,
      //    weight: healthData.weight,
      //    calculatedBMR: healthData.calculatedBMR,
      //    calculatedTDEE: healthData.calculatedTDEE,
      //    foodEntriesCount: healthData.foodEntries?.length || 0,
      //    exerciseEntriesCount: healthData.exerciseEntries?.length || 0,
      //    summary: healthData.summary,
      //    dailyStatus: healthData.dailyStatus,
      //    tefAnalysis: healthData.tefAnalysis,
      //  } : null,
      //  recentHealthDataCount: recentHealthData?.length || 0,
      //  recentHealthDataDates: recentHealthData?.map(log => log.date) || [],
      //})

      if (userProfile) {
        systemPrompt += `

        用户资料:
        - 体重: ${userProfile.weight || "未知"} kg
        - 身高: ${userProfile.height || "未知"} cm
        - 年龄: ${userProfile.age || "未知"} 岁
        - 性别: ${
          userProfile.gender === "male" ? "男" : userProfile.gender === "female" ? "女" : userProfile.gender || "未知"
        }
        - 活动水平: ${
          ({
            sedentary: "久坐不动",
            light: "轻度活跃",
            moderate: "中度活跃",
            active: "高度活跃",
            very_active: "非常活跃",
          } as Record<string, string>)[userProfile.activityLevel as string] ||
          userProfile.activityLevel ||
          "未知"
        }
        - 健康目标: ${
          ({
            lose_weight: "减重",
            maintain: "保持体重",
            gain_weight: "增重",
            build_muscle: "增肌",
            improve_health: "改善健康",
          } as Record<string, string>)[userProfile.goal as string] ||
          userProfile.goal ||
          "未知"
        }
        ${userProfile.targetWeight ? `- 目标体重: ${userProfile.targetWeight} kg` : ""}
        ${userProfile.targetCalories ? `- 目标每日卡路里: ${userProfile.targetCalories} kcal` : ""}
        ${(() => {
          const notesContent = [
            userProfile.notes,
            userProfile.professionalMode && userProfile.medicalHistory ? `\n\n详细医疗信息:\n${userProfile.medicalHistory}` : '',
            userProfile.professionalMode && userProfile.lifestyle ? `\n\n生活方式信息:\n${userProfile.lifestyle}` : '',
            userProfile.professionalMode && userProfile.healthAwareness ? `\n\n健康认知与期望:\n${userProfile.healthAwareness}` : ''
          ].filter(Boolean).join('');
          return notesContent ? `- 其他目标或注意事项: ${notesContent}` : '';
        })()}
        `
      }

      if (healthData) {
        systemPrompt += `

        今日健康数据 (${healthData.date || "今日"}):
        - 当日体重: ${healthData.weight ? `${healthData.weight} kg` : "未记录"}
        - 基础代谢率(BMR): ${healthData.calculatedBMR?.toFixed(0) || "未计算"} kcal
        - 总能量消耗(TDEE): ${healthData.calculatedTDEE?.toFixed(0) || "未计算"} kcal
        - 总卡路里摄入: ${healthData.summary?.totalCaloriesConsumed?.toFixed(0) || "0"} kcal
        - 总卡路里消耗: ${healthData.summary?.totalCaloriesBurned?.toFixed(0) || "0"} kcal
        - 净卡路里: ${
          healthData.summary
            ? (healthData.summary.totalCaloriesConsumed - healthData.summary.totalCaloriesBurned).toFixed(0)
            : "0"
        } kcal
        - 热量缺口/盈余: ${
          healthData.summary && healthData.calculatedTDEE
            ? (healthData.calculatedTDEE - (healthData.summary.totalCaloriesConsumed - healthData.summary.totalCaloriesBurned)).toFixed(0)
            : "无法计算"
        } kcal (正数为缺口，负数为盈余)
        ${bmiValue ? `- 体重指数(BMI): ${bmiValue.toFixed(1)}` : ""}
        ${weightChangePrediction ? `- 预测体重变化: 日差 ${weightChangePrediction.dailyCalorieDiff.toFixed(0)} kcal → 约每周 ${weightChangePrediction.weeklyKg.toFixed(2)}kg, 每月 ${weightChangePrediction.monthlyKg.toFixed(2)}kg` : ""}
        - 宏量营养素摄入:
          * 蛋白质: ${healthData.summary?.macros?.protein?.toFixed(1) || "0"} g (${healthData.summary?.macros?.protein && healthData.summary?.totalCaloriesConsumed ? ((healthData.summary.macros.protein * 4 / healthData.summary.totalCaloriesConsumed) * 100).toFixed(1) : "0"}%)
          * 碳水化合物: ${healthData.summary?.macros?.carbs?.toFixed(1) || "0"} g (${healthData.summary?.macros?.carbs && healthData.summary?.totalCaloriesConsumed ? ((healthData.summary.macros.carbs * 4 / healthData.summary.totalCaloriesConsumed) * 100).toFixed(1) : "0"}%)
          * 脂肪: ${healthData.summary?.macros?.fat?.toFixed(1) || "0"} g (${healthData.summary?.macros?.fat && healthData.summary?.totalCaloriesConsumed ? ((healthData.summary.macros.fat * 9 / healthData.summary.totalCaloriesConsumed) * 100).toFixed(1) : "0"}%)
        - 食物记录数: ${healthData.foodEntries?.length || 0} 条
        - 运动记录数: ${healthData.exerciseEntries?.length || 0} 条
        ${healthData.dailyStatus ? `
        - 每日状态: ${formatDailyStatusForAI(healthData.dailyStatus)}
        ` : ""}
        ${healthData.tefAnalysis ? `
        - 食物热效应(TEF):
          * 基础TEF: ${healthData.tefAnalysis.baseTEF.toFixed(1)} kcal (${healthData.tefAnalysis.baseTEFPercentage.toFixed(1)}%)
          * 增强乘数: ×${healthData.tefAnalysis.enhancementMultiplier.toFixed(2)}
          * 增强后TEF: ${healthData.tefAnalysis.enhancedTEF.toFixed(1)} kcal
          * 增强因素: ${healthData.tefAnalysis.enhancementFactors.join(", ") || "无"}
        ` : ""}
        `
      }

      if (healthData?.foodEntries?.length > 0) {
        systemPrompt += `
        今日食物记录:
        ${healthData.foodEntries.map((entry: any) => {
          const nutrition = entry.total_nutritional_info_consumed;
          return `- ${entry.food_name} (${entry.consumed_grams}g): ${nutrition?.calories?.toFixed(0) || 0} kcal
          蛋白质: ${nutrition?.protein?.toFixed(1) || 0}g, 碳水: ${nutrition?.carbohydrates?.toFixed(1) || 0}g, 脂肪: ${nutrition?.fat?.toFixed(1) || 0}g
          ${entry.meal_type ? `餐次: ${entry.meal_type}` : ""}${entry.time_period ? `, 时间: ${entry.time_period}` : ""}${entry.timestamp ? `, 记录时间: ${new Date(entry.timestamp).toLocaleTimeString('zh-CN')}` : ""}`
        }).join('\n')}
        `
      }

      if (healthData?.exerciseEntries?.length > 0) {
        systemPrompt += `
        今日运动记录:
        ${healthData.exerciseEntries.map((entry: any) =>
          `- ${entry.exercise_name} (${entry.duration_minutes}分钟): ${entry.calories_burned_estimated?.toFixed(0) || entry.calories_burned || 0} kcal
          ${entry.notes ? `备注: ${entry.notes}` : ""}`
        ).join('\n')}
        `
      }

      // 添加历史数据趋势（排除今天）
      if (recentHealthData && recentHealthData.length > 0) {
        // 过滤掉今天的数据，只显示历史数据
        const historicalData = recentHealthData.filter((dayLog: any, index: number) => index > 0)

        if (historicalData.length > 0) {
          systemPrompt += `

        历史健康数据趋势 (最近${historicalData.length}天):
        ${historicalData.map((dayLog: any, index: number) => {
          const dayLabel = index === 0 ? "昨天" : `${index + 1}天前`

          // 检查是否有饮食记录
          const hasFoodData = dayLog.foodEntries?.length > 0
          const hasExerciseData = dayLog.exerciseEntries?.length > 0
          const hasWeightData = dayLog.weight !== undefined
          const hasStatusData = !!dayLog.dailyStatus

          // 如果完全没有数据，显示简化信息
          if (!hasFoodData && !hasExerciseData && !hasWeightData && !hasStatusData) {
            return `
        ${dayLabel} (${dayLog.date}): 无记录数据`
          }

          return `
        ${dayLabel} (${dayLog.date}):
        - 体重: ${dayLog.weight ? `${dayLog.weight} kg` : "未记录"}
        - BMR: ${dayLog.calculatedBMR?.toFixed(0) || "未计算"} kcal
        - TDEE: ${dayLog.calculatedTDEE?.toFixed(0) || "未计算"} kcal
        ${hasFoodData || hasExerciseData ? `- 摄入: ${dayLog.summary?.totalCaloriesConsumed?.toFixed(0) || "0"} kcal
        - 消耗: ${dayLog.summary?.totalCaloriesBurned?.toFixed(0) || "0"} kcal
        - 净卡路里: ${dayLog.summary ? (dayLog.summary.totalCaloriesConsumed - dayLog.summary.totalCaloriesBurned).toFixed(0) : "0"} kcal
        - 热量缺口: ${dayLog.summary && dayLog.calculatedTDEE ? (dayLog.calculatedTDEE - (dayLog.summary.totalCaloriesConsumed - dayLog.summary.totalCaloriesBurned)).toFixed(0) : "无法计算"} kcal` : "- 饮食运动: 无记录"}
        ${hasFoodData ? `- 宏量营养素: 蛋白质 ${dayLog.summary?.macros?.protein?.toFixed(1) || "0"}g (${dayLog.summary?.macros?.protein && dayLog.summary?.totalCaloriesConsumed ? ((dayLog.summary.macros.protein * 4 / dayLog.summary.totalCaloriesConsumed) * 100).toFixed(1) : "0"}%), 碳水 ${dayLog.summary?.macros?.carbs?.toFixed(1) || "0"}g (${dayLog.summary?.macros?.carbs && dayLog.summary?.totalCaloriesConsumed ? ((dayLog.summary.macros.carbs * 4 / dayLog.summary.totalCaloriesConsumed) * 100).toFixed(1) : "0"}%), 脂肪 ${dayLog.summary?.macros?.fat?.toFixed(1) || "0"}g (${dayLog.summary?.macros?.fat && dayLog.summary?.totalCaloriesConsumed ? ((dayLog.summary.macros.fat * 9 / dayLog.summary.totalCaloriesConsumed) * 100).toFixed(1) : "0"}%)` : ""}
        - 记录数量: 食物${dayLog.foodEntries?.length || 0}条, 运动${dayLog.exerciseEntries?.length || 0}条
        ${dayLog.dailyStatus ? `- 状态: ${formatDailyStatusForAI(dayLog.dailyStatus)}` : ""}
        ${dayLog.tefAnalysis ? `- TEF增强: ×${dayLog.tefAnalysis.enhancementMultiplier.toFixed(2)} (${dayLog.tefAnalysis.enhancementFactors.join(", ") || "无"})` : ""}
        ${dayLog.foodEntries?.length > 0 ? `
        主要食物: ${dayLog.foodEntries.slice(0, 3).map((entry: any) => `${entry.food_name}(${entry.consumed_grams}g)`).join(", ")}${dayLog.foodEntries.length > 3 ? "..." : ""}` : ""}
        ${dayLog.exerciseEntries?.length > 0 ? `
        主要运动: ${dayLog.exerciseEntries.slice(0, 2).map((entry: any) => `${entry.exercise_name}(${entry.duration_minutes}分钟${entry.time_period ? ", " + entry.time_period : ""})`).join(", ")}${dayLog.exerciseEntries.length > 2 ? "..." : ""}` : ""}
          `
        }).join('\n')}
        `
        }
      }

      // 添加AI记忆信息
      if (aiMemory) {
        if (typeof aiMemory === 'object' && !aiMemory.content) {
          // 处理多个专家的记忆
          const memories = Object.entries(aiMemory).filter(([_, memory]: [string, any]) => memory?.content)
          if (memories.length > 0) {
            systemPrompt += `

        团队记忆 (各专家关于用户的重要信息):
        ${memories.map(([expertId, memory]: [string, any]) => {
          const expertNames: Record<string, string> = {
            general: "通用助手",
            nutrition: "营养师",
            fitness: "健身教练",
            psychology: "心理咨询师",
            medical: "医疗顾问",
            sleep: "睡眠专家"
          }
          const expertName = expertNames[expertId] || expertId
          const updateTime = memory.lastUpdated ? new Date(memory.lastUpdated).toLocaleString('zh-CN') : "未知"
          const version = memory.version || 1

          // 检查记忆是否有时间标记
          const hasTimeWarning = memory.content?.startsWith('[该内容距今时间较长，可能会有更新]')
          const daysSinceUpdate = memory.lastUpdated ?
            Math.floor((Date.now() - new Date(memory.lastUpdated).getTime()) / (1000 * 60 * 60 * 24)) : null

          return `
        【${expertName}的记忆】
        ${memory.content}
        (更新时间: ${updateTime}, 版本: ${version}${hasTimeWarning ? ', ⚠️ 该记忆距今较长，建议确认是否仍然准确' : ''})`
        }).join('\n')}

        注意:
        1. 你可以查看所有专家的记忆来提供更全面的建议
        2. 但你只能更新自己专业领域的记忆
        3. 如果看到记忆内容以"[该内容距今时间较长，可能会有更新]"开头，说明这是较旧的记忆，请在使用时主动询问用户该信息是否仍然准确
        4. 如果本次对话中有重要的新信息需要记住，可以在回答末尾提出更新记忆的请求

        ⚠️ 团队协作重要原则 - 主动剪枝避免重复:
        - **必须主动检查其他专家的记忆内容**：在更新自己的记忆前，仔细查看其他专家已记录的信息
        - **严禁重复记录相同信息**：如果其他专家已经记录了某项信息，你不得在自己的记忆中重复记录
        - **以其他专家的记录为准**：当发现重复内容时，应删除自己记忆中的重复部分，以其他专家的专业记录为准
        - **主动进行内容剪枝**：定期检查并清理自己记忆中与其他专家重复的内容
        - **专业分工明确**：只记录与自己专业领域直接相关的独特信息
        - **交叉引用而非重复**：如需引用其他专家的信息，使用"参考营养师记忆"等方式，而不是重复记录

        记忆处理原则:
        - 对于标记为"较长时间"的记忆，使用时要谨慎，建议先确认信息的准确性
        - 当用户确认或更新了旧记忆中的信息时，应该更新记忆内容（移除时间标记）
        - 记忆内容必须极度精简，不超过500字
        - 只记录核心事实，避免冗余描述
        - 不能包含特殊符号，使用简洁的中文表达
        - 避免复杂句式
        - **更新记忆前必须检查团队其他专家的记忆，避免重复内容**
        `
          }
        } else if (aiMemory.content) {
          // 处理单个专家的记忆（向后兼容）
          systemPrompt += `

        我的记忆 (关于用户的重要信息):
        ${aiMemory.content}

        记忆更新时间: ${aiMemory.lastUpdated ? new Date(aiMemory.lastUpdated).toLocaleString('zh-CN') : "未知"}
        记忆版本: ${aiMemory.version || 1}


        注意: 请基于这些记忆信息提供更个性化的建议。如果本次对话中有重要的新信息需要记住，可以在回答末尾提出更新记忆的请求。

        记忆更新格式要求:
        - 记忆内容必须极度精简，不超过500字
        - 只记录核心事实，避免冗余描述
        - 不能包含特殊符号，使用简洁的中文表达
        - 避免复杂句式
        `
        }
      }

      systemPrompt += `
        Snapifit AI(简称SF）是一个健康管理平台，可以实现AI交互的快速饮食、运动和状态日记及专业分析，而你是SF雇佣的AI健康专家。
        请根据以上详细信息，以${expertRole?.name || "专业健康助手"}的身份提供个性化的回答和建议。
        ${expertRole?.description ? `专业领域: ${expertRole.description}` : ""}

        重要提示: 如果在对话中发现了关于用户的重要新信息（如新的健康目标、偏好、限制条件、重要的健康变化等），
        并且这些信息对未来的建议很有价值，你可以在回答的最后添加一个特殊标记来请求更新记忆：

        [MEMORY_UPDATE_REQUEST]
        新记忆内容：[在这里写入需要记住的重要信息，限制在500字以内]
        更新原因：[简要说明为什么需要更新记忆]
        [/MEMORY_UPDATE_REQUEST]

        ⚠️ 记忆更新的重要原则：
        1. **这是替换操作，不是补充操作**：新记忆内容将完全替换你之前的记忆
        2. **必须结合并重写**：将之前的重要信息与新信息结合，重新组织成完整的记忆内容
        3. **保留重要历史信息**：不要丢失之前记录的重要信息
        4. **整合新旧信息**：将新发现的信息与已有记忆合并，形成更完整的用户画像
        5. **🔥 团队协作剪枝原则**：更新记忆前必须检查上述团队记忆，如果其他专家已记录相同信息，必须从自己的记忆中删除重复内容
        6. **专业分工明确**：只记录与自己专业领域直接相关的独特信息，避免跨领域重复
        7. **以其他专家为准**：当发现重复时，删除自己记忆中的重复部分，以其他专家的专业记录为准
        8. 只记录对长期健康管理有价值的信息
        9. 避免记录临时性的数据（如今天吃了什么）
        10. 保持记忆内容简洁明了，总共不超过500字

        记忆更新示例：

        **基础更新示例：**
        - 如果之前记忆："用户对乳制品过敏，目标减重5kg"
        - 新发现："用户开始力量训练，希望增肌"
        - 正确的新记忆内容："用户对乳制品过敏。健身目标已从单纯减重5kg调整为减脂增肌并重，开始进行力量训练。"

        **团队协作剪枝示例：**
        - 营养师记忆："用户对乳制品过敏，偏好低碳水饮食"
        - 健身教练之前记忆："用户对乳制品过敏，目标减重，开始力量训练"
        - 健身教练发现重复后的正确记忆："目标从减重调整为减脂增肌，开始力量训练，偏好上肢训练"
        - 说明：删除了与营养师重复的"乳制品过敏"信息，专注于运动相关的独特信息

        `

      //console.log("=== 系统提示词构建完成 ===")
      //console.log("最终系统提示词长度:", systemPrompt.length)
      //console.log("系统提示词包含的主要部分:")
      //console.log("- 专家角色定义:", !!customSystemPrompt)
      //console.log("- 用户资料:", !!userProfile)
      //console.log("- 今日健康数据:", !!healthData)
      //console.log("- 历史健康数据:", recentHealthData?.length || 0, "天")
      //console.log("- 今日食物记录:", healthData?.foodEntries?.length || 0, "条")
      //console.log("- 今日运动记录:", healthData?.exerciseEntries?.length || 0, "条")
      //console.log("- 每日状态记录:", !!healthData?.dailyStatus)
      //console.log("- TEF分析:", !!healthData?.tefAnalysis)

    } else {
      //console.log("=== 无健康数据 ===")
      //console.log("No user profile or health data provided", {
      //  hasUserProfile: !!userProfile,
      //  hasHealthData: !!healthData,
      //  hasRecentHealthData: !!recentHealthData,
      //})
    }

    // 🔗 统一使用 SharedOpenAIClient（支持混合模式）
    //console.log("Using SharedOpenAIClient for chat...")

    const { SharedOpenAIClient } = await import('@/lib/shared-openai-client')
    const isSharedMode = modelConfig?.source === 'shared'
    const sharedClient = new SharedOpenAIClient({
      userId: session.user.id,
      preferredModel: selectedModel,
      fallbackConfig,
      preferPrivate: !isSharedMode // 私有模式优先使用私有配置
    })

    // 清理消息格式，支持图片
    const cleanMessages = messages.map((msg: any) => {
      const cleanMsg: any = {
        role: msg.role,
        content: msg.content,
      }

      // 如果消息包含图片，添加到消息中
      if (msg.images && Array.isArray(msg.images) && msg.images.length > 0) {
        cleanMsg.images = msg.images
      }

      return cleanMsg
    })

    // 🔍 输出完整的上下文信息到控制台
    console.log("=== AI 上下文信息 ===")
    console.log("1. 系统提示词:")
    console.log(systemPrompt)
    console.log("\n2. 对话消息 (最近5条):")
    console.log(JSON.stringify(cleanMessages.slice(-5), null, 2))
    console.log("\n3. 用户档案:")
    console.log(JSON.stringify(userProfile, null, 2))
    console.log("\n4. 今日健康数据:")
    console.log(JSON.stringify(healthData, null, 2))
    console.log("\n5. 近期健康数据:")
    console.log(JSON.stringify(recentHealthData, null, 2))
    console.log("\n6. AI记忆:")
    console.log(JSON.stringify(aiMemory, null, 2))
    console.log("\n7. 专家角色:")
    console.log(JSON.stringify(expertRole, null, 2))
    console.log("\n8. 模型配置:")
    console.log(`选择的模型: ${selectedModel}`)
    console.log(`共享模式: ${isSharedMode}`)
    console.log("=== 上下文信息结束 ===\n")

    // ========== 使用 AI SDK (tools) 流式响应（私有模式优先） ==========
    if (modelConfig?.source === 'private' && fallbackConfig?.apiKey) {
      const openai = createOpenAI({ apiKey: fallbackConfig.apiKey, baseURL: fallbackConfig.baseUrl })
      const model = openai.chat(selectedModel)

      const cookie = req.headers.get('cookie') || ''
      const isToolAllowed = (name: string) => allowedTools.length === 0 || allowedTools.includes(name)

      const healthTool = tool({
        description: '调用内置健康工具',
        parameters: z.object({
          name: z.string(),
          params: z.record(z.any()).default({})
        }),
        execute: async ({ name, params }) => {
          if (!isToolAllowed(name)) {
            return { success: false, error: `工具未被允许: ${name}` }
          }
          const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/mcp/health-data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', cookie },
            body: JSON.stringify({ tool: name, params })
          })
          return await res.json()
        }
      })

      const externalMCP = tool({
        description: '调用外部 MCP Provider 工具',
        parameters: z.object({
          provider_id: z.string(),
          tool_name: z.string(),
          params: z.record(z.any()).default({})
        }),
        execute: async ({ provider_id, tool_name, params }) => {
          if (!isToolAllowed(tool_name)) {
            return { success: false, error: `工具未被允许: ${tool_name}` }
          }
          const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/mcp/bridge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', cookie },
            body: JSON.stringify({ action: 'call_tool', provider_id, tool_name, params })
          })
          return await res.json()
        }
      })

      const result = await streamText({
        model,
        system: systemPrompt,
        messages: cleanMessages as any,
        tools: { healthTool, externalMCP },
        maxSteps: 4
      })

      return result.toDataStreamResponse()
    }

    // ========== 共享模式：尝试用共享池的Key + AI SDK tools ==========
    try {
      const keyManager = new KeyManager()
      const { key, error } = await keyManager.getAvailableKey(selectedModel)
      if (!key || error) throw new Error(error || 'No shared key available')

      const openai = createOpenAI({ apiKey: key.apiKey, baseURL: key.baseUrl })
      const model = openai.chat(selectedModel)
      const cookie = req.headers.get('cookie') || ''
      const isToolAllowed = (name: string) => allowedTools.length === 0 || allowedTools.includes(name)

      const healthTool = tool({
        description: '调用内置健康工具',
        parameters: z.object({ name: z.string(), params: z.record(z.any()).default({}) }),
        execute: async ({ name, params }) => {
          if (!isToolAllowed(name)) {
            return { success: false, error: `工具未被允许: ${name}` }
          }
          const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/mcp/health-data`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ tool: name, params })
          })
          return await res.json()
        }
      })
      const externalMCP = tool({
        description: '调用外部 MCP Provider 工具',
        parameters: z.object({ provider_id: z.string(), tool_name: z.string(), params: z.record(z.any()).default({}) }),
        execute: async ({ provider_id, tool_name, params }) => {
          if (!isToolAllowed(tool_name)) {
            return { success: false, error: `工具未被允许: ${tool_name}` }
          }
          const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/mcp/bridge`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ action: 'call_tool', provider_id, tool_name, params })
          })
          return await res.json()
        }
      })

      const result = await streamText({ model, system: systemPrompt, messages: cleanMessages as any, tools: { healthTool, externalMCP }, maxSteps: 4 })

      // 简单成功计数
      if (key.id) {
        try { await keyManager.logKeyUsage(key.id, { sharedKeyId: key.id, userId: session.user.id, apiEndpoint: '/chat/completions', modelUsed: selectedModel, success: true }) } catch {}
      }

      return result.toDataStreamResponse()
    } catch (e) {
      // 回退到旧的 SharedOpenAIClient 流式
      const { stream } = await sharedClient.streamText({ model: selectedModel, messages: cleanMessages, system: systemPrompt })
      const encoder = new TextEncoder()
      const transformedStream = new ReadableStream({
        async start(controller) {
          let isControllerClosed = false
          const closeController = () => { if (!isControllerClosed) { isControllerClosed = true; controller.close() } }
          const enqueueData = (data: Uint8Array) => { if (!isControllerClosed) controller.enqueue(data) }
          try {
            const reader = stream.body?.getReader(); if (!reader) throw new Error('No stream reader available')
            const decoder = new TextDecoder('utf-8'); let buffer = ''
            while (true) {
              const { done, value } = await reader.read(); if (done) break
              buffer += decoder.decode(value, { stream: true }); const lines = buffer.split('\n'); buffer = lines.pop() || ''
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6)
                  if (data === '[DONE]') { enqueueData(encoder.encode(`d:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`)); closeController(); return }
                  try { const parsed = JSON.parse(data); const content = parsed.choices?.[0]?.delta?.content; if (content) enqueueData(encoder.encode(`0:"${content.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"\n`)) } catch {}
                }
              }
            }
            enqueueData(encoder.encode(`d:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`)); closeController()
          } catch (error) { if (!isControllerClosed) controller.error(error) }
        }
      })
      return new Response(transformedStream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' } })
    }
  } catch (error) {
    console.error('Chat API error:', error)

    // 发生异常，回滚使用计数
    if (session?.user?.id) {
      await rollbackUsageIfNeeded(usageManager || null, session.user.id, 'conversation_count')
    }

    return Response.json(
      {
        error: "Failed to process chat request",
        code: "AI_SERVICE_ERROR",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

// 获取下次重置时间
function getNextResetTime(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  return tomorrow.toISOString()
}
