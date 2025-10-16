/**
 * 健康工具注册表
 * 管理11种健康MCP工具的定义和实现
 */

import {
  HealthMCPTool,
  MCPCallContext,
  HEALTH_TOOLS,
  HealthToolName
} from '../types'
import { DatabaseService } from '../services/database'

export class HealthToolRegistry {
  private tools: Map<string, HealthMCPTool> = new Map()

  constructor(private databaseService: DatabaseService) {
    this.registerAllTools()
  }

  /**
   * 统一执行入口：根据工具名路由到具体实现
   */
  async execute(toolName: HealthToolName, params: any, context: MCPCallContext): Promise<any> {
    switch (toolName) {
      case HEALTH_TOOLS.GET_USER_PROFILE:
        return this.getUserProfile(params, context)
      case HEALTH_TOOLS.GET_DAILY_LOGS:
        return this.getDailyLogs(params, context)
      case HEALTH_TOOLS.NUTRITION_CALCULATOR:
        return this.calculateNutrition(params, context)
      case HEALTH_TOOLS.MEAL_PLANNER:
        return this.planMeal(params, context)
      case HEALTH_TOOLS.EXERCISE_SEARCH:
        return this.searchExercise(params, context)
      case HEALTH_TOOLS.WORKOUT_PLANNER:
        return this.planWorkout(params, context)
      case HEALTH_TOOLS.BMI_CALCULATOR:
        return this.calculateBMI(params, context)
      case HEALTH_TOOLS.WEIGHT_TRACKER:
        return this.trackWeight(params, context)
      case HEALTH_TOOLS.SLEEP_ANALYZER:
        return this.analyzeSleep(params, context)
      case HEALTH_TOOLS.HEALTH_INSIGHTS:
        return this.generateHealthInsights(params, context)
      case HEALTH_TOOLS.EXPORT_DATA:
        return this.exportData(params, context)
      default:
        throw new Error(`未实现的工具: ${toolName}`)
    }
  }

  /**
   * 注册所有健康工具
   */
  private registerAllTools(): void {
    // 用户数据访问工具
    this.registerTool(HEALTH_TOOLS.GET_USER_PROFILE, {
      name: HEALTH_TOOLS.GET_USER_PROFILE,
      description: '获取用户健康档案信息',
      category: 'user_data',
      securityLevel: 'user_data',
      permissions: ['read:profile'],
      healthDataAccess: {
        requiresProfile: true,
        timeRange: 'today'
      },
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: '用户ID' },
          fields: {
            type: 'array',
            items: { type: 'string' },
            description: '要获取的字段列表（可选）'
          }
        },
        required: ['userId']
      }
    })

    this.registerTool(HEALTH_TOOLS.GET_DAILY_LOGS, {
      name: HEALTH_TOOLS.GET_DAILY_LOGS,
      description: '获取用户每日健康日志',
      category: 'user_data',
      securityLevel: 'user_data',
      permissions: ['read:health_data'],
      healthDataAccess: {
        requiresLogs: true,
        timeRange: 'week'
      },
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: '用户ID' },
          date: { type: 'string', description: '日期 (YYYY-MM-DD)' },
          days: { type: 'number', description: '天数范围', minimum: 1, maximum: 30 }
        },
        required: ['userId']
      }
    })

    // 营养分析工具
    this.registerTool(HEALTH_TOOLS.NUTRITION_CALCULATOR, {
      name: HEALTH_TOOLS.NUTRITION_CALCULATOR,
      description: '计算食物营养成分和热量',
      category: 'nutrition',
      securityLevel: 'public',
      permissions: ['calculate:nutrition'],
      inputSchema: {
        type: 'object',
        properties: {
          foods: {
            type: 'array',
            items: { type: 'string' },
            description: '食物名称列表'
          },
          portions: {
            type: 'array',
            items: { type: 'number' },
            description: '对应的食物份量(克)'
          }
        },
        required: ['foods']
      }
    })

    this.registerTool(HEALTH_TOOLS.MEAL_PLANNER, {
      name: HEALTH_TOOLS.MEAL_PLANNER,
      description: '生成个性化膳食计划',
      category: 'nutrition',
      securityLevel: 'user_data',
      permissions: ['read:profile', 'generate:meal_plan'],
      healthDataAccess: {
        requiresProfile: true,
        requiresLogs: true,
        timeRange: 'week'
      },
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: '用户ID' },
          goals: {
            type: 'array',
            items: { type: 'string' },
            description: '健康目标'
          },
          days: { type: 'number', description: '计划天数', minimum: 1, maximum: 7 },
          preferences: {
            type: 'object',
            description: '饮食偏好和限制'
          }
        },
        required: ['userId']
      }
    })

    // 运动健身工具
    this.registerTool(HEALTH_TOOLS.EXERCISE_SEARCH, {
      name: HEALTH_TOOLS.EXERCISE_SEARCH,
      description: '搜索运动数据库',
      category: 'exercise',
      securityLevel: 'public',
      permissions: ['read:exercise_data'],
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜索关键词' },
          type: { type: 'string', description: '运动类型' },
          level: { type: 'string', description: '难度级别' },
          equipment: { type: 'string', description: '所需设备' }
        },
        required: ['query']
      }
    })

    this.registerTool(HEALTH_TOOLS.WORKOUT_PLANNER, {
      name: HEALTH_TOOLS.WORKOUT_PLANNER,
      description: '生成个性化训练计划',
      category: 'exercise',
      securityLevel: 'user_data',
      permissions: ['read:profile', 'generate:workout_plan'],
      healthDataAccess: {
        requiresProfile: true,
        requiresLogs: true,
        timeRange: 'week'
      },
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: '用户ID' },
          goals: {
            type: 'array',
            items: { type: 'string' },
            description: '健身目标'
          },
          equipment: {
            type: 'array',
            items: { type: 'string' },
            description: '可用设备'
          },
          timeAvailable: { type: 'number', description: '每日可用时间(分钟)' }
        },
        required: ['userId']
      }
    })

    // 健康分析工具
    this.registerTool(HEALTH_TOOLS.BMI_CALCULATOR, {
      name: HEALTH_TOOLS.BMI_CALCULATOR,
      description: '计算BMI和身体成分分析',
      category: 'analysis',
      securityLevel: 'public',
      permissions: ['calculate:health_metrics'],
      inputSchema: {
        type: 'object',
        properties: {
          weight: { type: 'number', description: '体重(kg)', minimum: 20, maximum: 300 },
          height: { type: 'number', description: '身高(cm)', minimum: 100, maximum: 250 },
          age: { type: 'number', description: '年龄', minimum: 1, maximum: 120 },
          gender: { type: 'string', enum: ['male', 'female'], description: '性别' }
        },
        required: ['weight', 'height']
      }
    })

    this.registerTool(HEALTH_TOOLS.WEIGHT_TRACKER, {
      name: HEALTH_TOOLS.WEIGHT_TRACKER,
      description: '体重趋势分析和预测',
      category: 'analysis',
      securityLevel: 'user_data',
      permissions: ['read:health_data', 'analyze:trends'],
      healthDataAccess: {
        requiresProfile: true,
        requiresLogs: true,
        timeRange: 'month'
      },
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: '用户ID' },
          timeRange: {
            type: 'string',
            enum: ['week', 'month', 'quarter', 'year'],
            description: '分析时间范围'
          }
        },
        required: ['userId']
      }
    })

    this.registerTool(HEALTH_TOOLS.SLEEP_ANALYZER, {
      name: HEALTH_TOOLS.SLEEP_ANALYZER,
      description: '睡眠质量分析',
      category: 'analysis',
      securityLevel: 'user_data',
      permissions: ['read:sleep_data', 'analyze:sleep'],
      healthDataAccess: {
        requiresLogs: true,
        timeRange: 'week'
      },
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: '用户ID' },
          period: {
            type: 'string',
            enum: ['week', 'month'],
            description: '分析周期'
          }
        },
        required: ['userId']
      }
    })

    // 数据洞察工具
    this.registerTool(HEALTH_TOOLS.HEALTH_INSIGHTS, {
      name: HEALTH_TOOLS.HEALTH_INSIGHTS,
      description: '生成综合健康洞察和建议',
      category: 'analysis',
      securityLevel: 'user_data',
      permissions: ['read:health_data', 'generate:insights'],
      healthDataAccess: {
        requiresProfile: true,
        requiresLogs: true,
        timeRange: 'month'
      },
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: '用户ID' },
          analysisType: {
            type: 'string',
            enum: ['overall', 'nutrition', 'exercise', 'sleep', 'weight'],
            description: '分析类型'
          },
          includeRecommendations: { type: 'boolean', description: '是否包含建议' }
        },
        required: ['userId']
      }
    })

    this.registerTool(HEALTH_TOOLS.EXPORT_DATA, {
      name: HEALTH_TOOLS.EXPORT_DATA,
      description: '导出用户健康数据',
      category: 'utility',
      securityLevel: 'sensitive',
      permissions: ['read:health_data', 'export:data'],
      healthDataAccess: {
        requiresProfile: true,
        requiresLogs: true,
        timeRange: 'all'
      },
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: '用户ID' },
          format: {
            type: 'string',
            enum: ['json', 'csv', 'pdf'],
            description: '导出格式'
          },
          dateRange: {
            type: 'object',
            properties: {
              startDate: { type: 'string', description: '开始日期' },
              endDate: { type: 'string', description: '结束日期' }
            },
            description: '日期范围'
          },
          includeFields: {
            type: 'array',
            items: { type: 'string' },
            description: '要包含的数据字段'
          }
        },
        required: ['userId', 'format']
      }
    })
  }

  /**
   * 注册单个工具
   */
  private registerTool(name: string, tool: HealthMCPTool): void {
    this.tools.set(name, tool)
  }

  /**
   * 获取工具定义
   */
  async getTool(name: string): Promise<HealthMCPTool | undefined> {
    return this.tools.get(name)
  }

  /**
   * 获取所有工具
   */
  async getAllTools(): Promise<HealthMCPTool[]> {
    return Array.from(this.tools.values())
  }

  /**
   * 获取工具统计信息
   */
  getToolStats() {
    const tools = Array.from(this.tools.values())
    return {
      total: tools.length,
      byCategory: tools.reduce((acc, tool) => {
        acc[tool.category] = (acc[tool.category] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      bySecurityLevel: tools.reduce((acc, tool) => {
        acc[tool.securityLevel] = (acc[tool.securityLevel] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }
  }

  // ==================== 工具实现方法 ====================

  async getUserProfile(params: any, context: MCPCallContext): Promise<any> {
    const { userId, fields } = params
    return await this.databaseService.getUserProfile(userId, fields)
  }

  async getDailyLogs(params: any, context: MCPCallContext): Promise<any> {
    const { userId, date, days } = params
    if (date) {
      return await this.databaseService.getDailyLogByDate(userId, date)
    } else {
      const dayCount = days || 7
      return await this.databaseService.getRecentDailyLogs(userId, dayCount)
    }
  }

  async calculateNutrition(params: any, context: MCPCallContext): Promise<any> {
    const { foods, portions } = params
    // TODO: 实现营养计算逻辑
    return {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbohydrates: 0,
      totalFat: 0,
      calculatedAt: new Date().toISOString()
    }
  }

  async planMeal(params: any, context: MCPCallContext): Promise<any> {
    const { userId, goals, days, preferences } = params
    // TODO: 实现膳食规划逻辑
    return {
      userId,
      mealPlan: [],
      nutritionTargets: {},
      generatedAt: new Date().toISOString()
    }
  }

  async searchExercise(params: any, context: MCPCallContext): Promise<any> {
    const { query, type, level, equipment } = params
    // TODO: 实现运动搜索逻辑
    return {
      exercises: [],
      totalResults: 0,
      searchedAt: new Date().toISOString()
    }
  }

  async planWorkout(params: any, context: MCPCallContext): Promise<any> {
    const { userId, goals, equipment, timeAvailable } = params
    // TODO: 实现训练计划逻辑
    return {
      userId,
      workoutPlan: [],
      estimatedDuration: timeAvailable,
      generatedAt: new Date().toISOString()
    }
  }

  async calculateBMI(params: any, context: MCPCallContext): Promise<any> {
    const { weight, height, age, gender } = params

    const heightInMeters = height / 100
    const bmi = weight / (heightInMeters * heightInMeters)

    let category = ''
    if (bmi < 18.5) category = '体重不足'
    else if (bmi < 24) category = '正常体重'
    else if (bmi < 28) category = '超重'
    else category = '肥胖'

    return {
      bmi: Math.round(bmi * 10) / 10,
      category,
      healthyRange: '18.5 - 23.9',
      weight,
      height,
      calculatedAt: new Date().toISOString()
    }
  }

  async trackWeight(params: any, context: MCPCallContext): Promise<any> {
    const { userId, timeRange } = params
    // TODO: 实现体重趋势分析
    return {
      userId,
      timeRange: timeRange || 'month',
      trend: 'stable',
      weightHistory: [],
      predictions: {},
      analyzedAt: new Date().toISOString()
    }
  }

  async analyzeSleep(params: any, context: MCPCallContext): Promise<any> {
    const { userId, period } = params
    // TODO: 实现睡眠分析逻辑
    return {
      userId,
      period: period || 'week',
      averageSleepDuration: 0,
      sleepQuality: 'good',
      recommendations: [],
      analyzedAt: new Date().toISOString()
    }
  }

  async generateHealthInsights(params: any, context: MCPCallContext): Promise<any> {
    const { userId, analysisType, includeRecommendations } = params
    // TODO: 实现健康洞察生成逻辑
    return {
      userId,
      analysisType: analysisType || 'overall',
      insights: [],
      recommendations: includeRecommendations ? [] : undefined,
      confidence: 0.8,
      generatedAt: new Date().toISOString()
    }
  }

  async exportData(params: any, context: MCPCallContext): Promise<any> {
    const { userId, format, dateRange, includeFields } = params
    // TODO: 实现数据导出逻辑
    return {
      userId,
      format,
      exportUrl: `https://example.com/exports/${userId}_${Date.now()}.${format}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24小时后过期
      exportedAt: new Date().toISOString()
    }
  }
}