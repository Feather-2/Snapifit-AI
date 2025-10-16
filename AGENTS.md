# Repository Guidelines

## 功能模块总览
- admin：管理接口与权限控制。
- ai/openai/models：AI 接口与模型代理。
- auth：注册/登录/邮箱验证/密码重置，NextAuth 处理器。
- captcha：验证码生成与校验。
- chart-data：图表数据与统计接口。
- config：系统配置查询。
- cron：定时任务手动触发入口。
- dashboard：仪表盘数据源。
- data-aggregation：数据聚合与汇总。
- debug / diagnose：调试与诊断端点。
- health / health-tools：健康数据与计算工具。
- internal：内部管理接口（受限）。
- invite-codes / invite-configs：邀请码与配额配置。
- keys / tokens：API 密钥与令牌管理。
- mcp：MCP 接口（本地/代理）。
- models：模型信息查询。
- not-found：404 处理示例。
- proxy：外部 API 代理。
- security：安全检查与防护。
- shared-keys：共享密钥公开列表/榜单。
- sync：`profile`/`memories`/`logs` 同步。
- system：系统消息与状态。
- test / test-auth / test-model / test-rate-limit / test-sandbox：测试端点。
- usage：用量/限额查询与校验。
- user：用户资料更新。
- 页面：`app/[locale]` 多语言（首页、signin、settings、verify-email），`app/debug` 调试页。

- 常用端点示例：
  - `GET /api/usage/stats` 查看用量；`POST /api/usage/check` 校验额度。
  - `GET /api/tokens` 列表；`POST /api/tokens` 创建；`DELETE /api/tokens?id=...` 撤销。
  - `GET /api/shared-keys/public-list` 公开密钥列表；`GET/POST /api/sync/profile` 用户档案同步。

## 项目结构与模块组织
- 源码：`app/`、`components/`、`lib/`、`hooks/`、`styles/`、`public/`。配置与类型：`config/`、`constants/`、`types/`。
- 脚本与文档：`scripts/`（运维/诊断）、`docs/`（部署/环境/数据库）。数据库与迁移：`database*/`、`database-migrations/`。

## 构建、测试与本地开发命令
- 开发：`npm run dev`；静态检查：`npm run lint`。
- 构建/运行：`npm run build`、`npm start`。
- 安全/环境：`npm run security-check`、`npm run check-env`。
- 常用诊断：`npm run test-db`、`npm run test-email`、`npm run test-oauth`。
 - 部署前：`npm run pre-deploy`；Docker/K8s：`npm run pre-deploy-docker`。
 - MCP 调试：`npm run ws-server`、`npm run ws-client`、`npm run test-mcp-architecture`。

## 编码风格与命名规范
- TypeScript + Next.js；缩进 2 空格；避免隐式 any；组件无副作用。
- 命名：组件 PascalCase（如 `UserCard.tsx`）；工具与 hooks kebab-case（如 `use-local-storage.ts`）。
- 路由/API 依约定目录；提交前执行 `npm run lint` 并修复警告。

## 测试指南
- 框架：`@playwright/test`；脚本级测试在 `scripts/test-*.ts|js`。
- 示例：`npx ts-node scripts/test-security.ts`、`npx tsx scripts/test-local-mcp.ts`。
- 用例组织：`__tests__/{api,mcp,function-calling}/**/*.spec.ts`；命名采用 `功能-场景-期望`。
- 要求：认证/安全/环境为最低覆盖；新功能需附最小复现脚本或 `__tests__/` 用例。

## Agent 开发提示
- MCP 接入：参考 `lib/mcp/*` 与 `docs/LOCAL-MCP-PROXY.md`，使用本地 `ws-server`/`ws-client` 联调。
- 安全边界：遵循 `lib/request-size-limiter.ts` 与 `lib/rate-limit.ts`；涉及外部调用时记录 `security-monitor` 事件。

## 提交与 Pull Request
- 提交：Conventional Commits，如 `feat: ...`、`fix: ...`，可加作用域 `feat(auth): ...`，提交信息建议使用中文。
- PR：说明变更、关联 Issue、影响与回滚方案、必要截图/日志；需通过 `lint`、`security-check`、`check-env`。

## 安全与配置提示
- 依据 `.env.example` 与 `docs/ENV-*` 配置；严禁提交密钥/令牌。
- 重点防护：`middleware-security-headers.ts`、`security-config.ts`、`lib/request-size-limiter.ts`。

## 语言与交互
- 所有讨论、Issue、PR 描述与代码注释必须使用纯中文。
