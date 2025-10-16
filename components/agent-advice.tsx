"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useUsageLimit } from "@/hooks/use-usage-limit"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { cn } from "@/lib/utils"
import type { DailyLog, AIConfig } from "@/lib/types"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useAgentAI } from "@/hooks/use-ai-service"

interface AgentAdviceProps {
  dailyLog: DailyLog
  userProfile: any
}

export function AgentAdvice({ dailyLog, userProfile }: AgentAdviceProps) {
  // 获取AI配置
  const [aiConfig] = useLocalStorage<AIConfig>("aiConfig", {
    agentModel: {
      name: "gpt-4o",
      baseUrl: "https://api.openai.com",
      apiKey: "",
      source: "shared", // 默认使用共享模型
    },
    chatModel: {
      name: "gpt-4o",
      baseUrl: "https://api.openai.com",
      apiKey: "",
      source: "shared", // 默认使用共享模型
    },
    visionModel: {
      name: "gemini-2.5-flash-preview-05-20",
      baseUrl: "https://api.openai.com",
      apiKey: "",
      source: "shared", // 默认使用共享模型
    },
    sharedKey: {
      selectedKeyIds: [],
    },
  })

  // 使用新的AI服务Hook
  const aiService = useAgentAI(aiConfig)

  const [advice, setAdvice] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const { toast } = useToast()
  const { refreshUsageInfo } = useUsageLimit()
  const abortControllerRef = useRef<AbortController | null>(null)




  const fetchAdvice = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setIsLoading(true)
    setIsStreaming(true)
    setAdvice("")

    try {
      // 检查配置是否有效
      if (!aiService.isConfigValid) {
        throw new Error(aiService.configError || '配置无效')
      }

      // 构建提示词
      const prompt = `
        用户档案:
        年龄: ${userProfile.age || '未知'}
        性别: ${userProfile.gender || '未知'}
        身高: ${userProfile.height || '未知'}cm
        体重: ${userProfile.weight || '未知'}kg
        健康目标: ${userProfile.goal || '未知'}

        今日数据:
        食物记录:
        ${dailyLog.foodEntries
          .map(
            (entry) =>
              `- ${entry.food_name}: ${entry.total_nutritional_info_consumed?.calories?.toFixed(0) || 0} kcal`,
          )
          .join("\n")}

        运动记录:
        ${dailyLog.exerciseEntries
          .map(
            (entry) =>
              `- ${entry.exercise_name} (${entry.duration_minutes}分钟): ${entry.calories_burned_estimated.toFixed(
                0,
              )} kcal`,
          )
          .join("\n")}

        请提供个性化、可操作的健康建议，包括饮食和运动方面的具体建议。建议应该是积极、鼓励性的，并且与用户的健康目标相符。
        请用中文回答，不超过300字，不需要分段，直接给出建议内容。
      `

      if (aiService.isPrivateMode) {
        // 私有模式：使用前端直接调用（非流式）
        const { text, source } = await aiService.generateText({ prompt })
        setAdvice(text)
        console.log(`[AgentAdvice] Generated advice using ${source} mode`)
      } else {
        // 共享模式：使用流式API
        const { stream, source } = await aiService.streamText({
          messages: [{ role: "user", content: prompt }]
        })

        if (!stream.body) {
          throw new Error("响应体为空")
        }

        const reader = stream.body.getReader()
        const decoder = new TextDecoder('utf-8')

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            setAdvice((prev) => prev + chunk)
          }
        } finally {
          reader.releaseLock()
          console.log(`[AgentAdvice] Generated advice using ${source} mode`)
        }
      }

      setIsStreaming(false)

      // 🔄 只有共享模式才需要刷新使用量信息
      if (!aiService.isPrivateMode) {
        console.log('[AgentAdvice] Refreshing usage info after successful advice generation')
        refreshUsageInfo()
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return
      }

      toast({
        title: "获取建议失败",
        description: error instanceof Error ? error.message : "无法获取个性化建议，请稍后重试",
        variant: "destructive",
      })
      setAdvice("基于您的健康数据，建议均衡饮食并保持适当运动。请记录更多数据以获取更精准的建议。")
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
    }
  }, [dailyLog, userProfile, aiService, toast, refreshUsageInfo])

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return (
    <div className="health-card h-full flex flex-col">
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-white">
              <RefreshCw className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-2xl font-semibold">智能建议</h3>
              <p className="text-muted-foreground text-lg">基于您的健康数据生成的个性化建议</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="lg"
            onClick={fetchAdvice}
            disabled={isLoading}
            className={cn("h-12 px-6", isLoading && "animate-spin")}
          >
            <RefreshCw className="mr-2 h-5 w-5" />
            {isLoading ? "生成中..." : "获取建议"}
          </Button>
        </div>
        <div className="flex-grow">
          {isLoading && !advice ? (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">正在生成个性化建议...</p>
            </div>
          ) : advice ? (
            <div className="space-y-4">
              <MarkdownRenderer content={advice} className="text-base" />
              {isStreaming && (
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                  <span className="text-sm text-muted-foreground">AI正在思考...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-lg text-muted-foreground">
                点击获取建议按钮，AI 将为您提供个性化的健康建议
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
