# 版本合并迁移 - 快速开始指南

> **适用人群**: 想要快速了解迁移过程的开发者
>
> **阅读时间**: 5分钟

---

## 🎯 迁移目标

将三个版本（个人版、L站版、社区版）合并到一个仓库，通过环境变量和功能开关实现版本差异化。

**好处**:
- ✅ 统一维护，降低成本
- ✅ 自动化构建和发布
- ✅ 核心功能只需更新一次
- ✅ 用户可以灵活选择版本

---

## 📊 版本对比

| 特性 | 个人版 | L站版 | 社区版 |
|------|--------|-------|--------|
| 数据库 | IndexedDB | Supabase | PostgreSQL |
| OAuth | ❌ | Linux.do | GitHub+Google |
| 管理面板 | ❌ | ❌ | ✅ |
| MCP | ❌ | Server | Server+Client |
| 部署 | Vercel | Vercel | Docker |

---

## 🚀 快速上手

### 1. 查看完整计划

```bash
# 阅读主迁移文档
cat docs/migration/VERSION-CONSOLIDATION-PLAN.md
```

### 2. 开始阶段一（低风险）

```bash
# 阅读阶段一指南
cat docs/migration/PHASE-1-FOUNDATION.md

# 创建版本配置目录
mkdir -p config/versions
mkdir -p hooks

# 复制模板文件（即将创建）
# cp docs/migration/templates/* config/versions/
```

### 3. 配置环境变量

```bash
# 选择要构建的版本
echo "NEXT_PUBLIC_VERSION=personal" >> .env.local
# 或
echo "NEXT_PUBLIC_VERSION=linuxdo" >> .env.local
# 或
echo "NEXT_PUBLIC_VERSION=community" >> .env.local
```

### 4. 构建特定版本

```bash
# 构建个人版
npm run build:personal

# 构建L站版
npm run build:linuxdo

# 构建社区版（默认）
npm run build:community
```

---

## 📂 文档结构

```
docs/migration/
├── README.md                           # 本文件 - 快速开始
├── VERSION-CONSOLIDATION-PLAN.md      # 完整迁移计划
├── PHASE-1-FOUNDATION.md              # 阶段一：基础设施
├── PHASE-2-CORE-ADAPTATION.md         # 阶段二：核心功能（待创建）
├── PHASE-3-BUILD-DEPLOY.md            # 阶段三：构建部署（待创建）
└── templates/                          # 代码模板（待创建）
    ├── version-config-example.ts
    ├── feature-hook-example.tsx
    └── component-example.tsx
```

---

## ⚡ 三个阶段

### 阶段一：基础设施（1-2天）🟢 低风险

创建版本配置系统，不影响现有功能。

**关键任务**:
1. 创建版本配置文件
2. 定义类型接口
3. 实现功能开关
4. 创建 React Hooks

**完成标志**: 应用正常启动，默认使用社区版

### 阶段二：核心功能适配（2天）🟡 中风险

修改认证、数据库等核心模块。

**关键任务**:
1. 适配认证系统（动态 OAuth）
2. 适配数据库层（支持 SQLite/IndexedDB）
3. 修改关键组件（条件渲染）
4. 更新导航和菜单

**完成标志**: 三个版本都能正常构建和运行

### 阶段三：构建和部署（1天）🟢 低风险

配置自动化构建和多版本部署。

**关键任务**:
1. 创建构建脚本
2. 配置环境变量模板
3. 更新 Docker 配置
4. 配置 GitHub Actions
5. 更新文档

**完成标志**: 自动化发布流程正常工作

---

## 🎨 代码示例

### 使用功能开关

```typescript
// ❌ 旧方式：硬编码
export function AdminPanel() {
  return <div>管理面板</div>
}

// ✅ 新方式：使用功能开关
import { useFeature } from '@/hooks/use-feature'

export function AdminPanel() {
  const hasAdminPanel = useFeature('admin.adminPanel')

  if (!hasAdminPanel) return null

  return <div>管理面板</div>
}
```

### 条件渲染登录按钮

```typescript
import { useAuthFeatures } from '@/hooks/use-feature'

export function SignInPage() {
  const { credentials, oauthEnabled, oauthProviders } = useAuthFeatures()

  return (
    <div>
      {credentials && <EmailPasswordForm />}

      {oauthEnabled && (
        <>
          {oauthProviders.includes('github') && <GitHubButton />}
          {oauthProviders.includes('google') && <GoogleButton />}
          {oauthProviders.includes('linuxdo') && <LinuxDoButton />}
        </>
      )}
    </div>
  )
}
```

### 动态加载数据库

```typescript
// lib/database/index.ts
import { getFeatureValue } from '@/config/features'

export async function createDatabaseClient() {
  const dbType = getFeatureValue<string>('database.type')

  switch(dbType) {
    case 'indexeddb':
      return new IndexedDBProvider()
    case 'sqlite':
      return new SQLiteProvider()
    case 'supabase':
      return new SupabaseProvider()
    case 'postgresql':
      return new PostgreSQLProvider()
  }
}
```

---

## 🛡️ 风险控制

### 回滚策略

每个阶段都可以独立回滚：

```bash
# 回滚阶段一
git reset --hard HEAD~5

# 回滚阶段二
git revert <commit-hash>

# 紧急回滚（生产环境）
git checkout community-backup
npm run deploy
```

### 测试策略

```bash
# 阶段一：功能测试
npm test -- tests/config/

# 阶段二：集成测试
npm test -- tests/auth/
npm test -- tests/database/

# 阶段三：端到端测试
npm run build:all
npm run test:e2e
```

---

## ❓ 常见问题

### Q: 迁移会影响现有用户吗？

**A**: 不会。默认使用社区版配置，现有功能完全保持不变。

### Q: 可以只迁移部分功能吗？

**A**: 可以。采用渐进式迁移，每个阶段独立完成。

### Q: 个人版需要重新开发吗？

**A**: 不需要。大部分代码复用，只需添加 SQLite/IndexedDB 适配器。

### Q: 迁移需要多长时间？

**A**:
- 阶段一：1-2天（必需）
- 阶段二：2天（核心）
- 阶段三：1天（优化）
- **总计：4-5天**

### Q: 出问题怎么办？

**A**:
1. 每个阶段都有回滚方案
2. 在独立分支进行迁移
3. 保留原 community 分支作为备份
4. 充分测试后再合并到主分支

---

## 📞 需要帮助？

- 📖 查看完整文档: [`VERSION-CONSOLIDATION-PLAN.md`](./VERSION-CONSOLIDATION-PLAN.md)
- 🔧 阶段一指南: [`PHASE-1-FOUNDATION.md`](./PHASE-1-FOUNDATION.md)
- 💬 提交 Issue: [GitHub Issues]

---

## ✅ 准备好了吗？

如果你准备开始迁移，请阅读：

1. **必读**: [`VERSION-CONSOLIDATION-PLAN.md`](./VERSION-CONSOLIDATION-PLAN.md) - 完整计划
2. **开始**: [`PHASE-1-FOUNDATION.md`](./PHASE-1-FOUNDATION.md) - 阶段一指南
3. **参考**: 代码模板（即将创建）

**记住**: 这是一个**渐进式、低风险**的迁移过程，你可以随时暂停或回滚！

---

**文档维护者**: Claude
**最后更新**: 2025-10-17
