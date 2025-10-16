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
