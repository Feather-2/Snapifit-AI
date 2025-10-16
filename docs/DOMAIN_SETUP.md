# 自定义域名配置指南

配置自定义域名可以提高邮件送达率、增强品牌形象，并避免被标记为垃圾邮件。

## 🎯 为什么要配置自定义域名？

### 优势

1. **提高送达率** - 自定义域名比共享域名有更好的信誉
2. **品牌一致性** - 使用您自己的域名发送邮件
3. **避免限制** - 不受共享域名的发送限制影响
4. **专业形象** - `noreply@yourcompany.com` 比 `noreply@resend.dev` 更专业

### 要求

- 您必须拥有一个域名
- 能够修改域名的 DNS 记录
- 域名状态正常（未被封禁）

## 📋 配置步骤

### 第一步：在 Resend 添加域名

1. **登录 Resend 控制台**
   ```
   https://resend.com/domains
   ```

2. **点击 "Add Domain"**

3. **填写域名信息**
   - **Name**: `yourdomain.com` (您的域名)
   - **Region**: 选择合适的地区
     - `us-east-1` - 美国东部（推荐，速度快）
     - `eu-west-1` - 欧洲西部
     - `ap-southeast-1` - 亚太地区

### 第二步：配置 DNS 记录

Resend 会提供需要添加的 DNS 记录，通常包括：

#### 1. SPF 记录 (必需)
```
类型: TXT
名称: @ (或根域名)
值: v=spf1 include:_spf.resend.com ~all
TTL: 3600
```

#### 2. DKIM 记录 (必需)
```
类型: CNAME
名称: resend._domainkey
值: resend._domainkey.resend.com
TTL: 3600
```

#### 3. DMARC 记录 (推荐)
```
类型: TXT
名称: _dmarc
值: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
TTL: 3600
```

### 第三步：各大域名服务商配置示例

#### 阿里云

1. 登录阿里云控制台
2. 进入 "域名" → "域名解析"
3. 选择您的域名，点击 "解析设置"
4. 添加记录：

```
记录类型: TXT
主机记录: @
记录值: v=spf1 include:_spf.resend.com ~all
TTL: 600

记录类型: CNAME
主机记录: resend._domainkey
记录值: resend._domainkey.resend.com
TTL: 600
```

#### 腾讯云

1. 登录腾讯云控制台
2. 进入 "域名注册" → "我的域名"
3. 点击域名后的 "解析"
4. 添加记录（格式同上）

#### Cloudflare

1. 登录 Cloudflare 控制台
2. 选择您的域名
3. 进入 "DNS" 标签页
4. 添加记录：

```
Type: TXT
Name: @
Content: v=spf1 include:_spf.resend.com ~all
Proxy status: DNS only (灰色云朵)

Type: CNAME
Name: resend._domainkey
Target: resend._domainkey.resend.com
Proxy status: DNS only (灰色云朵)
```

#### GoDaddy

1. 登录 GoDaddy 账户
2. 进入 "我的产品" → "DNS"
3. 选择域名，点击 "管理 DNS"
4. 添加记录（格式同阿里云）

### 第四步：验证域名

1. **等待 DNS 传播**
   - 通常需要 5-30 分钟
   - 可以使用工具检查：`nslookup -type=txt yourdomain.com`

2. **在 Resend 控制台验证**
   - 返回 Resend 域名页面
   - 点击您域名旁的 "Verify" 按钮
   - 等待验证完成

3. **确认状态**
   - 所有记录都应该显示 ✅ 绿色对勾
   - 域名状态显示为 "Verified"

## 🔧 更新应用配置

### 环境变量

验证成功后，更新 `.env.local` 文件：

```bash
# 使用您的自定义域名
FROM_EMAIL=noreply@yourdomain.com
# 或者
FROM_EMAIL=support@yourdomain.com
# 或者
FROM_EMAIL=no-reply@yourdomain.com
```

### 常用邮箱前缀

- `noreply@` - 不接收回复的邮件
- `no-reply@` - 同上
- `support@` - 客服邮箱
- `hello@` - 友好的问候邮箱
- `team@` - 团队邮箱
- `info@` - 信息邮箱

## 🧪 测试配置

### 1. 使用测试脚本

```bash
# 测试邮件发送
node scripts/test-email.js
```

### 2. 手动测试

```bash
# 检查 SPF 记录
nslookup -type=txt yourdomain.com

# 检查 DKIM 记录
nslookup -type=cname resend._domainkey.yourdomain.com

# 检查 DMARC 记录
nslookup -type=txt _dmarc.yourdomain.com
```

### 3. 在线工具

- **MXToolbox**: https://mxtoolbox.com/spf.aspx
- **DKIM Validator**: https://dkimvalidator.com/
- **Mail Tester**: https://www.mail-tester.com/

## ⚠️ 常见问题

### DNS 记录未生效

**症状**: Resend 显示记录未找到

**解决方案**:
1. 等待更长时间（最多 48 小时）
2. 检查记录格式是否正确
3. 确认 TTL 设置不要太高
4. 联系域名服务商客服

### 邮件仍进垃圾箱

**可能原因**:
1. 域名信誉度低（新域名）
2. 邮件内容触发垃圾邮件过滤器
3. 缺少 DMARC 记录

**解决方案**:
1. 添加 DMARC 记录
2. 优化邮件内容
3. 逐步建立域名信誉

### 验证失败

**检查清单**:
- [ ] DNS 记录格式正确
- [ ] 记录值完全匹配
- [ ] TTL 设置合理（600-3600）
- [ ] 域名状态正常
- [ ] 等待足够的传播时间

## 🚀 高级配置

### 子域名配置

如果您想使用子域名（如 `mail.yourdomain.com`）：

1. 在 Resend 添加子域名
2. 配置相应的 DNS 记录
3. 使用 `noreply@mail.yourdomain.com`

### 多域名配置

您可以添加多个域名：

1. 为不同的应用使用不同域名
2. 为不同地区使用不同域名
3. 备用域名以防主域名问题

### DMARC 策略

```
# 宽松策略（推荐开始使用）
v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com

# 隔离策略（有一定经验后）
v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com

# 拒绝策略（完全信任后）
v=DMARC1; p=reject; rua=mailto:dmarc@yourdomain.com
```

## 📊 监控和维护

### 定期检查

1. **域名到期时间** - 确保域名不会过期
2. **DNS 记录状态** - 定期验证记录是否正常
3. **邮件送达率** - 监控邮件是否正常送达
4. **DMARC 报告** - 查看 DMARC 报告了解邮件状态

### 故障排除

1. **邮件发送失败** - 检查域名验证状态
2. **送达率下降** - 检查域名信誉度
3. **DNS 记录丢失** - 重新添加记录

配置完成后，您就可以使用专业的自定义域名发送邮件了！
