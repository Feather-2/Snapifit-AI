# Snapfit AI 版本合并迁移计划

> **目标**: 将三版本策略（个人版、L站版、社区版）合并到单仓库，通过功能开关实现版本差异化
>
> **创建时间**: 2025-10-17
> **当前状态**: 规划阶段
> **预计工期**: 3-5天（分三个阶段）

---

## 📋 目录

1. [当前状态分析](#当前状态分析)
2. [迁移策略](#迁移策略)
3. [技术难点](#技术难点)
4. [分阶段实施计划](#分阶段实施计划)
5. [风险评估与应对](#风险评估与应对)
6. [回滚方案](#回滚方案)
7. [测试计划](#测试计划)

---

## 当前状态分析

### 现有代码结构优势 ✅

1. **数据库层已有抽象** ([lib/database/index.ts](../../lib/database/index.ts))
   ```typescript
   // 已支持 Supabase 和 PostgreSQL 切换
   const DB_PROVIDER = process.env.DB_PROVIDER || 'supabase'
   ```
   - ✅ 支持 `supabase` 和 `postgresql`
   - ⚠️ 缺少 `sqlite` 支持（个人版需要）

2. **认证系统模块化** ([lib/auth.ts](../../lib/auth.ts))
   ```typescript
   // 当前配置
   providers: [GitHubProvider, CredentialsProvider]
   ```
   - ✅ 支持多 OAuth Provider
   - ⚠️ 所有 Provider 硬编码，无条件加载

3. **组件设计良好**
   - ✅ 114个组件，模块化清晰
   - ✅ 使用 Shadcn/ui，易于条件渲染
   - ⚠️ 管理面板、MCP配置等需要添加权限检查

### 版本差异对照表

| 功能模块 | 个人版 | L站版 | 社区版（当前） |
|---------|--------|-------|--------------|
| **数据库** | SQLite/无 | Supabase | PostgreSQL/Supabase |
| **OAuth** | ❌ | Linux.do | GitHub + Google |
| **凭据登录** | ✅ | ✅ | ✅ |
| **多用户** | ❌ | ✅ | ✅ |
| **管理面板** | ❌ | ❌ | ✅ |
| **MCP Server** | ❌ | ✅ | ✅ |
| **MCP Client** | ❌ | ❌ | ✅ |
| **邀请码** | ❌ | ✅ | ✅ |
| **共享密钥** | ❌ | ✅ | ✅ |
| **部署方式** | Vercel | Vercel | Docker/Vercel |

---

## 迁移策略

### 核心思路：**功能开关 + 环境变量**

```typescript
// 通过环境变量控制版本
NEXT_PUBLIC_VERSION=personal | linuxdo | community

// 基于版本加载不同的功能配置
```

### 架构设计

```
config/
├── versions/
│   ├── index.ts              # 版本配置入口
│   ├── personal.ts           # 个人版配置
│   ├── linuxdo.ts            # L站版配置
│   └── community.ts          # 社区版配置
├── features.ts               # 功能开关系统
└── version-types.ts          # 版本类型定义
```

---

## 技术难点

### 🔴 难点1: 认证系统的动态加载

**问题**：
- NextAuth.js 的 `providers` 在构建时确定
- 不同版本需要不同的 OAuth Provider
- 个人版不需要任何 OAuth

**解决方案**：
```typescript
// lib/auth/providers.ts
export function getAuthProviders(version: AppVersion) {
  const providers = [CredentialsProvider] // 所有版本都有

  switch(version) {
    case 'linuxdo':
      providers.push(LinuxDoProvider)
      break
    case 'community':
      providers.push(GitHubProvider, GoogleProvider)
      break
    case 'personal':
      // 只有凭据登录
      break
  }

  return providers
}
```

### 🟡 难点2: 数据库的版本适配

**问题**：
- 个人版需要支持 SQLite 或无数据库（纯本地 IndexedDB）
- L站版使用 Supabase
- 社区版支持 PostgreSQL 或 Supabase

**解决方案**：
```typescript
// lib/database/providers/sqlite.ts (新增)
export class SQLiteProvider implements DatabaseClient {
  // 实现 SQLite 适配器
}

// lib/database/providers/indexeddb.ts (新增)
export class IndexedDBProvider implements DatabaseClient {
  // 个人版无数据库模式，纯前端
}

// lib/database/index.ts (修改)
export async function createDatabaseClient(): Promise<DatabaseClient> {
  const version = getAppVersion()

  if (version === 'personal') {
    const dbMode = process.env.PERSONAL_DB_MODE || 'indexeddb'
    if (dbMode === 'sqlite') {
      return new SQLiteProvider()
    }
    return new IndexedDBProvider() // 纯前端模式
  }

  // ... 其他版本
}
```

### 🟡 难点3: UI组件的条件渲染

**问题**：
- 管理面板只在社区版显示
- MCP配置在个人版隐藏
- 共享密钥系统按版本显示

**解决方案**：
```typescript
// hooks/use-feature.ts (新增)
export function useFeature(featureName: keyof VersionFeatures) {
  const version = useAppVersion()
  const features = VERSION_FEATURES[version]
  return features[featureName]
}

// 组件中使用
export function AdminPanel() {
  const hasAdminPanel = useFeature('adminPanel')

  if (!hasAdminPanel) return null

  return <div>管理面板内容</div>
}
```

### 🟢 难点4: 构建和打包

**问题**：
- 需要支持构建三个不同版本
- 环境变量需要在构建时确定
- Docker 镜像需要支持多版本

**解决方案**：
```json
// package.json
{
  "scripts": {
    "build:personal": "NEXT_PUBLIC_VERSION=personal next build",
    "build:linuxdo": "NEXT_PUBLIC_VERSION=linuxdo next build",
    "build:community": "NEXT_PUBLIC_VERSION=community next build"
  }
}
```

---

## 分阶段实施计划

### 📍 阶段一：基础设施搭建（1-2天）

**目标**: 建立版本配置系统，不影响现有功能

#### 任务清单

- [ ] 1.1 创建版本配置目录结构
  ```bash
  mkdir -p config/versions
  touch config/versions/index.ts
  touch config/versions/personal.ts
  touch config/versions/linuxdo.ts
  touch config/versions/community.ts
  touch config/features.ts
  touch config/version-types.ts
  ```

- [ ] 1.2 定义版本类型和接口
  ```typescript
  // config/version-types.ts
  export type AppVersion = 'personal' | 'linuxdo' | 'community'

  export interface VersionFeatures {
    // 数据库
    database: 'sqlite' | 'indexeddb' | 'supabase' | 'postgresql'

    // 认证
    oauth: {
      enabled: boolean
      providers: ('github' | 'google' | 'linuxdo')[]
    }
    credentialsAuth: boolean

    // 功能
    multiUser: boolean
    adminPanel: boolean
    inviteSystem: boolean
    sharedKeys: boolean

    // MCP
    mcpServer: boolean
    mcpClient: boolean

    // 部署
    deploymentTargets: ('vercel' | 'docker' | 'local')[]
  }
  ```

- [ ] 1.3 实现版本配置
  ```typescript
  // config/versions/personal.ts
  export const personalConfig: VersionFeatures = {
    database: 'indexeddb',
    oauth: { enabled: false, providers: [] },
    credentialsAuth: true,
    multiUser: false,
    adminPanel: false,
    inviteSystem: false,
    sharedKeys: false,
    mcpServer: false,
    mcpClient: false,
    deploymentTargets: ['vercel', 'local']
  }
  ```

- [ ] 1.4 创建功能开关工具
  ```typescript
  // config/features.ts
  export function getVersionConfig(): VersionFeatures {
    const version = (process.env.NEXT_PUBLIC_VERSION || 'community') as AppVersion
    return VERSION_CONFIGS[version]
  }

  export function hasFeature(feature: keyof VersionFeatures): boolean {
    const config = getVersionConfig()
    return !!config[feature]
  }
  ```

- [ ] 1.5 创建 React Hooks
  ```typescript
  // hooks/use-version.ts
  export function useAppVersion(): AppVersion
  export function useVersionConfig(): VersionFeatures
  export function useFeature(feature: keyof VersionFeatures): any
  ```

**验收标准**:
- ✅ 版本配置系统可以正常工作
- ✅ 默认使用 `community` 版本，现有功能不受影响
- ✅ 可以通过环境变量切换版本
- ✅ 运行 `npm run dev` 正常启动

---

### 📍 阶段二：核心功能适配（2天）

**目标**: 修改认证、数据库等核心模块支持多版本

#### 任务清单

- [ ] 2.1 适配认证系统
  - [ ] 创建 `lib/auth/providers.ts`
  - [ ] 修改 `lib/auth.ts` 使用动态 providers
  - [ ] 添加 Linux.do OAuth Provider（如果需要）
  - [ ] 条件渲染登录按钮

- [ ] 2.2 适配数据库层
  - [ ] 创建 SQLite Provider (`lib/database/providers/sqlite.ts`)
  - [ ] 创建 IndexedDB Provider (`lib/database/providers/indexeddb.ts`)
  - [ ] 修改 `lib/database/index.ts` 支持版本检测
  - [ ] 添加数据库迁移脚本

- [ ] 2.3 修改关键组件
  - [ ] 管理面板添加权限检查 (`components/admin/`)
  - [ ] MCP配置页面添加版本检查 (`app/[locale]/admin/mcp/`)
  - [ ] 共享密钥页面条件显示
  - [ ] 邀请码系统条件启用

- [ ] 2.4 修改导航和菜单
  - [ ] `components/main-nav.tsx` 根据版本显示菜单项
  - [ ] `components/mobile-nav.tsx` 同步修改
  - [ ] 设置页面按版本显示选项

**验收标准**:
- ✅ 三个版本都能正常构建
- ✅ 个人版不显示管理面板
- ✅ L站版显示 Linux.do 登录按钮
- ✅ 社区版保持现有功能完整

---

### 📍 阶段三：构建和部署（1天）

**目标**: 配置自动化构建和多版本部署

#### 任务清单

- [ ] 3.1 创建构建脚本
  - [ ] 添加 `npm run build:personal`
  - [ ] 添加 `npm run build:linuxdo`
  - [ ] 添加 `npm run build:community`
  - [ ] 添加 `npm run build:all` 构建所有版本

- [ ] 3.2 配置环境变量模板
  - [ ] 创建 `.env.personal.example`
  - [ ] 创建 `.env.linuxdo.example`
  - [ ] 创建 `.env.community.example`
  - [ ] 更新主 `.env.example`

- [ ] 3.3 更新 Docker 配置
  - [ ] 修改 `deployment/docker-full/docker-compose.yml` 支持版本参数
  - [ ] 修改 `deployment/docker-single/docker-compose.yml`
  - [ ] 创建多版本 Dockerfile（如果需要）

- [ ] 3.4 配置 GitHub Actions
  - [ ] 创建 `.github/workflows/build-all-versions.yml`
  - [ ] 自动构建三个版本
  - [ ] 自动发布 Docker 镜像
  - [ ] 自动创建 Release

- [ ] 3.5 更新文档
  - [ ] 更新主 README.md 添加版本选择指南
  - [ ] 更新 `deployment/README.md`
  - [ ] 创建版本对比文档
  - [ ] 更新部署文档

**验收标准**:
- ✅ 可以一键构建所有版本
- ✅ Docker 镜像正确打包
- ✅ GitHub Actions 自动化工作
- ✅ 文档完整且准确

---

## 风险评估与应对

### 🔴 高风险项

#### 风险1: 构建失败导致无法部署
- **概率**: 中
- **影响**: 高
- **应对**:
  - 在独立分支进行迁移
  - 每个阶段都进行构建测试
  - 保留当前 community 分支作为备份

#### 风险2: 认证系统改动导致用户登录失败
- **概率**: 低
- **影响**: 极高
- **应对**:
  - 充分测试所有登录路径
  - 保持数据库 schema 不变
  - 提供回滚脚本

### 🟡 中风险项

#### 风险3: 数据库切换导致数据丢失
- **概率**: 低
- **影响**: 高
- **应对**:
  - 在迁移前完整备份数据库
  - 提供数据导入导出工具
  - SQLite 模式仅用于新部署

#### 风险4: 功能开关遗漏导致版本混乱
- **概率**: 中
- **影响**: 中
- **应对**:
  - 建立完整的功能清单
  - 逐个组件检查和测试
  - 编写自动化测试

---

## 回滚方案

### 情况1: 阶段一失败
**操作**:
```bash
# 删除新增的配置文件
rm -rf config/versions
git checkout -- package.json

# 恢复到迁移前状态
git reset --hard HEAD~
```

### 情况2: 阶段二失败（认证/数据库问题）
**操作**:
```bash
# 回滚到阶段一完成时的提交
git revert <commit-hash>

# 或者创建修复分支
git checkout -b hotfix/version-migration
```

### 情况3: 生产环境问题
**操作**:
```bash
# 立即切换到备份分支
git checkout community-backup

# 重新部署
npm run deploy:community
```

---

## 测试计划

### 单元测试

```typescript
// tests/config/features.test.ts
describe('版本配置系统', () => {
  test('个人版配置正确', () => {
    process.env.NEXT_PUBLIC_VERSION = 'personal'
    const config = getVersionConfig()
    expect(config.adminPanel).toBe(false)
    expect(config.multiUser).toBe(false)
  })

  test('社区版配置正确', () => {
    process.env.NEXT_PUBLIC_VERSION = 'community'
    const config = getVersionConfig()
    expect(config.adminPanel).toBe(true)
    expect(config.oauth.providers).toContain('github')
  })
})
```

### 集成测试

```typescript
// tests/auth/oauth.test.ts
describe('认证系统', () => {
  test('个人版不显示OAuth按钮', async () => {
    process.env.NEXT_PUBLIC_VERSION = 'personal'
    const { getByText, queryByText } = render(<SignInPage />)

    expect(queryByText('使用GitHub登录')).toBeNull()
    expect(getByText('使用邮箱登录')).toBeInTheDocument()
  })

  test('社区版显示所有登录方式', async () => {
    process.env.NEXT_PUBLIC_VERSION = 'community'
    const { getByText } = render(<SignInPage />)

    expect(getByText('使用GitHub登录')).toBeInTheDocument()
    expect(getByText('使用Google登录')).toBeInTheDocument()
    expect(getByText('使用邮箱登录')).toBeInTheDocument()
  })
})
```

### 手动测试清单

#### 个人版
- [ ] 可以正常构建
- [ ] 不显示管理面板入口
- [ ] 只显示邮箱登录
- [ ] IndexedDB 数据正常读写
- [ ] 可以部署到 Vercel

#### L站版
- [ ] 可以正常构建
- [ ] 显示 Linux.do OAuth 登录
- [ ] 连接 Supabase 数据库正常
- [ ] 显示共享密钥功能
- [ ] 不显示管理面板

#### 社区版
- [ ] 可以正常构建
- [ ] 所有 OAuth 登录正常
- [ ] 管理面板完整显示
- [ ] PostgreSQL/Supabase 切换正常
- [ ] MCP 功能完整
- [ ] Docker 部署正常

---

## 进度追踪

### 当前状态: 📋 规划阶段

| 阶段 | 状态 | 开始时间 | 完成时间 | 备注 |
|-----|------|---------|---------|------|
| 阶段一 | ⏸️ 未开始 | - | - | 基础设施搭建 |
| 阶段二 | ⏸️ 未开始 | - | - | 核心功能适配 |
| 阶段三 | ⏸️ 未开始 | - | - | 构建和部署 |

---

## 附录

### 相关文档
- [VERSION-STRATEGY.md](../VERSION-STRATEGY.md) - 原版本策略文档
- [MCP_DUAL_ARCHITECTURE.md](../MCP_DUAL_ARCHITECTURE.md) - MCP架构文档
- [DEPLOYMENT.md](../DEPLOYMENT.md) - 部署指南

### 参考资料
- Next.js Environment Variables: https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
- NextAuth.js Dynamic Providers: https://next-auth.js.org/configuration/providers/oauth
- Feature Flags Best Practices: https://martinfowler.com/articles/feature-toggles.html

---

**文档维护者**: Claude
**最后更新**: 2025-10-17
