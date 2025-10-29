# lib/ 目录清理 - 文件迁移映射表

> **生成时间**: 2025-10-29
> **引用分析**: 已完成
> **总文件数**: 30个需要移动

---

## 📊 引用情况统计

### 高频引用文件 (>10次) - 需要特别注意

| 文件 | 引用次数 | 目标路径 | 优先级 |
|------|----------|----------|--------|
| **auth.ts** | 74 | `lib/auth/index.ts` | 🔴 P0 |
| **ip-utils.ts** | 19 | `lib/utils/ip.ts` | 🔴 P0 |
| **env-config.ts** | 12 | `lib/config/environment.ts` | 🔴 P0 |

### 中频引用文件 (5-10次)

| 文件 | 引用次数 | 目标路径 | 优先级 |
|------|----------|----------|--------|
| **api-auth-helper.ts** | 9 | `lib/auth/api-helper.ts` | 🟡 P1 |
| **key-manager.ts** | 9 | `lib/auth/key-manager.ts` | 🟡 P1 |

### 低频引用文件 (<5次)

| 文件 | 引用次数 | 目标路径 |
|------|----------|----------|
| api-token-manager.ts | 5 | `lib/auth/token-manager.ts` |
| user-manager.ts | 4 | `lib/user/manager.ts` |
| usage-manager.ts | 4 | `lib/user/usage-manager.ts` |
| shared-openai-client.ts | 3 | `lib/ai/shared.ts` |
| debug-utils.ts | 3 | `lib/utils/debug.ts` |
| openai-client.ts | 1 | `lib/ai/openai.ts` |

### 零引用文件 (可能未使用或仅内部使用)

| 文件 | 目标路径 | 备注 |
|------|----------|------|
| health-utils.ts | `lib/utils/health.ts` | 可能被间接引用 |
| image-utils.ts | `lib/utils/image.ts` | 可能被间接引用 |
| number-utils.ts | `lib/utils/number.ts` | 可能被间接引用 |
| screenshot-utils.ts | `lib/utils/screenshot.ts` | 可能被间接引用 |
| tef-utils.ts | `lib/utils/tef.ts` | 可能被间接引用 |
| time-utils.ts | `lib/utils/time.ts` | 可能被间接引用 |
| db-config.ts | `lib/config/database.ts` | 可能被间接引用 |
| debug-config.ts | `lib/config/debug.ts` | 可能被间接引用 |
| frontend-ai-client.ts | `lib/ai/frontend.ts` | 可能未使用或客户端使用 |

---

## 🗺️ 完整迁移映射

### 1. 工具类 (lib/utils/) - 8个文件

| 原路径 | 新路径 | 引用次数 | 搜索模式 |
|--------|--------|----------|----------|
| `lib/health-utils.ts` | `lib/utils/health.ts` | 0 | `from '@/lib/health-utils'` |
| `lib/image-utils.ts` | `lib/utils/image.ts` | 0 | `from '@/lib/image-utils'` |
| `lib/ip-utils.ts` | `lib/utils/ip.ts` | 19 | `from '@/lib/ip-utils'` |
| `lib/number-utils.ts` | `lib/utils/number.ts` | 0 | `from '@/lib/number-utils'` |
| `lib/screenshot-utils.ts` | `lib/utils/screenshot.ts` | 0 | `from '@/lib/screenshot-utils'` |
| `lib/tef-utils.ts` | `lib/utils/tef.ts` | 0 | `from '@/lib/tef-utils'` |
| `lib/time-utils.ts` | `lib/utils/time.ts` | 0 | `from '@/lib/time-utils'` |
| `lib/debug-utils.ts` | `lib/utils/debug.ts` | 3 | `from '@/lib/debug-utils'` |

**替换规则**:
```
from '@/lib/ip-utils'      → from '@/lib/utils/ip'
from '@/lib/debug-utils'   → from '@/lib/utils/debug'
```

### 2. 配置文件 (lib/config/) - 3个文件

| 原路径 | 新路径 | 引用次数 | 搜索模式 |
|--------|--------|----------|----------|
| `lib/db-config.ts` | `lib/config/database.ts` | 0 | `from '@/lib/db-config'` |
| `lib/debug-config.ts` | `lib/config/debug.ts` | 0 | `from '@/lib/debug-config'` |
| `lib/env-config.ts` | `lib/config/environment.ts` | 12 | `from '@/lib/env-config'` |

**替换规则**:
```
from '@/lib/env-config'    → from '@/lib/config/environment'
```

### 3. 认证相关 (lib/auth/) - 4个文件

| 原路径 | 新路径 | 引用次数 | 搜索模式 |
|--------|--------|----------|----------|
| `lib/auth.ts` | `lib/auth/index.ts` | 74 | `from '@/lib/auth'` |
| `lib/api-auth-helper.ts` | `lib/auth/api-helper.ts` | 9 | `from '@/lib/api-auth-helper'` |
| `lib/api-token-manager.ts` | `lib/auth/token-manager.ts` | 5 | `from '@/lib/api-token-manager'` |
| `lib/key-manager.ts` | `lib/auth/key-manager.ts` | 9 | `from '@/lib/key-manager'` |

**替换规则**:
```
from '@/lib/auth'               → from '@/lib/auth'  (不变，因为index.ts)
from '@/lib/api-auth-helper'    → from '@/lib/auth/api-helper'
from '@/lib/api-token-manager'  → from '@/lib/auth/token-manager'
from '@/lib/key-manager'        → from '@/lib/auth/key-manager'
```

### 4. AI客户端 (lib/ai/) - 3个文件

| 原路径 | 新路径 | 引用次数 | 搜索模式 |
|--------|--------|----------|----------|
| `lib/openai-client.ts` | `lib/ai/openai.ts` | 1 | `from '@/lib/openai-client'` |
| `lib/shared-openai-client.ts` | `lib/ai/shared.ts` | 3 | `from '@/lib/shared-openai-client'` |
| `lib/frontend-ai-client.ts` | `lib/ai/frontend.ts` | 0 | `from '@/lib/frontend-ai-client'` |

**替换规则**:
```
from '@/lib/openai-client'        → from '@/lib/ai/openai'
from '@/lib/shared-openai-client' → from '@/lib/ai/shared'
from '@/lib/frontend-ai-client'   → from '@/lib/ai/frontend'
```

### 5. 安全相关 (lib/security/) - 8个文件

已在之前的重构中处理：
- `lib/rate-limit-redis.ts` → 保持不变（已在 lib/）
- `lib/rate-limit-redis-selfhosted.ts` → 保持不变
- `lib/security-logger.ts` → 保持不变
- `lib/ip-ban-manager.ts` → `lib/security/ban/ip-manager.ts`
- `lib/user-ban-manager.ts` → `lib/security/ban/user-manager.ts`
- `lib/user-ban-middleware.ts` → `lib/security/ban/middleware.ts`
- `lib/input-validator.ts` → `lib/security/input-validator.ts`
- `lib/request-size-limiter.ts` → `lib/security/request-size-limiter.ts`

### 6. 用户管理 (lib/user/) - 2个文件

| 原路径 | 新路径 | 引用次数 | 搜索模式 |
|--------|--------|----------|----------|
| `lib/user-manager.ts` | `lib/user/manager.ts` | 4 | `from '@/lib/user-manager'` |
| `lib/usage-manager.ts` | `lib/user/usage-manager.ts` | 4 | `from '@/lib/usage-manager'` |

**替换规则**:
```
from '@/lib/user-manager'   → from '@/lib/user/manager'
from '@/lib/usage-manager'  → from '@/lib/user/usage-manager'
```

### 7. 其他文件

| 原路径 | 新路径 | 备注 |
|--------|--------|------|
| `lib/tef-cache.ts` | `lib/cache/tef.ts` | 移入cache目录 |
| `lib/debug-guard.ts` | `lib/middleware/debug-guard.ts` | 移入middleware目录 |
| `lib/api-helpers.ts` | `lib/api/helpers.ts` | 移入api目录 |

---

## 🔄 批量替换脚本

### 替换命令列表

```bash
# 1. ip-utils (19次引用 - 最高优先级)
find app lib components -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i "s|from '@/lib/ip-utils'|from '@/lib/utils/ip'|g" {} +

# 2. env-config (12次引用)
find app lib components -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i "s|from '@/lib/env-config'|from '@/lib/config/environment'|g" {} +

# 3. api-auth-helper (9次引用)
find app lib components -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i "s|from '@/lib/api-auth-helper'|from '@/lib/auth/api-helper'|g" {} +

# 4. key-manager (9次引用)
find app lib components -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i "s|from '@/lib/key-manager'|from '@/lib/auth/key-manager'|g" {} +

# 5. api-token-manager (5次引用)
find app lib components -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i "s|from '@/lib/api-token-manager'|from '@/lib/auth/token-manager'|g" {} +

# 6. user-manager (4次引用)
find app lib components -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i "s|from '@/lib/user-manager'|from '@/lib/user/manager'|g" {} +

# 7. usage-manager (4次引用)
find app lib components -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i "s|from '@/lib/usage-manager'|from '@/lib/user/usage-manager'|g" {} +

# 8. shared-openai-client (3次引用)
find app lib components -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i "s|from '@/lib/shared-openai-client'|from '@/lib/ai/shared'|g" {} +

# 9. debug-utils (3次引用)
find app lib components -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i "s|from '@/lib/debug-utils'|from '@/lib/utils/debug'|g" {} +

# 10. openai-client (1次引用)
find app lib components -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i "s|from '@/lib/openai-client'|from '@/lib/ai/openai'|g" {} +

# 11. api-helpers
find app lib components -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i "s|from '@/lib/api-helpers'|from '@/lib/api/helpers'|g" {} +
```

---

## ⚠️ 特殊情况处理

### 1. auth.ts → auth/index.ts

**不需要修改导入路径**，因为：
```typescript
// 之前
import { auth } from '@/lib/auth'

// 之后（路径不变，因为index.ts）
import { auth } from '@/lib/auth'
```

### 2. lib内部的相对引用

需要检查并更新 lib/ 内部文件的相对导入：

```typescript
// 例如 lib/auth/api-helper.ts 内部可能引用其他lib文件
// 需要从相对路径改为绝对路径或更新相对路径
```

### 3. 导出的类型和函数

移动文件后，确保所有 export 保持不变：
```typescript
// 文件内容不变，只是路径变了
export function someFunction() { ... }
export type SomeType = ...
```

---

## 📝 执行顺序

### 阶段 1: 创建目录结构
```bash
mkdir -p lib/{utils,config,auth,ai,user,api,security/ban,middleware,cache}
```

### 阶段 2: 移动文件（按优先级）

1. **P0 - 高频引用文件** (先移动，后更新引用)
   - auth.ts → auth/index.ts
   - ip-utils.ts → utils/ip.ts
   - env-config.ts → config/environment.ts

2. **P1 - 中频引用文件**
   - api-auth-helper.ts → auth/api-helper.ts
   - key-manager.ts → auth/key-manager.ts

3. **P2 - 低频/零引用文件** (批量移动)
   - 所有其他 utils
   - 所有其他 config
   - AI客户端
   - 用户管理

### 阶段 3: 批量更新导入路径

运行上面的批量替换脚本

### 阶段 4: 验证

1. TypeScript编译检查
2. 运行测试
3. 手动测试关键功能

---

## 🎯 预期影响范围

| 文件类型 | 预计修改文件数 | 备注 |
|----------|----------------|------|
| API路由 | 50-70 | app/api/**/*.ts |
| 组件 | 10-20 | components/**/*.tsx |
| lib内部 | 20-30 | lib/**/*.ts |
| **总计** | **80-120** | 需要批量更新导入 |

---

**创建时间**: 2025-10-29
**分析完成**: ✅
**准备执行**: ✅
**风险评估**: 🟡 中等（有详细映射和脚本）
