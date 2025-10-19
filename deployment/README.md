# SnapFit AI 部署指南

本目录包含 SnapFit AI 的部署配置和相关文件。

## 📁 目录结构

```
deployment/
├── README.md                    # 本文件 - 部署指南
├── database/                    # 数据库相关文件
│   ├── current_database_schema.sql     # 当前数据库结构
│   ├── current_database_data.sql       # 当前数据库数据
│   ├── empty_database_schema.sql       # 空数据库结构（推荐）
│   └── schema_backup.sql              # 备份文件
├── docker-full/                 # Docker 完整部署（推荐）
│   ├── README.md               # Docker 完整部署详细说明
│   ├── docker-compose.yml      # Docker Compose 配置
│   ├── .env                    # 环境变量配置
│   ├── .env.example           # 环境变量模板
│   └── quick-start.bat        # Windows 快速启动脚本
└── docker-single/              # Docker 单容器部署
    ├── README.md               # Docker 单容器部署详细说明
    ├── docker-compose.yml      # Docker Compose 配置
    ├── Dockerfile              # Docker 镜像构建文件
    ├── .env                    # 环境变量配置
    ├── .env.example           # 环境变量模板
    └── quick-start.bat        # Windows 快速启动脚本
```

## 🚀 部署方式选择

### 方式1：Docker 完整部署（推荐新用户）

这是最简单、最可靠的部署方式，包含：

- ✅ SnapFit AI 应用
- ✅ PostgreSQL 数据库 (Supabase/pgsql 17.4.1.043)
- ✅ 空数据库初始化
- ✅ 数据持久化
- ✅ 健康检查和自动重启

**快速开始：**

```bash
# 1. 进入 Docker 完整部署目录
cd deployment/docker-full

# 2. 复制并编辑环境配置
cp .env.example .env
nano .env  # 修改密码和密钥

# 3. 启动服务
docker-compose up -d

# 4. 访问应用
# http://localhost:3000
```

详细说明请查看：[docker-full/README.md](docker-full/README.md)

### 方式2：Docker 单容器部署（推荐有 Supabase 的用户）

轻量级部署方式，适合已有 Supabase 项目的用户：

- ✅ 只需一个应用容器
- ✅ 连接外部 Supabase 数据库
- ✅ 快速启动（30秒）
- ✅ 资源消耗少
- ✅ 适合云环境部署

**快速开始：**

```bash
# 1. 进入 Docker 单容器部署目录
cd deployment/docker-single

# 2. 复制并编辑环境配置
cp .env.example .env
nano .env  # 配置 Supabase 连接信息

# 3. 启动服务
docker-compose up -d

# 4. 访问应用
# http://localhost:3000
```

详细说明请查看：[docker-single/README.md](docker-single/README.md)

## 📊 数据库文件说明

| 文件                            | 用途           | 推荐使用  |
| ------------------------------- | -------------- | --------- |
| `empty_database_schema.sql`   | 空数据库结构   | ✅ 新部署 |
| `current_database_schema.sql` | 完整数据库结构 | 📋 参考   |
| `current_database_data.sql`   | 数据库数据     | 💾 备份   |
| `schema_backup.sql`           | 备份文件       | 🔄 恢复   |

### 空数据库的优势

- ✅ **干净启动** - 没有测试数据
- ✅ **安全性** - 不包含敏感信息
- ✅ **一致性** - 标准化的初始状态
- ✅ **可重复** - 每次部署都是相同的起点

## 🔧 环境配置

### 必须配置的项目

1. **数据库密码**

   ```env
   POSTGRES_PASSWORD=your_secure_password
   ```
2. **应用密钥**

   ```env
   NEXTAUTH_SECRET=your_nextauth_secret
   KEY_ENCRYPTION_SECRET=your_encryption_secret
   ```
3. **OAuth配置**（可选）

   ```env
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   ```

### 生成安全密钥

```bash
# 方法1: 使用 OpenSSL
openssl rand -base64 32

# 方法2: 使用在线生成器
# https://passwordsgenerator.net/

# 方法3: 使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 🛠️ 部署后配置

### 1. 创建管理员账户

访问应用并注册第一个账户，该账户将自动成为管理员。

### 2. 配置共享密钥

在管理界面中添加 AI API 密钥供用户使用。

### 3. 设置邀请码

配置用户注册的邀请码系统。

## 📋 部署检查清单

- [ ] 修改所有默认密码和密钥
- [ ] 配置 OAuth（如果需要）
- [ ] 配置邮件服务（如果需要）
- [ ] 测试应用访问
- [ ] 测试用户注册和登录
- [ ] 验证数据库连接
- [ ] 检查日志输出

## 🔒 安全建议

### 生产环境

- ✅ 使用强密码和随机密钥
- ✅ 启用 HTTPS
- ✅ 配置防火墙
- ✅ 定期备份数据库
- ✅ 监控日志和性能
- ✅ 定期更新镜像

### 网络安全

- ✅ 数据库不暴露外部端口
- ✅ 使用内部 Docker 网络
- ✅ API 限流和权限验证

## 📞 故障排除

### 常见问题

1. **容器启动失败**

   ```bash
   # 查看日志
   docker-compose logs -f

   # 检查配置
   docker-compose config
   ```
2. **数据库连接失败**

   ```bash
   # 检查数据库状态
   docker-compose ps

   # 查看数据库日志
   docker-compose logs postgres
   ```
3. **端口冲突**

   ```bash
   # 检查端口占用
   netstat -tlnp | grep :3000

   # 修改端口配置
   # 在 .env 中设置 APP_PORT=3001
   ```

### 获取帮助

- 📖 查看详细文档：`docker-full/README.md`
- 🔍 检查日志：`docker-compose logs`
- 💬 提交 Issue：项目 GitHub 页面

## 🆚 部署方式对比

| 特性                     | docker-full             | docker-single  | 开发环境   |
| ------------------------ | ----------------------- | -------------- | ---------- |
| **容器数量**       | 2个                     | 1个            | 0个        |
| **数据库**         | 内置Supabase PostgreSQL | 外部Supabase   | 外部数据库 |
| **PostgreSQL版本** | 17.4.1.043              | -              | 变化       |
| **内存使用**       | ~2.5GB                  | ~1GB           | ~500MB     |
| **启动时间**       | 2-3分钟                 | 30秒           | 10秒       |
| **数据持久化**     | Docker卷                | Supabase云端   | 外部数据库 |
| **适用场景**       | 完全隔离部署            | 云环境部署     | 开发调试   |
| **推荐用户**       | 新用户/自建             | 有Supabase用户 | 开发者     |

## 🎯 下一步

1. **选择部署方式**：根据上述对比选择适合的部署方式
2. **完成部署**：按照对应的步骤完成部署
3. **配置应用**：设置管理员账户和基本配置
4. **测试功能**：验证所有功能正常工作
5. **生产优化**：根据需要配置 HTTPS、域名等

---

## 🌍 版本选择与环境变量矩阵（重要）

本项目支持三种形态，通过环境变量切换：

### A. 个人体验版（浏览器 IndexedDB）
- 用途：纯前端本地使用，无需服务端数据库与登录
- 变量（.env/.env.local）：
  - `NEXT_PUBLIC_VERSION=personal`
  - `PERSONAL_DB_MODE=indexeddb`
- 行为：中间件会统一拦截所有 `/api/*` 请求并返回 405，页面将提示“此版本无需登录，可直接在本地使用”。
- 部署建议：本形态更适合本地开发/静态体验；如需服务器部署，建议改用社区版或 L站版。

### B. 个人版（SQLite）
- 用途：单机运行，数据落地到 SQLite 文件
- 变量：
  - `NEXT_PUBLIC_VERSION=personal`
  - `PERSONAL_DB_MODE=sqlite`
  - `SQLITE_FILE=./data/personal.sqlite3`（可选，默认该路径）
- 依赖：
  - 安装 `better-sqlite3`：`npm i better-sqlite3`
- 初始化与数据迁移：
  - 初始化：`node scripts/sqlite-init.js`
  - 导出：`node scripts/sqlite-export.js [输出文件]`
  - 导入：`node scripts/sqlite-import.js <输入文件> [--clear]`

### C. 社区版（PostgreSQL/Supabase）
- 用途：多用户、全量功能
- 变量：
  - `NEXT_PUBLIC_VERSION=community`
  - `DB_PROVIDER=postgresql | supabase`
  - 当 `DB_PROVIDER=supabase` 时必须：
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `SUPABASE_SERVICE_ROLE_KEY`

### D. L站社区版（Supabase/特化 PG，仅限 L站 OAuth）
- 用途：在 L站社区环境使用，仅允许 L站 OAuth 登录
- 变量：
  - `NEXT_PUBLIC_VERSION=linuxdo`
  - OAuth2 二选一（任选一套命名）：
    - `OAUTH_CLIENT_ID` / `OAUTH_CLIENT_SECRET`
    - `OAUTH_AUTH_URL` / `OAUTH_TOKEN_URL` / `OAUTH_USER_INFO_URL`
    - `OAUTH_SCOPES=user:profile`
    - 或同义命名：`LINUXDO_CLIENT_ID` / `LINUXDO_CLIENT_SECRET` / `LINUXDO_AUTH_URL` / `LINUXDO_TOKEN_URL` / `LINUXDO_USER_INFO_URL` / `LINUXDO_SCOPES`
  - 若有 OIDC：
    - `LINUXDO_ISSUER` 或 `LINUXDO_WELL_KNOWN_URL`

> 提示：根目录 `.env.example` 已包含核心变量模板，可复制为 `.env.local` 后按版本进行增删。

### Docker 环境变量示例（docker-single）

Supabase 形态：
```
NEXT_PUBLIC_VERSION=community
DB_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxx
SUPABASE_SERVICE_ROLE_KEY=xxxx
NEXTAUTH_SECRET=xxxx
KEY_ENCRYPTION_SECRET=xxxx
```

L站形态（仅 L站 OAuth）：
```
NEXT_PUBLIC_VERSION=linuxdo
DB_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxx
SUPABASE_SERVICE_ROLE_KEY=xxxx

OAUTH_CLIENT_ID=your_client_id
OAUTH_CLIENT_SECRET=your_client_secret
OAUTH_AUTH_URL=https://connect.linux.do/oauth2/authorize
OAUTH_TOKEN_URL=https://connect.linux.do/oauth2/token
OAUTH_USER_INFO_URL=https://connect.linux.do/api/user
OAUTH_SCOPES=user:profile

NEXTAUTH_SECRET=xxxx
KEY_ENCRYPTION_SECRET=xxxx
```

个人版（SQLite，本机或容器内）示例：
```
NEXT_PUBLIC_VERSION=personal
PERSONAL_DB_MODE=sqlite
SQLITE_FILE=/data/personal.sqlite3
NEXTAUTH_SECRET=xxxx
KEY_ENCRYPTION_SECRET=xxxx
```

开始您的 SnapFit AI 部署之旅！🚀
