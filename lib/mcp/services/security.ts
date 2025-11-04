/**
 * 安全服务
 * 处理MCP服务器的安全检查、审核和过滤
 */

import { SecurityConfig, MCPCallContext, ReviewResult, SecurityReviewInterface } from '../types'
import { logInfo, logWarn } from '@/lib/logging'

export class SecurityService implements SecurityReviewInterface {
  private callCounts: Map<string, { count: number, resetTime: number }> = new Map()

  constructor(private config: SecurityConfig) {}

  /**
   * 验证工具调用安全性
   */
  async validateToolCall(toolName: string, params: any, context: MCPCallContext): Promise<void> {
    logInfo('mcp_validate_tool_call', { toolName } as any)

    // 速率限制检查
    await this.checkRateLimit(context.userId || 'anonymous')

    // 参数安全检查
    this.validateParameters(params)

    // 敏感数据检查
    this.checkForSensitiveData(params)
  }

  /**
   * 速率限制检查
   */
  private async checkRateLimit(userId: string): Promise<void> {
    if (!this.config.rateLimiting.enabled) {
      return
    }

    const now = Date.now()
    const windowStart = now - (60 * 1000) // 1分钟窗口
    const key = `${userId}_${Math.floor(now / (60 * 1000))}`

    const userCalls = this.callCounts.get(key) || { count: 0, resetTime: windowStart }

    // 重置过期的计数
    if (now > userCalls.resetTime + (60 * 1000)) {
      this.callCounts.set(key, { count: 1, resetTime: now })
      return
    }

    // 检查是否超过限制
    if (userCalls.count >= this.config.rateLimiting.requestsPerMinute) {
      throw new Error(`速率限制：每分钟最多 ${this.config.rateLimiting.requestsPerMinute} 次请求`)
    }

    // 增加计数
    this.callCounts.set(key, {
      count: userCalls.count + 1,
      resetTime: userCalls.resetTime
    })
  }

  /**
   * 参数验证
   */
  private validateParameters(params: any): void {
    if (!params || typeof params !== 'object') {
      return
    }

    // 检查参数大小
    const paramString = JSON.stringify(params)
    if (paramString.length > 10 * 1024) { // 10KB限制
      throw new Error('请求参数过大')
    }

    // 检查危险的SQL注入模式
    const dangerousPatterns = [
      /;\s*drop\s+table/gi,
      /;\s*delete\s+from/gi,
      /;\s*update\s+.+set/gi,
      /<script[^>]*>/gi,
      /javascript:/gi
    ]

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        for (const pattern of dangerousPatterns) {
          if (pattern.test(value)) {
            throw new Error(`参数包含危险内容: ${key}`)
          }
        }
      }
    }
  }

  /**
   * 敏感数据检查
   */
  private checkForSensitiveData(params: any): void {
    const paramString = JSON.stringify(params)

    for (const sensitiveField of this.config.dataFilters.sensitiveFields) {
      if (paramString.toLowerCase().includes(sensitiveField.toLowerCase())) {
        logWarn('mcp_sensitive_field_detected', { field: sensitiveField } as any)
        // 可以选择阻止请求或记录日志
      }
    }
  }

  /**
   * 审核请求（预留接口实现）
   */
  async reviewRequest(request: any, context: MCPCallContext): Promise<ReviewResult> {
    logInfo('mcp_review_request')

    // 基础安全检查
    const issues = []

    // 检查请求大小
    const requestSize = JSON.stringify(request).length
    if (requestSize > 50 * 1024) { // 50KB
      issues.push({
        type: 'request_too_large',
        severity: 'medium' as const,
        description: '请求体过大'
      })
    }

    // TODO: 这里可以添加多层Agent审核
    // const agentResults = await this.runMultiLayerReview(request, context)

    return {
      approved: issues.length === 0,
      confidence: 0.8,
      issues,
      recommendedAction: issues.length === 0 ? 'approve' : 'review',
      // 预留字段
      agentResults: [], // 未来的多层Agent结果
      reviewChainResults: [] // 审核链结果
    }
  }

  /**
   * 审核响应（预留接口实现）
   */
  async reviewResponse(response: any, context: MCPCallContext): Promise<ReviewResult> {
    logInfo('mcp_review_response')

    const issues = []

    // 检查响应大小
    const responseString = JSON.stringify(response)
    if (responseString.length > this.config.dataFilters.maxResponseSize) {
      issues.push({
        type: 'response_too_large',
        severity: 'high' as const,
        description: '响应数据过大'
      })
    }

    // 检查敏感信息泄露
    const sensitiveDataFound = this.scanForSensitiveData(responseString)
    if (sensitiveDataFound.length > 0) {
      issues.push({
        type: 'sensitive_data_leak',
        severity: 'high' as const,
        description: `检测到敏感信息: ${sensitiveDataFound.join(', ')}`
      })
    }

    // TODO: 这里可以添加多层Agent审核
    // const agentResults = await this.runMultiLayerReview(response, context)

    return {
      approved: issues.length === 0,
      confidence: 0.7,
      issues,
      recommendedAction: issues.some(i => i.severity === 'high') ? 'reject' : 'approve',
      // 预留字段
      agentResults: [],
      reviewChainResults: []
    }
  }

  /**
   * 扫描敏感数据
   */
  private scanForSensitiveData(content: string): string[] {
    const found: string[] = []

    const sensitivePatterns = [
      { name: '信用卡号', pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g },
      { name: '身份证号', pattern: /\b\d{17}[\dXx]\b/g },
      { name: '手机号', pattern: /\b1[3-9]\d{9}\b/g },
      { name: '邮箱', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g }
    ]

    for (const { name, pattern } of sensitivePatterns) {
      if (pattern.test(content)) {
        found.push(name)
      }
    }

    return found
  }

  /**
   * 过滤响应中的敏感信息
   */
  filterSensitiveDataFromResponse(response: any): any {
    if (typeof response !== 'object' || response === null) {
      return response
    }

    const filtered = Array.isArray(response) ? [...response] : { ...response }

    // 递归过滤敏感字段
    for (const [key, value] of Object.entries(filtered)) {
      if (this.config.dataFilters.sensitiveFields.some(field =>
        key.toLowerCase().includes(field.toLowerCase())
      )) {
        (filtered as any)[key] = '[已过滤]'
      } else if (typeof value === 'object' && value !== null) {
        (filtered as any)[key] = this.filterSensitiveDataFromResponse(value)
      }
    }

    return filtered
  }

  /**
   * 记录安全事件
   */
  logSecurityEvent(event: {
    type: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    userId?: string
    details: any
  }): void {
    if (!this.config.auditLogging) {
      return
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      ...event,
      type: 'security_event'
    }

    logInfo('mcp_security_event', logEntry as any)

    // TODO: 发送到日志系统或安全监控平台
  }

  /**
   * 获取安全统计信息
   */
  getSecurityStats() {
    return {
      rateLimitingEnabled: this.config.rateLimiting.enabled,
      auditLoggingEnabled: this.config.auditLogging,
      activeSessions: this.callCounts.size,
      totalCallsTracked: Array.from(this.callCounts.values())
        .reduce((sum, session) => sum + session.count, 0)
    }
  }

  /**
   * 清理过期的速率限制记录
   */
  cleanupExpiredRateLimits(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    for (const [key, data] of this.callCounts.entries()) {
      if (now > data.resetTime + (60 * 1000)) { // 1分钟后过期
        expiredKeys.push(key)
      }
    }

    for (const key of expiredKeys) {
      this.callCounts.delete(key)
    }
  }

  // 预留方法：未来的多层Agent审核
  private async runMultiLayerReview(content: any, context: MCPCallContext): Promise<any[]> {
    // TODO: 实现多层Agent审核链
    // 1. 基础安全扫描Agent
    // 2. 医疗内容审核Agent
    // 3. 隐私保护审核Agent
    // 4. 上下文理解审核Agent

    logInfo('mcp_multi_agent_review_reserved')
    return []
  }
}