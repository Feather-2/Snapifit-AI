import { MCPProvider } from './client'

/**
 * 简化版 Provider Registry（后续可持久化到数据库并加密敏感字段）
 */
class ProviderRegistry {
  private providers: Map<string, MCPProvider> = new Map()

  constructor() {
    // 默认内置提供者（本地健康工具 + 本地文件系统）
    const defaults: MCPProvider[] = [
      {
        id: 'local-health-tools',
        name: '本地健康工具',
        serverUrl: 'internal:health-tools',
        isActive: true,
        connectionTimeout: 20000
      },
      {
        id: 'local-fs',
        name: '本地文件系统',
        serverUrl: process.platform === 'win32'
          ? 'npx -y @modelcontextprotocol/server-filesystem %TEMP%'
          : 'npx -y @modelcontextprotocol/server-filesystem /tmp',
        isActive: true,
        connectionTimeout: 20000
      }
    ]
    defaults.forEach(p => this.providers.set(p.id, p))
  }

  list(): MCPProvider[] {
    return Array.from(this.providers.values())
  }

  get(id: string): MCPProvider | undefined {
    return this.providers.get(id)
  }

  upsert(provider: MCPProvider) {
    this.providers.set(provider.id, provider)
  }

  remove(id: string) {
    this.providers.delete(id)
  }
}

let registry: ProviderRegistry | null = null
export function getProviderRegistry(): ProviderRegistry {
  if (!registry) registry = new ProviderRegistry()
  return registry
}


