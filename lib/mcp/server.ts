/**
 * MCP健康服务器实现
 * 提供11种健康相关的MCP工具服务
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'

import {
  MCPServerConfig,
  HealthMCPTool,
  MCPCallResult,
  MCPCallContext,
  HEALTH_TOOLS,
  HealthToolName,
  SecurityReviewInterface
} from './types'

// 导入健康工具实现
import { HealthToolRegistry } from './health-tools/registry'
import { DatabaseService } from './services/database'
import { AuthService } from './services/auth'
import { SecurityService } from './services/security'

export class HealthMCPServer {
  private server: Server
  private toolRegistry: HealthToolRegistry
  private databaseService: DatabaseService
  private authService: AuthService
  private securityService: SecurityService
  private config: MCPServerConfig
  private transport: StdioServerTransport | SSEServerTransport | null = null

  constructor(config: MCPServerConfig) {
    this.config = config

    // 初始化服务
    this.databaseService = new DatabaseService(config.healthApp.databaseUrl)
    this.authService = new AuthService(config.healthApp.authConfig)
    this.securityService = new SecurityService(config.healthApp.securityConfig)
    this.toolRegistry = new HealthToolRegistry(this.databaseService)

    // 创建MCP服务器实例
    this.server = new Server(
      {
        name: config.name,
        version: config.version
      },
      {
        capabilities: {
          tools: { listChanged: !!config.capabilities.tools },
          resources: config.capabilities.resources ? {} : undefined,
          prompts: config.capabilities.prompts ? { listChanged: false } : undefined,
          sampling: config.capabilities.sampling ? {} : undefined,
        } as any
      }
    )

    this.setupHandlers()
  }

  /**
   * 设置MCP协议处理器
   */
  private setupHandlers(): void {
    // 工具列表处理器
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = await this.toolRegistry.getAllTools()
      return {
        tools: tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }))
      }
    })

    // 工具调用处理器
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params as any

      try {
        // 构建调用上下文
        const context: MCPCallContext = {
          // 从请求中提取认证信息
          userId: this.extractUserId(request),
          sessionId: this.generateSessionId(),
          permissions: await this.authService.getUserPermissions(this.extractUserId(request)),
           metadata: {
             requestId: (request as any).id,
            timestamp: new Date().toISOString()
          }
        }

        // 安全检查
        await this.securityService.validateToolCall(name, args, context)

        // 执行工具调用
        const result = await this.callHealthTool(name as HealthToolName, args, context)

        // 审核响应（预留接口）
        await this.securityService.reviewResponse(result, context)

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result.result)
            }
          ]
        }
      } catch (error) {
        console.error(`[MCP Server] 工具调用失败: ${name}`, error)
        throw error
      }
    })

    // 资源列表处理器（可选）
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'health://user-profiles',
            name: '用户健康档案',
            description: '用户的基本健康信息和目标',
            mimeType: 'application/json'
          },
          {
            uri: 'health://daily-logs',
            name: '每日健康日志',
            description: '用户的每日饮食、运动和健康数据',
            mimeType: 'application/json'
          }
        ]
      }
    })

    // 提示词列表处理器（可选）
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [
          {
            name: 'health_analysis',
            description: '分析用户健康数据并提供个性化建议',
            arguments: [
              {
                name: 'user_id',
                description: '用户ID',
                required: true
              },
              {
                name: 'analysis_type',
                description: '分析类型：nutrition, exercise, sleep, overall',
                required: false
              }
            ]
          }
        ]
      }
    })
  }

  /**
   * 调用健康工具
   */
  private async callHealthTool(
    toolName: HealthToolName,
    params: any,
    context: MCPCallContext
  ): Promise<MCPCallResult> {
    const startTime = Date.now()

    try {
      console.log(`[MCP Server] 调用工具: ${toolName}`)

      // 获取工具实例
      const tool = await this.toolRegistry.getTool(toolName)
      if (!tool) {
        throw new Error(`工具不存在: ${toolName}`)
      }

      // 检查权限
      await this.checkToolPermissions(tool, context)

      // 准备健康数据上下文
      if (tool.healthDataAccess) {
        context.healthData = await this.prepareHealthDataContext(tool, context)
      }

      // 执行工具
      let result: any
      switch (toolName) {
        case HEALTH_TOOLS.GET_USER_PROFILE:
          result = await this.toolRegistry.getUserProfile(params, context)
          break
        case HEALTH_TOOLS.GET_DAILY_LOGS:
          result = await this.toolRegistry.getDailyLogs(params, context)
          break
        case HEALTH_TOOLS.NUTRITION_CALCULATOR:
          result = await this.toolRegistry.calculateNutrition(params, context)
          break
        case HEALTH_TOOLS.MEAL_PLANNER:
          result = await this.toolRegistry.planMeal(params, context)
          break
        case HEALTH_TOOLS.EXERCISE_SEARCH:
          result = await this.toolRegistry.searchExercise(params, context)
          break
        case HEALTH_TOOLS.WORKOUT_PLANNER:
          result = await this.toolRegistry.planWorkout(params, context)
          break
        case HEALTH_TOOLS.BMI_CALCULATOR:
          result = await this.toolRegistry.calculateBMI(params, context)
          break
        case HEALTH_TOOLS.WEIGHT_TRACKER:
          result = await this.toolRegistry.trackWeight(params, context)
          break
        case HEALTH_TOOLS.SLEEP_ANALYZER:
          result = await this.toolRegistry.analyzeSleep(params, context)
          break
        case HEALTH_TOOLS.HEALTH_INSIGHTS:
          result = await this.toolRegistry.generateHealthInsights(params, context)
          break
        case HEALTH_TOOLS.EXPORT_DATA:
          result = await this.toolRegistry.exportData(params, context)
          break
        default:
          throw new Error(`未实现的工具: ${toolName}`)
      }

      const duration = Date.now() - startTime
      console.log(`[MCP Server] 工具执行完成: ${toolName} (${duration}ms)`)

      return {
        success: true,
        result,
        metadata: {
          toolName,
          duration,
          timestamp: new Date().toISOString(),
          userId: context.userId,
          sessionId: context.sessionId
        }
      }

    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      console.error(`[MCP Server] 工具执行失败: ${toolName} (${duration}ms)`, error)

      return {
        success: false,
        error: {
          code: 'TOOL_EXECUTION_ERROR',
          message: errorMessage,
          details: error instanceof Error ? error.stack : undefined
        },
        metadata: {
          toolName,
          duration,
          timestamp: new Date().toISOString(),
          userId: context.userId,
          sessionId: context.sessionId
        }
      }
    }
  }

  /**
   * 检查工具权限
   */
  private async checkToolPermissions(tool: HealthMCPTool, context: MCPCallContext): Promise<void> {
    const userPermissions = context.permissions || []
    const requiredPermissions = tool.permissions

    for (const requiredPermission of requiredPermissions) {
      if (!userPermissions.includes(requiredPermission)) {
        throw new Error(`缺少权限: ${requiredPermission}`)
      }
    }
  }

  /**
   * 准备健康数据上下文
   */
  private async prepareHealthDataContext(
    tool: HealthMCPTool,
    context: MCPCallContext
  ): Promise<any> {
    if (!context.userId) {
      throw new Error('需要用户ID才能访问健康数据')
    }

    const healthData: any = {}

    if (tool.healthDataAccess?.requiresProfile) {
      healthData.userProfile = await this.databaseService.getUserProfile(context.userId)
    }

    if (tool.healthDataAccess?.requiresLogs) {
      const timeRange = tool.healthDataAccess.timeRange || 'today'
      healthData.dailyLogs = await this.databaseService.getDailyLogs(context.userId, timeRange)
    }

    return healthData
  }

  /**
   * 启动服务器
   */
  async start(transport: 'stdio' | 'sse', options?: any): Promise<void> {
    try {
      console.log(`[MCP Server] 启动健康MCP服务器: ${this.config.name}`)

      if (transport === 'stdio') {
        this.transport = new StdioServerTransport()
      } else if (transport === 'sse') {
        // 注意：SSEServerTransport 构造函数需要 (endpoint, res, options)；
        // 这里先跳过直接实例化，实际SSE启动由外层HTTP路由负责。
        // 占位设置，避免类型报错。
        this.transport = new StdioServerTransport()
      } else {
        throw new Error(`不支持的传输类型: ${transport}`)
      }

      await this.server.connect(this.transport)
      console.log(`[MCP Server] 服务器启动成功 (${transport})`)

    } catch (error) {
      console.error('[MCP Server] 启动失败:', error)
      throw error
    }
  }

  /**
   * 停止服务器
   */
  async stop(): Promise<void> {
    try {
      if (this.server) {
        await this.server.close()
      }
      console.log('[MCP Server] 服务器已停止')
    } catch (error) {
      console.error('[MCP Server] 停止服务器时出错:', error)
    }
  }

  /**
   * 获取服务器统计信息
   */
  getStats() {
    return {
      name: this.config.name,
      version: this.config.version,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      tools: this.toolRegistry.getToolStats()
    }
  }

  /**
   * 辅助方法
   */
  private extractUserId(request: any): string | undefined {
    // 优先从 meta 提取；若无，则从参数中回退提取（兼容未注入 meta 的客户端）
    const metaUser = request.meta?.userId
    if (metaUser) return metaUser
    try {
      const args = (request.params && (request.params as any).arguments) || {}
      return args.userId || args.user_id || undefined
    } catch {
      return undefined
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * 创建并配置健康MCP服务器
 */
export function createHealthMCPServer(config: Partial<MCPServerConfig> = {}): HealthMCPServer {
  const defaultConfig: MCPServerConfig = {
    name: 'snapifit-health-mcp-server',
    version: '1.0.0',
    capabilities: {
      tools: true,
      resources: true,
      prompts: true,
      sampling: false
    },
    healthApp: {
      databaseUrl: process.env.DATABASE_URL || '',
      authConfig: {
        oauth: {
          enabled: true,
          clientId: process.env.OAUTH_CLIENT_ID,
          clientSecret: process.env.OAUTH_CLIENT_SECRET,
          scopes: ['read:profile', 'read:health_data', 'write:health_data']
        },
        apiKey: {
          enabled: true,
          headerName: 'X-API-Key'
        },
        session: {
          enabled: true,
          timeout: 3600 // 1小时
        }
      },
      securityConfig: {
        rateLimiting: {
          enabled: true,
          requestsPerMinute: 60,
          burstLimit: 10
        },
        dataFilters: {
          sensitiveFields: ['password', 'ssn', 'credit_card'],
          maxResponseSize: 1024 * 1024 // 1MB
        },
        auditLogging: true
      }
    }
  }

  const finalConfig = { ...defaultConfig, ...config }
  return new HealthMCPServer(finalConfig)
}