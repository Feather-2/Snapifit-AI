/**
 * MCP客户端实现
 * 安全地接入第三方MCP工具
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { spawn, ChildProcess } from 'child_process'

import {
  MCPProvider as CoreMCPProvider,
  MCPClientConfig,
  MCPConnectionType,
  MCPCallResult,
  MCPCallContext,
  ClientSecurityPolicy,
  ToolDiscoveryResponse,
  HEALTH_TOOLS,
  type HealthToolName
} from './types'
import { HealthToolRegistry } from './health-tools/registry'
import { DatabaseService } from './services/database'

// 为兼容现有路由中使用的简化 Provider 结构，定义并导出 Legacy 类型
export type LegacyMCPProvider = {
  id: string
  name: string
  serverUrl: string
  isActive: boolean
  connectionTimeout?: number
}

// 兼容旧代码：导出与旧路由兼容的 Provider 类型别名
export type MCPProvider = LegacyMCPProvider

// 兼容旧代码：包装器类，接受 Legacy Provider 并在内部创建 SecureMCPClient
export class MCPClient {
  private inner: SecureMCPClient

  constructor(providerOrConfig: LegacyMCPProvider | MCPClientConfig) {
    const config = MCPClient.asClientConfig(providerOrConfig)
    this.inner = new SecureMCPClient(config)
  }

  static asClientConfig(providerOrConfig: LegacyMCPProvider | MCPClientConfig): MCPClientConfig {
    if ((providerOrConfig as any).provider && (providerOrConfig as any).securityPolicy) {
      return providerOrConfig as MCPClientConfig
    }

    const provider = providerOrConfig as LegacyMCPProvider

    // 将 legacy serverUrl 解析为连接配置
    const connection = MCPClient.parseServerUrl(provider.serverUrl)

    const config: MCPClientConfig = {
      provider: {
        id: provider.id,
        name: provider.name,
        description: 'legacy provider',
        connectionConfig: connection,
        trustLevel: 'verified',
        isActive: provider.isActive,
        metadata: { version: '1.0.0' }
      },
      connectionType: connection.type,
      timeout: provider.connectionTimeout || 30000,
      retryAttempts: 3,
      securityPolicy: MCPClient.defaultPolicy()
    }
    return config
  }

  private static parseServerUrl(serverUrl: string): {
    type: MCPConnectionType,
    command?: string,
    args?: string[],
    url?: string,
    headers?: Record<string, string>
  } {
    const trimmed = serverUrl.trim()
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return { type: MCPConnectionType.SSE, url: trimmed }
    }
    // 其余情况按命令行解析（支持双引号保留空格）
    const parts: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < trimmed.length; i++) {
      const ch = trimmed[i]
      if (ch === '"') {
        inQuotes = !inQuotes
        continue
      }
      if (!inQuotes && /\s/.test(ch)) {
        if (current.length > 0) { parts.push(current); current = '' }
      } else {
        current += ch
      }
    }
    if (current.length > 0) parts.push(current)
    const command = parts.shift() || ''
    const args = parts
    return { type: MCPConnectionType.STDIO, command, args }
  }

  private static defaultPolicy(): ClientSecurityPolicy {
    return {
      allowedTools: '*',
      blockedTools: ['exec', 'shell', 'system'],
      dataFilters: {
        stripSensitiveData: true,
        maxRequestSize: 50 * 1024,
        maxResponseSize: 500 * 1024
      },
      executionLimits: {
        timeout: 30000,
        maxConcurrentCalls: 3
      }
    }
  }

  async connect() { return this.inner.connect() }
  async disconnect() { return this.inner.disconnect() }
  async listTools() { return this.inner.listTools() }
  async callTool(toolName: string, params: Record<string, any> = {}, context?: MCPCallContext) {
    return this.inner.callTool(toolName, params, context)
  }
  isConnectionHealthy() { return this.inner.isConnectionHealthy() }
}

// 兼容旧路由的简化调用器
export function getSimpleMCPCaller() {
  return {
    async callTool(provider: LegacyMCPProvider, toolName: string, params: Record<string, any>) {
      // 内置健康工具走本地注册表，不启动外部进程
      if (provider.id === 'local-health-tools' || provider.serverUrl.startsWith('internal:')) {
        const registry = new HealthToolRegistry(new DatabaseService(''))
        const start = Date.now()
        const result = await registry.execute(toolName as HealthToolName, params, { userId: (params && (params.userId || params.user_id)) || undefined })
        return { success: true, result, error: undefined, duration: Date.now() - start, timestamp: new Date().toISOString() }
      }

      const client = new MCPClient(provider)
      try {
        await client.connect()
        const res = await client.callTool(toolName, params)
        return {
          success: res.success,
          result: res.result,
          error: res.error,
          duration: res.metadata.duration,
          timestamp: res.metadata.timestamp
        }
      } finally {
        await client.disconnect()
      }
    },
    async getProviderTools(provider: LegacyMCPProvider) {
      if (provider.id === 'local-health-tools' || provider.serverUrl.startsWith('internal:')) {
        const registry = new HealthToolRegistry(new DatabaseService(''))
        const tools = await registry.getAllTools()
        return tools.map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })) as any
      }
      const client = new MCPClient(provider)
      try {
        await client.connect()
        const tools = await client.listTools()
        return tools.tools
      } finally {
        await client.disconnect()
      }
    }
  }
}

export class SecureMCPClient {
  private client: Client | null = null
  private transport: StdioClientTransport | SSEClientTransport | null = null
  private process: ChildProcess | null = null
  private isConnected = false
  private connectionAttempts = 0

  constructor(private config: MCPClientConfig) {}

  /**
   * 连接到MCP服务器
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      console.log(`[MCP Client] 已连接到: ${this.config.provider.name}`)
      return
    }

    console.log(`[MCP Client] 连接到: ${this.config.provider.name}`)

    try {
      await this.establishConnection()
      this.isConnected = true
      this.connectionAttempts = 0
      console.log(`[MCP Client] 连接成功: ${this.config.provider.name}`)
    } catch (error) {
      this.connectionAttempts++
      console.error(`[MCP Client] 连接失败 (尝试 ${this.connectionAttempts}):`, error)

      if (this.connectionAttempts < this.config.retryAttempts) {
        console.log(`[MCP Client] ${this.config.retryAttempts - this.connectionAttempts} 秒后重试...`)
        await new Promise(resolve => setTimeout(resolve, 1000 * this.connectionAttempts))
        return await this.connect()
      }

      throw error
    }
  }

  /**
   * 建立连接
   */
  private async establishConnection(): Promise<void> {
    const { provider } = this.config
    const { connectionConfig } = provider

    switch (connectionConfig.type) {
      case MCPConnectionType.STDIO:
        await this.connectStdio()
        break
      case MCPConnectionType.HTTP:
      case MCPConnectionType.SSE:
        await this.connectHttp()
        break
      case MCPConnectionType.WEBSOCKET:
        throw new Error('WebSocket连接暂未实现')
      default:
        throw new Error(`不支持的连接类型: ${connectionConfig.type}`)
    }
  }

  /**
   * 建立stdio连接
   */
  private async connectStdio(): Promise<void> {
    const { connectionConfig } = this.config.provider

    if (!connectionConfig.command) {
      throw new Error('stdio连接需要命令参数')
    }

    const args = connectionConfig.args || []
    console.log(`[MCP Client] 启动进程: ${connectionConfig.command} ${args.join(' ')}`)

    // 直接使用 SDK 负责启动子进程，避免自管流引起的兼容性问题
    this.transport = new StdioClientTransport({
      command: connectionConfig.command!,
      args,
      // 一些运行环境需要 shell 才能解析 npx/cmd 脚本；放入可选字段以提高兼容性
      spawn: { shell: process.platform === 'win32', windowsHide: true } as any
    } as any)

    this.client = new Client({
      name: 'snapifit-health-app',
      version: '1.0.0'
    }, {
      capabilities: {
        roots: {
          listChanged: false
        }
      }
    })

    await this.client.connect(this.transport)
  }

  /**
   * 建立HTTP连接
   */
  private async connectHttp(): Promise<void> {
    const { connectionConfig } = this.config.provider

    if (!connectionConfig.url) {
      throw new Error('HTTP连接需要URL参数')
    }

    console.log(`[MCP Client] 连接到: ${connectionConfig.url}`)

    try {
      this.transport = new SSEClientTransport(new URL(connectionConfig.url))

      this.client = new Client({
        name: 'snapifit-health-app',
        version: '1.0.0'
      }, {
        capabilities: {
          roots: {
            listChanged: false
          }
        }
      })

      await this.client.connect(this.transport)
    } catch (error) {
      console.error(`[MCP Client] HTTP连接失败:`, error)
      throw error
    }
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    console.log(`[MCP Client] 断开连接: ${this.config.provider.name}`)

    try {
      if (this.client) {
        try { await this.client.close() } catch {}
        this.client = null
      }

      if (this.transport) {
        this.transport = null
      }

      if (this.process) {
        try { this.process.kill('SIGTERM') } catch {}

        // 等待进程退出，最多等待5秒
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            try {
              if (this.process && !this.process.killed) {
                console.warn('[MCP Client] 强制终止进程')
                this.process.kill('SIGKILL')
              }
            } catch {}
            resolve()
          }, 5000)

          this.process!.on('exit', () => {
            clearTimeout(timeout)
            resolve()
          })
        })

        this.process = null
      }

      this.isConnected = false
    } catch (error) {
      console.error('[MCP Client] 断开连接时出错:', error)
    }
  }

  /**
   * 获取工具列表
   */
  async listTools(): Promise<ToolDiscoveryResponse> {
    if (!this.client || !this.isConnected) {
      throw new Error('客户端未连接')
    }

    try {
      console.log(`[MCP Client] 获取工具列表: ${this.config.provider.name}`)

      const response = await this.client.listTools()

      // 规范化为严格的 MCPTool[]（确保必填字段存在）
      const normalizedTools = (response.tools || []).map((t: any) => ({
        name: t.name,
        description: t.description ?? '',
        inputSchema: t.inputSchema ?? { type: 'object', properties: {} },
        outputSchema: t.outputSchema
      })) as any

      return {
        tools: normalizedTools,
        capabilities: {
          supportsStreaming: false,
          supportsBatch: false
        },
        metadata: {
          serverName: this.config.provider.name,
          serverVersion: this.config.provider.metadata?.version || '1.0.0',
          protocolVersion: '2025-03-26',
          healthCheck: {
            status: 'healthy',
            lastCheck: new Date().toISOString()
          }
        }
      }
    } catch (error) {
      console.error(`[MCP Client] 获取工具列表失败:`, error)
      throw error
    }
  }

  /**
   * 调用工具
   */
  async callTool(
    toolName: string,
    params: Record<string, any> = {},
    context?: MCPCallContext
  ): Promise<MCPCallResult> {
    if (!this.client || !this.isConnected) {
      throw new Error('客户端未连接')
    }

    const startTime = Date.now()

    try {
      // 安全检查
      await this.validateToolCall(toolName, params, context)

      console.log(`[MCP Client] 调用工具: ${toolName}`)

      // 过滤参数（移除敏感数据）并注入 userId（若存在）
      const filteredParams = this.filterSensitiveParams(params)
      if (context?.userId && filteredParams && typeof filteredParams === 'object') {
        if (filteredParams.userId === undefined && filteredParams.user_id === undefined) {
          ;(filteredParams as any).userId = context.userId
        }
      }

      // 调用工具
      const result = await Promise.race([
        this.client.callTool({
          name: toolName,
          arguments: filteredParams
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('工具调用超时')), this.config.timeout)
        )
      ]) as any

      const duration = Date.now() - startTime
      console.log(`[MCP Client] 工具调用成功: ${toolName} (${duration}ms)`)

      // 过滤响应（移除敏感信息）
      const filteredResult = this.filterSensitiveResponse(result)

      return {
        success: true,
        result: filteredResult,
        metadata: {
          toolName,
          providerId: this.config.provider.id,
          duration,
          timestamp: new Date().toISOString(),
          userId: context?.userId,
          sessionId: context?.sessionId
        }
      }

    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      console.error(`[MCP Client] 工具调用失败: ${toolName} (${duration}ms)`, error)

      return {
        success: false,
        error: {
          code: 'TOOL_CALL_ERROR',
          message: errorMessage,
          details: error instanceof Error ? error.stack : undefined
        },
        metadata: {
          toolName,
          providerId: this.config.provider.id,
          duration,
          timestamp: new Date().toISOString(),
          userId: context?.userId,
          sessionId: context?.sessionId
        }
      }
    }
  }

  /**
   * 验证工具调用
   */
  private async validateToolCall(
    toolName: string,
    params: any,
    context?: MCPCallContext
  ): Promise<void> {
    const policy = this.config.securityPolicy

    // 检查工具白名单
    if (Array.isArray(policy.allowedTools) && !policy.allowedTools.includes(toolName)) {
      throw new Error(`工具 ${toolName} 不在允许列表中`)
    }

    // 检查工具黑名单
    if (policy.blockedTools.includes(toolName)) {
      throw new Error(`工具 ${toolName} 被明确禁止`)
    }

    // 检查参数大小
    const paramString = JSON.stringify(params)
    if (paramString.length > policy.dataFilters.maxRequestSize) {
      throw new Error('请求参数过大')
    }
  }

  /**
   * 过滤敏感参数
   */
  private filterSensitiveParams(params: Record<string, any>): Record<string, any> {
    if (!this.config.securityPolicy.dataFilters.stripSensitiveData) {
      return params
    }

    const filtered = { ...params }
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth']

    for (const key in filtered) {
      if (sensitiveKeys.some(sensitiveKey =>
        key.toLowerCase().includes(sensitiveKey)
      )) {
        delete filtered[key]
      }
    }

    return filtered
  }

  /**
   * 过滤敏感响应
   */
  private filterSensitiveResponse(response: any): any {
    if (!this.config.securityPolicy.dataFilters.stripSensitiveData) {
      return response
    }

    const responseString = JSON.stringify(response)

    // 检查响应大小
    if (responseString.length > this.config.securityPolicy.dataFilters.maxResponseSize) {
      return {
        error: '响应数据过大，已被过滤',
        originalSize: responseString.length,
        maxSize: this.config.securityPolicy.dataFilters.maxResponseSize
      }
    }

    // TODO: 实现更复杂的响应过滤逻辑
    return response
  }

  /**
   * 检查连接状态
   */
  isConnectionHealthy(): boolean {
    return this.isConnected && this.client !== null
  }

  /**
   * 获取提供者信息
   */
  getProviderInfo() {
    return {
      id: this.config.provider.id,
      name: this.config.provider.name,
      trustLevel: this.config.provider.trustLevel,
      isActive: this.config.provider.isActive,
      isConnected: this.isConnected,
      connectionType: this.config.provider.connectionConfig.type,
      connectionAttempts: this.connectionAttempts
    }
  }
}

/**
 * MCP客户端管理器
 * 管理多个MCP客户端连接
 */
export class MCPClientManager {
  private clients: Map<string, SecureMCPClient> = new Map()
  private providers: Map<string, CoreMCPProvider> = new Map()

  /**
   * 添加提供者
   */
  addProvider(provider: CoreMCPProvider, securityPolicy?: ClientSecurityPolicy): void {
    console.log(`[MCP Manager] 添加提供者: ${provider.name}`)

    this.providers.set(provider.id, provider)

    const config: MCPClientConfig = {
      provider,
      connectionType: provider.connectionConfig.type,
      timeout: 30000,
      retryAttempts: 3,
      securityPolicy: securityPolicy || this.getDefaultSecurityPolicy(provider)
    }

    const client = new SecureMCPClient(config)
    this.clients.set(provider.id, client)
  }

  /**
   * 移除提供者
   */
  async removeProvider(providerId: string): Promise<void> {
    console.log(`[MCP Manager] 移除提供者: ${providerId}`)

    const client = this.clients.get(providerId)
    if (client) {
      await client.disconnect()
      this.clients.delete(providerId)
    }

    this.providers.delete(providerId)
  }

  /**
   * 调用工具
   */
  async callTool(
    providerId: string,
    toolName: string,
    params: Record<string, any> = {},
    context?: MCPCallContext
  ): Promise<MCPCallResult> {
    const client = this.clients.get(providerId)
    if (!client) {
      throw new Error(`提供者不存在: ${providerId}`)
    }

    const provider = this.providers.get(providerId)
    if (!provider?.isActive) {
      throw new Error(`提供者已禁用: ${providerId}`)
    }

    // 确保连接
    if (!client.isConnectionHealthy()) {
      await client.connect()
    }

    return await client.callTool(toolName, params, context)
  }

  /**
   * 获取提供者工具列表
   */
  async getProviderTools(providerId: string): Promise<ToolDiscoveryResponse> {
    const client = this.clients.get(providerId)
    if (!client) {
      throw new Error(`提供者不存在: ${providerId}`)
    }

    if (!client.isConnectionHealthy()) {
      await client.connect()
    }

    return await client.listTools()
  }

  /**
   * 获取所有提供者
   */
  getAllProviders(): CoreMCPProvider[] {
    return Array.from(this.providers.values())
  }

  /**
   * 关闭所有连接
   */
  async disconnectAll(): Promise<void> {
    console.log('[MCP Manager] 关闭所有连接')

    const disconnectPromises = Array.from(this.clients.values())
      .map(client => client.disconnect())

    await Promise.all(disconnectPromises)
  }

  /**
   * 获取默认安全策略
   */
  private getDefaultSecurityPolicy(provider: CoreMCPProvider): ClientSecurityPolicy {
    const basePolicies: Record<string, Partial<ClientSecurityPolicy>> = {
      trusted: {
        allowedTools: '*',
        blockedTools: [],
        dataFilters: {
          stripSensitiveData: false,
          maxRequestSize: 100 * 1024, // 100KB
          maxResponseSize: 1024 * 1024 // 1MB
        },
        executionLimits: {
          timeout: 60000, // 60秒
          maxConcurrentCalls: 5
        }
      },
      verified: {
        allowedTools: '*',
        blockedTools: ['exec', 'shell', 'system'],
        dataFilters: {
          stripSensitiveData: true,
          maxRequestSize: 50 * 1024,
          maxResponseSize: 500 * 1024
        },
        executionLimits: {
          timeout: 30000,
          maxConcurrentCalls: 3
        }
      },
      public: {
        allowedTools: ['weather', 'search', 'translate', 'calculator'],
        blockedTools: ['file', 'database', 'network', 'exec'],
        dataFilters: {
          stripSensitiveData: true,
          maxRequestSize: 10 * 1024,
          maxResponseSize: 100 * 1024
        },
        executionLimits: {
          timeout: 15000,
          maxConcurrentCalls: 2
        }
      },
      sandbox: {
        allowedTools: ['calculator', 'converter'],
        blockedTools: ['*'],
        dataFilters: {
          stripSensitiveData: true,
          maxRequestSize: 5 * 1024,
          maxResponseSize: 50 * 1024
        },
        executionLimits: {
          timeout: 10000,
          maxConcurrentCalls: 1
        }
      }
    }

    const basePolicy = basePolicies[provider.trustLevel] || basePolicies.sandbox

    return {
      allowedTools: basePolicy.allowedTools || [],
      blockedTools: basePolicy.blockedTools || [],
      dataFilters: basePolicy.dataFilters || {
        stripSensitiveData: true,
        maxRequestSize: 10 * 1024,
        maxResponseSize: 100 * 1024
      },
      executionLimits: basePolicy.executionLimits || {
        timeout: 15000,
        maxConcurrentCalls: 2
      }
    }
  }
}

// 单例实例
let mcpClientManagerInstance: MCPClientManager | null = null

export function getMCPClientManager(): MCPClientManager {
  if (!mcpClientManagerInstance) {
    mcpClientManagerInstance = new MCPClientManager()
  }
  return mcpClientManagerInstance
}