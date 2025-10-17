import type { VersionConfig } from '../version-types'

/**
 * 个人版配置
 *
 * @description
 * 轻量级版本，适合个人使用
 * - 无需服务端数据库（可选 SQLite）
 * - 纯前端或简单部署
 * - 单用户模式
 */
export const personalConfig: VersionConfig = {
  metadata: {
    name: 'personal',
    displayName: 'Snapfit AI 个人版',
    description: '轻量级健康管理应用，适合个人使用',
    targetUsers: '个人用户',
    recommendedDeployment: 'vercel',
    minRequirements: {
      memory: '512MB',
      storage: '500MB',
      nodeVersion: '20+'
    }
  },

  features: {
    database: {
      type: 'indexeddb', // 默认使用浏览器 IndexedDB
      requiresServerDb: false,
      supportsMultiUser: false
    },

    auth: {
      credentials: true, // 简单的本地密码
      oauth: {
        enabled: false,
        providers: []
      },
      emailVerification: false,
      passwordReset: false
    },

    userSystem: {
      multiUser: false,
      roleSystem: false,
      trustLevelSystem: false,
      banSystem: false
    },

    admin: {
      adminPanel: false,
      userManagement: false,
      systemConfig: false,
      securityMonitoring: false
    },

    invite: {
      inviteCodeSystem: false,
      inviteQuotaManagement: false
    },

    ai: {
      sharedKeys: false,
      privateKeys: true, // 用户自己配置 AI 密钥
      memorySystem: true,
      multiModel: true
    },

    mcp: {
      server: false,
      client: false,
      configManagement: false
    },

    data: {
      export: true,
      import: true,
      cloudSync: false, // 无云端同步
      localBackup: true
    },

    deployment: {
      targets: ['vercel', 'local'],
      requiresDocker: false,
      supportsVercel: true
    },

    ui: {
      showVersionBadge: true,
      showContributors: false,
      showCommunityFeatures: false
    }
  },

  env: {
    required: [
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL'
    ],
    optional: [
      'OPENAI_API_KEY', // 用户可选配置
      'PERSONAL_DB_MODE' // 'indexeddb' 或 'sqlite'
    ],
    defaults: {
      PERSONAL_DB_MODE: 'indexeddb',
      NEXT_PUBLIC_VERSION: 'personal'
    }
  }
}
