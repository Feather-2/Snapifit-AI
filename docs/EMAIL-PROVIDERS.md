# 📧 邮件服务提供商配置指南

SnapFit AI 现在支持多种邮件服务提供商，您可以根据需要选择最适合的方案。

## 🎯 支持的邮件服务

### 1. **Resend**（推荐）
- ✅ **简单易用** - 现代化 API 设计
- ✅ **免费额度** - 每月 3,000 封邮件
- ✅ **高送达率** - 专业邮件基础设施
- ✅ **开发友好** - 优秀的 TypeScript 支持

### 2. **SMTP**（通用）
- ✅ **兼容性强** - 支持所有 SMTP 服务
- ✅ **选择灵活** - Gmail、Outlook、自建服务器等
- ✅ **成本控制** - 可使用免费或自建服务
- ✅ **企业友好** - 支持企业邮件系统

## ⚙️ 配置方式

### 🚀 **方案一：使用 Resend**

#### 1. 环境变量配置
```bash
# .env.local
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com
APP_NAME=SnapFit AI
```

#### 2. 获取 API Key
1. 访问 [resend.com](https://resend.com) 注册账户
2. 进入 "API Keys" 页面
3. 点击 "Create API Key"
4. 复制生成的 API Key

#### 3. 域名配置（可选）
- 使用 `onboarding@resend.dev` 进行测试
- 配置自定义域名提高送达率

### 📨 **方案二：使用 SMTP**

#### 1. 环境变量配置
```bash
# .env.local
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=your-email@gmail.com
APP_NAME=SnapFit AI
```

#### 2. 安装依赖
```bash
pnpm add nodemailer
pnpm add -D @types/nodemailer
```

## 📋 **常见 SMTP 服务配置**

### Gmail
```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # 使用应用专用密码
```

**获取应用专用密码：**
1. 启用两步验证
2. 访问 Google 账户设置
3. 生成应用专用密码

### Outlook/Hotmail
```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

### QQ 邮箱
```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@qq.com
SMTP_PASS=your-authorization-code  # 使用授权码
```

### 163 邮箱
```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@163.com
SMTP_PASS=your-authorization-code
```

### 企业邮箱
```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=mail.yourcompany.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@yourcompany.com
SMTP_PASS=your-password
```

## 🔧 **高级配置**

### SMTP 安全选项
```bash
# TLS 配置
SMTP_TLS_REJECT_UNAUTHORIZED=true  # 严格 TLS 验证
SMTP_TLS_REJECT_UNAUTHORIZED=false # 宽松 TLS 验证（用于自签名证书）

# 端口选择
SMTP_PORT=25   # 标准 SMTP（不推荐）
SMTP_PORT=587  # STARTTLS（推荐）
SMTP_PORT=465  # SSL/TLS
```

### 开发模式
```bash
# 不配置任何邮件服务，邮件将输出到控制台
# EMAIL_PROVIDER=  # 留空或不设置
```

## 🧪 **测试邮件发送**

### 1. 使用测试脚本
```bash
node scripts/test-email.js
```

### 2. 检查配置
```bash
# 查看当前邮件配置
curl http://localhost:3000/api/debug/email-config
```

### 3. 发送测试邮件
```bash
# 注册测试账户
# 或使用忘记密码功能
```

## 🚨 **故障排除**

### 常见问题

#### 1. **SMTP 连接失败**
```
Error: connect ECONNREFUSED
```
**解决方案：**
- 检查 SMTP_HOST 和 SMTP_PORT
- 确认网络连接
- 检查防火墙设置

#### 2. **认证失败**
```
Error: Invalid login
```
**解决方案：**
- 检查用户名和密码
- 使用应用专用密码（Gmail）
- 启用"不够安全的应用访问"

#### 3. **TLS 错误**
```
Error: self signed certificate
```
**解决方案：**
```bash
SMTP_TLS_REJECT_UNAUTHORIZED=false
```

#### 4. **邮件进入垃圾箱**
**解决方案：**
- 配置 SPF、DKIM、DMARC 记录
- 使用已验证的域名
- 避免垃圾邮件关键词

## 📊 **性能对比**

| 特性 | Resend | SMTP |
|------|--------|------|
| 配置难度 | 简单 | 中等 |
| 送达率 | 高 | 取决于服务商 |
| 成本 | 免费额度 | 取决于服务商 |
| 监控 | 内置 | 需自建 |
| 企业支持 | 优秀 | 取决于服务商 |

## 🎯 **推荐方案**

### 开发环境
- 使用开发模式（控制台输出）
- 或 Resend 测试域名

### 生产环境
- **小型项目**：Resend
- **企业项目**：企业 SMTP
- **高发送量**：专业邮件服务

## 🔄 **迁移指南**

### 从 Resend 迁移到 SMTP
1. 安装 nodemailer 依赖
2. 更新环境变量
3. 重启应用
4. 测试邮件发送

### 从 SMTP 迁移到 Resend
1. 注册 Resend 账户
2. 获取 API Key
3. 更新环境变量
4. 重启应用

现在您可以根据需要选择最适合的邮件服务方案！🚀
