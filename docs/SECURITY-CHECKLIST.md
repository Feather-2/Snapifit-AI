# 🔒 SnapFit AI 安全部署清单

## 部署前必检项目

### 1. 环境变量安全 ✅
- [ ] `NEXTAUTH_SECRET` 至少32字符，使用强随机字符串
- [ ] `KEY_ENCRYPTION_SECRET` 至少32字符，用于API密钥加密
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 保密，仅服务端使用
- [ ] 所有密钥都不是示例值（不包含 `your_`, `example`, `changeme`）
- [ ] 生产环境 `NEXTAUTH_URL` 使用 HTTPS

### 2. 数据库安全 ✅
- [ ] 数据库连接启用 SSL/TLS
- [ ] 数据库密码强度足够（至少12字符，包含大小写字母、数字、特殊字符）
- [ ] 数据库用户权限最小化（仅必要的表和操作权限）
- [ ] 定期备份数据库
- [ ] 启用数据库审计日志

### 3. 身份验证与授权 ✅
- [ ] 强制密码策略（最少8字符）
- [ ] 会话超时设置合理（30天）
- [ ] 启用多因素认证（如果支持）
- [ ] 管理员账户使用强密码
- [ ] 定期审查用户权限

### 4. API 安全 ✅
- [ ] 所有 API 端点都有适当的身份验证
- [ ] 实施速率限制防止滥用
- [ ] 输入验证和清理
- [ ] 输出编码防止 XSS
- [ ] CORS 配置正确
- [ ] API 密钥加密存储

### 5. 网络安全 ✅
- [ ] 强制 HTTPS（生产环境）
- [ ] 安全头配置（CSP, HSTS, X-Frame-Options 等）
- [ ] 禁用不必要的 HTTP 方法
- [ ] 配置防火墙规则
- [ ] DDoS 保护

### 6. 数据保护 ✅
- [ ] 敏感数据加密存储
- [ ] 传输中数据加密（HTTPS/TLS）
- [ ] 个人信息匿名化处理
- [ ] 数据备份加密
- [ ] 符合数据保护法规（GDPR, CCPA 等）

### 7. 监控与日志 ✅
- [ ] 启用安全事件日志
- [ ] 监控异常登录尝试
- [ ] 设置安全告警
- [ ] 定期审查访问日志
- [ ] 错误日志不包含敏感信息

### 8. 代码安全 ✅
- [ ] 依赖包安全扫描
- [ ] 移除调试代码和注释
- [ ] 禁用生产环境调试模式
- [ ] 源码映射禁用
- [ ] 敏感信息不在代码中硬编码

### 9. 服务器安全 ✅
- [ ] 操作系统和软件保持最新
- [ ] 禁用不必要的服务
- [ ] 配置防火墙
- [ ] 定期安全扫描
- [ ] 访问控制和权限管理

### 10. 备份与恢复 ✅
- [ ] 定期数据备份
- [ ] 备份数据加密
- [ ] 测试恢复流程
- [ ] 灾难恢复计划
- [ ] 备份存储在安全位置

## 安全检查命令

```bash
# 运行完整安全检查
pnpm security-check

# 检查环境变量
pnpm check-env

# 部署前检查
pnpm pre-deploy

# 测试数据库连接
pnpm test-db
```

## 生产环境配置示例

### 环境变量 (.env.production)
```bash
# 数据库
DB_PROVIDER=postgresql
DATABASE_URL=postgresql://user:strong_password@host:5432/db?sslmode=require

# 认证
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your_very_secure_32_character_secret_key_here

# 加密
KEY_ENCRYPTION_SECRET=another_very_secure_32_character_encryption_key

# OAuth (可选)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# 邮件
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=noreply@yourdomain.com

# 管理员
ADMIN_USER_IDS=admin_user_id_1,admin_user_id_2
```

### Nginx 配置示例
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL 配置
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

    # 安全头
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # 代理到 Next.js 应用
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 限制请求大小
    client_max_body_size 10M;

    # 速率限制
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
}
```

## 安全事件响应

### 发现安全问题时的步骤：
1. **立即评估** - 确定问题的严重性和影响范围
2. **隔离威胁** - 阻止进一步的损害
3. **收集证据** - 保存日志和相关信息
4. **修复漏洞** - 应用安全补丁或配置更改
5. **监控** - 持续监控是否有进一步的威胁
6. **文档记录** - 记录事件和响应措施
7. **事后分析** - 分析原因并改进安全措施

### 紧急联系信息
- 系统管理员：[联系方式]
- 安全团队：[联系方式]
- 云服务提供商支持：[联系方式]

## 定期安全维护

### 每周
- [ ] 检查安全日志
- [ ] 更新依赖包
- [ ] 监控系统性能

### 每月
- [ ] 安全扫描
- [ ] 备份测试
- [ ] 权限审查

### 每季度
- [ ] 安全策略审查
- [ ] 灾难恢复演练
- [ ] 安全培训

### 每年
- [ ] 全面安全审计
- [ ] 渗透测试
- [ ] 安全策略更新

---

**注意**: 这个清单应该根据具体的部署环境和安全要求进行调整。定期更新和审查这个清单以确保它反映最新的安全最佳实践。
