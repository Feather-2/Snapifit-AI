# 🔧 环境变量完整对照表

## 速率限制相关环境变量

### ✅ **已完全接入环境变量控制的功能**

| 功能模块 | 环境变量 | 默认值 | 说明 |
|---------|---------|--------|------|
| **速率限制总开关** | `ENABLE_RATE_LIMIT` | `true` | 是否启用所有速率限制 |

### 📊 **基础 API 速率限制**（每分钟请求数）

| API类型 | 环境变量 | 默认值 | 说明 |
|---------|---------|--------|------|
| 同步API | `RATE_LIMIT_SYNC` | `20` | 数据同步相关API |
| AI API | `RATE_LIMIT_AI` | `10` | 聊天、分析等AI功能 |
| 上传API | `RATE_LIMIT_UPLOAD` | `3` | 文件上传相关 |
| 管理API | `RATE_LIMIT_ADMIN` | `30` | 管理员操作 |
| 认证API | `RATE_LIMIT_AUTH` | `60` | 登录、注册等 |
| 一般API | `RATE_LIMIT_API` | `50` | 其他API请求 |
| 全局限制 | `RATE_LIMIT_GLOBAL` | `100` | 所有请求的总限制 |

### 🔄 **同步API细粒度限制**

| 限制类型 | 环境变量 | 默认值 | 说明 |
|---------|---------|--------|------|
| 用户每秒 | `RATE_LIMIT_SYNC_USER_PER_SECOND` | `3` | 单用户每秒同步次数 |
| 用户每分钟 | `RATE_LIMIT_SYNC_USER_PER_MINUTE` | `30` | 单用户每分钟同步次数 |
| 用户每小时 | `RATE_LIMIT_SYNC_USER_PER_HOUR` | `300` | 单用户每小时同步次数 |
| IP每分钟 | `RATE_LIMIT_SYNC_IP_PER_MINUTE` | `100` | 单IP每分钟同步次数 |
| IP每小时 | `RATE_LIMIT_SYNC_IP_PER_HOUR` | `1000` | 单IP每小时同步次数 |

### 📧 **邮件发送限制**

| 限制类型 | 环境变量 | 默认值 | 说明 |
|---------|---------|--------|------|
| 短期限制 | `RATE_LIMIT_EMAIL_SHORT_TERM` | `1` | 30秒内发送次数 |
| 中期限制 | `RATE_LIMIT_EMAIL_MEDIUM_TERM` | `5` | 5分钟内发送次数 |
| 长期限制 | `RATE_LIMIT_EMAIL_LONG_TERM` | `10` | 24小时内发送次数 |

## 🎯 **预设配置方案**

### 🔓 **无限制模式**
```bash
ENABLE_RATE_LIMIT=false
```

### ⚖️ **默认模式**（推荐）
```bash
ENABLE_RATE_LIMIT=true
# 其他变量使用默认值
```

### 🔒 **高安全模式**
```bash
ENABLE_RATE_LIMIT=true
RATE_LIMIT_SYNC=10
RATE_LIMIT_AI=5
RATE_LIMIT_UPLOAD=1
RATE_LIMIT_ADMIN=15
RATE_LIMIT_AUTH=30
RATE_LIMIT_API=25
RATE_LIMIT_GLOBAL=50
RATE_LIMIT_SYNC_USER_PER_SECOND=1
RATE_LIMIT_SYNC_USER_PER_MINUTE=15
RATE_LIMIT_SYNC_USER_PER_HOUR=150
RATE_LIMIT_SYNC_IP_PER_MINUTE=50
RATE_LIMIT_SYNC_IP_PER_HOUR=500
RATE_LIMIT_EMAIL_SHORT_TERM=1
RATE_LIMIT_EMAIL_MEDIUM_TERM=3
RATE_LIMIT_EMAIL_LONG_TERM=5
```

### 🚀 **高性能模式**
```bash
ENABLE_RATE_LIMIT=true
RATE_LIMIT_SYNC=100
RATE_LIMIT_AI=50
RATE_LIMIT_UPLOAD=10
RATE_LIMIT_ADMIN=100
RATE_LIMIT_AUTH=200
RATE_LIMIT_API=150
RATE_LIMIT_GLOBAL=300
RATE_LIMIT_SYNC_USER_PER_SECOND=10
RATE_LIMIT_SYNC_USER_PER_MINUTE=100
RATE_LIMIT_SYNC_USER_PER_HOUR=1000
RATE_LIMIT_SYNC_IP_PER_MINUTE=300
RATE_LIMIT_SYNC_IP_PER_HOUR=3000
RATE_LIMIT_EMAIL_SHORT_TERM=3
RATE_LIMIT_EMAIL_MEDIUM_TERM=15
RATE_LIMIT_EMAIL_LONG_TERM=50
```

## ✅ **环境变量完整性检查**

### 已接入的功能模块：
- ✅ **中间件速率限制** - 完全支持环境变量
- ✅ **同步API限制器** - 完全支持环境变量
- ✅ **邮件发送限制** - 完全支持环境变量
- ✅ **调试端点** - 使用动态配置

### 配置文件：
- ✅ **`.env.local`** - 包含所有环境变量示例
- ✅ **`.env.rate-limit.example`** - 完整的配置模板
- ✅ **`lib/env-config.ts`** - 统一的配置管理

## 🔧 **使用方法**

1. **复制配置模板**：
   ```bash
   cp .env.rate-limit.example .env.local
   ```

2. **选择预设方案**：
   - 取消注释对应的配置块

3. **自定义配置**：
   - 根据需要修改具体的数值

4. **重启应用**：
   ```bash
   docker-compose restart
   ```

## 📋 **验证配置**

### 检查当前配置：
```bash
curl http://localhost:3000/api/debug/rate-limit-status
```

### 管理员配置界面：
```bash
curl http://localhost:3000/api/admin/rate-limit
```

## 🎉 **总结**

**所有速率限制功能都已完全接入环境变量控制！**

- **13个环境变量**控制所有速率限制
- **4种预设方案**适应不同场景
- **完整的文档**和示例配置
- **统一的配置管理**系统

您的"丰俭由人"设计理念已经完美实现！🚀
