# 会话进度记录（SESSION_NOTES）

更新时间：2025-10-30

## 背景
- 构建阶段出现 “<Html> should not be imported outside of pages/_document.”，根因是导出期回退到 pages runtime 处理 404/500。
- 目标：统一 404 策略到 App Router，避免 pages runtime 回退；同时精简构建日志噪声并完善文档。

## 已完成
- 统一 404 处理为 App Router：
  - 移除（禁用）pages 体系 404/500/_document（移动到 `pages_disabled/`）。
  - `app/not-found.tsx` 与 `app/global-error.tsx`：改为动态渲染；`global-error` 去除 `<html>/<body>` 包裹。
- 生产环境 rewrites：
  - 显式将 `'/404'`（含 locale 变体）改写到 `'/api/not-found'`。
  - 为 `/api/not-found` 设置 `Cache-Control: no-store` 响应头，防止错误页缓存。
- 文档与日志：
  - `README.md` 增加“404 策略与 rewrites（生产）”说明。
  - `config/versions/index.ts` 调整为静默回退至 `'community'`，去除 “Invalid version: undefined, falling back to 'community'” 构建期噪声。

## 关键变更（文件）
- `next.config.mjs`：新增 404 改写与 `/api/not-found` no-store 头（生产）。
- `app/global-error.tsx`：去除 `<html>/<body>` 包裹，标记为动态。
- `app/not-found.tsx`：标记为动态。
- `app/404/page.tsx` → `app/404/page.disabled.tsx`（随后不再参与构建）。
- `pages_disabled/404.tsx`、`pages_disabled/500.tsx`、`pages_disabled/_document.tsx`：作为回滚备份保留。
- `config/versions/index.ts`：静默回退版本逻辑。
- `README.md`：补充 404 策略说明。

提交参考：
- 70cef31 fix(next): prevent pages runtime 404 fallback
- 75ac70c fix(app): avoid pages runtime during export
- b31f44d chore(version): silence invalid version warning by default fallback

## 构建与运行状态
- `pnpm build`：通过（App Router 404 生效，pages runtime 回退已避免）。
- 运行日志：PostgreSQL mode（Supabase 兼容适配，Node.js Runtime），`next start` 成功，服务可访问。

## 验证要点（建议快速自测）
- 不存在路由（如 `/zh/does-not-exist`）→ 渲染 `app/not-found.tsx`，状态码 404。
- 直达 `/404` → 返回 JSON 404（`/api/not-found`），响应头包含 `Cache-Control: no-store`。
- 受限路由（如 `/api/debug/*`, `/api/test-*`）→ 404 JSON。
- 基础 API：`/api/health`、`/api/usage/stats` 正常返回。

## 风险与兼容
- 若外部依赖直达 `'/404'` 的 HTML 页，当前为 JSON 404。可在后续版本按需提供一个人类可读的 `/:locale/not-found` 页面用于导航。
- `pages_disabled/` 暂保留一版，确认稳定后可删除以彻底收敛到 App Router。

## 待办 / 下一步
-（已完成）非生产一致性：在 `next.config.mjs` 为所有环境统一 `/404 -> /api/not-found` 改写，避免 pages runtime 回退与环境差异。
-（已完成）Windows 友好脚本：新增 `scripts/build-community.ps1`、`scripts/start-community.ps1`，并提供 `npm run build:community:ps` / `npm run start:community:ps` 入口。
-（已完成）最小 404 验证脚本：新增 `scripts/test-404.ts`，并在 `package.json` 增加 `npm run test-404`。
-（待评估）观察一版后删除 `pages_disabled/`，并在变更记录中说明。

## 常用命令（Windows / PowerShell）
- 生产构建（带调试可选）：
  - `pnpm build`
  - 调试：`$env:NEXT_PRIVATE_DEBUG='true'; $env:NODE_ENV='production'; pnpm build; Remove-Item Env:NEXT_PRIVATE_DEBUG, Env:NODE_ENV`
- 启动（社区版 Postgres）：
  - `$env:NEXT_PUBLIC_VERSION='community'; $env:DB_PROVIDER='postgresql'; pnpm start`
- 快速校验：
  - `curl -i http://localhost:3000/404` → 404 + `Cache-Control: no-store`
  - `curl -i http://localhost:3000/api/health`
  - `npm run test-404` 或 `npx tsx scripts/test-404.ts`
  - 构建（社区版）：`npm run build:community:ps`
  - 启动（社区版）：`npm run start:community:ps`
