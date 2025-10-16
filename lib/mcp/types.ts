/**
 * MCP双向架构的核心类型定义
 * 基于2025-03-26 MCP规范，针对健康应用优化
 */

// ==================== 基础MCP类型 ====================

export interface MCPTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
  outputSchema?: {
    type: 'object'
    properties: Record<string, any>
  }
}

export interface MCPResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

export interface MCPPrompt {
  name: string
  description: string
  arguments?: Array<{
    name: string
    description: string
    required?: boolean
  }>
}

// ==================== 健康MCP工具定义 ====================

export interface HealthMCPTool extends MCPTool {
  category: 'user_data' | 'nutrition' | 'exercise' | 'analysis' | 'utility'
  securityLevel: 'public' | 'user_data' | 'sensitive'
  permissions: string[]
  healthDataAccess?: {
    requiresProfile?: boolean
    requiresLogs?: boolean
    timeRange?: 'today' | 'week' | 'month' | 'all'
  }
}

// 11种健康工具的类型定义
export const HEALTH_TOOLS = {
  // 用户数据访问 (2个)
  GET_USER_PROFILE: 'get_user_profile',
  GET_DAILY_LOGS: 'get_daily_logs',
  
  // 营养分析 (2个)
  NUTRITION_CALCULATOR: 'nutrition_calculator',
  MEAL_PLANNER: 'meal_planner',
  
  // 运动健身 (2个)
  EXERCISE_SEARCH: 'exercise_search',
  WORKOUT_PLANNER: 'workout_planner',
  
  // 健康分析 (3个)
  BMI_CALCULATOR: 'bmi_calculator',
  WEIGHT_TRACKER: 'weight_tracker',
  SLEEP_ANALYZER: 'sleep_analyzer',
  
  // 数据洞察 (2个)
  HEALTH_INSIGHTS: 'health_insights',
  EXPORT_DATA: 'export_data'
} as const

export type HealthToolName = typeof HEALTH_TOOLS[keyof typeof HEALTH_TOOLS]

// ==================== MCP服务器配置 ====================

export interface MCPServerConfig {
  name: string
  version: string
  capabilities: {
    tools?: boolean
    resources?: boolean
    prompts?: boolean
    sampling?: boolean
  }
  // 健康应用特定配置
  healthApp: {
    databaseUrl: string
    authConfig: AuthConfig
    securityConfig: SecurityConfig
  }
}

export interface AuthConfig {
  oauth: {
    enabled: boolean
    clientId?: string
    clientSecret?: string
    scopes: string[]
  }
  apiKey: {
    enabled: boolean
    headerName: string
  }
  session: {
    enabled: boolean
    timeout: number
  }
}

export interface SecurityConfig {
  rateLimiting: {
    enabled: boolean
    requestsPerMinute: number
    burstLimit: number
  }
  dataFilters: {
    sensitiveFields: string[]
    maxResponseSize: number
  }
  auditLogging: boolean
}

// ==================== MCP客户端配置 ====================

export interface MCPClientConfig {
  provider: MCPProvider
  connectionType: MCPConnectionType
  timeout: number
  retryAttempts: number
  securityPolicy: ClientSecurityPolicy
}

export enum MCPConnectionType {
  STDIO = 'stdio',
  HTTP = 'http',
  SSE = 'sse',
  WEBSOCKET = 'websocket'
}

export interface MCPProvider {
  id: string
  name: string
  description?: string
  connectionConfig: {
    type: MCPConnectionType
    // stdio配置
    command?: string
    args?: string[]
    // HTTP/WebSocket配置
    url?: string
    headers?: Record<string, string>
    // 认证配置
    auth?: {
      type: 'bearer' | 'api_key' | 'oauth'
      credentials: Record<string, string>
    }
  }
  trustLevel: 'trusted' | 'verified' | 'public' | 'sandbox'
  isActive: boolean
  metadata?: {
    author?: string
    homepage?: string
    version?: string
  }
}

export interface ClientSecurityPolicy {
  allowedTools: string[] | '*'
  blockedTools: string[]
  dataFilters: {
    stripSensitiveData: boolean
    maxRequestSize: number
    maxResponseSize: number
  }
  executionLimits: {
    timeout: number
    maxConcurrentCalls: number
  }
}

// ==================== 调用结果和上下文 ====================

export interface MCPCallResult<T = any> {
  success: boolean
  result?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  metadata: {
    toolName: string
    providerId?: string
    duration: number
    timestamp: string
    userId?: string
    sessionId?: string
  }
}

export interface MCPCallContext {
  userId?: string
  sessionId?: string
  expertRole?: string
  healthData?: {
    userProfile?: any
    todayLog?: any
    recentLogs?: any[]
  }
  permissions?: string[]
  metadata?: Record<string, any>
}

// ==================== Chat集成类型 ====================

export interface ChatMCPIntegration {
  // 工具建议
  toolSuggestions: Array<{
    tool: string
    confidence: number
    reason: string
    autoExecute?: boolean
    params?: Record<string, any>
  }>
  
  // 执行结果
  executionResults: Array<{
    tool: string
    result: any
    formattedForChat: string
    timestamp: string
  }>
  
  // 状态管理
  isExecuting: boolean
  executingTools: string[]
  lastError?: string
}

// ==================== 事件和监控 ====================

export interface MCPEvent {
  type: 'tool_call' | 'connection_change' | 'error' | 'security_alert'
  timestamp: Date
  source: 'server' | 'client'
  data: any
  severity?: 'low' | 'medium' | 'high' | 'critical'
}

export interface MCPMetrics {
  // 服务器指标
  server: {
    totalCalls: number
    successRate: number
    averageLatency: number
    activeConnections: number
    errorsByType: Record<string, number>
  }
  
  // 客户端指标
  client: {
    totalProviders: number
    activeConnections: number
    callsByProvider: Record<string, number>
    failuresByProvider: Record<string, number>
  }
  
  // 健康应用指标
  healthApp: {
    userEngagement: number
    toolUsageStats: Record<string, number>
    dataAccessPatterns: Record<string, number>
  }
}

// ==================== 批量操作 ====================

export interface MCPBatchRequest {
  requests: Array<{
    id: string
    tool: string
    params: any
    context?: MCPCallContext
  }>
  options?: {
    failFast?: boolean
    maxConcurrency?: number
    timeout?: number
  }
}

export interface MCPBatchResponse {
  responses: Array<{
    id: string
    success: boolean
    result?: any
    error?: any
    duration: number
  }>
  summary: {
    total: number
    successful: number
    failed: number
    totalDuration: number
  }
}

// ==================== 安全审核接口（预留） ====================

export interface SecurityReviewInterface {
  reviewRequest(request: any, context: MCPCallContext): Promise<ReviewResult>
  reviewResponse(response: any, context: MCPCallContext): Promise<ReviewResult>
}

export interface ReviewResult {
  approved: boolean
  confidence: number
  issues: Array<{
    type: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    description: string
  }>
  recommendedAction: 'approve' | 'review' | 'reject'
  // 预留字段
  agentResults?: any[]
  reviewChainResults?: any[]
}

// ==================== 工具发现和能力 ====================

export interface ToolDiscoveryResponse {
  tools: MCPTool[]
  capabilities: {
    supportsStreaming?: boolean
    supportsBatch?: boolean
    maxConcurrency?: number
    rateLimits?: {
      requestsPerMinute: number
      burstLimit: number
    }
  }
  metadata: {
    serverName: string
    serverVersion: string
    protocolVersion: string
    healthCheck?: {
      status: 'healthy' | 'degraded' | 'unhealthy'
      lastCheck: string
    }
  }
}