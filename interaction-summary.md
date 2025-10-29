# 交互摘要与优化计划

更新时间：2025-10-29

## 分支与目标
- 分支：`refactor/architecture-cleanup`
- 目标：在架构清理后，巩固路径与依赖对齐、提升网络稳健性，并修复导出阶段 404 回退导致的构建失败。

## 路径与依赖对齐（现状）
- 导入路径统一：`@/lib/ai/{openai,shared}`，`@/lib/mcp/{server,orchestrator,client}`。
- 安全与工具：`request-size-limiter` 使用 `@/lib/utils/ip`；封禁/审计集中到 `@/lib/{supabase,security-logger}`。
- Token/DB：`token-manager` 指向 `@/lib/database` 与类型定义。

## 已落地变更（摘要）
- OpenAI 客户端：支持 `verbose` 与瞬时网络错误自动重试（`OPENAI_CLIENT_VERBOSE`、`OPENAI_CLIENT_RETRIES`、`OPENAI_CLIENT_RETRY_DELAY_MS`），各 API 支持诊断参数透传。
- 速率限制：改为 `rate-limit-redis-selfhosted`；Upstash 动态引入，缺失时降级内存方案。
- 身份认证：Linux.do OIDC/OAuth 改为自定义 Provider，移除对 `next-auth/providers/oauth` 的硬依赖（避免构建期导出缺失）。
- SQLite Provider：动态 require，未安装 `better-sqlite3` 不再在打包期报错。
- 测试路由：`test-sandbox`、`test/mcp-architecture` 对齐至 `mcp/{orchestrator,client}` 本地健康工具。
- 杂项：`url-validator` → `@/lib/config/environment`；`email-service` 延迟加载环境；多处 `@/lib/...` 路径修正。
- 兜底页面：提供 `app/not-found.tsx` 与 `app/global-error.tsx`；新增 `app/404/page.tsx`（`force-dynamic`、`revalidate=0`）；生产 rewrites 的 404 指向 `/api/not-found`。

## 构建/导出异常（核心问题）
- 导出阶段报错：“<Html> should not be imported outside of pages/_document.”，触发于预渲染 404。
- 研判：源码未直接使用 `<Html>`，很可能是导出期仍走到 pages runtime 的 404 回退路径，内部引用导致报错。

## 诊断与处置策略
- 定位回退源：
  - 检查 `.next/server/app/**`、`route-manifest.json`、`build-manifest.json`，确认是否仍有对 `/404` 的引用链或 pages runtime 产物关联。
  - 全局搜索对 `'/404'` 的硬编码引用，排除任何重定向/跳转至 `/404` 的逻辑。
- 404 策略收敛：
  - 优先在 App Router 使用 `notFound()`；如需跳转，使用 `NextResponse.redirect('/')` 或返回语义化 JSON。
  - 评估移除 `app/404/page.tsx`，仅保留 `app/not-found.tsx` 作为唯一 404 来源，以减少 pages runtime 介入概率。
- 重写规则校验：
  - 禁止任何环境将 404 重写到 `/404`；生产中统一指向 `/api/not-found`（或返回 404 JSON），避免触发 pages 回退。
- 构建调试：
  - 使用 `NODE_DEBUG=next:* next build` 或 `NEXT_PRIVATE_DEBUG=true next build` 收集导出期详细栈与路由决策信息。

## 网络稳健性备注
- 诊断期可启用：`OPENAI_CLIENT_VERBOSE=true`、`OPENAI_CLIENT_RETRIES=2`、`OPENAI_CLIENT_RETRY_DELAY_MS=500`；
- 或在调用处传 `{ verbose: true, retries: 2 }`；仅限开发/诊断环境启用，避免生产日志噪声。

## 验证标准（完成定义）
- `next build`/导出通过；无 `<Html>` 相关报错。
- `route-manifest` 无 pages 404 回退痕迹，访问不存在路由返回 `app/not-found.tsx` 渲染结果。
- 生产 rewrites 不再触发 `/404`；基础 smoke 测试通过（API 与 OpenAI 代理联通）。

## 行动项（优先级）
- [ ] 全局搜索并替换 `'/404'` 引用为 `notFound()` 或安全响应（必要时跳转首页）。
- [ ] 评估并（必要时）移除 `app/404/page.tsx`，仅保留 `app/not-found.tsx`。
- [ ] 校验 `next.config.mjs` 的 rewrites，确保 404 指向 `/api/not-found` 或直接 404。
- [ ] 运行调试构建并审阅 `route-manifest.json`、`build-manifest.json`。
- [ ] 通过后执行 smoke：`npm run smoke:community`（或等价）。

## 回滚与风险
- 风险：移除 `app/404/page.tsx` 可能影响既有链接或外部依赖对 `/404` 的直达访问。
- 回滚：保留一个轻量 `app/404/page.tsx`，但内部直接 `notFound()` 或最小渲染，且不被 rewrites/跳转主动命中。

—
注：如需更细粒度变更，请参考 `git log -n 5` 与相关文件 diff；实现与注释应遵循 AGENTS.md 的中文与风格规范。
