# 邮件发送频率限制

为了防止邮件滥用和保护系统资源，我们实现了严格的**双重频率限制**机制。

## 🛡️ 双重限制策略

### 邮箱级别限制

1. **30秒内最多1次** - 防止快速重复发送
2. **5分钟内最多5次** - 防止短时间内大量发送
3. **24小时内最多10次** - 防止每日滥用

### IP级别限制 (新增)

1. **30秒内最多3次** - 允许多个邮箱但限制总量
2. **5分钟内最多10次** - 防止同一IP大量发送
3. **24小时内最多50次** - 防止IP级别滥用

### 限制范围

- **邮箱维度**: 按邮箱地址独立计算
- **IP维度**: 按客户端IP地址独立计算
- **双重检查**: 必须同时满足邮箱和IP限制
- **全类型覆盖**: 包括所有类型的邮件（验证邮件、密码重置邮件等）
- **开发支持**: 开发模式下也会记录发送次数（用于测试）

## 用户体验

### 前端处理

1. **实时反馈** - 显示剩余等待时间
2. **按钮状态** - 发送中和冷却期间禁用按钮
3. **错误提示** - 清晰的频率限制说明
4. **倒计时显示** - 显示具体等待秒数

### API响应

```json
// 成功发送
{
  "success": true,
  "data": { "id": "email_id" }
}

// 邮箱频率限制
{
  "success": false,
  "error": "邮件发送过于频繁，30秒内最多发送1次邮件",
  "rateLimited": true,
  "waitMinutes": 5,
  "nextAllowedTime": 1640995200000
}

// IP频率限制
{
  "success": false,
  "error": "IP发送过于频繁，30秒内最多发送3次邮件",
  "rateLimited": true,
  "waitMinutes": 2,
  "nextAllowedTime": 1640995080000
}
```

## 技术实现

### 存储方式

- **开发/测试**: 内存存储 (Map)
- **生产环境**: 建议使用 Redis
- **数据结构**: 每个邮箱对应一个时间戳数组

### 清理机制

- 自动清理过期记录（24小时外）
- 只保留有效时间窗口内的记录
- 内存占用优化

## API 端点

### 检查发送状态

```bash
GET /api/auth/email-status?email=user@example.com
```

响应示例：
```json
{
  "success": true,
  "data": {
    "email": "user@example.com",
    "clientIP": "192.168.1.100",
    "canSendNow": false,
    "error": "邮件发送过于频繁，30秒内最多发送1次邮件",
    "nextAllowedTime": 1640995200000,
    "waitMinutes": 5,
    "emailUsage": {
      "last30Seconds": "1/1",
      "last5Minutes": "3/5",
      "last24Hours": "8/10"
    },
    "ipUsage": {
      "last30Seconds": "2/3",
      "last5Minutes": "7/10",
      "last24Hours": "25/50"
    },
    "limits": {
      "description": "邮件发送频率限制 (邮箱 + IP双重限制)",
      "emailRules": [
        "邮箱级别: 30秒内最多1次",
        "邮箱级别: 5分钟内最多5次",
        "邮箱级别: 24小时内最多10次"
      ],
      "ipRules": [
        "IP级别: 30秒内最多3次",
        "IP级别: 5分钟内最多10次",
        "IP级别: 24小时内最多50次"
      ]
    }
  }
}
```

### 清理发送历史（仅开发环境）

```bash
DELETE /api/auth/email-status?email=user@example.com
```

## 测试工具

### 基础测试

```bash
node scripts/test-email.js
```

### 频率限制测试

```bash
node scripts/test-email.js --rate-limit
```

### 测试功能

1. **邮件发送测试** - 验证邮件服务是否正常
2. **频率限制测试** - 验证限制规则是否生效
3. **状态检查** - 查看当前发送状态
4. **历史清理** - 清理测试数据

## 配置选项

### 自定义限制规则

在 `lib/email/email-service.ts` 中修改：

```typescript
const RATE_LIMITS = {
  SHORT_TERM: { window: 30 * 1000, limit: 1 },    // 30秒1次
  MEDIUM_TERM: { window: 5 * 60 * 1000, limit: 5 }, // 5分钟5次
  LONG_TERM: { window: 24 * 60 * 60 * 1000, limit: 10 } // 24小时10次
}
```

### 生产环境优化

1. **使用 Redis**
   ```typescript
   // 替换内存存储为 Redis
   import Redis from 'ioredis'
   const redis = new Redis(process.env.REDIS_URL)
   ```

2. **分布式部署**
   - 确保所有实例共享同一个 Redis
   - 考虑使用 Redis Cluster

3. **监控告警**
   - 监控频率限制触发次数
   - 设置异常发送告警

## 安全考虑

### 防护措施

1. **IP 级别限制** - 可考虑添加 IP 维度的限制
2. **用户级别限制** - 已注册用户可能需要不同的限制规则
3. **验证码保护** - 对于频繁请求可要求验证码

### 绕过检测

1. **多邮箱攻击** - 监控同一 IP 的多邮箱请求
2. **分布式攻击** - 考虑添加全局限制
3. **时间窗口边界** - 当前实现已考虑边界情况

## 故障排除

### 常见问题

1. **限制过严** - 调整时间窗口或次数限制
2. **内存泄漏** - 确保过期记录被正确清理
3. **时区问题** - 使用 UTC 时间戳避免时区影响

### 调试方法

1. **查看发送历史**
   ```javascript
   console.log(EmailService.getEmailStats())
   ```

2. **检查特定邮箱状态**
   ```javascript
   console.log(EmailService.checkEmailRateLimit('user@example.com'))
   ```

3. **清理测试数据**
   ```javascript
   EmailService.clearEmailHistory('test@example.com')
   ```

## 最佳实践

### 用户引导

1. **提前告知** - 在发送前显示限制规则
2. **友好提示** - 使用易懂的错误消息
3. **替代方案** - 提供其他验证方式

### 系统设计

1. **优雅降级** - 邮件服务故障时的备用方案
2. **异步处理** - 避免阻塞用户操作
3. **日志记录** - 记录所有限制触发事件

### 性能优化

1. **批量清理** - 定期批量清理过期记录
2. **内存监控** - 监控内存使用情况
3. **缓存策略** - 合理设置缓存过期时间
