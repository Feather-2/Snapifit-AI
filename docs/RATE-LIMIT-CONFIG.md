# 🚦 速率限制配置指南

## 概述

SnapFit AI 提供了灵活的速率限制配置，支持"丰俭由人"的安全策略。您可以根据部署环境和安全需求，选择完全禁用、使用默认配置或自定义限制规则。

## 🔧 配置方式

### 1. 完全禁用速率限制

适用于：内网部署、测试环境、高信任环境

```bash
# 在 .env.local 中设置
ENABLE_RATE_LIMIT=false
```

### 2. 使用默认配置

适用于：大多数生产环境

```bash
# 在 .env.local 中设置（或不设置，使用默认值）
ENABLE_RATE_LIMIT=true
```

### 3. 自定义配置

适用于：有特殊需求的部署环境

```bash
# 基础 API 限制（每分钟请求数）
RATE_LIMIT_SYNC=20          # 同步API
RATE_LIMIT_AI=10            # AI API
RATE_LIMIT_UPLOAD=3         # 文件上传
RATE_LIMIT_ADMIN=30         # 管理API
RATE_LIMIT_AUTH=60          # 认证API
RATE_LIMIT_API=50           # 一般API
RATE_LIMIT_GLOBAL=100       # 全局限制

# 同步API细粒度限制
RATE_LIMIT_SYNC_USER_PER_SECOND=3    # 用户每秒
RATE_LIMIT_SYNC_USER_PER_MINUTE=30   # 用户每分钟
RATE_LIMIT_SYNC_USER_PER_HOUR=300    # 用户每小时

# 邮件发送限制
RATE_LIMIT_EMAIL_SHORT_TERM=1        # 30秒内
RATE_LIMIT_EMAIL_MEDIUM_TERM=5       # 5分钟内
RATE_LIMIT_EMAIL_LONG_TERM=10        # 24小时内
```

## 📊 预设配置方案

### 🔒 高安全模式（严格限制）

适用于：公网部署、高风险环境

```bash
ENABLE_RATE_LIMIT=true
RATE_LIMIT_SYNC=10
RATE_LIMIT_AI=5
RATE_LIMIT_UPLOAD=1
RATE_LIMIT_ADMIN=15
RATE_LIMIT_AUTH=30
RATE_LIMIT_API=25
RATE_LIMIT_GLOBAL=50
```

### ⚖️ 平衡模式（默认配置）

适用于：一般生产环境

```bash
ENABLE_RATE_LIMIT=true
# 其他配置使用默认值
```

### 🚀 高性能模式（宽松限制）

适用于：内网部署、高性能需求

```bash
ENABLE_RATE_LIMIT=true
RATE_LIMIT_SYNC=100
RATE_LIMIT_AI=50
RATE_LIMIT_UPLOAD=10
RATE_LIMIT_ADMIN=100
RATE_LIMIT_AUTH=200
RATE_LIMIT_API=150
RATE_LIMIT_GLOBAL=300
```

### 🔓 无限制模式

适用于：测试环境、完全信任环境

```bash
ENABLE_RATE_LIMIT=false
```

## 🎯 配置建议

### 根据部署环境选择

| 环境类型 | 推荐配置 | 说明 |
|---------|---------|------|
| 开发环境 | 无限制模式 | 便于开发调试 |
| 测试环境 | 无限制模式 | 避免测试干扰 |
| 内网生产 | 高性能模式 | 信任度高，追求性能 |
| 公网生产 | 平衡模式 | 安全与性能并重 |
| 高风险环境 | 高安全模式 | 安全优先 |

### 根据用户规模调整

| 用户规模 | 建议调整 |
|---------|---------|
| < 100 用户 | 使用默认配置 |
| 100-1000 用户 | 适当提高限制 |
| > 1000 用户 | 使用高性能模式或自定义 |

## 🔍 监控和调试

### 查看当前配置

```bash
# 访问调试端点
GET /api/debug/rate-limit-status
```

### 管理员配置界面

```bash
# 管理员可以查看和验证配置
GET /api/admin/rate-limit
```

### 日志监控

速率限制触发时会记录安全事件：

```typescript
// 在日志中查找
eventType: 'rate_limit_exceeded'
severity: 'medium'
```

## ⚠️ 注意事项

### 1. 配置生效

- 环境变量修改后需要重启应用
- 建议在测试环境先验证配置效果

### 2. 性能影响

- 完全禁用速率限制可以提高性能
- 过于严格的限制可能影响用户体验

### 3. 安全考虑

- 公网部署建议保持速率限制
- 内网部署可以根据信任度调整

### 4. 监控建议

- 定期检查速率限制触发情况
- 根据实际使用情况调整配置

## 🚀 快速开始

1. **复制配置模板**
   ```bash
   cp .env.rate-limit.example .env.local
   ```

2. **选择合适的预设**
   - 取消注释对应的配置块

3. **重启应用**
   ```bash
   docker-compose restart
   ```

4. **验证配置**
   - 访问 `/api/debug/rate-limit-status`
   - 检查日志输出

## 🔧 故障排除

### 问题：速率限制过于严格

**解决方案：**
1. 检查当前配置：`GET /api/admin/rate-limit`
2. 适当提高限制值
3. 或临时禁用：`ENABLE_RATE_LIMIT=false`

### 问题：配置不生效

**解决方案：**
1. 确认环境变量格式正确
2. 重启应用
3. 检查日志是否有错误

### 问题：性能问题

**解决方案：**
1. 使用高性能模式
2. 或完全禁用速率限制
3. 监控系统资源使用

这种"丰俭由人"的设计让您可以根据实际需求灵活调整安全策略！
