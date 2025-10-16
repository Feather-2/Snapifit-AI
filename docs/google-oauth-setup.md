# Google OAuth 配置指南

## 📋 概述

本指南将帮助您配置 Google OAuth 登录功能，让用户可以使用 Google 账号登录 SnapFit AI。

## 🚀 快速开始

### 1. Google Cloud Console 配置

#### 1.1 创建项目
1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 点击项目选择器，创建新项目或选择现有项目
3. 项目名称建议：`SnapFit AI` 或您的应用名称

#### 1.2 启用 Google+ API
1. 在左侧菜单中，点击 **API 和服务** > **库**
2. 搜索 "Google+ API" 或 "People API"
3. 点击启用

#### 1.3 创建 OAuth 2.0 凭据
1. 在左侧菜单中，点击 **API 和服务** > **凭据**
2. 点击 **创建凭据** > **OAuth 2.0 客户端 ID**
3. 如果是首次创建，需要先配置 OAuth 同意屏幕

#### 1.4 配置 OAuth 同意屏幕
1. 选择 **外部** 用户类型（除非您有 Google Workspace）
2. 填写应用信息：
   - **应用名称**: `SnapFit AI`
   - **用户支持电子邮件**: 您的邮箱
   - **应用徽标**: 可选，上传您的应用图标
   - **应用首页**: `https://yourdomain.com`
   - **应用隐私政策链接**: `https://yourdomain.com/privacy`
   - **应用服务条款链接**: `https://yourdomain.com/terms`
3. 作用域配置：
   - 添加 `email`
   - 添加 `profile`
   - 添加 `openid`
4. 测试用户：添加您的测试邮箱地址

#### 1.5 创建 OAuth 客户端
1. 返回凭据页面，点击 **创建凭据** > **OAuth 2.0 客户端 ID**
2. 应用类型选择 **Web 应用**
3. 名称：`SnapFit AI Web Client`
4. 授权的重定向 URI：
   ```
   http://localhost:3000/api/auth/callback/google
   https://yourdomain.com/api/auth/callback/google
   ```
5. 点击创建

#### 1.6 获取凭据
创建完成后，您将获得：
- **客户端 ID**: `xxxxx.apps.googleusercontent.com`
- **客户端密钥**: `GOCSPX-xxxxx`

### 2. 环境变量配置

将获得的凭据添加到您的 `.env.local` 文件：

```bash
# Google OAuth 配置
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_google_client_secret

# 确保 NextAuth URL 正确
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
```

### 3. 验证配置

#### 3.1 检查环境变量
确保以下环境变量已正确设置：
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`

#### 3.2 测试登录流程
1. 启动应用：`pnpm dev`
2. 访问登录页面：`http://localhost:3000/signin`
3. 点击 "使用 Google 登录" 按钮
4. 完成 Google OAuth 授权流程
5. 验证用户信息是否正确保存

## 🔧 高级配置

### 域名验证
如果您使用自定义域名，需要在 Google Cloud Console 中验证域名所有权：

1. 在 Google Cloud Console 中，转到 **API 和服务** > **域名验证**
2. 添加您的域名
3. 按照指示完成验证（通常是添加 DNS 记录或上传 HTML 文件）

### 生产环境配置
1. 更新 OAuth 同意屏幕状态为 "发布"
2. 添加生产环境的重定向 URI
3. 更新环境变量中的 `NEXTAUTH_URL`

## 🚨 常见问题

### 1. "redirect_uri_mismatch" 错误
**原因**: 重定向 URI 不匹配
**解决方案**:
- 检查 Google Cloud Console 中配置的重定向 URI
- 确保 URI 完全匹配，包括协议（http/https）和端口号

### 2. "invalid_client" 错误
**原因**: 客户端 ID 或密钥错误
**解决方案**:
- 检查环境变量中的 `GOOGLE_CLIENT_ID` 和 `GOOGLE_CLIENT_SECRET`
- 确保没有多余的空格或换行符

### 3. "access_denied" 错误
**原因**: 用户拒绝授权或应用未通过审核
**解决方案**:
- 确保 OAuth 同意屏幕配置正确
- 检查应用是否需要 Google 审核

### 4. 用户信息不完整
**原因**: 权限范围不足
**解决方案**:
- 确保在 OAuth 同意屏幕中添加了 `email` 和 `profile` 权限

## 📞 技术支持

如果遇到问题，请检查：
1. 浏览器开发者工具的控制台错误
2. 服务器日志中的错误信息
3. Google Cloud Console 中的 API 使用情况

## ✅ 部署检查清单

### 开发环境
- [ ] Google Cloud Console 项目已创建
- [ ] OAuth 2.0 客户端已配置
- [ ] 重定向 URI 包含 `http://localhost:3000/api/auth/callback/google`
- [ ] 环境变量 `GOOGLE_CLIENT_ID` 已设置
- [ ] 环境变量 `GOOGLE_CLIENT_SECRET` 已设置
- [ ] 环境变量 `NEXTAUTH_URL` 已设置
- [ ] 环境变量 `NEXTAUTH_SECRET` 已设置
- [ ] 测试页面 `/debug/oauth-test` 可正常访问
- [ ] Google 登录流程测试通过

### 生产环境
- [ ] OAuth 同意屏幕状态设为 "发布"
- [ ] 重定向 URI 包含生产环境域名
- [ ] 生产环境环境变量已正确配置
- [ ] 域名已在 Google Cloud Console 中验证
- [ ] SSL 证书已正确配置
- [ ] 生产环境登录测试通过

## 🔗 相关链接

- [Google Cloud Console](https://console.cloud.google.com/)
- [Google OAuth 2.0 文档](https://developers.google.com/identity/protocols/oauth2)
- [NextAuth.js Google Provider 文档](https://next-auth.js.org/providers/google)
- [OAuth 测试页面](/debug/oauth-test)
