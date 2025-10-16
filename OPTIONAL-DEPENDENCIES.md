# 📦 可选依赖说明

SnapFit AI 支持多种邮件服务提供商，某些功能需要安装额外的依赖包。

## 📧 邮件服务依赖

### Resend（默认，已包含）
- ✅ **已安装**：`resend` 包已包含在项目中
- ✅ **即开即用**：无需额外安装
- ✅ **推荐使用**：简单易用，高送达率

### SMTP（可选）
- ⚠️ **需要安装**：使用 SMTP 服务需要安装 `nodemailer`
- 🔧 **安装命令**：`pnpm add nodemailer`
- 📚 **配置指南**：参见 [docs/SMTP-SETUP.md](docs/SMTP-SETUP.md)

## 🚀 安装可选依赖

### 如果您想使用 SMTP 邮件服务：

```bash
# 安装 nodemailer
pnpm add nodemailer

# 配置环境变量
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 如果您只使用 Resend：

```bash
# 无需额外安装，直接配置
EMAIL_PROVIDER=resend
RESEND_API_KEY=your_resend_api_key
```

## 🔍 检查当前配置

您可以通过以下方式检查当前的邮件配置：

```bash
# 查看邮件配置状态
curl http://localhost:3000/api/debug/email-config

# 测试邮件发送
node scripts/test-email.js
```

## 📋 功能对比

| 功能 | Resend | SMTP |
|------|--------|------|
| 安装复杂度 | 简单 | 中等 |
| 额外依赖 | 无 | nodemailer |
| 配置难度 | 简单 | 中等 |
| 成本 | 免费额度 | 取决于服务商 |
| 送达率 | 高 | 取决于配置 |
| 企业支持 | 良好 | 优秀 |

## 🎯 推荐方案

### 个人项目/小型团队
- 推荐使用 **Resend**
- 无需额外安装
- 配置简单，送达率高

### 企业项目/大型团队
- 可选择 **SMTP**
- 支持企业邮件系统
- 更高的自主控制权

### 成本敏感项目
- 可选择 **SMTP** + 免费邮件服务
- 如 Gmail、Outlook 等

## 🚨 注意事项

1. **构建错误**：如果您看到 `Module not found: Can't resolve 'nodemailer'` 错误，这是正常的。只有在您选择使用 SMTP 时才需要安装 nodemailer。

2. **运行时检查**：应用会在运行时检查 nodemailer 是否可用，如果不可用会自动降级到开发模式（控制台输出）。

3. **环境变量**：确保根据选择的邮件服务正确配置环境变量。

## 📚 相关文档

- [📧 邮件服务提供商配置指南](docs/EMAIL-PROVIDERS.md)
- [📨 SMTP 配置详细指南](docs/SMTP-SETUP.md)
- [🔧 邮件服务设置](docs/EMAIL_SETUP.md)
- [🌐 域名配置指南](docs/DOMAIN_SETUP.md)

选择最适合您需求的邮件服务方案，享受灵活的配置体验！🚀
