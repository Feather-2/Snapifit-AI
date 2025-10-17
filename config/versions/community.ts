import type { VersionConfig } from '../version-types'

/**
 * 社区版配置
 *
 * @description
 * 功能完整的社区版本
 * - 多 OAuth 支持
 * - PostgreSQL/Supabase
 * - 完整管理面板
 * - 双向 MCP 架构
 */
export const communityConfig: VersionConfig = {
  metadata: {
    name: 'community',
    displayName: 'Snapfit AI 社区版',
    description: '功能完整的健康管理应用，适合团队和企业',
    targetUsers: '企业、团队、开发者',
    recommendedDeployment: 'docker',
    minRequirements: {
      memory: '2GB',
      storage: '20GB',
      nodeVersion: '20+'
    }
  },

  features: {
    database: {
      type: 'postgresql', // 默认 PostgreSQL，支持 Supabase
      requiresServerDb: true,
      supportsMultiUser: true
    },

    auth: {
      credentials: true,
      oauth: {
        enabled: true,
        providers: ['github', 'google']
      },
      emailVerification: true,
      passwordReset: true
    },

    userSystem: {
      multiUser: true,
      roleSystem: true,
      trustLevelSystem: true,
      banSystem: true
    },

    admin: {
      adminPanel: true, // 完整管理面板
      userManagement: true,
      systemConfig: true,
      securityMonitoring: true
    },

    invite: {
      inviteCodeSystem: true,
      inviteQuotaManagement: true
    },

    ai: {
      sharedKeys: true,
      privateKeys: true,
      memorySystem: true,
      multiModel: true
    },

    mcp: {
      server: true, // MCP Server
      client: true, // MCP Client
      configManagement: true
    },

    data: {
      export: true,
      import: true,
      cloudSync: true,
      localBackup: true
    },

    deployment: {
      targets: ['docker', 'vercel', 'local'],
      requiresDocker: true, // 推荐 Docker
      supportsVercel: true
    },

    ui: {
      showVersionBadge: true,
      showContributors: true,
      showCommunityFeatures: true
    }
  },

  env: {
    required: [
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL',
      'DATABASE_URL' // PostgreSQL 连接字符串
    ],
    optional: [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'GITHUB_CLIENT_ID',
      'GITHUB_CLIENT_SECRET',
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'OPENAI_API_KEY',
      'DB_PROVIDER' // 'postgresql' 或 'supabase'
    ],
    defaults: {
      DB_PROVIDER: 'postgresql',
      NEXT_PUBLIC_VERSION: 'community'
    }
  }
}
