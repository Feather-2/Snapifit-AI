import { getProviderRegistry } from './provider-registry'
import { getSimpleMCPCaller, MCPProvider } from './client'
import { recordHealthCheck, recordToolCall } from './metrics'
import type { ToolDiscoveryResponse } from './types'

export interface OrchestratorCallOptions {
  providerId: string
  toolName: string
  params?: Record<string, any>
}

class MCPOrchestrator {
  async listProviders(): Promise<Array<Pick<MCPProvider, 'id' | 'name' | 'isActive'>>> {
    const providers = getProviderRegistry().list()
    return providers.map(p => ({ id: p.id, name: p.name, isActive: p.isActive }))
  }

  async getTools(providerId: string): Promise<ToolDiscoveryResponse['tools']> {
    const provider = getProviderRegistry().get(providerId)
    if (!provider) throw new Error(`提供者不存在: ${providerId}`)
    const caller = getSimpleMCPCaller()
    const tools = await caller.getProviderTools(provider)
    return tools
  }

  async callTool(opts: OrchestratorCallOptions) {
    const provider = getProviderRegistry().get(opts.providerId)
    if (!provider) throw new Error(`提供者不存在: ${opts.providerId}`)
    if (!provider.isActive) throw new Error(`提供者已禁用: ${provider.name}`)
    const caller = getSimpleMCPCaller()
    const maxRetries = 2
    const baseDelay = 200
    let attempt = 0
    let lastError: any = null
    const start = Date.now()
    while (attempt <= maxRetries) {
      try {
        const res = await caller.callTool(provider, opts.toolName, opts.params || {})
        recordToolCall({ providerId: provider.id, providerName: provider.name, tool: opts.toolName, success: res.success, durationMs: Date.now() - start, resultBytes: res && res.success && res.result != null ? JSON.stringify(res.result).length : 0 })
        return res
      } catch (e) {
        lastError = e
        if (attempt === maxRetries) break
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise(r => setTimeout(r, delay))
        attempt += 1
      }
    }
    recordToolCall({ providerId: provider.id, providerName: provider.name, tool: opts.toolName, success: false, durationMs: Date.now() - start })
    throw lastError || new Error('工具调用失败')
  }

  async healthCheck(providerId: string) {
    try {
      const start = Date.now()
      await this.getTools(providerId)
      const duration = Date.now() - start
      recordHealthCheck({ providerId, healthy: true, durationMs: duration })
      return { healthy: true, checkedAt: new Date().toISOString() }
    } catch (e) {
      recordHealthCheck({ providerId, healthy: false })
      return { healthy: false, error: e instanceof Error ? e.message : String(e), checkedAt: new Date().toISOString() }
    }
  }
}

let orchestrator: MCPOrchestrator | null = null
export function getMCPOrchestrator(): MCPOrchestrator {
  if (!orchestrator) orchestrator = new MCPOrchestrator()
  return orchestrator
}


