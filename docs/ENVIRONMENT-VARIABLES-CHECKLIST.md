# 📋 环境变量完整检查清单

## ✅ **必需的环境变量**

### 🗄️ **数据库配置**
- [ ] `DB_PROVIDER` - 数据库提供商 ('supabase' | 'postgresql')
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Supabase 项目 URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase 匿名密钥
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase 服务角色密钥
- [ ] `DATABASE_URL` - PostgreSQL 连接字符串

### 🔐 **安全配置**
- [ ] `NEXTAUTH_SECRET` - NextAuth JWT 签名密钥
- [ ] `KEY_ENCRYPTION_SECRET` - API 密钥加密密钥
- [ ] `NEXTAUTH_URL` - 应用回调 URL

## 🔧 **可选的环境变量**

### 🔑 **第三方登录**
- [ ] `GITHUB_CLIENT_ID` - GitHub OAuth 客户端 ID
- [ ] `GITHUB_CLIENT_SECRET` - GitHub OAuth 客户端密钥
- [ ] `GOOGLE_CLIENT_ID` - Google OAuth 客户端 ID
- [ ] `GOOGLE_CLIENT_SECRET` - Google OAuth 客户端密钥

### 📧 **邮件服务**
- [ ] `EMAIL_PROVIDER` - 邮件服务提供商 ('resend' | 'smtp')
- [ ] `RESEND_API_KEY` - Resend API 密钥
- [ ] `FROM_EMAIL` - 发件人邮箱地址
- [ ] `APP_NAME` - 应用名称
- [ ] `SMTP_HOST` - SMTP 服务器地址
- [ ] `SMTP_PORT` - SMTP 端口
- [ ] `SMTP_SECURE` - SMTP 安全连接
- [ ] `SMTP_USER` - SMTP 用户名
- [ ] `SMTP_PASS` - SMTP 密码
- [ ] `SMTP_TLS_REJECT_UNAUTHORIZED` - TLS 验证

### ⚙️ **权限管理**
- [ ] `ALLOW_NON_SUPER_ADMIN_SHARE_KEYS` - 允许非超管分享密钥
- [ ] `ALLOW_NON_SUPER_ADMIN_CREATE_INVITE_CODES` - 允许非超管创建邀请码
- [ ] `ALLOW_NON_THIRD_PARTY_SOURCES` - 允许访问第三方源站

### 🚦 **速率限制**
- [ ] `ENABLE_RATE_LIMIT` - 启用速率限制
- [ ] `RATE_LIMIT_SYNC` - 同步 API 限制
- [ ] `RATE_LIMIT_AI` - AI API 限制
- [ ] `RATE_LIMIT_UPLOAD` - 上传限制
- [ ] `RATE_LIMIT_ADMIN` - 管理 API 限制
- [ ] `RATE_LIMIT_AUTH` - 认证 API 限制
- [ ] `RATE_LIMIT_API` - 一般 API 限制
- [ ] `RATE_LIMIT_GLOBAL` - 全局限制
- [ ] `RATE_LIMIT_SYNC_USER_PER_SECOND` - 用户每秒同步限制
- [ ] `RATE_LIMIT_SYNC_USER_PER_MINUTE` - 用户每分钟同步限制
- [ ] `RATE_LIMIT_SYNC_USER_PER_HOUR` - 用户每小时同步限制
- [ ] `RATE_LIMIT_SYNC_IP_PER_MINUTE` - IP 每分钟同步限制
- [ ] `RATE_LIMIT_SYNC_IP_PER_HOUR` - IP 每小时同步限制
- [ ] `RATE_LIMIT_EMAIL_SHORT_TERM` - 邮件短期限制
- [ ] `RATE_LIMIT_EMAIL_MEDIUM_TERM` - 邮件中期限制
- [ ] `RATE_LIMIT_EMAIL_LONG_TERM` - 邮件长期限制

### 🌐 **网络代理**
- [ ] `HTTP_PROXY` - HTTP 代理地址
- [ ] `HTTPS_PROXY` - HTTPS 代理地址
- [ ] `NO_PROXY` - 不使用代理的地址

### 🚀 **部署配置**
- [ ] `DEPLOYMENT_TYPE` - 部署类型 ('http' | 'https')
- [ ] `FORCE_HTTPS` - 强制 HTTPS
- [ ] `DB_SSL` - 数据库 SSL
- [ ] `AUTH_TRUST_HOST` - 信任主机配置

### 🤖 **AI API 配置**
- [ ] `DEFAULT_OPENAI_API_KEY` - 默认 OpenAI API 密钥
- [ ] `DEFAULT_OPENAI_BASE_URL` - 默认 OpenAI API 基础 URL

### 📊 **应用元数据**
- [ ] `APP_VERSION` - 应用版本
- [ ] `TZ` - 时区设置
- [ ] `LOG_LEVEL` - 日志级别
- [ ] `NODE_ENV` - 运行环境

### 🔍 **调试配置**
- [ ] `DEBUG_AUTH` - 认证调试
- [ ] `DEBUG_USAGE` - 使用量调试
- [ ] `DEBUG_API` - API 调试
- [ ] `DEBUG_DB` - 数据库调试

### 📈 **监控配置**
- [ ] `ENABLE_PERFORMANCE_MONITORING` - 启用性能监控
- [ ] `ENABLE_ERROR_MONITORING` - 启用错误监控
- [ ] `ENABLE_SECURITY_MONITORING` - 启用安全监控

## 🎯 **部署环境特定变量**

### Docker 部署额外变量
- [ ] `POSTGRES_DB` - PostgreSQL 数据库名
- [ ] `POSTGRES_USER` - PostgreSQL 用户名
- [ ] `POSTGRES_PASSWORD` - PostgreSQL 密码
- [ ] `POSTGRES_PORT` - PostgreSQL 端口
- [ ] `APP_HOST_PORT` - 应用主机端口
- [ ] `APP_CONTAINER_PORT` - 应用容器端口
- [ ] `DOMAIN` - 部署域名
- [ ] `NEXTAUTH_URL_INTERNAL` - 内部回调 URL

### Vercel 部署额外变量
- [ ] `VERCEL_URL` - Vercel 自动生成的 URL

## 🔧 **快速检查命令**

### 检查必需变量
```bash
node scripts/check-env.js
```

### 安全检查
```bash
node scripts/security-check.js
```

### 查看当前配置
```bash
curl http://localhost:3000/api/debug/rate-limit-status
curl http://localhost:3000/api/debug/email-config
```

## 📝 **配置模板**

### 开发环境最小配置
```bash
# 必需
DB_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
KEY_ENCRYPTION_SECRET=your_encryption_secret

# 推荐
EMAIL_PROVIDER=resend
RESEND_API_KEY=your_resend_key
FROM_EMAIL=your_email
APP_NAME=SnapFit AI
```

### 生产环境完整配置
```bash
# 参考 .env.rate-limit.example 文件
# 包含所有安全、监控、限制配置
```

## ⚠️ **安全提醒**

1. **不要提交敏感信息**到版本控制
2. **使用强随机密钥**（至少 32 字符）
3. **定期轮换密钥**
4. **生产环境使用 HTTPS**
5. **启用适当的速率限制**
6. **配置监控和日志**

## 🚀 **部署前检查**

- [ ] 所有必需变量已设置
- [ ] 密钥强度足够（≥32字符）
- [ ] 生产环境使用 HTTPS
- [ ] 邮件服务配置正确
- [ ] 速率限制适合环境
- [ ] 监控配置启用
- [ ] 安全检查通过

使用此清单确保您的 SnapFit AI 部署配置完整且安全！🎯
