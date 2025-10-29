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



## 许可证

- 本项目采用“使用场景双重许可”：`AGPL-3.0`（含第7条署名保留）或 商业许可（四种单部署选择：个人试用版、个人版+SQLite、Linux.do 特供版、企业版）。
- 如按 AGPLv3 使用，允许商用，但需在网络提供服务时开源完整源代码，并保留署名与法律声明；若需闭源/去品牌/企业合规与支持，请选择商业许可并获取授权。
- 详情见：`LICENSING.md`、`LICENSE`、`AGPL-ADDITIONAL-TERMS.md`、`LICENSE-COMMERCIAL.md`。
