/**
 * MCP集成Hook
 * 管理MCP工具与Chat系统的集成
 */

import { useState, useCallback, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import type { Message } from 'ai'

interface MCPIntegrationOptions {
  expertRole?: string
  healthData?: any
  userProfile?: any
  autoSuggest?: boolean
}

interface ToolResult {
  toolName: string
  result: any
  timestamp: string
  insertedIntoChat: boolean
}

interface ToolSuggestion {
  tool: string
  name: string
  description: string
  confidence: number
  reason: string
  category: string
  params?: Record<string, any>
}

export function useMCPIntegration({
  expertRole = 'general',
  healthData,
  userProfile,
  autoSuggest = true
}: MCPIntegrationOptions) {
  const { toast } = useToast()
  const [toolResults, setToolResults] = useState<ToolResult[]>([])
  const [suggestions, setSuggestions] = useState<ToolSuggestion[]>([])
  const [isExecuting, setIsExecuting] = useState(false)
  const [executingTool, setExecutingTool] = useState<string | null>(null)

  /**
   * 分析消息并生成工具建议
   */
  const analyzeMessage = useCallback((message: string): ToolSuggestion[] => {
    if (!autoSuggest) return []

    const suggestions: ToolSuggestion[] = []

    // 营养分析
    if (/营养|卡路里|热量|蛋白质|碳水|脂肪|食物/.test(message)) {
      if (healthData?.foodEntries?.length > 0) {
        suggestions.push({
          tool: 'nutrition_calculator',
          name: '营养分析',
          description: '分析今日摄入的营养成分',
          confidence: 0.9,
          reason: '检测到营养相关询问，且有今日食物记录',
          category: 'health',
          params: {
            foods: healthData.foodEntries.map((f: any) => f.food_name),
            portions: healthData.foodEntries.map((f: any) => f.consumed_grams)
          }
        })
      } else {
        suggestions.push({
          tool: 'nutrition_calculator',
          name: '营养计算器',
          description: '计算食物营养成分',
          confidence: 0.7,
          reason: '检测到营养相关询问',
          category: 'health'
        })
      }
    }

    // BMI计算
    if (/体重|身高|bmi|体质|肥胖|瘦|标准/.test(message)) {
      if (userProfile?.weight && userProfile?.height) {
        suggestions.push({
          tool: 'bmi_calculator',
          name: 'BMI计算',
          description: '计算您的身体质量指数',
          confidence: 0.95,
          reason: '检测到体重相关询问，且有完整身体数据',
          category: 'health',
          params: {
            weight: userProfile.weight,
            height: userProfile.height
          }
        })
      }
    }

    // 运动相关
    if (/运动|锻炼|健身|消耗|燃烧/.test(message)) {
      suggestions.push({
        tool: 'exercise_database_search',
        name: '运动查询',
        description: '搜索运动信息和卡路里消耗',
        confidence: 0.8,
        reason: '检测到运动相关询问',
        category: 'health'
      })
    }

    // 数据可视化
    if (/图表|趋势|分析|统计|变化/.test(message) && healthData) {
      suggestions.push({
        tool: 'chart_generator',
        name: '数据图表',
        description: '生成健康数据可视化图表',
        confidence: 0.75,
        reason: '检测到数据分析需求，且有健康数据',
        category: 'analysis'
      })
    }

    // 膳食规划
    if (/食谱|膳食|计划|搭配|推荐/.test(message)) {
      const params: any = {}
      if (userProfile?.targetCalories) {
        params.targetCalories = userProfile.targetCalories
      }
      if (userProfile?.goal) {
        params.goal = userProfile.goal
      }

      suggestions.push({
        tool: 'meal_planner',
        name: '膳食规划',
        description: '生成个性化膳食建议',
        confidence: 0.8,
        reason: '检测到膳食规划需求',
        category: 'health',
        params: Object.keys(params).length > 0 ? params : undefined
      })
    }

    return suggestions.filter(s => s.confidence > 0.6) // 只返回置信度较高的建议
  }, [autoSuggest, healthData, userProfile])

  /**
   * 执行工具
   */
  const executeTool = useCallback(async (
    toolName: string, 
    params: any = {},
    context: any = {}
  ): Promise<any> => {
    setIsExecuting(true)
    setExecutingTool(toolName)

    try {
      const response = await fetch('/api/mcp/secure-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: toolName,
          params,
          context: {
            expertId: expertRole,
            healthData,
            userProfile,
            ...context
          },
          securityToken: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '工具执行失败')
      }

      // 保存工具结果
      const toolResult: ToolResult = {
        toolName,
        result: result.result,
        timestamp: new Date().toISOString(),
        insertedIntoChat: false
      }

      setToolResults(prev => [toolResult, ...prev.slice(0, 9)]) // 保留最近10个结果

      toast({
        title: "工具执行成功",
        description: `${toolName.replace(/_/g, ' ')} 已完成`,
      })

      return result.result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      console.error('工具执行失败:', error)
      
      toast({
        title: "工具执行失败",
        description: errorMessage,
        variant: "destructive"
      })

      throw error
    } finally {
      setIsExecuting(false)
      setExecutingTool(null)
    }
  }, [expertRole, healthData, userProfile, toast])

  /**
   * 生成工具结果的聊天消息
   */
  const formatToolResultForChat = useCallback((
    toolName: string, 
    result: any
  ): string => {
    switch (toolName) {
      case 'nutrition_calculator':
        return `📊 营养分析结果：
• 总热量：${result.totalCalories} kcal
• 蛋白质：${result.totalProtein}g
• 碳水化合物：${result.totalCarbohydrates}g  
• 脂肪：${result.totalFat}g

计算时间：${new Date(result.calculatedAt).toLocaleString()}`

      case 'bmi_calculator':
        return `📏 BMI计算结果：
• BMI指数：${result.bmi}
• 体重分类：${result.category}
• 健康范围：${result.healthyRange}

计算时间：${new Date(result.calculatedAt).toLocaleString()}`

      case 'exercise_database_search':
        return `🏃 运动查询结果：
${result.exercises?.map((ex: any) => 
  `• ${ex.name}：${ex.caloriesPerHour} kcal/小时`
).join('\n') || '未找到相关运动'}

查询时间：${new Date().toLocaleString()}`

      case 'chart_generator':
        return `📈 数据图表已生成
类型：${result.chartType || '健康数据图表'}
时间范围：${result.timeRange || '最近7天'}

图表链接：${result.chartUrl || '图表生成中...'}`

      case 'meal_planner':
        return `🍽️ 膳食规划建议：
${result.meals?.map((meal: any) => 
  `• ${meal.name}：${meal.calories} kcal`
).join('\n') || '正在生成个性化建议...'}

规划时间：${new Date().toLocaleString()}`

      default:
        return `🔧 ${toolName.replace(/_/g, ' ')} 执行完成
结果：${typeof result === 'object' ? JSON.stringify(result, null, 2) : result}`
    }
  }, [])

  /**
   * 将工具结果插入到聊天中
   */
  const insertToolResultIntoChat = useCallback((
    toolResult: ToolResult,
    onInsert: (message: Message) => void
  ) => {
    const formattedContent = formatToolResultForChat(toolResult.toolName, toolResult.result)
    
    const message: Message = {
      id: `tool-result-${Date.now()}`,
      role: 'assistant',
      content: formattedContent,
      createdAt: new Date()
    }

    // 标记为已插入
    setToolResults(prev => 
      prev.map(tr => 
        tr === toolResult ? { ...tr, insertedIntoChat: true } : tr
      )
    )

    onInsert(message)
  }, [formatToolResultForChat])

  // 监听消息变化，自动生成建议
  const handleMessageChange = useCallback((message: string) => {
    if (message.length > 10) { // 只对有实际内容的消息分析
      const newSuggestions = analyzeMessage(message)
      setSuggestions(newSuggestions)
    } else {
      setSuggestions([])
    }
  }, [analyzeMessage])

  return {
    // 工具建议
    suggestions,
    setSuggestions,
    
    // 工具执行
    executeTool,
    isExecuting,
    executingTool,
    
    // 工具结果
    toolResults,
    formatToolResultForChat,
    insertToolResultIntoChat,
    
    // 消息分析
    analyzeMessage,
    handleMessageChange,
    
    // 工具信息
    getToolInfo: (toolName: string) => {
      const toolInfoMap: Record<string, any> = {
        'nutrition_calculator': {
          name: '营养计算器',
          description: '分析食物营养成分和热量',
          category: 'health',
          icon: '🥗'
        },
        'bmi_calculator': {
          name: 'BMI计算器', 
          description: '计算身体质量指数',
          category: 'health',
          icon: '📏'
        },
        'exercise_database_search': {
          name: '运动数据库',
          description: '查询运动信息',
          category: 'health', 
          icon: '🏃'
        },
        'chart_generator': {
          name: '图表生成器',
          description: '生成数据可视化',
          category: 'analysis',
          icon: '📊'
        },
        'meal_planner': {
          name: '膳食规划器',
          description: '生成膳食计划',
          category: 'health',
          icon: '🍽️'
        }
      }
      
      return toolInfoMap[toolName] || {
        name: toolName,
        description: '工具执行',
        category: 'utility',
        icon: '🔧'
      }
    }
  }
}