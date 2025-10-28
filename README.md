# Snapifit AI 社区版

欢迎来到 Snapifit AI 社区版代码库。完整的项目说明与使用指南请参阅 `docs/README.md`。

## 文档入口

- 架构与时序图（MCP）: `docs/MCP-DIAGRAMS.md`
- 双向 MCP 架构阐述: `MCP_DUAL_ARCHITECTURE.md`
- MCP API 路由指南: 见 `docs/LOCAL-MCP-PROXY.md` 与 `docs/openapi.yaml`
- 部署与安装指南: 见 `deployment/README.md` 与 `docs/deployment-guide.md`

## 多版本验证快速上手

- 版本化环境检查：`npm run check-env:versioned`
- 启动示例：
  - 个人体验版（IndexedDB）：`npm run dev:personal`
  - 个人版（SQLite）：`npm run dev:personal:sqlite`
  - L站版（Supabase）：`npm run dev:linuxdo`
  - 社区版（PostgreSQL）：`npm run dev:community`
- 冒烟测试（需先启动服务）：`npm run smoke:personal | smoke:linuxdo | smoke:community`
- 更多见 `docs/README.md` 的“多版本本地验证与 CI”

更多使用文档与指南，请继续查看 `docs/` 目录。


