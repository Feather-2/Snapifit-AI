import type { VersionConfig } from '../version-types'

/**
 * Linux.do 专属版配置
 *
 * @description
 * 为 Linux.do 社区定制的版本
 * - Linux.do OAuth 登录
 * - Supabase 数据库
 * - 多用户支持
 * - 共享密钥系统
 */
export const linuxdoConfig: VersionConfig = {
  metadata: {
    name: 'linuxdo',
    displayName: 'Snapfit AI for Linux.do',
    description: 'Linux.do 社区专属健康管理应用',
    targetUsers: 'Linux.do 社区用户',
    recommendedDeployment: 'vercel',
    minRequirements: {
      memory: '1GB',
      storage: '10GB',
      nodeVersion: '20+'
    }
  },

  features: {
    database: {
      type: 'supabase',
      requiresServerDb: true,
      supportsMultiUser: true
    },

    auth: {
      credentials: false,
      oauth: {
        enabled: true,
        providers: ['linuxdo']
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
      adminPanel: false, // L站版无管理面板
      userManagement: false,
      systemConfig: false,
      securityMonitoring: true
    },

    invite: {
      inviteCodeSystem: true,
      inviteQuotaManagement: true
    },

    ai: {
      sharedKeys: true, // 共享密钥池
      privateKeys: true,
      memorySystem: true,
      multiModel: true
    },

    mcp: {
      server: true, // 提供健康工具
      client: false,
      configManagement: false
    },

    data: {
      export: true,
      import: true,
      cloudSync: true,
      localBackup: true
    },

    deployment: {
      targets: ['vercel'],
      requiresDocker: false,
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
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      // Linux.do OAuth：支持两套命名（LINUXDO_* 或 OAUTH_*）
      // 至少需要其中一套的 CLIENT_ID/CLIENT_SECRET
      // 端点可通过 OIDC issuer/well-known 或 OAuth2 三元组提供
      'LINUXDO_CLIENT_ID',
      'LINUXDO_CLIENT_SECRET'
    ],
    optional: [
      'OPENAI_API_KEY',
      'LINUXDO_ISSUER',
      'LINUXDO_WELL_KNOWN_URL',
      'LINUXDO_AUTH_URL',
      'LINUXDO_TOKEN_URL',
      'LINUXDO_USER_INFO_URL',
      'LINUXDO_SCOPES',
      // 同义变量（支持外部提供的 OAUTH_*）
      'OAUTH_CLIENT_ID',
      'OAUTH_CLIENT_SECRET',
      'OAUTH_AUTH_URL',
      'OAUTH_TOKEN_URL',
      'OAUTH_USER_INFO_URL',
      'OAUTH_SCOPES'
    ],
    defaults: {
      DB_PROVIDER: 'supabase',
      NEXT_PUBLIC_VERSION: 'linuxdo'
    }
  }
}
