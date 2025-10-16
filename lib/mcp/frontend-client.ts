/**
 * 前端MCP客户端 - 安全架构设计
 *
 * 核心思路:
 * 1. MCP连接和工具调用主要在浏览器端执行
 * 2. 服务器端仅提供安全的代理服务
 * 3. 与现有chat系统无缝集成
 */

export interface MCPSecurityPolicy {
  // 允许的工具白名单
  allowedTools: string[]
  // 允许的域名/命令
  allowedSources: string[]
  // 数据过滤规则
  dataFilters: {
    maxResponseSize: number
    sensitiveFields: string[]
    allowedFileTypes?: string[]
  }
  // 执行限制
  executionLimits: {
    timeout: number
    maxConcurrentCalls: number
    rateLimit: {
      callsPerMinute: number
      callsPerHour: number
    }
  }
}

export interface MCPChatIntegration {
  // 与专家角色的集成
  expertIntegration: {
    expertId: string
    availableTools: string[]
    toolSuggestions: Array<{
      tool: string
      description: string
      useCase: string
    }>
  }
  // 健康数据相关工具
  healthDataTools: {
    nutritionAnalysis: boolean
    exerciseTracking: boolean
    dataVisualization: boolean
  }
  // 自动化工具调用
  autoToolCalls: {
    enabled: boolean
    triggerPatterns: string[]
    confirmBeforeCall: boolean
  }
}

export interface BrowserMCPClient {
  // 工具管理
  tools: {
    available: MCPTool[]
    enabled: string[]
    lastRefresh: Date
  }
  // 连接状态
  connections: {
    [providerId: string]: {
      status: 'connected' | 'disconnected' | 'error'
      lastActivity: Date
      capabilities: string[]
    }
  }
  // 安全策略
  security: MCPSecurityPolicy
  // 聊天集成配置
  chatIntegration: MCPChatIntegration
}

/**
 * 前端MCP管理器
 */
export class FrontendMCPManager {
  private client: BrowserMCPClient
  private securityPolicy: MCPSecurityPolicy

  constructor(securityPolicy: MCPSecurityPolicy) {
    this.securityPolicy = securityPolicy
    this.client = this.initializeClient()
  }

  /**
   * 初始化客户端
   */
  private initializeClient(): BrowserMCPClient {
    return {
      tools: {
        available: [],
        enabled: [],
        lastRefresh: new Date()
      },
      connections: {},
      security: this.securityPolicy,
      chatIntegration: {
        expertIntegration: {
          expertId: 'general',
          availableTools: [],
          toolSuggestions: []
        },
        healthDataTools: {
          nutritionAnalysis: true,
          exerciseTracking: true,
          dataVisualization: true
        },
        autoToolCalls: {
          enabled: true,
          triggerPatterns: ['分析', '计算', '查询', '生成'],
          confirmBeforeCall: false
        }
      }
    }
  }

  /**
   * 安全的工具调用
   */
  async callTool(
    toolName: string,
    params: Record<string, any>,
    context: {
      expertId?: string
      messageContext?: string
      userId?: string
    }
  ): Promise<MCPCallResult> {
    // 1. 安全检查
    if (!this.isToolAllowed(toolName)) {
      throw new Error(`工具 ${toolName} 不在允许列表中`)
    }

    // 2. 参数过滤
    const filteredParams = this.filterParams(params)

    // 3. 通过安全代理调用
    return await this.callViaSecureProxy(toolName, filteredParams, context)
  }

  /**
   * 工具白名单检查
   */
  private isToolAllowed(toolName: string): boolean {
    return this.securityPolicy.allowedTools.includes(toolName) ||
           this.securityPolicy.allowedTools.includes('*')
  }

  /**
   * 参数过滤
   */
  private filterParams(params: Record<string, any>): Record<string, any> {
    const filtered = { ...params }

    // 移除敏感字段
    for (const field of this.securityPolicy.dataFilters.sensitiveFields) {
      delete filtered[field]
    }

    return filtered
  }

  /**
   * 通过安全代理调用工具
   */
  private async callViaSecureProxy(
    toolName: string,
    params: Record<string, any>,
    context: any
  ): Promise<MCPCallResult> {
    // 从受信端点获取一次性安全令牌
    let securityToken = ''
    try {
      const tokenRes = await fetch('/api/mcp/secure-proxy/token', { method: 'GET' })
      if (tokenRes.ok) {
        const data = await tokenRes.json()
        securityToken = data.token
      }
    } catch {}

    const response = await fetch('/api/mcp/secure-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tool: toolName,
        params,
        context,
        securityToken
      })
    })

    if (!response.ok) {
      throw new Error(`代理调用失败: ${response.statusText}`)
    }

    const result = await response.json()

    // 结果过滤
    return this.filterResult(result)
  }

  /**
   * 生成安全令牌
   */
  private generateSecurityToken(): string {
    // 与服务器的 HMAC 校验保持一致：timestamp.hmac(userId:timestamp)
    // 注意：前端无法安全持有密钥，这里仅生成时间戳；实际签名由服务端下发或通过受信JS生成
    // 简化：仅返回时间戳占位，服务器将拒绝无签名请求，前端需从受信端点获取 token
    return `${Date.now()}.placeholder`
  }

  /**
   * 结果过滤
   */
  private filterResult(result: any): MCPCallResult {
    // 检查响应大小
    const resultString = JSON.stringify(result)
    if (resultString.length > this.securityPolicy.dataFilters.maxResponseSize) {
      return {
        success: false,
        error: '响应数据过大，已被过滤',
        timestamp: new Date().toISOString()
      }
    }

    return result
  }

  /**
   * 与Chat系统集成
   */
  integrateWithChat(chatSystem: any) {
    // 监听聊天消息
    chatSystem.onMessage((message: string, expertId: string) => {
      this.analyzeMessageForToolCalls(message, expertId)
    })

    // 提供工具建议
    chatSystem.onToolSuggestionRequest((context: any) => {
      // 简化：直接返回静态建议或基于消息分析生成
      return this.suggestToolsForMessage(context.message || '', context.expertId || 'general')
    })
  }

  /**
   * 分析消息中的工具调用需求
   */
  private async analyzeMessageForToolCalls(message: string, expertId: string) {
    if (!this.client.chatIntegration.autoToolCalls.enabled) return

    const patterns = this.client.chatIntegration.autoToolCalls.triggerPatterns
    const hasPattern = patterns.some(pattern =>
      message.toLowerCase().includes(pattern.toLowerCase())
    )

    if (hasPattern) {
      const suggestions = await this.suggestToolsForMessage(message, expertId)
      // 触发工具建议UI
      this.showToolSuggestions(suggestions)
    }
  }

  /**
   * 为消息建议合适的工具
   */
  private async suggestToolsForMessage(
    message: string,
    expertId: string
  ): Promise<Array<{tool: string, confidence: number, reason: string}>> {
    // 基于消息内容和专家角色推荐工具
    const suggestions = []

    // 健康数据相关
    if (message.includes('营养') || message.includes('卡路里')) {
      suggestions.push({
        tool: 'nutrition_calculator',
        confidence: 0.9,
        reason: '检测到营养相关询问'
      })
    }

    if (message.includes('运动') || message.includes('锻炼')) {
      suggestions.push({
        tool: 'exercise_planner',
        confidence: 0.8,
        reason: '检测到运动相关询问'
      })
    }

    return suggestions
  }

  /**
   * 显示工具建议UI
   */
  private showToolSuggestions(suggestions: any[]) {
    // 触发前端UI显示工具建议
    window.dispatchEvent(new CustomEvent('mcp:tool-suggestions', {
      detail: { suggestions }
    }))
  }

  /**
   * 获取专家可用工具
   */
  getToolsForExpert(expertId: string): string[] {
    const expertConfig = this.client.chatIntegration.expertIntegration
    if (expertConfig.expertId === expertId) {
      return expertConfig.availableTools
    }
    return []
  }
}

/**
 * MCP工具接口
 */
export interface MCPTool {
  name: string
  description: string
  category: 'health' | 'data' | 'utility' | 'analysis'
  inputSchema: {
    type: string
    properties: Record<string, any>
    required?: string[]
  }
  outputSchema?: {
    type: string
    properties: Record<string, any>
  }
  securityLevel: 'safe' | 'moderate' | 'restricted'
  expertSuggestions: string[] // 适合的专家角色
}

/**
 * 调用结果接口
 */
export interface MCPCallResult {
  success: boolean
  result?: any
  error?: string
  duration?: number
  timestamp: string
  tool?: string
  filteredFields?: string[]
}