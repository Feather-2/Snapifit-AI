# 阶段一：基础设施搭建 - 详细实施指南

> **目标**: 建立版本配置系统，为后续迁移打好基础
>
> **预计时间**: 1-2天
> **风险等级**: 🟢 低风险
> **可回滚**: ✅ 是

---

## 📋 任务概览

```
总任务数: 5
预计工时: 8-12小时
依赖关系: 1.1 → 1.2 → 1.3 → 1.4 → 1.5
```

---

## 任务 1.1：创建版本配置目录结构

### 执行步骤

```bash
# 1. 在项目根目录创建配置目录
mkdir -p config/versions

# 2. 创建版本配置文件
touch config/versions/index.ts
touch config/versions/personal.ts
touch config/versions/linuxdo.ts
touch config/versions/community.ts

# 3. 创建功能开关和类型文件
touch config/features.ts
touch config/version-types.ts

# 4. 创建 React Hooks 目录（如果不存在）
mkdir -p hooks

# 5. 创建版本相关 Hooks
touch hooks/use-version.ts
touch hooks/use-feature.ts

# 6. 验证文件创建
ls -la config/versions/
ls -la hooks/use-*.ts
```

### 预期结果

```
config/
├── versions/
│   ├── index.ts          # ✅ 已创建
│   ├── personal.ts       # ✅ 已创建
│   ├── linuxdo.ts        # ✅ 已创建
│   └── community.ts      # ✅ 已创建
├── features.ts           # ✅ 已创建
└── version-types.ts      # ✅ 已创建

hooks/
├── use-version.ts        # ✅ 已创建
└── use-feature.ts        # ✅ 已创建
```

---

## 任务 1.2：定义版本类型和接口

### 文件：`config/version-types.ts`

```typescript
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
```

### 验证

```bash
# 编译检查类型定义
npx tsc --noEmit config/version-types.ts
```

---

## 任务 1.3：实现版本配置

### 文件：`config/versions/personal.ts`

```typescript
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
```

### 文件：`config/versions/linuxdo.ts`

```typescript
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
      credentials: true,
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
      'LINUXDO_CLIENT_ID',
      'LINUXDO_CLIENT_SECRET'
    ],
    optional: [
      'OPENAI_API_KEY'
    ],
    defaults: {
      DB_PROVIDER: 'supabase',
      NEXT_PUBLIC_VERSION: 'linuxdo'
    }
  }
}
```

### 文件：`config/versions/community.ts`

```typescript
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
```

### 文件：`config/versions/index.ts`

```typescript
import { personalConfig } from './personal'
import { linuxdoConfig } from './linuxdo'
import { communityConfig } from './community'
import type { AppVersion, VersionConfig } from '../version-types'

/**
 * 版本配置映射
 */
export const VERSION_CONFIGS: Record<AppVersion, VersionConfig> = {
  personal: personalConfig,
  linuxdo: linuxdoConfig,
  community: communityConfig
}

/**
 * 获取当前版本
 */
export function getCurrentVersion(): AppVersion {
  const version = process.env.NEXT_PUBLIC_VERSION as AppVersion

  // 验证版本有效性
  if (!version || !VERSION_CONFIGS[version]) {
    console.warn(`Invalid version: ${version}, falling back to 'community'`)
    return 'community'
  }

  return version
}

/**
 * 获取当前版本配置
 */
export function getCurrentVersionConfig(): VersionConfig {
  const version = getCurrentVersion()
  return VERSION_CONFIGS[version]
}

/**
 * 导出所有配置
 */
export { personalConfig, linuxdoConfig, communityConfig }
export * from '../version-types'
```

---

## 任务 1.4：创建功能开关工具

### 文件：`config/features.ts`

```typescript
import { getCurrentVersionConfig, getCurrentVersion } from './versions'
import type { VersionFeatures, VersionConfig, FeaturePath } from './version-types'

/**
 * 获取版本配置
 */
export function getVersionConfig(): VersionConfig {
  return getCurrentVersionConfig()
}

/**
 * 获取功能配置
 */
export function getFeatures(): VersionFeatures {
  return getCurrentVersionConfig().features
}

/**
 * 获取当前版本名称
 */
export function getVersion() {
  return getCurrentVersion()
}

/**
 * 检查功能是否启用
 *
 * @example
 * hasFeature('admin.adminPanel') // 返回 boolean
 * hasFeature('mcp.server') // 返回 boolean
 */
export function hasFeature(featurePath: string): boolean {
  const features = getFeatures()
  const parts = featurePath.split('.')

  let current: any = features
  for (const part of parts) {
    if (current === undefined || current === null) {
      return false
    }
    current = current[part]
  }

  return Boolean(current)
}

/**
 * 获取嵌套功能值
 *
 * @example
 * getFeatureValue('database.type') // 返回 'postgresql' 等
 * getFeatureValue('auth.oauth.providers') // 返回 ['github', 'google']
 */
export function getFeatureValue<T = any>(featurePath: string): T | undefined {
  const features = getFeatures()
  const parts = featurePath.split('.')

  let current: any = features
  for (const part of parts) {
    if (current === undefined || current === null) {
      return undefined
    }
    current = current[part]
  }

  return current as T
}

/**
 * 是否是个人版
 */
export function isPersonalVersion(): boolean {
  return getVersion() === 'personal'
}

/**
 * 是否是 L站版
 */
export function isLinuxdoVersion(): boolean {
  return getVersion() === 'linuxdo'
}

/**
 * 是否是社区版
 */
export function isCommunityVersion(): boolean {
  return getVersion() === 'community'
}

/**
 * 获取版本显示名称
 */
export function getVersionDisplayName(): string {
  return getVersionConfig().metadata.displayName
}

/**
 * 获取环境变量配置
 */
export function getEnvConfig() {
  return getVersionConfig().env
}

/**
 * 验证必需的环境变量
 */
export function validateEnv(): { valid: boolean; missing: string[] } {
  const envConfig = getEnvConfig()
  const missing: string[] = []

  for (const key of envConfig.required) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }

  return {
    valid: missing.length === 0,
    missing
  }
}
```

---

## 任务 1.5：创建 React Hooks

### 文件：`hooks/use-version.ts`

```typescript
'use client'

import { useMemo } from 'react'
import { getVersion, getVersionConfig, getFeatures } from '@/config/features'
import type { AppVersion, VersionConfig, VersionFeatures } from '@/config/version-types'

/**
 * 获取当前版本
 */
export function useAppVersion(): AppVersion {
  return useMemo(() => getVersion(), [])
}

/**
 * 获取版本配置
 */
export function useVersionConfig(): VersionConfig {
  return useMemo(() => getVersionConfig(), [])
}

/**
 * 获取功能配置
 */
export function useFeatures(): VersionFeatures {
  return useMemo(() => getFeatures(), [])
}

/**
 * 获取版本元信息
 */
export function useVersionMetadata() {
  const config = useVersionConfig()
  return config.metadata
}

/**
 * 版本判断 hooks
 */
export function useIsPersonalVersion(): boolean {
  const version = useAppVersion()
  return version === 'personal'
}

export function useIsLinuxdoVersion(): boolean {
  const version = useAppVersion()
  return version === 'linuxdo'
}

export function useIsCommunityVersion(): boolean {
  const version = useAppVersion()
  return version === 'community'
}
```

### 文件：`hooks/use-feature.ts`

```typescript
'use client'

import { useMemo } from 'react'
import { hasFeature, getFeatureValue } from '@/config/features'
import type { VersionFeatures } from '@/config/version-types'

/**
 * 检查功能是否启用
 *
 * @example
 * const hasAdmin = useFeature('admin.adminPanel')
 * const hasMCP = useFeature('mcp.server')
 */
export function useFeature(featurePath: string): boolean {
  return useMemo(() => hasFeature(featurePath), [featurePath])
}

/**
 * 获取功能值
 *
 * @example
 * const dbType = useFeatureValue<string>('database.type')
 * const oauthProviders = useFeatureValue<string[]>('auth.oauth.providers')
 */
export function useFeatureValue<T = any>(featurePath: string): T | undefined {
  return useMemo(() => getFeatureValue<T>(featurePath), [featurePath])
}

/**
 * 功能分组 hooks
 */
export function useDatabaseFeatures() {
  return useMemo(() => {
    const type = getFeatureValue<string>('database.type')
    const requiresServerDb = hasFeature('database.requiresServerDb')
    const supportsMultiUser = hasFeature('database.supportsMultiUser')

    return { type, requiresServerDb, supportsMultiUser }
  }, [])
}

export function useAuthFeatures() {
  return useMemo(() => {
    const credentials = hasFeature('auth.credentials')
    const oauthEnabled = hasFeature('auth.oauth.enabled')
    const oauthProviders = getFeatureValue<string[]>('auth.oauth.providers') || []

    return { credentials, oauthEnabled, oauthProviders }
  }, [])
}

export function useAdminFeatures() {
  return useMemo(() => {
    const adminPanel = hasFeature('admin.adminPanel')
    const userManagement = hasFeature('admin.userManagement')
    const systemConfig = hasFeature('admin.systemConfig')

    return { adminPanel, userManagement, systemConfig }
  }, [])
}

export function useMCPFeatures() {
  return useMemo(() => {
    const server = hasFeature('mcp.server')
    const client = hasFeature('mcp.client')
    const configManagement = hasFeature('mcp.configManagement')

    return { server, client, configManagement }
  }, [])
}
```

---

## 验收测试

### 1. 类型检查

```bash
# 检查所有新增文件的类型
npx tsc --noEmit config/**/*.ts
npx tsc --noEmit hooks/use-*.ts
```

### 2. 功能测试

创建测试文件 `tests/config/features.test.ts`:

```typescript
import { getVersion, hasFeature, getFeatureValue } from '@/config/features'

describe('版本配置系统', () => {
  beforeEach(() => {
    // 重置环境变量
    delete process.env.NEXT_PUBLIC_VERSION
  })

  test('默认使用 community 版本', () => {
    expect(getVersion()).toBe('community')
  })

  test('个人版配置正确', () => {
    process.env.NEXT_PUBLIC_VERSION = 'personal'

    expect(hasFeature('admin.adminPanel')).toBe(false)
    expect(hasFeature('auth.oauth.enabled')).toBe(false)
    expect(getFeatureValue('database.type')).toBe('indexeddb')
  })

  test('社区版配置正确', () => {
    process.env.NEXT_PUBLIC_VERSION = 'community'

    expect(hasFeature('admin.adminPanel')).toBe(true)
    expect(hasFeature('mcp.server')).toBe(true)
    expect(hasFeature('mcp.client')).toBe(true)
  })
})
```

### 3. 运行测试

```bash
# 运行单元测试
npm test -- tests/config/features.test.ts

# 或者手动验证
npm run dev
# 访问 http://localhost:3000 确认应用正常启动
```

---

## 常见问题

### Q1: TypeScript 报错 "Cannot find module '@/config/features'"

**解决方案**:
```json
// tsconfig.json 确认 paths 配置正确
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Q2: 环境变量不生效

**解决方案**:
```bash
# 重启开发服务器
npm run dev

# 或者清除缓存
rm -rf .next
npm run dev
```

### Q3: 默认值没有生效

**解决方案**:
- 确保在 `.env.local` 中没有冲突的配置
- 检查 `NEXT_PUBLIC_VERSION` 是否正确设置

---

## 完成标志

- ✅ 所有文件创建完成
- ✅ TypeScript 编译无错误
- ✅ 测试用例通过
- ✅ 应用可以正常启动
- ✅ 默认使用 community 版本，现有功能不受影响

---

## 下一步

完成阶段一后，进入 [阶段二：核心功能适配](./PHASE-2-CORE-ADAPTATION.md)

---

**文档维护者**: Claude
**最后更新**: 2025-10-17
