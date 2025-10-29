# SnapFit AI 文档站项目规划

## 🎯 项目概述

为 SnapFit AI 健康管理应用创建一个独立的文档站，提供完整的用户指南、API文档、部署指南和开发文档。

## 🏗️ 技术栈选择

### 推荐方案：VitePress
- **框架**: VitePress (基于 Vue 3 + Vite)
- **部署**: Vercel (推荐) / Netlify / GitHub Pages
- **域名**: `docs.snapfit.ai` 或 `snapfit-docs.vercel.app`
- **特点**: 快速、现代、SEO友好

### 备选方案
1. **Docusaurus** - 功能最全面，适合大型项目
2. **GitBook** - 商业化程度高，团队协作强
3. **Nextra** - 基于Next.js，与主项目技术栈一致

## 📁 项目结构

```
snapfit-docs/
├── docs/
│   ├── .vitepress/
│   │   ├── config.ts              # 站点配置
│   │   ├── theme/                 # 自定义主题
│   │   │   ├── index.ts
│   │   │   ├── Layout.vue
│   │   │   └── components/
│   │   └── public/                # 静态资源
│   │       ├── images/
│   │       ├── icons/
│   │       └── favicon.ico
│   ├── index.md                   # 首页
│   ├── guide/                     # 用户指南
│   │   ├── index.md
│   │   ├── getting-started.md     # 快速开始
│   │   ├── installation.md        # 安装指南
│   │   ├── features/              # 功能介绍
│   │   │   ├── health-tracking.md
│   │   │   ├── ai-suggestions.md
│   │   │   ├── data-visualization.md
│   │   │   └── user-management.md
│   │   └── troubleshooting.md     # 故障排除
│   ├── deployment/                # 部署文档
│   │   ├── index.md
│   │   ├── quick-deploy.md        # 一键部署
│   │   ├── docker/                # Docker部署
│   │   │   ├── single-container.md
│   │   │   └── full-stack.md
│   │   ├── supabase.md           # Supabase部署
│   │   ├── production.md         # 生产环境
│   │   └── environment-config.md  # 环境配置
│   ├── api/                       # API文档
│   │   ├── index.md
│   │   ├── authentication.md      # 认证API
│   │   ├── ai-services/           # AI服务API
│   │   │   ├── chat.md
│   │   │   ├── suggestions.md
│   │   │   ├── parsing.md
│   │   │   └── analysis.md
│   │   ├── health-data.md         # 健康数据API
│   │   └── user-management.md     # 用户管理API
│   ├── development/               # 开发文档
│   │   ├── index.md
│   │   ├── architecture.md        # 系统架构
│   │   ├── database-schema.md     # 数据库设计
│   │   ├── contributing.md        # 贡献指南
│   │   ├── coding-standards.md    # 编码规范
│   │   └── testing.md            # 测试指南
│   ├── security/                  # 安全文档
│   │   ├── index.md
│   │   ├── authentication.md      # 认证安全
│   │   ├── data-protection.md     # 数据保护
│   │   └── best-practices.md      # 安全最佳实践
│   ├── examples/                  # 示例代码
│   │   ├── index.md
│   │   ├── integration/           # 集成示例
│   │   └── customization/         # 定制示例
│   ├── faq.md                     # 常见问题
│   ├── changelog.md               # 更新日志
│   └── support.md                 # 技术支持
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

## 🎨 设计规范

### 主题配色
- **主色**: #22c55e (绿色，与SnapFit AI保持一致)
- **辅色**: #64748b (灰色)
- **背景**: #ffffff / #0f172a (明暗主题)
- **文字**: #1e293b / #f1f5f9

### 组件设计
- **导航栏**: 简洁现代，包含搜索功能
- **侧边栏**: 分层级导航，支持折叠
- **内容区**: 宽松布局，代码高亮
- **移动端**: 响应式设计，汉堡菜单

## 🚀 实施步骤

### 第一阶段：项目初始化 (1-2天)
1. **创建VitePress项目**
   ```bash
   npm create vitepress@latest snapfit-docs
   cd snapfit-docs
   npm install
   ```

2. **基础配置**
   - 配置站点信息
   - 设置导航菜单
   - 配置主题色彩
   - 添加Logo和Favicon

3. **项目结构搭建**
   - 创建目录结构
   - 添加基础页面
   - 配置路由

### 第二阶段：内容迁移 (3-5天)
1. **用户指南**
   - 从现有README.md迁移内容
   - 重新组织结构
   - 添加截图和示例

2. **部署文档**
   - 整理现有部署脚本
   - 创建详细的部署指南
   - 添加故障排除指南

3. **API文档**
   - 分析现有API端点
   - 创建API参考文档
   - 添加请求/响应示例

### 第三阶段：功能增强 (2-3天)
1. **交互功能**
   - 集成搜索功能
   - 添加代码复制按钮
   - 配置语法高亮

2. **特色组件**
   - API测试工具
   - 配置生成器
   - 部署状态检查器

### 第四阶段：部署上线 (1天)
1. **部署配置**
   - 配置Vercel部署
   - 设置自定义域名
   - 配置HTTPS

2. **CI/CD设置**
   - GitHub Actions自动部署
   - 内容更新自动同步

## 📋 内容规划

### 核心页面内容

#### 1. 首页 (index.md)
- SnapFit AI简介
- 主要功能亮点
- 快速开始链接
- 社区链接

#### 2. 快速开始 (guide/getting-started.md)
- 系统要求
- 一键部署脚本
- 基础配置
- 验证安装

#### 3. 功能介绍
- **健康追踪**: 运动记录、饮食管理、数据可视化
- **AI功能**: 智能建议、文本解析、图像识别
- **用户管理**: 认证系统、权限控制、数据安全

#### 4. 部署指南
- **Docker部署**: 单容器、完整栈
- **Supabase部署**: 云端快速部署
- **生产环境**: 性能优化、监控配置

#### 5. API文档
- **认证API**: 登录、注册、OAuth
- **AI服务API**: 各种AI功能端点
- **数据API**: 健康数据CRUD操作

## 🔧 技术实现

### VitePress配置示例
```typescript
// .vitepress/config.ts
export default {
  title: 'SnapFit AI 文档',
  description: '现代化健康管理应用完整指南',
  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/' },
      { text: '部署', link: '/deployment/' },
      { text: 'API', link: '/api/' },
      { text: '开发', link: '/development/' }
    ],
    sidebar: {
      '/guide/': [
        { text: '快速开始', link: '/guide/getting-started' },
        { text: '功能介绍', link: '/guide/features/' }
      ]
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/your-repo/snapfit-ai' }
    ]
  }
}
```

### 部署配置
```yaml
# .github/workflows/deploy.yml
name: Deploy Documentation
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run build
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 📊 预期效果

### 用户体验
- **快速上手**: 5分钟内完成部署
- **全面覆盖**: 从入门到高级的完整文档
- **易于搜索**: 全文搜索，快速定位信息
- **移动友好**: 完美的移动端阅读体验

### 维护效率
- **自动更新**: 代码更新自动同步文档
- **版本控制**: Git管理，支持协作编辑
- **性能优化**: 静态生成，加载速度快
- **SEO友好**: 搜索引擎优化，提高可发现性

## 🎯 下一步行动

1. **立即开始**: 创建新的Git仓库 `snapfit-docs`
2. **初始化项目**: 使用VitePress脚手架
3. **内容迁移**: 从现有文档开始迁移
4. **部署测试**: 在Vercel上部署测试版本
5. **持续完善**: 根据用户反馈不断优化

这个文档站将成为SnapFit AI项目的重要组成部分，为用户提供完整、专业的使用指南和技术文档。

## 📝 详细实施代码

### 1. 项目初始化脚本

```bash
#!/bin/bash
# setup-docs.sh - 文档站初始化脚本

echo "🚀 开始创建 SnapFit AI 文档站..."

# 创建项目
npm create vitepress@latest snapfit-docs -- --template default
cd snapfit-docs

# 安装依赖
npm install

# 安装额外插件
npm install -D @types/node
npm install vitepress-plugin-search markdown-it-container

# 创建目录结构
mkdir -p docs/{guide,deployment,api,development,security,examples}
mkdir -p docs/guide/features
mkdir -p docs/deployment/docker
mkdir -p docs/api/ai-services
mkdir -p docs/.vitepress/{theme,public}
mkdir -p docs/.vitepress/public/{images,icons}

echo "✅ 项目结构创建完成"

# 创建基础配置文件
cat > docs/.vitepress/config.ts << 'EOF'
import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'SnapFit AI 文档',
  description: '现代化健康管理应用 - 完整使用指南',
  lang: 'zh-CN',

  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#22c55e' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:locale', content: 'zh-CN' }],
    ['meta', { property: 'og:title', content: 'SnapFit AI | 智能健康管理' }],
    ['meta', { property: 'og:site_name', content: 'SnapFit AI 文档' }],
  ],

  themeConfig: {
    logo: '/images/logo.png',
    siteTitle: 'SnapFit AI',

    nav: [
      { text: '首页', link: '/' },
      { text: '用户指南', link: '/guide/' },
      { text: '部署指南', link: '/deployment/' },
      { text: 'API 文档', link: '/api/' },
      { text: '开发文档', link: '/development/' },
      {
        text: '更多',
        items: [
          { text: '常见问题', link: '/faq' },
          { text: '更新日志', link: '/changelog' },
          { text: '技术支持', link: '/support' }
        ]
      }
    ],

    sidebar: {
      '/guide/': [
        {
          text: '开始使用',
          items: [
            { text: '简介', link: '/guide/' },
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '安装指南', link: '/guide/installation' }
          ]
        },
        {
          text: '核心功能',
          items: [
            { text: '健康追踪', link: '/guide/features/health-tracking' },
            { text: 'AI 智能建议', link: '/guide/features/ai-suggestions' },
            { text: '数据可视化', link: '/guide/features/data-visualization' },
            { text: '用户管理', link: '/guide/features/user-management' }
          ]
        },
        {
          text: '故障排除',
          items: [
            { text: '常见问题', link: '/guide/troubleshooting' }
          ]
        }
      ],

      '/deployment/': [
        {
          text: '部署方案',
          items: [
            { text: '部署概览', link: '/deployment/' },
            { text: '一键部署', link: '/deployment/quick-deploy' }
          ]
        },
        {
          text: 'Docker 部署',
          items: [
            { text: '单容器部署', link: '/deployment/docker/single-container' },
            { text: '完整栈部署', link: '/deployment/docker/full-stack' }
          ]
        },
        {
          text: '云端部署',
          items: [
            { text: 'Supabase 部署', link: '/deployment/supabase' },
            { text: '生产环境', link: '/deployment/production' }
          ]
        },
        {
          text: '配置管理',
          items: [
            { text: '环境配置', link: '/deployment/environment-config' }
          ]
        }
      ],

      '/api/': [
        {
          text: 'API 概览',
          items: [
            { text: 'API 简介', link: '/api/' },
            { text: '认证方式', link: '/api/authentication' }
          ]
        },
        {
          text: 'AI 服务',
          items: [
            { text: '智能对话', link: '/api/ai-services/chat' },
            { text: '智能建议', link: '/api/ai-services/suggestions' },
            { text: '文本解析', link: '/api/ai-services/parsing' },
            { text: '数据分析', link: '/api/ai-services/analysis' }
          ]
        },
        {
          text: '数据管理',
          items: [
            { text: '健康数据', link: '/api/health-data' },
            { text: '用户管理', link: '/api/user-management' }
          ]
        }
      ],

      '/development/': [
        {
          text: '开发指南',
          items: [
            { text: '开发概览', link: '/development/' },
            { text: '系统架构', link: '/development/architecture' },
            { text: '数据库设计', link: '/development/database-schema' }
          ]
        },
        {
          text: '贡献指南',
          items: [
            { text: '如何贡献', link: '/development/contributing' },
            { text: '编码规范', link: '/development/coding-standards' },
            { text: '测试指南', link: '/development/testing' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/your-username/snapfit-ai' }
    ],

    footer: {
      message: '基于 Apache-2.0 / 商业许可发布',
      copyright: 'Copyright © 2024 SnapFit AI'
    },

    search: {
      provider: 'local',
      options: {
        locales: {
          zh: {
            translations: {
              button: {
                buttonText: '搜索文档',
                buttonAriaLabel: '搜索文档'
              },
              modal: {
                noResultsText: '无法找到相关结果',
                resetButtonTitle: '清除查询条件',
                footer: {
                  selectText: '选择',
                  navigateText: '切换'
                }
              }
            }
          }
        }
      }
    },

    editLink: {
      pattern: 'https://github.com/your-username/snapfit-docs/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页面'
    },

    lastUpdated: {
      text: '最后更新于',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'medium'
      }
    }
  },

  markdown: {
    theme: 'github-dark',
    lineNumbers: true
  }
})
EOF

echo "✅ 配置文件创建完成"
echo "🎉 SnapFit AI 文档站初始化完成！"
echo ""
echo "下一步："
echo "1. cd snapfit-docs"
echo "2. npm run dev"
echo "3. 访问 http://localhost:5173"
```

### 2. 首页内容模板

```markdown
# docs/index.md
---
layout: home

hero:
  name: "SnapFit AI"
  text: "智能健康管理平台"
  tagline: 现代化的健康追踪与AI智能建议系统
  image:
    src: /images/hero-logo.png
    alt: SnapFit AI
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: 查看演示
      link: https://demo.snapfit.ai

features:
  - icon: 🏃‍♂️
    title: 运动记录
    details: 详细的运动数据追踪和分析，支持多种运动类型，智能计算卡路里消耗
  - icon: 🍎
    title: 饮食管理
    details: 营养摄入记录和建议，AI智能识别食物，自动计算营养成分
  - icon: 📊
    title: 数据可视化
    details: 直观的图表和趋势分析，多维度健康数据展示，个性化报告生成
  - icon: 🤖
    title: AI 智能建议
    details: 基于个人数据的智能健康建议，个性化运动和饮食方案推荐
  - icon: 📱
    title: 响应式设计
    details: 完美适配桌面和移动设备，随时随地管理您的健康数据
  - icon: 🔐
    title: 数据安全
    details: 企业级安全保护，支持多种认证方式，数据加密存储
---

## 🚀 为什么选择 SnapFit AI？

SnapFit AI 是一个现代化的健康管理平台，结合了先进的AI技术和直观的用户界面，为用户提供全方位的健康管理解决方案。

### ✨ 核心优势

- **🎯 智能化**: 基于机器学习的个性化建议系统
- **📈 数据驱动**: 科学的健康数据分析和可视化
- **🔧 易部署**: 支持Docker一键部署，多种部署方案
- **🌍 国际化**: 完整的中英文双语支持
- **🏢 企业级**: 支持大规模用户和高并发访问

### 🎯 适用场景

- **个人健康管理**: 日常运动和饮食记录
- **健身房管理**: 会员健康数据管理
- **企业健康**: 员工健康管理系统
- **医疗辅助**: 患者健康数据追踪

## 📊 技术架构

SnapFit AI 采用现代化的技术栈，确保系统的稳定性和可扩展性：

- **前端**: Next.js 15 + React 19 + TypeScript
- **后端**: Node.js + NextAuth.js
- **数据库**: PostgreSQL / Supabase
- **AI服务**: OpenAI GPT + 自定义模型
- **部署**: Docker + Kubernetes

## 🤝 社区支持

- [GitHub 仓库](https://github.com/your-username/snapfit-ai) - 源代码和问题反馈
- [讨论区](https://github.com/your-username/snapfit-ai/discussions) - 社区讨论
- [更新日志](/changelog) - 版本更新记录
- [技术支持](/support) - 获取帮助

---

<div style="text-align: center; margin-top: 2rem;">
  <a href="/guide/getting-started" style="display: inline-block; padding: 12px 24px; background: #22c55e; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
    立即开始使用 →
  </a>
</div>
```

### 3. 部署自动化脚本

```yaml
# .github/workflows/deploy.yml
name: Deploy SnapFit AI Documentation

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout
      uses: actions/checkout@v4
      with:
        fetch-depth: 0

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Build documentation
      run: npm run build

    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v25
      if: github.ref == 'refs/heads/main'
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        github-token: ${{ secrets.GITHUB_TOKEN }}
        vercel-org-id: ${{ secrets.ORG_ID }}
        vercel-project-id: ${{ secrets.PROJECT_ID }}
        working-directory: ./

    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      if: github.ref == 'refs/heads/main'
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: docs/.vitepress/dist
```

## 🎨 自定义主题示例

```vue
<!-- docs/.vitepress/theme/Layout.vue -->
<template>
  <Layout>
    <template #nav-bar-title-after>
      <span class="version-badge">v{{ version }}</span>
    </template>

    <template #nav-bar-content-after>
      <div class="nav-extra">
        <a href="https://github.com/your-username/snapfit-ai" target="_blank" class="github-link">
          <svg class="icon" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        </a>
      </div>
    </template>
  </Layout>
</template>

<script setup>
import DefaultTheme from 'vitepress/theme'
import { version } from '../../../package.json'

const { Layout } = DefaultTheme
</script>

<style>
.version-badge {
  background: #22c55e;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  margin-left: 8px;
}

.nav-extra {
  display: flex;
  align-items: center;
  gap: 12px;
}

.github-link {
  display: flex;
  align-items: center;
  color: var(--vp-c-text-1);
  transition: color 0.25s;
}

.github-link:hover {
  color: var(--vp-c-brand);
}

.github-link .icon {
  width: 20px;
  height: 20px;
  fill: currentColor;
}
</style>
```

这个详细的规划文档包含了完整的实施方案，你可以直接使用这些代码和配置来创建SnapFit AI的文档站。所有的脚本和配置都是可以直接运行的，帮助你快速搭建一个专业的文档网站。
