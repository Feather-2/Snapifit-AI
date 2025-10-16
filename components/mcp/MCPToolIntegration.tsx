/**
 * MCP工具集成组件 - 与Chat系统无缝结合
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Calculator,
  Activity,
  Apple,
  TrendingUp,
  Zap,
  Shield,
  ExternalLink,
  Loader2
} from 'lucide-react'

interface MCPToolIntegrationProps {
  // 与chat系统的集成接口
  onToolResult?: (result: any, toolName: string) => void
  currentExpert?: string
  currentMessage?: string
  healthData?: any
  userProfile?: any
  // 是否显示在chat界面中
  embedded?: boolean
}

interface ToolSuggestion {
  tool: string
  name: string
  description: string
  confidence: number
  reason: string
  icon: any
  category: string
  params?: Record<string, any>
}

export function MCPToolIntegration({
  onToolResult,
  currentExpert = 'general',
  currentMessage = '',
  healthData,
  userProfile,
  embedded = false
}: MCPToolIntegrationProps) {
  const { toast } = useToast()
  const [suggestions, setSuggestions] = useState<ToolSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [executingTool, setExecutingTool] = useState<string | null>(null)
  const [lastResults, setLastResults] = useState<Record<string, any>>({})

  // 监听消息变化，自动分析工具建议
  useEffect(() => {
    if (currentMessage) {
      analyzeMessageForTools(currentMessage, currentExpert)
    }
  }, [currentMessage, currentExpert])

  // 监听MCP工具建议事件
  useEffect(() => {
    const handleToolSuggestions = (event: CustomEvent) => {
      setSuggestions(event.detail.suggestions.map(mapToToolSuggestion))
    }

    window.addEventListener('mcp:tool-suggestions', handleToolSuggestions as EventListener)
    return () => {
      window.removeEventListener('mcp:tool-suggestions', handleToolSuggestions as EventListener)
    }
  }, [])

  /**
   * 分析消息中的工具需求
   */
  const analyzeMessageForTools = useCallback(async (message: string, expertId: string) => {
    const toolSuggestions: ToolSuggestion[] = []

    // 营养相关
    if (/营养|卡路里|热量|食物|饮食/.test(message)) {
      toolSuggestions.push({
        tool: 'nutrition_calculator',
        name: '营养计算器',
        description: '计算食物的营养成分和热量',
        confidence: 0.9,
        reason: '检测到营养相关询问',
        icon: Apple,
        category: 'health',
        params: healthData?.foodEntries ? {
          foods: healthData.foodEntries.map((f: any) => f.food_name),
          portions: healthData.foodEntries.map((f: any) => f.consumed_grams)
        } : undefined
      })
    }

    // BMI计算
    if (/体重|身高|bmi|体质/.test(message) && userProfile?.weight && userProfile?.height) {
      toolSuggestions.push({
        tool: 'bmi_calculator',
        name: 'BMI计算器',
        description: '计算身体质量指数',
        confidence: 0.85,
        reason: '检测到体重相关询问且有用户数据',
        icon: Calculator,
        category: 'health',
        params: {
          weight: userProfile.weight,
          height: userProfile.height
        }
      })
    }

    // 运动相关
    if (/运动|锻炼|健身|消耗/.test(message)) {
      toolSuggestions.push({
        tool: 'exercise_database_search',
        name: '运动数据库',
        description: '搜索运动信息和卡路里消耗',
        confidence: 0.8,
        reason: '检测到运动相关询问',
        icon: Activity,
        category: 'health'
      })
    }

    // 数据图表
    if (/图表|趋势|可视化|分析/.test(message) && healthData) {
      toolSuggestions.push({
        tool: 'chart_generator',
        name: '图表生成器',
        description: '生成健康数据可视化图表',
        confidence: 0.75,
        reason: '检测到数据可视化需求',
        icon: TrendingUp,
        category: 'analysis'
      })
    }

    setSuggestions(toolSuggestions)
  }, [healthData, userProfile])

  /**
   * 执行工具调用
   */
  const executeTool = async (suggestion: ToolSuggestion) => {
    setExecutingTool(suggestion.tool)
    setIsLoading(true)

    try {
      // 获取一次性安全令牌
      const tokenRes = await fetch('/api/mcp/secure-proxy/token', { method: 'GET' })
      if (!tokenRes.ok) {
        throw new Error('获取安全令牌失败')
      }
      const { token } = await tokenRes.json()

      const response = await fetch('/api/mcp/secure-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: suggestion.tool,
          params: suggestion.params || {},
          context: {
            expertId: currentExpert,
            messageContext: currentMessage,
            healthData,
            userProfile
          },
          securityToken: token
        })
      })

      const result = await response.json()

      if (result.success) {
        setLastResults(prev => ({ ...prev, [suggestion.tool]: result.result }))

        // 通知chat系统工具结果
        if (onToolResult) {
          onToolResult(result.result, suggestion.tool)
        }

        toast({
          title: "工具执行成功",
          description: `${suggestion.name} 已完成`,
        })
      } else {
        throw new Error(result.error || '工具执行失败')
      }
    } catch (error) {
      console.error('工具执行失败:', error)
      toast({
        title: "工具执行失败",
        description: error instanceof Error ? error.message : '未知错误',
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
      setExecutingTool(null)
    }
  }

  /**
   * 映射工具建议数据
   */
  const mapToToolSuggestion = (suggestion: any): ToolSuggestion => {
    const toolMap: Record<string, Partial<ToolSuggestion>> = {
      'nutrition_calculator': {
        name: '营养计算器',
        description: '计算食物的营养成分和热量',
        icon: Apple,
        category: 'health'
      },
      'bmi_calculator': {
        name: 'BMI计算器',
        description: '计算身体质量指数',
        icon: Calculator,
        category: 'health'
      },
      'exercise_database_search': {
        name: '运动数据库',
        description: '搜索运动信息',
        icon: Activity,
        category: 'health'
      },
      'chart_generator': {
        name: '图表生成器',
        description: '生成数据可视化',
        icon: TrendingUp,
        category: 'analysis'
      }
    }

    return {
      ...suggestion,
      ...toolMap[suggestion.tool],
      tool: suggestion.tool
    }
  }

  /**
   * 渲染工具结果
   */
  const renderToolResult = (toolName: string, result: any) => {
    switch (toolName) {
      case 'nutrition_calculator':
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>总热量: {result.totalCalories} kcal</div>
              <div>蛋白质: {result.totalProtein}g</div>
              <div>碳水化合物: {result.totalCarbohydrates}g</div>
              <div>脂肪: {result.totalFat}g</div>
            </div>
          </div>
        )

      case 'bmi_calculator':
        return (
          <div className="space-y-2">
            <div className="text-lg font-medium">BMI: {result.bmi}</div>
            <div className="text-sm text-muted-foreground">
              分类: {result.category}
            </div>
            <div className="text-xs text-muted-foreground">
              健康范围: {result.healthyRange}
            </div>
          </div>
        )

      default:
        return (
          <pre className="text-sm whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        )
    }
  }

  // 嵌入模式：显示在聊天界面中
  if (embedded) {
    return (
      <div className="space-y-2">
        {suggestions.length > 0 && (
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="w-4 h-4" />
                工具建议
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {suggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => executeTool(suggestion)}
                    disabled={isLoading}
                    className="h-7 px-2 text-xs"
                  >
                    {executingTool === suggestion.tool && (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    )}
                    <suggestion.icon className="w-3 h-3 mr-1" />
                    {suggestion.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 工具结果显示 */}
        {Object.entries(lastResults).map(([toolName, result]) => (
          <Card key={toolName} className="bg-green-50 border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">工具结果</CardTitle>
            </CardHeader>
            <CardContent>
              {renderToolResult(toolName, result)}
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // 完整模式：独立的工具面板
  return (
    <TooltipProvider>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Zap className="w-4 h-4" />
            工具助手
            {suggestions.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {suggestions.length}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              MCP 工具助手
            </SheetTitle>
            <SheetDescription>
              安全的健康数据分析工具
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* 工具建议 */}
            {suggestions.length > 0 ? (
              <div>
                <h3 className="font-medium mb-2">推荐工具</h3>
                <div className="space-y-2">
                  {suggestions.map((suggestion, index) => (
                    <Card key={index} className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <suggestion.icon className="w-4 h-4" />
                            <span className="font-medium text-sm">{suggestion.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {(suggestion.confidence * 100).toFixed(0)}%
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {suggestion.description}
                          </p>
                          <p className="text-xs text-blue-600">
                            {suggestion.reason}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => executeTool(suggestion)}
                          disabled={isLoading}
                        >
                          {executingTool === suggestion.tool && (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          )}
                          执行
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  在聊天中提及营养、运动、体重等话题时，系统会自动推荐相关工具。
                </AlertDescription>
              </Alert>
            )}

            {/* 工具结果 */}
            {Object.keys(lastResults).length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-medium mb-2">执行结果</h3>
                  <div className="space-y-2">
                    {Object.entries(lastResults).map(([toolName, result]) => (
                      <Card key={toolName} className="p-3">
                        <div className="font-medium text-sm mb-2 capitalize">
                          {toolName.replace(/_/g, ' ')}
                        </div>
                        {renderToolResult(toolName, result)}
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  )
}