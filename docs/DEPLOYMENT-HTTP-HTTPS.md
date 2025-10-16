# 🌐 SnapFit AI HTTP/HTTPS 部署指南

本文档详细说明如何在HTTP和HTTPS环境下部署SnapFit AI，以及相关的安全配置。

## 📋 部署类型对比

| 特性 | HTTP部署 | HTTPS部署 |
|------|----------|-----------|
| **适用场景** | 开发/测试环境 | 生产环境 |
| **安全级别** | 基础 | 高 |
| **SSL证书** | 不需要 | 需要 |
| **Cookie安全** | 非安全Cookie | 安全Cookie |
| **CSP策略** | 宽松 | 严格 |
| **HSTS** | 禁用 | 启用 |
| **部署复杂度** | 简单 | 中等 |

## 🔧 环境变量配置

### HTTP部署配置

```bash
# 部署类型
DEPLOYMENT_TYPE=http

# 强制HTTPS（设置为false）
FORCE_HTTPS=false

# 数据库SSL（本地开发通常为false）
DB_SSL=false

# 认证URL（使用http://）
NEXTAUTH_URL=http://localhost:3000
```

### HTTPS部署配置

```bash
# 部署类型
DEPLOYMENT_TYPE=https

# 强制HTTPS（设置为true）
FORCE_HTTPS=true

# 数据库SSL（生产环境建议为true）
DB_SSL=true

# 认证URL（使用https://）
NEXTAUTH_URL=https://yourdomain.com
```

## 🐳 Docker部署

### 1. HTTP部署（开发/测试）

```bash
# 1. 进入部署目录
cd deployment/docker-full  # 或 docker-single

# 2. 复制环境配置
cp .env.example .env

# 3. 编辑配置文件
nano .env

# 4. 设置HTTP配置
DEPLOYMENT_TYPE=http
FORCE_HTTPS=false
DB_SSL=false
NEXTAUTH_URL=http://localhost:38000

# 5. 启动服务
docker-compose up -d

# 6. 访问应用
curl http://localhost:38000/api/health
```

### 2. HTTPS部署（生产环境）

```bash
# 1. 准备SSL证书
# 方法1: Let's Encrypt
sudo certbot certonly --standalone -d yourdomain.com

# 方法2: 自签名证书（仅测试）
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/private.key -out ssl/certificate.crt

# 2. 配置环境变量
DEPLOYMENT_TYPE=https
FORCE_HTTPS=true
DB_SSL=true
NEXTAUTH_URL=https://yourdomain.com

# 3. 配置反向代理（Nginx示例）
# 见下方Nginx配置

# 4. 启动服务
docker-compose up -d
```

## 🔒 安全配置详解

### 自动安全策略调整

项目会根据`FORCE_HTTPS`环境变量自动调整安全策略：

#### HTTP模式 (`FORCE_HTTPS=false`)
- ❌ 禁用HSTS头
- ❌ 禁用CSP的`upgrade-insecure-requests`
- ❌ 禁用安全Cookie
- ✅ 允许HTTP连接

#### HTTPS模式 (`FORCE_HTTPS=true`)
- ✅ 启用HSTS头
- ✅ 启用CSP的`upgrade-insecure-requests`
- ✅ 启用安全Cookie
- ✅ 强制HTTPS连接

### 安全头对比

| 安全头 | HTTP模式 | HTTPS模式 |
|--------|----------|-----------|
| `Strict-Transport-Security` | 不设置 | `max-age=31536000; includeSubDomains; preload` |
| `Content-Security-Policy` | 无`upgrade-insecure-requests` | 包含`upgrade-insecure-requests` |
| Cookie `Secure` 标志 | `false` | `true` |

## 🌐 反向代理配置

### Nginx配置示例

#### HTTP配置
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### HTTPS配置
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

## 🔍 部署检测工具

使用内置的部署检测脚本：

```bash
# 运行部署检测
node scripts/deployment-check.js

# 输出示例
🔍 SnapFit AI 部署环境检测
==================================================

📋 环境信息检测
------------------------------
环境类型: 生产环境
容器环境: Docker
HTTPS配置: 已配置
认证URL: https://yourdomain.com
部署类型: https

🔒 安全配置检查
------------------------------
✅ NEXTAUTH_SECRET 配置
✅ KEY_ENCRYPTION_SECRET 配置
✅ HTTPS配置一致性
✅ 生产环境HTTPS

📊 安全评分
------------------------------
安全评分: 4/4 (100%)
✅ 安全配置良好，可以部署
```

## 🚀 快速部署命令

### HTTP开发环境
```bash
# 设置环境变量
export DEPLOYMENT_TYPE=http
export FORCE_HTTPS=false
export NEXTAUTH_URL=http://localhost:3000

# 启动服务
make dev
# 或
docker-compose -f deployment/docker-full/docker-compose.yml up -d
```

### HTTPS生产环境
```bash
# 设置环境变量
export DEPLOYMENT_TYPE=https
export FORCE_HTTPS=true
export NEXTAUTH_URL=https://yourdomain.com

# 启动服务
make prod
# 或
docker-compose -f deployment/docker-full/docker-compose.yml up -d
```

## ⚠️ 注意事项

### HTTP部署注意事项
1. **仅用于开发/测试环境**
2. **数据传输不加密**
3. **某些浏览器功能可能受限**
4. **不适合生产环境**

### HTTPS部署注意事项
1. **需要有效的SSL证书**
2. **配置反向代理**
3. **确保所有外部资源使用HTTPS**
4. **定期更新SSL证书**

### 数据库SSL配置
- **本地开发**: `DB_SSL=false`
- **Supabase**: `DB_SSL=true`（推荐）
- **自建PostgreSQL**: 根据SSL配置决定

## 🔧 故障排除

### 常见问题

#### 1. HTTPS重定向循环
```bash
# 检查FORCE_HTTPS设置
echo $FORCE_HTTPS

# 确保反向代理正确设置X-Forwarded-Proto
proxy_set_header X-Forwarded-Proto $scheme;
```

#### 2. Cookie无法设置
```bash
# HTTP环境下确保禁用安全Cookie
FORCE_HTTPS=false
```

#### 3. CSP阻止资源加载
```bash
# 检查CSP配置
curl -I http://localhost:3000 | grep Content-Security-Policy
```

#### 4. 数据库连接失败
```bash
# 检查数据库SSL配置
DB_SSL=false  # 本地开发
DB_SSL=true   # 生产环境
```

## 📚 相关文档

- [Docker部署指南](../deployment/docker-full/README.md)
- [安全配置清单](./SECURITY-CHECKLIST.md)
- [环境变量说明](../.env.example)
- [故障排除指南](./TROUBLESHOOTING.md)
