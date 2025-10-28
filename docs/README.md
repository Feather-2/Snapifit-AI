![Snapifit-community-version](https://github.com/user-attachments/assets/9df36504-fd13-4ada-81da-c0d1b71ae71a)

# Snapifit AI 社区版

> 🏃‍♂️ 智能健康管理应用 - 让健康管理更简单、更智能

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-green.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)

## 🎯 功能特性

- 🏃‍♂️ **运动记录** - 详细的运动数据追踪和分析
- 🍎 **饮食管理** - 营养摄入记录和建议
- 📊 **健康数据可视化** - 直观的图表和趋势分析
- 🤖 **AI 智能建议** - 基于数据的个性化健康建议
- 📱 **响应式设计** - 完美适配桌面和移动设备
- 🌍 **国际化支持** - 中英文双语界面
- 🔐 **多种认证方式** - 支持邮箱密码和 OAuth 登录
- 🗄️ **双数据库支持** - Supabase 和 PostgreSQL 一键切换

## 🚀 快速开始

### 一键部署（推荐）

**Linux/macOS:**

```bash
# 克隆项目
git clone <your-repo>
cd Snapifit-ai

# 运行快速开始脚本
chmod +x quick-start.sh
./quick-start.sh
```

**Windows:**

```cmd
# 克隆项目
git clone <your-repo>
cd Snapifit-ai

# 运行快速开始脚本
quick-start.bat
```

### 手动开发环境

```bash
# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 文件

# 启动开发服务器
pnpm dev

# 访问应用
open http://localhost:3000
```

## 🎯 部署方案

我们提供三种完整的部署方案：

### 1. 🌐 Supabase 云端部署

- **适合**: 个人项目、快速原型
- **优势**: 零运维、快速部署
- **时间**: 5-10分钟

### 2. 🐳 Docker 单容器部署

- **适合**: 生产环境、CI/CD
- **优势**: 环境一致、易扩展
- **时间**: 10-15分钟

### 3. 🏗️ Docker 完整栈部署

- **适合**: 企业内网、大型应用
- **优势**: 完全控制、数据安全
- **时间**: 15-20分钟

详细部署指南请查看 [deployment/README.md](deployment/README.md)

## 🛠️ 技术栈

- **前端**: Next.js 15.2.4, React 19, TypeScript
- **样式**: Tailwind CSS, Shadcn/ui
- **数据库**: Supabase / PostgreSQL
- **认证**: NextAuth.js
- **国际化**: next-intl
- **图表**: Recharts
- **部署**: Docker, Vercel

## 📋 系统要求

### 最低要求

- Node.js 20+
- pnpm 或 npm
- 2GB RAM
- 10GB 存储空间

### 推荐配置

- Node.js 20+
- pnpm
- 4GB RAM
- 20GB SSD
- Docker 24+ (容器化部署)

## 🔧 开发指南

### 环境检查

```bash
# Linux/macOS
./deployment/scripts/check-env.sh

# Windows
deployment\scripts\check-env.bat
```

### 健康检查

```bash
# Linux/macOS
./deployment/scripts/health-check.sh

# Windows
deployment\scripts\health-check.bat
```

### 部署方案切换

```bash
# Linux/macOS
./deployment/scripts/switch-deployment.sh

# Windows
# 手动切换，参考 deployment/README.md
```

## 📊 项目结构

```
Snapifit-ai/
├── app/                    # Next.js 应用目录
├── components/             # React 组件
├── lib/                    # 工具库和配置
├── messages/               # 国际化文件
├── deployment/             # 部署相关文件
│   ├── supabase/          # Supabase 部署
│   ├── docker-single/     # 单容器部署
│   ├── docker-full/       # 完整栈部署
│   └── scripts/           # 部署脚本
├── quick-start.sh         # Linux/macOS 快速开始
├── quick-start.bat        # Windows 快速开始
└── README.md              # 项目说明
```

## 🤝 贡献指南

我们欢迎所有形式的贡献！

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 支持

- 📖 [文档](deployment/README.md)
- 📚 [MCP 架构与时序图](MCP-DIAGRAMS.md)
- 🔌 [本地 MCP Proxy 对接规范](LOCAL-MCP-PROXY.md)
- 🐛 [问题反馈](https://github.com/your-org/Snapifit-ai/issues)
- 💬 [讨论区](https://github.com/your-org/Snapifit-ai/discussions)

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者！

---

<div align="center">
  <p>用 ❤️ 构建，为了更健康的生活</p>
  <p>Snapifit AI 社区版 © 2025</p>
</div>
## 🧭 版本矩阵与切换

### 多版本本地验证与 CI

- 本地快速检查
  - 版本化环境检查：`npm run check-env:versioned`
  - 启动（三版示例）：
    - 个人体验版（IndexedDB）：`npm run dev:personal`
    - 个人版（SQLite）：`npm run dev:personal:sqlite`
    - L站版（Supabase）：`npm run dev:linuxdo`
    - 社区版（PostgreSQL）：`npm run dev:community`

- 冒烟测试（需先启动服务）
  - 版本特性摘要：`npm run smoke:version -- <personal|linuxdo|community> [indexeddb|sqlite] [postgresql|supabase]`
  - API 基础冒烟：
    - 通用：`npm run smoke:personal | smoke:linuxdo | smoke:community`
    - 用量 API：`npm run smoke:usage`
    - 令牌 API：`npm run smoke:tokens`

- CI 集成
  - 工作流：`.github/workflows/smoke-tests.yml`
  - 矩阵：personal-indexeddb / linuxdo-supabase / community-postgresql
  - 步骤：check-env:versioned → build → start → smoke（通用 + usage + tokens）

### Linux.do 真实 OAuth E2E（模板）

- 目标：在公网环境（如 Vercel）对 Linux.do 版执行真实 OAuth 登录端到端测试。
- 工作流模板：`.github/workflows/linuxdo-e2e.yml`
- 需要配置的 Secrets：
  - `PUBLIC_BASE_URL`：已部署的 Linux.do 版本完整 URL（如 https://your-domain）
  - `LINUXDO_TEST_USER` / `LINUXDO_TEST_PASS`：Linux.do 测试账号凭据
- 测试脚本：`scripts/e2e-linuxdo-oauth.spec.ts`（使用 Playwright 驱动浏览器完成 OAuth）
- 注意：不同 IdP 登录页的输入框/按钮选择器可能不同。如遇不到元素，按注释调整选择器。

### 最小化初始化（社区版 PostgreSQL）

- 设置 `DATABASE_URL`
- 执行最小化 schema 初始化（开发验证）：
  - `npm run pg:minimal-init`
- 之后即可 `npm run dev:community`，基础 API 可工作；高级功能可按需逐步补充函数与存储过程

### 个人版（SQLite）用户创建（可选）

- 初始化数据库：`npm run sqlite:init`
- 创建测试用户（凭证登录）：
  - `npm run sqlite:create-user` 或 `node scripts/sqlite-create-user.js <username> <email> <password>`

应用支持三种形态，通过环境变量切换：

- 个人体验版（本地浏览器 IndexedDB）
  - 用途：纯本地体验，无需服务端数据库与登录
  - 配置：
    - `NEXT_PUBLIC_VERSION=personal`
    - `PERSONAL_DB_MODE=indexeddb`
  - 行为：中间件会统一拦截所有 `/api/*` 请求并返回 405；数据仅存储在浏览器 IndexedDB。
  - 登录页会提示“此版本无需登录，可直接在本地使用”。

- 个人版（单机 SQLite）
  - 用途：本机运行，单用户数据持久化到 SQLite 文件
  - 配置：
    - `NEXT_PUBLIC_VERSION=personal`
    - `PERSONAL_DB_MODE=sqlite`
    - 可选：`SQLITE_FILE=./data/personal.sqlite3`
  - 依赖：`npm i better-sqlite3`
  - 脚本：
    - 初始化：`node scripts/sqlite-init.js`
    - 导出：`node scripts/sqlite-export.js [输出文件]`
    - 导入：`node scripts/sqlite-import.js <输入文件> [--clear]`

- 社区/L站版（Supabase/特化 PostgreSQL）
  - 社区版（默认）：
    - `NEXT_PUBLIC_VERSION=community`
    - `DB_PROVIDER=postgresql | supabase`
    - 当使用 supabase：
      - `NEXT_PUBLIC_SUPABASE_URL`
      - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
      - `SUPABASE_SERVICE_ROLE_KEY`
  - L站版（只允许 L站 OAuth）：
    - `NEXT_PUBLIC_VERSION=linuxdo`
    - 必填（OAuth2 二选一任意一套变量名）：
      - `OAUTH_CLIENT_ID`、`OAUTH_CLIENT_SECRET`
      - 端点：`OAUTH_AUTH_URL`、`OAUTH_TOKEN_URL`、`OAUTH_USER_INFO_URL`
      - 范围：`OAUTH_SCOPES=user:profile`
      - 也支持同义的 `LINUXDO_*` 变量名（如 `LINUXDO_AUTH_URL` 等）
    - 若有 OIDC 配置，可改用：`LINUXDO_ISSUER` 或 `LINUXDO_WELL_KNOWN_URL`

> 提示：默认版本为社区版（见 `.env.example`）。

## 📦 数据导入/导出

### IndexedDB（个人体验版，本地）
- 入口：设置 → 数据（Data）页签
- 导出：将 `userProfile + aiConfig + healthLogs + aiMemories` 打包为 JSON 下载
- 导入：选择 JSON 文件写入本地 IndexedDB（登录状态下会尽力同步到云端）

### SQLite（个人版，本机）
- 初始化：`node scripts/sqlite-init.js`
- 导出：`node scripts/sqlite-export.js [输出文件]`
- 导入：`node scripts/sqlite-import.js <输入文件> [--clear]`
- 数据文件：`SQLITE_FILE` 环境变量（默认 `data/personal.sqlite3`）

### 服务端导出（社区/L站/个人 SQLite）
- API：`GET /api/health/export?format=json|csv|xml`（需 API Token：scope=`export`，permission=`read`）
- 输出：健康日志与用户档案数据

## 🔐 认证与登录

- 登录方式由版本开关动态控制：
  - 个人体验版：默认关闭所有登录（无需登录即可使用）
  - 个人版：建议仅启用凭据登录（邮箱/密码）
  - 社区版：支持 GitHub/Google + 凭据登录
  - L站版：仅允许 Linux.do OAuth（强约束）
- 登录页会根据功能开关动态展示对应按钮（Linux.do/GitHub/Google/凭据）
