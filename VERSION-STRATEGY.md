# SnapFit AI 多版本管理策略

## 🎯 版本架构

### 📋 版本对比表

| 特性 | 个人版 | L站专属版 | 社区版 |
|------|--------|-----------|--------|
| **授权** | AGPL-3.0（默认）/ 商业许可 | AGPL-3.0（默认）/ 商业许可 | AGPL-3.0（默认）/ 商业许可 |
| **数据库** | SQLite/无DB | Supabase | PostgreSQL/Supabase |
| **部署** | Vercel/本地 | Vercel | Docker/Vercel/本地 |
| **OAuth** | 无 | Linux.do | GitHub/Google |
| **用户数** | 单用户 | 多用户 | 多租户 |
| **管理功能** | 基础 | 中等 | 完整 |
| **目标用户** | 个人使用 | Linux.do社区 | 企业/团队 |

## 🏗️ 仓库结构策略

### 推荐方案：独立仓库 + 接力开发

```
snapfit-ai-personal/      # 个人版 (基础功能)
├── 基础健康记录功能
├── SQLite 数据存储
├── Vercel 部署配置
└── AGPL-3.0（默认）/ 商业许可

snapfit-ai-linuxdo/       # L站专属版 (个人版 + 社区功能)
├── 继承个人版功能
├── Linux.do OAuth 集成
├── Supabase 数据库
├── 社区定制 UI
└── AGPL-3.0（默认）/ 商业许可

snapfit-ai-community/     # 社区版 (L站版 + 企业功能)
├── 继承 L站版功能
├── 多 OAuth 支持
├── 管理面板
├── 多租户支持
├── Docker 部署
└── AGPL-3.0（默认）/ 商业许可
```

## 🔄 接力式开发流程

### 开发顺序
```
个人版 (基础) → L站版 (增强) → 社区版 (完整)
```

### 功能同步策略

#### 1. 手动同步 (推荐)
```bash
# 从个人版同步到 L站版
cd snapfit-ai-linuxdo
git remote add personal ../snapfit-ai-personal
git fetch personal
git cherry-pick <commit-hash>  # 选择性合并

# 从 L站版同步到社区版
cd snapfit-ai-community  
git remote add linuxdo ../snapfit-ai-linuxdo
git fetch linuxdo
git cherry-pick <commit-hash>
```

#### 2. 自动同步 (可选)
```yaml
# .github/workflows/sync-upstream.yml
name: Sync from upstream
on:
  schedule:
    - cron: '0 2 * * *'  # 每天凌晨2点检查
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
    - name: Sync from personal
      # 自动检测并同步重要更新
```

## 🚀 部署策略

### 个人版部署
```bash
# Vercel 一键部署
vercel --prod

# Docker 本地部署  
docker-compose -f docker-compose.personal.yml up -d

# 特点：轻量级，快速启动
```

### L站专属版部署
```bash
# Vercel + Supabase
vercel --prod --env-file .env.linuxdo

# 特点：社区集成，稳定可靠
```

### 社区版部署
```bash
# Docker 完整部署
docker-compose -f docker-compose.community.full.yml up -d

# Kubernetes 部署
kubectl apply -f k8s/

# 特点：企业级，高可用
```

## 📦 CI/CD 配置

### 各版本独立的 GitHub Actions

#### 个人版 (.github/workflows/personal-build.yml)
- ✅ Vercel 自动部署
- ✅ Docker 镜像构建
- ✅ SQLite 配置生成

#### L站版 (.github/workflows/linuxdo-build.yml)  
- ✅ Vercel 部署
- ✅ Linux.do OAuth 配置
- ✅ Supabase 集成测试

#### 社区版 (.github/workflows/community-build.yml)
- ✅ Docker 多架构构建
- ✅ Kubernetes 配置生成
- ✅ 完整功能测试

## 🔧 版本特性管理

### 功能开关配置
```typescript
// config/features.ts
export const FEATURES = {
  personal: {
    oauth: false,
    multiUser: false,
    adminPanel: false,
    database: 'sqlite'
  },
  linuxdo: {
    oauth: ['linuxdo'],
    multiUser: true,
    adminPanel: false,
    database: 'supabase'
  },
  community: {
    oauth: ['github', 'google'],
    multiUser: true,
    adminPanel: true,
    database: 'postgresql'
  }
}
```

### 环境变量区分
```bash
# 个人版
NEXT_PUBLIC_VERSION=personal
NEXT_PUBLIC_FEATURES=basic

# L站版
NEXT_PUBLIC_VERSION=linuxdo  
NEXT_PUBLIC_FEATURES=linuxdo-exclusive

# 社区版
NEXT_PUBLIC_VERSION=community
NEXT_PUBLIC_FEATURES=full
```

## 📋 版本发布流程

### 1. 个人版发布
```bash
# 开发完成
git tag personal-v1.0.0
git push origin personal-v1.0.0

# 自动触发：
# - Docker 镜像构建
# - Vercel 部署
# - Release 创建
```

### 2. L站版发布
```bash
# 同步个人版更新
git cherry-pick personal-commits

# 添加 L站特性
# 测试 Linux.do OAuth

git tag linuxdo-v1.0.0
git push origin linuxdo-v1.0.0
```

### 3. 社区版发布
```bash
# 同步 L站版更新
git cherry-pick linuxdo-commits

# 添加企业特性
# 完整功能测试

git tag community-v1.0.0
git push origin community-v1.0.0
```

## 🔍 版本同步检查

### 定期同步检查清单
- [ ] 核心功能更新是否已同步
- [ ] 安全修复是否已应用
- [ ] UI/UX 改进是否需要适配
- [ ] 新功能是否适合当前版本

### 同步工具脚本
```bash
#!/bin/bash
# sync-check.sh

echo "检查版本间的差异..."

# 检查个人版 → L站版
git log personal/main..linuxdo/main --oneline

# 检查 L站版 → 社区版  
git log linuxdo/main..community/main --oneline

echo "同步建议："
echo "1. 安全修复应立即同步"
echo "2. 核心功能可选择性同步"
echo "3. UI改进需要适配各版本特色"
```

## 🎯 优势总结

### 独立仓库的优势
- ✅ **清晰分离** - 各版本功能和配置独立
- ✅ **灵活部署** - 不同的部署策略和要求
- ✅ **独立发布** - 各版本可以独立发布和维护
- ✅ **团队协作** - 不同团队可以专注不同版本

### 接力开发的优势
- ✅ **功能复用** - 基础功能可以逐步增强
- ✅ **渐进式** - 从简单到复杂的自然演进
- ✅ **风险控制** - 每个版本都有明确的功能边界
- ✅ **用户选择** - 用户可以根据需求选择合适版本

这种策略既保持了您当前的开发模式，又提供了完整的自动化部署能力！🚀
