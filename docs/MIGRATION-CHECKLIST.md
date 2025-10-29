# 迁移检查清单

> **目的**: 确保从旧架构到新架构的平滑迁移

**使用方法**: 在每个阶段完成后,勾选对应的复选框

---

## 📋 阶段 1: 准备工作 (预计 30 分钟)

### 环境准备

- [ ] **备份当前代码**
  ```bash
  git add .
  git commit -m "备份: 迁移到新架构前的状态"
  git branch backup-before-refactor
  ```

- [ ] **确认当前分支**
  ```bash
  git branch
  # 应该显示: * feature/version-consolidation
  ```

- [ ] **检查现有提交**
  ```bash
  git log --oneline -1
  # 应该显示: a68c281 feat(ui): 完成版本适配UI修复与中间件重构
  ```

- [ ] **验证文件存在**
  ```bash
  ls -l middleware.new.ts lib/rate-limit-redis.ts lib/security-logger.ts lib/api-helpers.ts
  # 所有文件应该存在
  ```

### 依赖检查

- [ ] **检查 Node.js 版本**
  ```bash
  node --version
  # 应该 >= 18.17.0
  ```

- [ ] **检查 npm 版本**
  ```bash
  npm --version
  # 应该 >= 9.0.0
  ```

- [ ] **检查磁盘空间**
  ```bash
  df -h .
  # 应该有至少 500MB 可用空间
  ```

---

## 📦 阶段 2: 安装依赖 (预计 5 分钟)

### 选项 A: Upstash Redis (推荐)

- [ ] **安装 Upstash Redis 客户端**
  ```bash
  npm install @upstash/redis
  ```

- [ ] **验证安装**
  ```bash
  npm list @upstash/redis
  # 应该显示版本号 (如 @upstash/redis@1.x.x)
  ```

### 选项 B: 自部署 Redis (可选)

- [ ] **安装 ioredis**
  ```bash
  npm install ioredis
  ```

- [ ] **验证安装**
  ```bash
  npm list ioredis
  # 应该显示版本号 (如 ioredis@5.x.x)
  ```

- [ ] **部署 Redis 服务器** (选择一种方式)

  **方式 1: Docker**
  ```bash
  docker run -d --name redis-health-app -p 6379:6379 redis:7-alpine
  ```

  **方式 2: Docker Compose**
  ```bash
  # 创建 docker-compose.yml (参考 lib/rate-limit-redis-selfhosted.ts)
  docker-compose up -d redis
  ```

  **方式 3: 系统安装**
  ```bash
  # Ubuntu/Debian
  sudo apt-get install redis-server
  sudo systemctl start redis-server

  # macOS
  brew install redis
  brew services start redis

  # Windows (WSL)
  sudo apt-get install redis-server
  sudo service redis-server start
  ```

- [ ] **测试 Redis 连接**
  ```bash
  # 如果有 redis-cli
  redis-cli ping
  # 应该返回: PONG

  # 或使用 Node.js 测试
  node -e "const Redis = require('ioredis'); const redis = new Redis(); redis.ping().then(console.log).catch(console.error).finally(() => redis.quit())"
  # 应该输出: PONG
  ```

---

## 🔧 阶段 3: 配置环境变量 (预计 10 分钟)

### Upstash Redis 配置

- [ ] **创建 Upstash 账户** (如果还没有)
  - 访问: https://console.upstash.com/
  - 注册免费账户
  - 验证邮箱

- [ ] **创建 Redis 数据库**
  - 点击 "Create Database"
  - 选择区域 (选择离用户最近的)
  - 选择类型: "Regional" (免费)
  - 点击 "Create"

- [ ] **获取连接凭证**
  - 复制 "REST URL"
  - 复制 "REST Token"

- [ ] **更新 `.env.local`**
  ```bash
  # 如果文件不存在，创建它
  touch .env.local

  # 添加以下内容 (替换为你的实际值)
  cat >> .env.local << 'EOF'

  ###############################################
  # Redis 速率限制 (生产环境必需)
  ###############################################
  UPSTASH_REDIS_REST_URL=https://your-region.upstash.io
  UPSTASH_REDIS_REST_TOKEN=AXXXxxxXXXxxx
  EOF
  ```

### 自部署 Redis 配置 (可选)

- [ ] **更新 `.env.local`**
  ```bash
  cat >> .env.local << 'EOF'

  ###############################################
  # 自部署 Redis 配置
  ###############################################
  REDIS_URL=redis://localhost:6379
  # 或分别配置:
  # REDIS_HOST=localhost
  # REDIS_PORT=6379
  # REDIS_PASSWORD=your_password_if_any
  EOF
  ```

### 验证配置

- [ ] **检查环境变量文件**
  ```bash
  cat .env.local | grep -E "REDIS|UPSTASH"
  # 应该显示你的 Redis 配置
  ```

- [ ] **确保 `.env.local` 在 `.gitignore` 中**
  ```bash
  grep -q ".env.local" .gitignore && echo "✓ 已忽略" || echo "✗ 未忽略 - 请添加!"
  ```

---

## 🔄 阶段 4: 启用新中间件 (预计 5 分钟)

### 备份旧中间件

- [ ] **重命名旧中间件**
  ```bash
  mv middleware.ts middleware.old.ts
  ```

- [ ] **验证备份**
  ```bash
  ls -l middleware.old.ts
  # 应该存在
  ```

### 启用新中间件

- [ ] **重命名新中间件**
  ```bash
  mv middleware.new.ts middleware.ts
  ```

- [ ] **验证新中间件**
  ```bash
  head -n 20 middleware.ts | grep "轻量级版本"
  # 应该显示注释中的 "轻量级版本"
  ```

### 如果使用自部署 Redis

- [ ] **更新导入路径** (仅自部署 Redis 需要)
  ```bash
  # 在需要的文件中,将:
  # import { rateLimit } from '@/lib/rate-limit-redis'
  # 改为:
  # import { rateLimit } from '@/lib/rate-limit-redis-selfhosted'

  # 注意: 如果使用 Upstash，保持原样
  ```

---

## 🧪 阶段 5: 测试新架构 (预计 20 分钟)

### 基础功能测试

- [ ] **启动开发服务器**
  ```bash
  npm run dev
  ```

- [ ] **检查启动日志**
  - [ ] 应该看到: `[RateLimit] Connected to Upstash Redis` 或 `[RateLimit] Connected to Redis`
  - [ ] 没有错误信息
  - [ ] 没有 "using in-memory fallback" (除非你故意不配置 Redis)

- [ ] **访问首页**
  - 打开: http://localhost:3000
  - 应该正常加载
  - 检查浏览器控制台无错误

- [ ] **访问设置页面**
  - 打开: http://localhost:3000/zh/settings
  - 验证标签页根据版本正确显示
  - 个人版应该看不到 "邀请码" 标签

### UI 版本适配验证

- [ ] **运行验证脚本**
  ```bash
  npm run verify:ui-adaptation
  ```

- [ ] **验证结果**
  - [ ] 应该显示: `✅ 所有检查通过: 16/16`
  - [ ] 没有 `✗` 标记的失败项

### 速率限制测试

- [ ] **测试 AI API 速率限制**
  ```bash
  # 发送 55 次请求 (限制是 50/分钟)
  for i in {1..55}; do
    curl -X POST http://localhost:3000/api/ai/chat \
      -H "Content-Type: application/json" \
      -d '{"message": "test"}' \
      -w "\nRequest $i: HTTP %{http_code}\n"
    sleep 0.5
  done
  ```

- [ ] **验证速率限制响应**
  - [ ] 前 50 次请求: HTTP 200 或 401 (如果需要认证)
  - [ ] 第 51 次开始: HTTP 429
  - [ ] 响应包含 `X-RateLimit-*` 头部
  - [ ] 响应包含 `retryAfter` 字段

- [ ] **检查日志**
  ```bash
  # 在开发服务器日志中应该看到:
  [SECURITY] {"type":"rate_limit_exceeded",...}
  ```

### Redis 连接测试

- [ ] **检查 Redis 数据**

  **Upstash 用户:**
  - 访问 Upstash Console
  - 打开你的数据库
  - 点击 "Data Browser"
  - 应该看到 `ratelimit:*` 开头的 key

  **自部署 Redis 用户:**
  ```bash
  redis-cli
  > KEYS ratelimit:*
  # 应该显示一些 key
  > TTL ratelimit:api:chat:1.2.3.4:12345678
  # 应该显示剩余 TTL (秒)
  > QUIT
  ```

### API 路由保护测试

- [ ] **创建测试 API 路由** (可选)
  ```bash
  mkdir -p app/api/test-rate-limit
  cat > app/api/test-rate-limit/route.ts << 'EOF'
  import { withRateLimitPreset } from '@/lib/api-helpers'
  import { NextResponse } from 'next/server'

  export async function GET(req: Request) {
    const result = await withRateLimitPreset(req, 'api')
    if (!result.allowed) return result.response

    return NextResponse.json({
      success: true,
      message: 'Rate limit test passed',
      remaining: result.remaining
    })
  }
  EOF
  ```

- [ ] **测试新 API 路由**
  ```bash
  curl http://localhost:3000/api/test-rate-limit
  # 应该返回 JSON 包含 "success": true
  ```

---

## 🔐 阶段 6: 安全验证 (预计 15 分钟)

### 安全头检查

- [ ] **检查响应头**
  ```bash
  curl -I http://localhost:3000/
  ```

- [ ] **验证安全头存在**
  - [ ] `X-Content-Type-Options: nosniff`
  - [ ] `X-Frame-Options: DENY` 或 `SAMEORIGIN`
  - [ ] `X-XSS-Protection: 1; mode=block`
  - [ ] `Content-Security-Policy: ...`

### CORS 检查

- [ ] **测试 CORS 头**
  ```bash
  curl -H "Origin: http://example.com" \
       -H "Access-Control-Request-Method: POST" \
       -I http://localhost:3000/api/test-rate-limit
  ```

- [ ] **验证 CORS 响应**
  - [ ] `Access-Control-Allow-Origin: *` 或特定域名
  - [ ] `Access-Control-Allow-Methods: ...`
  - [ ] `Access-Control-Allow-Headers: ...`

### 请求体大小限制

- [ ] **测试大请求拦截**
  ```bash
  # 创建 15MB 的测试文件 (超过 10MB 限制)
  dd if=/dev/zero of=/tmp/large-file.bin bs=1M count=15

  # 尝试上传
  curl -X POST http://localhost:3000/api/test-rate-limit \
       -H "Content-Type: application/octet-stream" \
       --data-binary @/tmp/large-file.bin
  ```

- [ ] **验证拦截响应**
  - [ ] HTTP 413 (Payload Too Large)
  - [ ] 响应包含 `REQUEST_TOO_LARGE` 错误码
  - [ ] 日志中有 `[MIDDLEWARE] Request size exceeded`

### 版本隔离检查

- [ ] **个人版 IndexedDB 模式测试** (如果适用)
  ```bash
  # 临时修改 .env.local
  PERSONAL_DB_MODE=indexeddb

  # 重启服务器
  # 访问任何 API 路由
  curl http://localhost:3000/api/any-endpoint
  ```

- [ ] **验证 API 阻断**
  - [ ] HTTP 405 (Method Not Allowed)
  - [ ] 响应包含 `SERVER_DB_DISABLED`
  - [ ] 日志中有 `[SECURITY] api_blocked_personal_mode`

---

## 📊 阶段 7: 性能测试 (预计 20 分钟)

### 中间件性能

- [ ] **测量中间件延迟**
  ```bash
  # 安装 wrk (性能测试工具)
  # Ubuntu: sudo apt-get install wrk
  # macOS: brew install wrk

  # 运行基准测试 (30秒, 10并发)
  wrk -t10 -c10 -d30s http://localhost:3000/
  ```

- [ ] **记录性能指标**
  - Requests/sec: ________
  - Latency (avg): ________
  - Latency (99%): ________
  - Transfer/sec: ________

- [ ] **对比旧架构** (可选)
  ```bash
  # 恢复旧中间件
  mv middleware.ts middleware.new-backup.ts
  mv middleware.old.ts middleware.ts

  # 重启服务器并重新测试
  wrk -t10 -c10 -d30s http://localhost:3000/

  # 对比结果

  # 恢复新中间件
  mv middleware.ts middleware.old.ts
  mv middleware.new-backup.ts middleware.ts
  ```

### Redis 性能

- [ ] **测试 Redis 响应时间**
  ```bash
  # 创建测试脚本
  cat > test-redis-latency.js << 'EOF'
  const { Redis } = require('@upstash/redis')

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })

  async function test() {
    const iterations = 100
    const start = Date.now()

    for (let i = 0; i < iterations; i++) {
      await redis.incr(`test:${Date.now()}`)
    }

    const elapsed = Date.now() - start
    console.log(`${iterations} operations in ${elapsed}ms`)
    console.log(`Average: ${elapsed / iterations}ms per operation`)
  }

  test().catch(console.error)
  EOF

  # 运行测试
  node test-redis-latency.js
  ```

- [ ] **记录 Redis 性能**
  - Average latency: ________ ms/op
  - 应该 < 50ms (Upstash) 或 < 5ms (本地 Redis)

### 负载测试

- [ ] **运行压力测试**
  ```bash
  # 高并发测试 (100并发, 持续1分钟)
  wrk -t20 -c100 -d60s http://localhost:3000/api/test-rate-limit
  ```

- [ ] **监控系统资源**
  ```bash
  # 在另一个终端运行
  top
  # 或
  htop
  ```

- [ ] **验证无内存泄漏**
  - [ ] Node.js 内存使用稳定
  - [ ] Redis 内存使用稳定
  - [ ] 没有持续增长的趋势

---

## 🚀 阶段 8: API 路由迁移 (预计 2-4 小时)

### 识别需要迁移的 API 路由

- [ ] **列出所有 API 路由**
  ```bash
  find app/api -name "route.ts" -o -name "route.js"
  ```

- [ ] **标记需要速率限制的路由**
  - [ ] `/api/ai/*` - AI 相关 API
  - [ ] `/api/sync/*` - 数据同步 API
  - [ ] `/api/upload/*` - 文件上传 API
  - [ ] `/api/admin/*` - 管理 API
  - [ ] `/api/auth/*` - 认证 API
  - [ ] 其他高价值 API

### 迁移 API 路由

**为每个需要保护的路由:**

- [ ] **选择保护模式**
  - [ ] 仅速率限制: `withRateLimitPreset()`
  - [ ] 认证 + 速率限制: `protectApiRoute()`
  - [ ] 自定义配置: `withRateLimit()`

- [ ] **更新路由代码**
  ```typescript
  // 示例: app/api/ai/chat/route.ts
  import { withRateLimitPreset } from '@/lib/api-helpers'

  export async function POST(req: Request) {
    const result = await withRateLimitPreset(req, 'ai')
    if (!result.allowed) return result.response

    // 原有业务逻辑...
  }
  ```

- [ ] **测试路由**
  ```bash
  curl -X POST http://localhost:3000/api/ai/chat \
    -H "Content-Type: application/json" \
    -d '{"message": "test"}'
  ```

- [ ] **验证速率限制**
  - [ ] 正常请求返回 200
  - [ ] 超限请求返回 429
  - [ ] 响应包含速率限制头

### 记录迁移进度

```
已迁移路由列表:
- [ ] /api/ai/chat
- [ ] /api/ai/generate
- [ ] /api/sync/upload
- [ ] /api/sync/download
- [ ] /api/admin/users
- [ ] /api/admin/settings
- [ ] /api/auth/signin
- [ ] /api/auth/signup
- [ ] ...其他路由
```

---

## 📝 阶段 9: 文档和清理 (预计 30 分钟)

### 更新项目文档

- [ ] **更新 README.md** (如果需要)
  - [ ] 添加 Redis 配置说明
  - [ ] 更新环境变量列表
  - [ ] 添加速率限制文档链接

- [ ] **更新 .env.example**
  ```bash
  cat >> .env.example << 'EOF'

  ###############################################
  # Redis 速率限制 (生产环境强烈推荐)
  ###############################################
  # 使用 Upstash Redis (推荐)
  # UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
  # UPSTASH_REDIS_REST_TOKEN=your_token_here

  # 或使用自部署 Redis
  # REDIS_URL=redis://localhost:6379
  # REDIS_HOST=localhost
  # REDIS_PORT=6379
  # REDIS_PASSWORD=your_password
  EOF
  ```

### 代码清理

- [ ] **删除旧中间件** (可选,建议保留一段时间)
  ```bash
  # 仅在充分测试后执行
  # rm middleware.old.ts
  ```

- [ ] **删除测试文件**
  ```bash
  rm -f test-redis-latency.js
  rm -rf app/api/test-rate-limit
  rm -f /tmp/large-file.bin
  ```

- [ ] **整理文档目录**
  ```bash
  ls docs/
  # 应该看到:
  # - MIDDLEWARE-SECURITY-ANALYSIS.md
  # - MIDDLEWARE-MIGRATION-GUIDE.md
  # - MIDDLEWARE-REFACTOR-SUMMARY.md
  # - UI-VERSION-ADAPTATION-FIX.md
  # - REFACTOR-COMPLETION-SUMMARY.md
  # - QUICK-START-REFACTORED-ARCHITECTURE.md
  ```

### Git 提交

- [ ] **检查变更**
  ```bash
  git status
  git diff
  ```

- [ ] **提交迁移变更** (如果有新的改动)
  ```bash
  git add .
  git commit -m "chore: 完成中间件重构迁移

  - 启用新的轻量级中间件
  - 配置 Redis 速率限制
  - 迁移所有 API 路由添加速率限制保护
  - 更新项目文档

  测试:
  - UI 适配验证: ✓ 100%
  - 速率限制测试: ✓
  - 性能测试: ✓ (95%+ 改进)
  - 安全测试: ✓
  "
  ```

---

## 🎯 阶段 10: 生产部署准备 (预计 1-2 小时)

### 生产环境配置

- [ ] **创建生产 Redis 实例**

  **Upstash (推荐):**
  - [ ] 登录 Upstash Console
  - [ ] 创建生产数据库 (选择合适的区域)
  - [ ] 配置持久化 (如果需要)
  - [ ] 复制生产凭证

  **自部署:**
  - [ ] 部署 Redis 到生产服务器
  - [ ] 配置持久化 (RDB + AOF)
  - [ ] 设置防火墙规则
  - [ ] 启用密码认证
  - [ ] 配置备份策略

- [ ] **配置生产环境变量**

  **Vercel:**
  ```bash
  vercel env add UPSTASH_REDIS_REST_URL production
  vercel env add UPSTASH_REDIS_REST_TOKEN production
  ```

  **其他平台:**
  - 通过平台控制面板添加环境变量
  - 或使用 CI/CD 配置文件

- [ ] **验证生产配置**
  ```bash
  # 使用生产环境变量运行本地测试
  UPSTASH_REDIS_REST_URL=https://prod-redis.upstash.io \
  UPSTASH_REDIS_REST_TOKEN=prod_token_here \
  npm run build

  npm run start
  ```

### 监控和警报

- [ ] **配置日志收集** (选择一个)
  - [ ] Vercel Logs
  - [ ] AWS CloudWatch
  - [ ] Google Cloud Logging
  - [ ] Datadog
  - [ ] Sentry

- [ ] **设置警报规则**
  - [ ] 速率限制触发频率 > 阈值
  - [ ] Redis 连接失败
  - [ ] API 响应时间 > 阈值
  - [ ] 错误率 > 阈值

- [ ] **配置 Uptime 监控** (可选)
  - [ ] UptimeRobot
  - [ ] Pingdom
  - [ ] StatusCake

### 部署前测试

- [ ] **运行完整测试套件**
  ```bash
  npm test
  ```

- [ ] **运行 E2E 测试** (如果有)
  ```bash
  npm run test:e2e
  ```

- [ ] **构建生产版本**
  ```bash
  npm run build
  ```

- [ ] **验证构建成功**
  - [ ] 没有 TypeScript 错误
  - [ ] 没有 ESLint 错误
  - [ ] 构建产物正常生成

### 部署

- [ ] **部署到预发布环境** (如果有)
  ```bash
  # Vercel
  vercel --prod=false

  # 或其他平台的部署命令
  ```

- [ ] **在预发布环境测试**
  - [ ] 所有功能正常
  - [ ] 速率限制工作
  - [ ] Redis 连接正常
  - [ ] 性能符合预期

- [ ] **部署到生产环境**
  ```bash
  # Vercel
  vercel --prod

  # 或
  git push origin main
  ```

### 部署后验证

- [ ] **smoke 测试**
  ```bash
  curl https://your-production-domain.com/
  curl https://your-production-domain.com/api/test-endpoint
  ```

- [ ] **检查生产日志**
  - [ ] 看到 `[RateLimit] Connected to Upstash Redis`
  - [ ] 没有错误信息
  - [ ] 请求正常处理

- [ ] **验证速率限制**
  ```bash
  for i in {1..55}; do
    curl -X POST https://your-production-domain.com/api/ai/chat \
      -H "Content-Type: application/json" \
      -d '{"message": "test"}'
    sleep 0.5
  done
  ```

- [ ] **监控前24小时**
  - [ ] 错误率正常
  - [ ] 响应时间正常
  - [ ] Redis 性能正常
  - [ ] 没有异常流量

---

## ✅ 最终检查清单

### 功能完整性

- [ ] UI 版本适配: 100% 验证通过
- [ ] 中间件: 新架构已启用
- [ ] Redis: 已配置且连接正常
- [ ] API 路由: 已添加速率限制保护
- [ ] 安全头: 已正确配置
- [ ] 性能: 符合预期 (95%+ 改进)

### 文档完整性

- [ ] 技术文档: 6 篇,完整
- [ ] README: 已更新
- [ ] .env.example: 已更新
- [ ] API 文档: 已更新 (如果有)

### 测试覆盖

- [ ] 单元测试: 通过
- [ ] 集成测试: 通过
- [ ] E2E 测试: 通过
- [ ] 性能测试: 通过
- [ ] 安全测试: 通过

### 生产就绪

- [ ] 环境变量: 已配置
- [ ] Redis: 生产实例已部署
- [ ] 监控: 已配置
- [ ] 警报: 已设置
- [ ] 备份: 已配置 (如果需要)

---

## 🎉 完成!

恭喜!你已经成功完成了从旧架构到新架构的迁移。

### 后续行动

1. **监控**: 密切关注前几天的生产日志和指标
2. **优化**: 根据实际使用情况调整速率限制配置
3. **扩展**: 继续完善剩余 UI 组件的版本适配
4. **文档**: 保持文档与代码同步更新

### 需要帮助?

- 查看 [docs/QUICK-START-REFACTORED-ARCHITECTURE.md](./QUICK-START-REFACTORED-ARCHITECTURE.md)
- 阅读 [docs/MIDDLEWARE-MIGRATION-GUIDE.md](./MIDDLEWARE-MIGRATION-GUIDE.md)
- 查看 [docs/REFACTOR-COMPLETION-SUMMARY.md](./REFACTOR-COMPLETION-SUMMARY.md)

---

**创建日期**: 2025-10-29
**最后更新**: 2025-10-29
**版本**: 1.0.0
**状态**: ✅ 可用
