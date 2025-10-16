# 邮件服务配置指南

本项目支持多种邮件服务提供商，推荐使用 Resend 作为邮件发送服务。

## 推荐方案：Resend

### 为什么选择 Resend？

1. **简单易用** - API 设计现代化，集成简单
2. **免费额度** - 每月 3,000 封邮件免费
3. **高送达率** - 专业的邮件基础设施
4. **开发友好** - 优秀的 TypeScript 支持
5. **实时监控** - 提供详细的发送统计和日志

### 配置步骤

#### 1. 注册 Resend 账户

访问 [resend.com](https://resend.com) 注册账户

#### 2. 获取 API Key

1. 登录 Resend 控制台
2. 进入 "API Keys" 页面
3. 点击 "Create API Key"
4. 选择权限（建议选择 "Sending access"）
5. 复制生成的 API Key

#### 3. 配置域名（可选但推荐）

如果你有自己的域名：

1. 在 Resend 控制台添加域名
2. 按照指引配置 DNS 记录
3. 验证域名所有权

如果没有域名，可以使用 Resend 提供的测试域名。

#### 4. 配置环境变量

在 `.env.local` 文件中添加：

```bash
# Resend 配置
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com  # 或使用 onboarding@resend.dev 进行测试
APP_NAME=Snapifit AI
```

## 其他邮件服务选项

### SendGrid

如果你更喜欢使用 SendGrid：

1. 注册 SendGrid 账户
2. 获取 API Key
3. 修改 `lib/email/email-service.ts` 使用 SendGrid SDK

### SMTP 服务

支持任何 SMTP 服务（Gmail、Outlook、自建邮件服务器等）：

1. 安装 nodemailer: `pnpm add nodemailer @types/nodemailer`
2. 修改邮件服务实现

## 开发模式

如果没有配置 `RESEND_API_KEY`，系统会自动进入开发模式：

- 邮件内容会输出到控制台
- 不会实际发送邮件
- 在开发环境下返回验证令牌用于测试

## 邮件模板

系统包含以下邮件模板：

### 1. 邮箱验证邮件
- **触发时机**: 用户注册后
- **内容**: 包含验证链接，24小时有效
- **样式**: 响应式 HTML 模板

### 2. 密码重置邮件
- **触发时机**: 用户请求重置密码
- **内容**: 包含重置链接，1小时有效
- **样式**: 响应式 HTML 模板

## 自定义邮件模板

你可以在 `lib/email/email-service.ts` 中自定义邮件模板：

```typescript
// 修改邮件样式
const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <style>
        /* 你的自定义样式 */
      </style>
    </head>
    <body>
      <!-- 你的邮件内容 -->
    </body>
  </html>
`
```

## 测试邮件发送

### 1. 注册测试

1. 启动开发服务器: `pnpm dev`
2. 访问注册页面
3. 填写测试邮箱注册
4. 检查控制台输出或邮箱

### 2. 密码重置测试

1. 访问忘记密码页面
2. 输入注册的邮箱
3. 检查邮件或控制台输出

## 生产环境配置

### 1. 域名配置

确保配置了正确的域名：

```bash
NEXTAUTH_URL=https://yourdomain.com
FROM_EMAIL=noreply@yourdomain.com
```

### 2. 邮件监控

建议配置邮件发送监控：

- 监控发送成功率
- 设置发送失败告警
- 定期检查邮件队列

### 3. 安全考虑

- 使用环境变量存储 API Key
- 定期轮换 API Key
- 监控异常发送活动
- 配置发送频率限制

## 故障排除

### 常见问题

1. **邮件发送失败**
   - 检查 API Key 是否正确
   - 确认域名配置是否完成
   - 查看 Resend 控制台的错误日志

2. **邮件进入垃圾箱**
   - 配置 SPF、DKIM、DMARC 记录
   - 使用已验证的域名
   - 避免垃圾邮件关键词

3. **开发环境无法发送**
   - 确认环境变量配置正确
   - 检查网络连接
   - 查看控制台错误信息

### 调试技巧

1. 启用详细日志
2. 使用测试邮箱
3. 检查邮件服务商控制台
4. 验证 DNS 配置

## 成本估算

### Resend 定价

- **免费版**: 3,000 封/月
- **Pro 版**: $20/月，50,000 封
- **企业版**: 联系销售

### 使用建议

- 小型项目：免费版足够
- 中型项目：Pro 版性价比高
- 大型项目：考虑企业版或自建

## 支持

如果遇到问题：

1. 查看 [Resend 文档](https://resend.com/docs)
2. 检查项目 GitHub Issues
3. 联系技术支持
