# 验证码系统文档

## 概述

SnapFit AI 现在集成了数学验证码系统，用于防止自动化攻击和滥用，特别是在密码重置功能中。

## 功能特点

### 🔢 数学验证码
- **简单易用**: 基于基础数学运算（加法、减法、乘法）
- **动态生成**: 每次请求都生成新的数学题
- **自动过期**: 验证码5分钟后自动过期
- **尝试限制**: 每个验证码最多允许3次尝试
- **国际化支持**: 支持中文和英文界面

### 🛡️ 安全特性
- **会话隔离**: 每个验证码都有独立的会话ID
- **内存存储**: 验证码临时存储在内存中（生产环境建议使用Redis）
- **自动清理**: 定期清理过期的验证码会话
- **防暴力破解**: 限制尝试次数，超限后自动失效

## 技术实现

### 核心组件

#### 1. 验证码生成器 (`lib/captcha/math-captcha.ts`)
```typescript
// 生成数学验证码
export function generateMathCaptcha(): {
  sessionId: string
  question: string
  answer: number
}

// 验证答案
export function verifyCaptcha(sessionId: string, userAnswer: number): boolean
```

#### 2. API 接口
- `GET /api/captcha/generate` - 生成新的验证码
- `POST /api/captcha/verify` - 验证答案（测试用）

#### 3. React 组件 (`components/ui/math-captcha.tsx`)
```tsx
<MathCaptcha
  onVerify={(data) => setCaptchaData(data)}
  onError={(error) => setError(error)}
  disabled={isLoading}
/>
```

### 集成示例

#### 在密码重置中使用
```typescript
// 前端发送请求时包含验证码数据
const response = await fetch('/api/auth/reset-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email,
    captcha: {
      sessionId: 'xxx',
      answer: 42
    }
  })
})

// 后端验证
const isValidCaptcha = verifyCaptcha(captcha.sessionId, captcha.answer)
if (!isValidCaptcha) {
  return NextResponse.json({
    success: false,
    error: '验证码错误，请重试'
  }, { status: 400 })
}
```

## 配置选项

### 验证码配置 (`lib/captcha/math-captcha.ts`)
```typescript
const CAPTCHA_CONFIG = {
  // 验证码有效期（5分钟）
  EXPIRY_TIME: 5 * 60 * 1000,
  // 最大尝试次数
  MAX_ATTEMPTS: 3,
  // 数字范围
  MIN_NUMBER: 1,
  MAX_NUMBER: 20,
  // 清理间隔（10分钟）
  CLEANUP_INTERVAL: 10 * 60 * 1000
}
```

### 支持的运算类型
- **加法**: `5 + 3 = ?`
- **减法**: `8 - 2 = ?` (确保结果为正数)
- **乘法**: `4 × 6 = ?` (使用较小数字)

## 使用指南

### 1. 用户体验
1. 用户访问忘记密码页面
2. 输入邮箱地址
3. 完成数学验证码
4. 点击发送重置邮件
5. 如果验证码错误，会自动刷新要求重新验证

### 2. 开发者集成
```tsx
import { MathCaptcha } from '@/components/ui/math-captcha'

function MyForm() {
  const [captchaData, setCaptchaData] = useState(null)
  
  return (
    <form>
      {/* 其他表单字段 */}
      
      <MathCaptcha
        onVerify={setCaptchaData}
        onError={(error) => console.error(error)}
      />
      
      <Button disabled={!captchaData}>
        提交
      </Button>
    </form>
  )
}
```

## 安全考虑

### 现有防护措施
1. **邮件发送频率限制**: 30秒内最多1次，24小时内最多10次
2. **IP级别限制**: 防止同一IP使用多个邮箱绕过限制
3. **自动封禁**: 多次违规后自动封禁IP或用户
4. **安全事件记录**: 记录所有可疑活动

### 验证码增强
1. **人机验证**: 防止自动化脚本攻击
2. **会话管理**: 每个验证码独立管理，防止重放攻击
3. **时间限制**: 验证码自动过期，减少被破解风险
4. **尝试限制**: 限制错误尝试次数

## 国际化支持

### 支持的语言
- 中文 (`zh`)
- 英文 (`en`)

### 翻译文件位置
- `messages/zh.json` - 中文翻译
- `messages/en.json` - 英文翻译

### 验证码相关翻译键
```json
{
  "auth": {
    "forgotPassword": {
      "captcha": {
        "title": "人机验证",
        "description": "请计算上面的数学题并输入答案",
        "placeholder": "答案",
        "generating": "生成中...",
        "loading": "加载中...",
        "enterAnswer": "请输入答案",
        "invalidNumber": "请输入有效的数字"
      },
      "errors": {
        "captchaRequired": "请完成人机验证",
        "captchaInvalid": "验证码错误，请重试"
      }
    }
  }
}
```

## 测试

### 测试页面
访问 `/test-captcha` 页面可以测试验证码功能。

### 手动测试步骤
1. 访问忘记密码页面
2. 输入有效邮箱
3. 完成验证码验证
4. 检查邮件发送是否成功
5. 测试验证码错误情况
6. 测试验证码过期情况

## 生产环境建议

### 1. 使用 Redis 存储
```typescript
// 替换内存存储为 Redis
import Redis from 'ioredis'
const redis = new Redis(process.env.REDIS_URL)

// 存储验证码
await redis.setex(`captcha:${sessionId}`, 300, JSON.stringify(captchaData))

// 验证验证码
const data = await redis.get(`captcha:${sessionId}`)
```

### 2. 增强验证码复杂度
- 添加更复杂的数学运算
- 支持图形验证码
- 集成第三方验证码服务（如 reCAPTCHA）

### 3. 监控和分析
- 记录验证码使用统计
- 监控验证码成功率
- 分析可疑的验证码活动

## 故障排除

### 常见问题
1. **验证码不显示**: 检查 `/api/captcha/generate` 接口是否正常
2. **验证总是失败**: 检查答案计算是否正确
3. **验证码过期太快**: 调整 `EXPIRY_TIME` 配置
4. **内存占用过高**: 考虑使用 Redis 替代内存存储

### 调试信息
验证码系统会在控制台输出详细的调试信息：
- `🔢 为IP xxx 生成验证码: 5 + 3 = ?`
- `✅ 验证码验证成功`
- `❌ 验证码答案错误`
- `❌ 验证码已过期`
