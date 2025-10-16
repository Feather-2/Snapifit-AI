# 📨 SMTP 邮件服务配置指南

## 🚀 快速开始

### 1. 安装依赖

如果您想使用 SMTP 邮件服务，需要先安装 nodemailer：

```bash
# 使用 pnpm（推荐）
pnpm add nodemailer

# 或使用 npm
npm install nodemailer

# 或使用 yarn
yarn add nodemailer
```

### 2. 配置环境变量

在 `.env.local` 文件中添加：

```bash
# 选择 SMTP 作为邮件服务提供商
EMAIL_PROVIDER=smtp

# SMTP 服务器配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# 发件人信息
FROM_EMAIL=your-email@gmail.com
APP_NAME=SnapFit AI
```

### 3. 重启应用

```bash
# 开发环境
pnpm dev

# 或生产环境
pnpm build && pnpm start
```

## 📧 常见邮件服务配置

### Gmail
```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # 使用应用专用密码
FROM_EMAIL=your-email@gmail.com
```

**获取 Gmail 应用专用密码：**
1. 启用两步验证
2. 访问 [Google 账户设置](https://myaccount.google.com/security)
3. 点击"应用专用密码"
4. 生成新的应用专用密码

### Outlook/Hotmail
```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
FROM_EMAIL=your-email@outlook.com
```

### QQ 邮箱
```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@qq.com
SMTP_PASS=your-authorization-code  # 使用授权码
FROM_EMAIL=your-email@qq.com
```

**获取 QQ 邮箱授权码：**
1. 登录 QQ 邮箱
2. 设置 → 账户
3. 开启 SMTP 服务
4. 生成授权码

### 163 邮箱
```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@163.com
SMTP_PASS=your-authorization-code
FROM_EMAIL=your-email@163.com
```

## 🔧 高级配置

### TLS 设置
```bash
# 严格 TLS 验证（推荐）
SMTP_TLS_REJECT_UNAUTHORIZED=true

# 宽松 TLS 验证（用于自签名证书）
SMTP_TLS_REJECT_UNAUTHORIZED=false
```

### 端口选择
```bash
# STARTTLS（推荐）
SMTP_PORT=587
SMTP_SECURE=false

# SSL/TLS
SMTP_PORT=465
SMTP_SECURE=true

# 标准 SMTP（不推荐）
SMTP_PORT=25
SMTP_SECURE=false
```

## 🧪 测试配置

### 1. 检查配置状态
```bash
curl http://localhost:3000/api/debug/email-config
```

### 2. 发送测试邮件
```bash
node scripts/test-email.js
```

### 3. 注册测试
1. 启动应用：`pnpm dev`
2. 访问注册页面
3. 使用测试邮箱注册
4. 检查邮箱是否收到验证邮件

## 🚨 故障排除

### 问题 1：nodemailer 未安装
```
Error: nodemailer is not installed
```
**解决方案：**
```bash
pnpm add nodemailer
```

### 问题 2：SMTP 连接失败
```
Error: connect ECONNREFUSED
```
**解决方案：**
- 检查 `SMTP_HOST` 和 `SMTP_PORT`
- 确认网络连接
- 检查防火墙设置

### 问题 3：认证失败
```
Error: Invalid login
```
**解决方案：**
- 检查用户名和密码
- 使用应用专用密码（Gmail）
- 启用"不够安全的应用访问"（某些邮件服务）

### 问题 4：TLS 错误
```
Error: self signed certificate
```
**解决方案：**
```bash
SMTP_TLS_REJECT_UNAUTHORIZED=false
```

### 问题 5：邮件进入垃圾箱
**解决方案：**
- 配置 SPF、DKIM、DMARC 记录
- 使用已验证的域名
- 避免垃圾邮件关键词
- 建立发送信誉

## 🔄 从 Resend 迁移到 SMTP

### 1. 安装依赖
```bash
pnpm add nodemailer
```

### 2. 更新环境变量
```bash
# 从
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxx

# 改为
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 3. 重启应用
```bash
pnpm dev
```

### 4. 测试邮件发送
```bash
node scripts/test-email.js
```

## 💡 最佳实践

### 1. 安全性
- 使用应用专用密码而不是账户密码
- 启用两步验证
- 定期更换密码
- 使用环境变量存储敏感信息

### 2. 可靠性
- 配置备用 SMTP 服务器
- 监控邮件发送状态
- 设置重试机制
- 记录发送日志

### 3. 送达率
- 配置 SPF、DKIM、DMARC 记录
- 使用已验证的域名
- 避免垃圾邮件关键词
- 维护良好的发送信誉

### 4. 性能
- 使用连接池
- 设置合理的超时时间
- 监控发送速率
- 优化邮件内容大小

## 📊 SMTP vs Resend 对比

| 特性 | SMTP | Resend |
|------|------|--------|
| 配置复杂度 | 中等 | 简单 |
| 成本 | 取决于服务商 | 免费额度 |
| 送达率 | 取决于配置 | 高 |
| 监控功能 | 需自建 | 内置 |
| 企业支持 | 优秀 | 良好 |
| 自主控制 | 高 | 中等 |

选择建议：
- **小型项目**：Resend
- **企业项目**：SMTP
- **成本敏感**：SMTP（免费服务）
- **高度自主**：SMTP（自建服务器）

现在您可以根据需要选择最适合的邮件服务方案！🚀
