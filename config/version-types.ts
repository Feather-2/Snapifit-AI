/**
 * 版本类型定义
 *
 * @description
 * 定义应用的三个版本类型及其功能配置接口
 */

// 应用版本类型
export type AppVersion = 'personal' | 'linuxdo' | 'community'

// OAuth 提供商类型
export type OAuthProvider = 'github' | 'google' | 'linuxdo'

// 数据库类型
export type DatabaseType = 'sqlite' | 'indexeddb' | 'supabase' | 'postgresql'

// 部署目标类型
export type DeploymentTarget = 'vercel' | 'docker' | 'local'

/**
 * 版本特性配置接口
 */
export interface VersionFeatures {
  // ========== 数据库配置 ==========
  database: {
    type: DatabaseType
    // 是否需要服务端数据库
    requiresServerDb: boolean
    // 是否支持多用户
    supportsMultiUser: boolean
  }

  // ========== 认证配置 ==========
  auth: {
    // 邮箱密码登录
    credentials: boolean
    // OAuth 配置
    oauth: {
      enabled: boolean
      providers: OAuthProvider[]
    }
    // 是否需要邮箱验证
    emailVerification: boolean
    // 是否支持密码重置
    passwordReset: boolean
  }

  // ========== 用户系统 ==========
  userSystem: {
    // 多用户支持
    multiUser: boolean
    // 用户角色系统
    roleSystem: boolean
    // 信任等级系统
    trustLevelSystem: boolean
    // 用户封禁功能
    banSystem: boolean
  }

  // ========== 管理功能 ==========
  admin: {
    // 管理面板
    adminPanel: boolean
    // 用户管理
    userManagement: boolean
    // 系统配置
    systemConfig: boolean
    // 安全监控
    securityMonitoring: boolean
  }

  // ========== 邀请系统 ==========
  invite: {
    // 邀请码系统
    inviteCodeSystem: boolean
    // 邀请配额管理
    inviteQuotaManagement: boolean
  }

  // ========== AI 功能 ==========
  ai: {
    // 共享密钥系统
    sharedKeys: boolean
    // 私有密钥
    privateKeys: boolean
    // AI 记忆系统
    memorySystem: boolean
    // 多模型支持
    multiModel: boolean
  }

  // ========== MCP 功能 ==========
  mcp: {
    // MCP Server（提供健康工具）
    server: boolean
    // MCP Client（接入第三方工具）
    client: boolean
    // MCP 配置管理
    configManagement: boolean
  }

  // ========== 数据管理 ==========
  data: {
    // 数据导出
    export: boolean
    // 数据导入
    import: boolean
    // 云端同步
    cloudSync: boolean
    // 本地备份
    localBackup: boolean
  }

  // ========== 部署配置 ==========
  deployment: {
    // 支持的部署目标
    targets: DeploymentTarget[]
    // 是否需要 Docker
    requiresDocker: boolean
    // 是否支持 Vercel
    supportsVercel: boolean
  }

  // ========== UI 功能 ==========
  ui: {
    // 显示版本标识
    showVersionBadge: boolean
    // 显示贡献者榜单
    showContributors: boolean
    // 显示社区功能
    showCommunityFeatures: boolean
  }
}

/**
 * 环境变量配置接口
 */
export interface VersionEnvConfig {
  // 必需的环境变量
  required: string[]
  // 可选的环境变量
  optional: string[]
  // 默认值
  defaults: Record<string, string>
}

/**
 * 版本元信息接口
 */
export interface VersionMetadata {
  // 版本名称
  name: string
  // 版本显示名称
  displayName: string
  // 版本描述
  description: string
  // 目标用户
  targetUsers: string
  // 推荐部署方式
  recommendedDeployment: DeploymentTarget
  // 最小系统要求
  minRequirements: {
    memory: string
    storage: string
    nodeVersion: string
  }
}

/**
 * 完整的版本配置
 */
export interface VersionConfig {
  metadata: VersionMetadata
  features: VersionFeatures
  env: VersionEnvConfig
}

/**
 * 功能开关辅助类型
 */
export type FeaturePath =
  | `database.${keyof VersionFeatures['database']}`
  | `auth.${keyof VersionFeatures['auth']}`
  | `userSystem.${keyof VersionFeatures['userSystem']}`
  | `admin.${keyof VersionFeatures['admin']}`
  | `invite.${keyof VersionFeatures['invite']}`
  | `ai.${keyof VersionFeatures['ai']}`
  | `mcp.${keyof VersionFeatures['mcp']}`
  | `data.${keyof VersionFeatures['data']}`
  | `deployment.${keyof VersionFeatures['deployment']}`
  | `ui.${keyof VersionFeatures['ui']}`
