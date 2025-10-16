import { FunctionCallTool, AIToolContext, HealthDataContext, DailyLog, UserProfile } from '@/lib/types'
import { getMCPServerInstance } from '@/lib/mcp/core/server'
import { getHealthDataRAG } from '@/lib/rag/health-data-rag'
import { z } from 'zod'

// 工具权限管理
class ToolPermissionManager {
  private static readonly PERMISSIONS = {
    'read_profile': '读取用户资料',
    'read_health_data': '读取健康数据',
    'read_analysis': '读取分析数据',
    'write_health_data': '写入健康数据',
    'admin': '管理员权限'
  }

  static hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    return userPermissions.includes(requiredPermission) || userPermissions.includes('admin')
  }

  static validatePermissions(userPermissions: string[], requiredPermissions: string[]): void {
    for (const permission of requiredPermissions) {
      if (!this.hasPermission(userPermissions, permission)) {
        throw new Error(`权限不足: 需要 ${permission} 权限`)
      }
    }
  }
}

// 健康数据工具定义
export const healthDataTools: FunctionCallTool[] = [
  {
    name: 'get_user_profile',
    description: '获取用户的基本资料信息，包括年龄、性别、身高、体重、健康目标等',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    handler: async (params: {}, context: AIToolContext) => {
      ToolPermissionManager.validatePermissions(context.permissions, ['read_profile'])

      const mcpServer = getMCPServerInstance()
      return await mcpServer.handleToolCall('get_user_profile', { user_id: context.userId }, {
        userId: context.userId,
        sessionId: context.sessionId
      })
    },
    permissions: ['read_profile'],
    category: 'health_data'
  },

  {
    name: 'get_recent_health_data',
    description: '获取用户最近的健康数据，包括体重、饮食、运动记录',
    parameters: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: '获取最近多少天的数据（默认7天）',
          default: 7
        },
        data_types: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['weight', 'food', 'exercise', 'sleep', 'mood']
          },
          description: '要获取的数据类型'
        }
      },
      required: []
    },
    handler: async (params: { days?: number; data_types?: string[] }, context: AIToolContext) => {
      ToolPermissionManager.validatePermissions(context.permissions, ['read_health_data'])

      const days = params.days || 7
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)

      const mcpServer = getMCPServerInstance()
      return await mcpServer.handleToolCall('get_daily_logs', {
        user_id: context.userId,
        date_range: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        },
        data_types: params.data_types || ['weight', 'food', 'exercise', 'sleep', 'mood']
      }, {
        userId: context.userId,
        sessionId: context.sessionId
      })
    },
    permissions: ['read_health_data'],
    category: 'health_data'
  },

  {
    name: 'get_nutrition_analysis',
    description: '获取指定日期的营养分析数据，包括卡路里、宏量营养素、营养平衡等',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: '日期（YYYY-MM-DD格式），默认为今天'
        },
        include_tef: {
          type: 'boolean',
          description: '是否包含食物热效应分析',
          default: true
        }
      },
      required: []
    },
    handler: async (params: { date?: string; include_tef?: boolean }, context: AIToolContext) => {
      ToolPermissionManager.validatePermissions(context.permissions, ['read_health_data'])

      const date = params.date || new Date().toISOString().split('T')[0]

      const mcpServer = getMCPServerInstance()
      return await mcpServer.handleToolCall('get_nutrition_analysis', {
        user_id: context.userId,
        date,
        include_tef: params.include_tef !== false
      }, {
        userId: context.userId,
        sessionId: context.sessionId
      })
    },
    permissions: ['read_health_data'],
    category: 'analysis'
  },

  {
    name: 'get_weight_predictions',
    description: '获取体重预测数据，基于历史数据预测未来体重变化',
    parameters: {
      type: 'object',
      properties: {
        prediction_days: {
          type: 'number',
          description: '预测天数（3, 7, 14, 30）',
          enum: [3, 7, 14, 30],
          default: 7
        }
      },
      required: []
    },
    handler: async (params: { prediction_days?: number }, context: AIToolContext) => {
      ToolPermissionManager.validatePermissions(context.permissions, ['read_health_data'])

      const mcpServer = getMCPServerInstance()
      return await mcpServer.handleToolCall('get_weight_predictions', {
        user_id: context.userId,
        prediction_days: params.prediction_days || 7
      }, {
        userId: context.userId,
        sessionId: context.sessionId
      })
    },
    permissions: ['read_health_data'],
    category: 'analysis'
  },

  {
    name: 'search_health_data',
    description: '搜索健康数据，可以根据关键词搜索食物、运动等记录',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词'
        },
        date_range: {
          type: 'object',
          properties: {
            start: { type: 'string', description: '开始日期（YYYY-MM-DD）' },
            end: { type: 'string', description: '结束日期（YYYY-MM-DD）' }
          },
          description: '日期范围'
        },
        data_types: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['weight', 'food', 'exercise', 'sleep', 'mood']
          },
          description: '要搜索的数据类型'
        }
      },
      required: ['query']
    },
    handler: async (params: {
      query: string;
      date_range?: { start: string; end: string };
      data_types?: string[]
    }, context: AIToolContext) => {
      ToolPermissionManager.validatePermissions(context.permissions, ['read_health_data'])

      const mcpServer = getMCPServerInstance()
      return await mcpServer.handleToolCall('search_health_data', {
        user_id: context.userId,
        query: params.query,
        filters: {
          date_range: params.date_range,
          data_types: params.data_types
        }
      }, {
        userId: context.userId,
        sessionId: context.sessionId
      })
    },
    permissions: ['read_health_data'],
    category: 'health_data'
  },

  {
    name: 'rag_query_health_data',
    description: '使用RAG系统智能查询健康数据，可以回答复杂的健康问题',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '查询问题或关键词'
        },
        days: {
          type: 'number',
          description: '查询最近多少天的数据（默认30天）',
          default: 30
        },
        data_types: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['weight', 'food', 'exercise', 'sleep', 'mood']
          },
          description: '要查询的数据类型',
          default: ['weight', 'food', 'exercise', 'sleep', 'mood']
        },
        max_results: {
          type: 'number',
          description: '最大返回结果数量',
          default: 10
        }
      },
      required: ['query']
    },
    handler: async (params: {
      query: string;
      days?: number;
      data_types?: string[];
      max_results?: number
    }, context: AIToolContext) => {
      ToolPermissionManager.validatePermissions(context.permissions, ['read_health_data'])

      const days = params.days || 30
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)

      const rag = getHealthDataRAG()

      const ragQuery = {
        query: params.query,
        context: {
          userId: context.userId,
          dateRange: {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0]
          },
          dataTypes: params.data_types || ['weight', 'food', 'exercise', 'sleep', 'mood'],
          aggregationLevel: 'daily' as const,
          includeAnalysis: true,
          includePredictions: false
        },
        vectorThreshold: 0.7,
        maxResults: params.max_results || 10,
        includeMetadata: true
      }

      const ragResult = await rag.query(ragQuery)

      // 生成增强回答
      const enhancedResponse = await rag.generateEnhancedResponse(
        params.query,
        ragResult,
        ragQuery.context
      )

      return {
        answer: enhancedResponse,
        sources: ragResult.documents,
        query: params.query,
        processingTime: ragResult.processingTime
      }
    },
    permissions: ['read_health_data'],
    category: 'analysis'
  },

  {
    name: 'calculate_health_metrics',
    description: '计算健康指标，如BMI、基础代谢率、目标卡路里等',
    parameters: {
      type: 'object',
      properties: {
        metrics: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['bmi', 'bmr', 'tdee', 'target_calories', 'weight_change_rate']
          },
          description: '要计算的指标'
        },
        date: {
          type: 'string',
          description: '计算指定日期的指标（YYYY-MM-DD），默认为今天'
        }
      },
      required: ['metrics']
    },
    handler: async (params: { metrics: string[]; date?: string }, context: AIToolContext) => {
      ToolPermissionManager.validatePermissions(context.permissions, ['read_health_data'])

      const date = params.date || new Date().toISOString().split('T')[0]

      // 获取用户资料和健康数据
      const mcpServer = getMCPServerInstance()

      const [userProfile, dailyLogs] = await Promise.all([
        mcpServer.handleToolCall('get_user_profile', { user_id: context.userId }, {
          userId: context.userId,
          sessionId: context.sessionId
        }),
        mcpServer.handleToolCall('get_daily_logs', {
          user_id: context.userId,
          date_range: { start: date, end: date }
        }, {
          userId: context.userId,
          sessionId: context.sessionId
        })
      ])

      const results: Record<string, any> = {}
      const currentWeight = dailyLogs[0]?.weight || userProfile?.weight

      for (const metric of params.metrics) {
        switch (metric) {
          case 'bmi':
            if (currentWeight && userProfile?.height) {
              const heightM = userProfile.height / 100
              results.bmi = {
                value: currentWeight / (heightM * heightM),
                unit: 'kg/m²',
                category: getBMICategory(currentWeight / (heightM * heightM))
              }
            }
            break

          case 'bmr':
            if (dailyLogs[0]?.calculatedBMR) {
              results.bmr = {
                value: dailyLogs[0].calculatedBMR,
                unit: 'kcal/day'
              }
            }
            break

          case 'tdee':
            if (dailyLogs[0]?.calculatedTDEE) {
              results.tdee = {
                value: dailyLogs[0].calculatedTDEE,
                unit: 'kcal/day'
              }
            }
            break

          case 'target_calories':
            if (userProfile?.targetCalories) {
              results.target_calories = {
                value: userProfile.targetCalories,
                unit: 'kcal/day'
              }
            }
            break

          case 'weight_change_rate':
            // 计算体重变化率需要更多历史数据
            const recentLogs = await mcpServer.handleToolCall('get_daily_logs', {
              user_id: context.userId,
              date_range: {
                start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                end: date
              },
              data_types: ['weight']
            }, {
              userId: context.userId,
              sessionId: context.sessionId
            })

            if (recentLogs.length >= 2) {
              const weights = recentLogs.filter((log: any) => log.weight).map((log: any) => log.weight)
              if (weights.length >= 2) {
                const weightChange = weights[0] - weights[weights.length - 1]
                const days = recentLogs.length
                results.weight_change_rate = {
                  value: weightChange / days * 7, // 周变化率
                  unit: 'kg/week',
                  trend: weightChange > 0 ? 'increasing' : weightChange < 0 ? 'decreasing' : 'stable'
                }
              }
            }
            break
        }
      }

      return {
        date,
        metrics: results,
        calculatedAt: new Date().toISOString()
      }
    },
    permissions: ['read_health_data'],
    category: 'analysis'
  },

  {
    name: 'get_health_summary',
    description: '获取健康数据摘要，包括今日状态、本周趋势、目标完成情况等',
    parameters: {
      type: 'object',
      properties: {
        include_predictions: {
          type: 'boolean',
          description: '是否包含预测数据',
          default: true
        },
        include_recommendations: {
          type: 'boolean',
          description: '是否包含建议',
          default: true
        }
      },
      required: []
    },
    handler: async (params: {
      include_predictions?: boolean;
      include_recommendations?: boolean
    }, context: AIToolContext) => {
      ToolPermissionManager.validatePermissions(context.permissions, ['read_health_data'])

      const mcpServer = getMCPServerInstance()
      const today = new Date().toISOString().split('T')[0]

      // 并行获取各种数据
      const [
        userProfile,
        todayData,
        weeklyData,
        nutritionAnalysis,
        predictions
      ] = await Promise.all([
        mcpServer.handleToolCall('get_user_profile', { user_id: context.userId }, {
          userId: context.userId,
          sessionId: context.sessionId
        }),
        mcpServer.handleToolCall('get_daily_logs', {
          user_id: context.userId,
          date_range: { start: today, end: today }
        }, {
          userId: context.userId,
          sessionId: context.sessionId
        }),
        mcpServer.handleToolCall('get_daily_logs', {
          user_id: context.userId,
          date_range: {
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end: today
          }
        }, {
          userId: context.userId,
          sessionId: context.sessionId
        }),
        mcpServer.handleToolCall('get_nutrition_analysis', {
          user_id: context.userId,
          date: today,
          include_tef: true
        }, {
          userId: context.userId,
          sessionId: context.sessionId
        }),
        params.include_predictions ? mcpServer.handleToolCall('get_weight_predictions', {
          user_id: context.userId,
          prediction_days: 7
        }, {
          userId: context.userId,
          sessionId: context.sessionId
        }) : null
      ])

      return {
        date: today,
        userProfile,
        todayStatus: todayData[0] || null,
        weeklyTrend: {
          logs: weeklyData,
          summary: generateWeeklySummary(weeklyData)
        },
        nutritionAnalysis,
        predictions: predictions || null,
        recommendations: params.include_recommendations ? generateRecommendations(userProfile, todayData[0], weeklyData) : null,
        generatedAt: new Date().toISOString()
      }
    },
    permissions: ['read_health_data'],
    category: 'analysis'
  }
]

// 辅助函数
function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return '偏瘦'
  if (bmi < 24) return '正常'
  if (bmi < 28) return '偏胖'
  return '肥胖'
}

function generateWeeklySummary(weeklyData: any[]): any {
  const validWeights = weeklyData.filter(log => log.weight).map(log => log.weight)
  const totalCaloriesConsumed = weeklyData.reduce((sum, log) => sum + (log.summary?.totalCaloriesConsumed || 0), 0)
  const totalCaloriesBurned = weeklyData.reduce((sum, log) => sum + (log.summary?.totalCaloriesBurned || 0), 0)

  return {
    daysWithData: weeklyData.length,
    averageWeight: validWeights.length > 0 ? validWeights.reduce((sum, w) => sum + w, 0) / validWeights.length : null,
    weightChange: validWeights.length >= 2 ? validWeights[0] - validWeights[validWeights.length - 1] : null,
    totalCaloriesConsumed,
    totalCaloriesBurned,
    averageDailyCalories: weeklyData.length > 0 ? totalCaloriesConsumed / weeklyData.length : 0,
    exerciseDays: weeklyData.filter(log => log.exerciseEntries?.length > 0).length
  }
}

function generateRecommendations(userProfile: any, todayData: any, weeklyData: any[]): string[] {
  const recommendations: string[] = []

  // 基于今日数据的建议
  if (todayData) {
    const caloriesConsumed = todayData.summary?.totalCaloriesConsumed || 0
    const targetCalories = userProfile?.targetCalories || 2000

    if (caloriesConsumed < targetCalories * 0.8) {
      recommendations.push('今日卡路里摄入偏低，建议增加营养丰富的食物')
    } else if (caloriesConsumed > targetCalories * 1.2) {
      recommendations.push('今日卡路里摄入偏高，建议控制饮食或增加运动')
    }

    if (!todayData.exerciseEntries?.length) {
      recommendations.push('今日还没有运动记录，建议进行适量运动')
    }
  }

  // 基于周数据的建议
  const weeklySummary = generateWeeklySummary(weeklyData)
  if (weeklySummary.exerciseDays < 3) {
    recommendations.push('本周运动天数较少，建议增加运动频率')
  }

  if (weeklySummary.weightChange && Math.abs(weeklySummary.weightChange) > 1) {
    recommendations.push('体重变化较大，建议关注饮食和运动的平衡')
  }

  return recommendations
}

// 工具执行器
export class HealthToolExecutor {
  private tools: Map<string, FunctionCallTool> = new Map()
  private rateLimits: Map<string, number[]> = new Map()

  constructor() {
    // 注册所有工具
    healthDataTools.forEach(tool => {
      this.tools.set(tool.name, tool)
    })
  }

  // 执行工具
  async executeTool(
    toolName: string,
    params: Record<string, any>,
    context: AIToolContext
  ): Promise<any> {
    const tool = this.tools.get(toolName)
    if (!tool) {
      throw new Error(`工具不存在: ${toolName}`)
    }

    // 检查速率限制
    this.checkRateLimit(context.userId, toolName)

    // 验证参数
    this.validateParams(tool, params)

    // 验证权限
    ToolPermissionManager.validatePermissions(context.permissions, tool.permissions)

    try {
      console.log(`[Function Call] 执行工具: ${toolName}`, params)

      const result = await tool.handler(params, context)

      // 记录请求
      this.recordRequest(context.userId, toolName)

      console.log(`[Function Call] 工具执行成功: ${toolName}`)
      return result
    } catch (error) {
      console.error(`[Function Call] 工具执行失败: ${toolName}`, error)
      throw error
    }
  }

  // 获取可用工具列表
  getAvailableTools(userPermissions: string[]): FunctionCallTool[] {
    return Array.from(this.tools.values()).filter(tool =>
      tool.permissions.some(permission =>
        ToolPermissionManager.hasPermission(userPermissions, permission)
      )
    )
  }

  // 获取工具定义（用于 AI 模型）
  getToolDefinitions(userPermissions: string[]): any[] {
    return this.getAvailableTools(userPermissions).map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }))
  }

  // 验证参数
  private validateParams(tool: FunctionCallTool, params: Record<string, any>): void {
    try {
      const schema = z.object(tool.parameters.properties || {})
      schema.parse(params)
    } catch (error) {
      throw new Error(`参数验证失败: ${error}`)
    }
  }

  // 检查速率限制
  private checkRateLimit(userId: string, toolName: string): void {
    const key = `${userId}:${toolName}`
    const now = Date.now()
    const windowMs = 60 * 1000 // 1分钟
    const maxRequests = 30 // 每分钟最多30次

    if (!this.rateLimits.has(key)) {
      this.rateLimits.set(key, [])
    }

    const requests = this.rateLimits.get(key)!

    // 清理过期请求
    const validRequests = requests.filter(time => now - time < windowMs)
    this.rateLimits.set(key, validRequests)

    if (validRequests.length >= maxRequests) {
      throw new Error(`工具调用频率过高: ${toolName}`)
    }
  }

  // 记录请求
  private recordRequest(userId: string, toolName: string): void {
    const key = `${userId}:${toolName}`
    const now = Date.now()

    if (!this.rateLimits.has(key)) {
      this.rateLimits.set(key, [])
    }

    this.rateLimits.get(key)!.push(now)
  }
}

// 单例实例
let executorInstance: HealthToolExecutor | null = null

export function getHealthToolExecutor(): HealthToolExecutor {
  if (!executorInstance) {
    executorInstance = new HealthToolExecutor()
  }
  return executorInstance
}