# SnapFit AI 文档站快速开始模板

## 🚀 一键启动脚本

### setup-docs.sh (Linux/macOS)
```bash
#!/bin/bash
set -e

echo "🚀 开始创建 SnapFit AI 文档站..."

# 检查依赖
command -v node >/dev/null 2>&1 || { echo "❌ 需要安装 Node.js 18+"; exit 1; }
command -v git >/dev/null 2>&1 || { echo "❌ 需要安装 Git"; exit 1; }

# 创建项目
echo "📦 创建 VitePress 项目..."
npm create vitepress@latest snapfit-docs -- --template default
cd snapfit-docs

# 安装依赖
echo "📥 安装依赖..."
npm install
npm install -D @types/node vitepress-plugin-search

# 创建目录结构
echo "📁 创建目录结构..."
mkdir -p docs/{guide,deployment,api,development,security,examples}
mkdir -p docs/guide/features
mkdir -p docs/deployment/docker
mkdir -p docs/api/ai-services
mkdir -p docs/.vitepress/{theme,public}
mkdir -p docs/.vitepress/public/{images,icons}

# 创建配置文件
echo "⚙️ 创建配置文件..."
cat > docs/.vitepress/config.ts << 'EOF'
import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'SnapFit AI 文档',
  description: '现代化健康管理应用 - 完整使用指南',
  lang: 'zh-CN',
  
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#22c55e' }]
  ],

  themeConfig: {
    logo: '/images/logo.png',
    siteTitle: 'SnapFit AI',
    
    nav: [
      { text: '首页', link: '/' },
      { text: '用户指南', link: '/guide/' },
      { text: '部署指南', link: '/deployment/' },
      { text: 'API 文档', link: '/api/' },
      { text: '开发文档', link: '/development/' }
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
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/your-username/snapfit-ai' }
    ],

    search: {
      provider: 'local'
    }
  }
})
EOF

# 创建首页
echo "📄 创建首页..."
cat > docs/index.md << 'EOF'
---
layout: home

hero:
  name: "SnapFit AI"
  text: "智能健康管理平台"
  tagline: 现代化的健康追踪与AI智能建议系统
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
    details: 详细的运动数据追踪和分析，支持多种运动类型
  - icon: 🍎
    title: 饮食管理
    details: 营养摄入记录和建议，AI智能识别食物
  - icon: 📊
    title: 数据可视化
    details: 直观的图表和趋势分析，个性化报告生成
  - icon: 🤖
    title: AI 智能建议
    details: 基于个人数据的智能健康建议
  - icon: 📱
    title: 响应式设计
    details: 完美适配桌面和移动设备
  - icon: 🔐
    title: 数据安全
    details: 企业级安全保护，数据加密存储
---
EOF

# 创建基础页面
echo "📝 创建基础页面..."
cat > docs/guide/index.md << 'EOF'
# 用户指南

欢迎使用 SnapFit AI！这里是完整的用户指南，帮助您快速上手并充分利用所有功能。

## 🎯 快速导航

- [快速开始](/guide/getting-started) - 5分钟快速部署
- [安装指南](/guide/installation) - 详细安装步骤
- [功能介绍](/guide/features/) - 核心功能说明

## 📋 主要功能

### 健康追踪
- 运动数据记录和分析
- 饮食营养管理
- 体重和体征监控

### AI 智能服务
- 个性化健康建议
- 智能食物识别
- 运动计划推荐

### 数据管理
- 可视化图表展示
- 数据导入导出
- 历史记录查询
EOF

cat > docs/guide/getting-started.md << 'EOF'
# 快速开始

## 🚀 一键部署

### Linux/macOS
```bash
# 克隆项目
git clone https://github.com/your-username/snapfit-ai.git
cd snapfit-ai

# 运行快速开始脚本
chmod +x quick-start.sh
./quick-start.sh
```

### Windows
```cmd
# 克隆项目
git clone https://github.com/your-username/snapfit-ai.git
cd snapfit-ai

# 运行快速开始脚本
quick-start.bat
```

## ⚙️ 环境要求

- Node.js 18+
- Docker (可选)
- 2GB+ RAM
- 10GB+ 存储空间

## 🔧 手动安装

如果一键部署遇到问题，可以按照以下步骤手动安装：

### 1. 安装依赖
```bash
pnpm install
```

### 2. 配置环境变量
```bash
cp .env.example .env.local
# 编辑 .env.local 文件
```

### 3. 启动服务
```bash
pnpm dev
```

### 4. 访问应用
打开浏览器访问 http://localhost:3000

## ✅ 验证安装

安装完成后，您应该能够：
- [ ] 访问主页面
- [ ] 注册新用户账号
- [ ] 登录系统
- [ ] 查看健康数据面板

## 🆘 遇到问题？

如果遇到安装问题，请查看：
- [故障排除指南](/guide/troubleshooting)
- [常见问题](/faq)
- [技术支持](/support)
EOF

# 创建部署文档
cat > docs/deployment/index.md << 'EOF'
# 部署指南

SnapFit AI 提供多种部署方案，满足不同场景的需求。

## 🎯 部署方案对比

| 方案 | 适用场景 | 部署时间 | 技术要求 |
|------|----------|----------|----------|
| [一键部署](/deployment/quick-deploy) | 快速体验 | 5-10分钟 | 基础 |
| [Docker单容器](/deployment/docker/single-container) | 生产环境 | 10-15分钟 | 中等 |
| [Docker完整栈](/deployment/docker/full-stack) | 企业部署 | 15-20分钟 | 高级 |
| [Supabase部署](/deployment/supabase) | 云端托管 | 5-10分钟 | 基础 |

## 🚀 推荐部署流程

1. **选择部署方案** - 根据需求选择合适的部署方式
2. **准备环境** - 安装必要的软件和工具
3. **配置参数** - 设置环境变量和配置文件
4. **执行部署** - 运行部署脚本或命令
5. **验证功能** - 测试各项功能是否正常

## 📋 部署前检查

- [ ] 服务器配置满足最低要求
- [ ] 网络连接正常
- [ ] 必要的端口已开放
- [ ] 域名解析配置正确（如需要）
EOF

# 创建API文档
cat > docs/api/index.md << 'EOF'
# API 文档

SnapFit AI 提供完整的 REST API，支持所有核心功能的程序化访问。

## 🔐 认证方式

所有API请求都需要进行身份认证：

```bash
# 使用 Bearer Token
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://api.snapfit.ai/v1/endpoint
```

## 📊 API 概览

### 认证相关
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/logout` - 用户登出

### AI 服务
- `POST /api/ai/chat` - 智能对话
- `POST /api/ai/suggestions` - 获取健康建议
- `POST /api/ai/parse` - 文本解析
- `POST /api/ai/analyze` - 数据分析

### 健康数据
- `GET /api/health/logs` - 获取健康日志
- `POST /api/health/logs` - 创建健康记录
- `PUT /api/health/logs/:id` - 更新健康记录
- `DELETE /api/health/logs/:id` - 删除健康记录

## 📝 请求示例

### 获取健康建议
```javascript
const response = await fetch('/api/ai/suggestions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    userId: 'user123',
    timeRange: '7d'
  })
});

const suggestions = await response.json();
```

## 🔍 错误处理

API 使用标准 HTTP 状态码：

- `200` - 请求成功
- `400` - 请求参数错误
- `401` - 未授权访问
- `403` - 权限不足
- `404` - 资源不存在
- `500` - 服务器内部错误
EOF

# 创建开发文档
cat > docs/development/index.md << 'EOF'
# 开发文档

欢迎参与 SnapFit AI 的开发！这里包含了所有开发相关的信息。

## 🏗️ 系统架构

SnapFit AI 采用现代化的全栈架构：

- **前端**: Next.js 15 + React 19 + TypeScript
- **后端**: Node.js + NextAuth.js
- **数据库**: PostgreSQL / Supabase
- **AI服务**: OpenAI GPT + 自定义模型
- **部署**: Docker + Kubernetes

## 🛠️ 开发环境搭建

### 1. 克隆代码
```bash
git clone https://github.com/your-username/snapfit-ai.git
cd snapfit-ai
```

### 2. 安装依赖
```bash
pnpm install
```

### 3. 配置环境
```bash
cp .env.example .env.local
# 编辑配置文件
```

### 4. 启动开发服务器
```bash
pnpm dev
```

## 📁 项目结构

```
snapfit-ai/
├── app/                    # Next.js 应用目录
├── components/             # React 组件
├── lib/                    # 工具库和配置
├── messages/               # 国际化文件
├── deployment/             # 部署相关文件
└── docs/                   # 文档文件
```

## 🤝 贡献指南

1. Fork 项目到您的 GitHub 账号
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📋 开发规范

- 使用 TypeScript 进行类型检查
- 遵循 ESLint 代码规范
- 编写单元测试
- 更新相关文档
EOF

echo "✅ 基础页面创建完成"

# 创建 package.json 脚本
echo "📦 配置 package.json..."
npm pkg set scripts.docs:dev="vitepress dev docs"
npm pkg set scripts.docs:build="vitepress build docs"
npm pkg set scripts.docs:preview="vitepress preview docs"

# 初始化 Git
echo "🔧 初始化 Git..."
git init
git add .
git commit -m "Initial commit: SnapFit AI documentation site"

echo ""
echo "🎉 SnapFit AI 文档站创建完成！"
echo ""
echo "下一步："
echo "1. cd snapfit-docs"
echo "2. npm run docs:dev"
echo "3. 访问 http://localhost:5173"
echo ""
echo "部署到 Vercel:"
echo "1. 推送到 GitHub"
echo "2. 在 Vercel 中导入项目"
echo "3. 自动部署完成"
```

### setup-docs.bat (Windows)
```batch
@echo off
echo 🚀 开始创建 SnapFit AI 文档站...

:: 检查 Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 需要安装 Node.js 18+
    exit /b 1
)

:: 检查 Git
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 需要安装 Git
    exit /b 1
)

:: 创建项目
echo 📦 创建 VitePress 项目...
call npm create vitepress@latest snapfit-docs -- --template default
cd snapfit-docs

:: 安装依赖
echo 📥 安装依赖...
call npm install
call npm install -D @types/node vitepress-plugin-search

:: 创建目录结构
echo 📁 创建目录结构...
mkdir docs\guide\features 2>nul
mkdir docs\deployment\docker 2>nul
mkdir docs\api\ai-services 2>nul
mkdir docs\development 2>nul
mkdir docs\security 2>nul
mkdir docs\examples 2>nul
mkdir docs\.vitepress\theme 2>nul
mkdir docs\.vitepress\public\images 2>nul
mkdir docs\.vitepress\public\icons 2>nul

echo ✅ 项目创建完成！
echo.
echo 下一步：
echo 1. cd snapfit-docs
echo 2. npm run docs:dev
echo 3. 访问 http://localhost:5173
pause
```

## 📦 package.json 模板

```json
{
  "name": "snapfit-ai-docs",
  "version": "1.0.0",
  "description": "SnapFit AI 官方文档站",
  "scripts": {
    "docs:dev": "vitepress dev docs",
    "docs:build": "vitepress build docs",
    "docs:preview": "vitepress preview docs",
    "deploy": "npm run docs:build && vercel --prod"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "vitepress": "^1.0.0",
    "vitepress-plugin-search": "^1.0.0"
  },
  "keywords": [
    "snapfit",
    "health",
    "ai",
    "documentation",
    "vitepress"
  ],
  "author": "SnapFit AI Team",
  "license": "Apache-2.0 OR LicenseRef-Snapifit-Commercial"
}
```

## 🚀 Vercel 部署配置

### vercel.json
```json
{
  "buildCommand": "npm run docs:build",
  "outputDirectory": "docs/.vitepress/dist",
  "framework": "vitepress"
}
```

### .github/workflows/deploy.yml
```yaml
name: Deploy Documentation
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run docs:build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: docs/.vitepress/dist
```

这些模板文件可以帮助你快速启动 SnapFit AI 文档站项目，所有代码都是可以直接使用的。
