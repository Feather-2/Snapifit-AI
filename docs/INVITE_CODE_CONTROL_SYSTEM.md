# 邀请码严格控制系统

## 🎯 设计目标

实现对邀请码生成的严格控制，避免滥用，确保社区有序增长。

## 📋 控制机制

### 1. **权限控制**
- **仅管理员可创建**: 只有 `admin` 或 `super_admin` 角色的用户可以创建邀请码
- **配置化管理**: 管理员可以为特定用户设置邀请码创建权限

### 2. **时间间隔控制**
- **间隔天数**: 设置用户多少天可以创建一次邀请码批次
- **严格时间检查**: 必须等待指定天数后才能创建下一批
- **下次创建时间**: 系统显示用户下次可以创建的具体时间

### 3. **数量限制**
- **每次数量**: 一次可以创建多少个邀请码
- **累计限制**: 用户总共可以创建的邀请码数量上限
- **双重检查**: 同时检查时间间隔和累计数量

### 4. **配置管理**
- **个性化配置**: 每个用户可以有不同的创建限制
- **默认配置**: 系统提供默认的限制参数
- **管理员控制**: 只有管理员可以修改用户的配置

## 🔧 技术实现

### 数据库结构

#### invite_configs 表
```sql
CREATE TABLE invite_configs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,           -- 用户ID
  interval_days INTEGER NOT NULL,  -- 间隔天数
  codes_per_batch INTEGER NOT NULL, -- 每次创建数量
  max_total_codes INTEGER NOT NULL, -- 最大累计数量
  is_active BOOLEAN NOT NULL,      -- 是否启用
  created_at TIMESTAMP,            -- 创建时间
  updated_at TIMESTAMP,            -- 更新时间
  created_by UUID NOT NULL         -- 配置创建者（管理员）
);
```

#### invite_codes 表更新
```sql
-- 移除 max_uses, current_uses 字段
-- 添加 used_by, used_at 字段
ALTER TABLE invite_codes 
ADD COLUMN used_by UUID REFERENCES users(id),
ADD COLUMN used_at TIMESTAMP;
```

### 核心逻辑

#### 创建权限检查
1. 检查用户是否是管理员
2. 获取用户的邀请码配置
3. 检查时间间隔是否满足
4. 检查累计数量是否超限
5. 计算可创建的数量

#### 时间控制算法
```typescript
// 计算下次允许创建时间
const lastCreatedAt = new Date(user.last_created_at)
const nextAllowedAt = new Date(
  lastCreatedAt.getTime() + config.interval_days * 24 * 60 * 60 * 1000
)

// 检查是否可以创建
const canCreateByTime = now >= nextAllowedAt
```

#### 数量控制算法
```typescript
// 检查累计数量
const canCreateByCount = currentTotal < config.max_total_codes

// 计算本次可创建数量
const availableCount = Math.min(
  config.codes_per_batch,
  config.max_total_codes - currentTotal
)
```

## 🎮 用户体验

### 管理员功能
1. **配置管理页面**: `/admin/invite-configs`
2. **设置用户权限**: 为特定用户配置创建限制
3. **查看所有配置**: 监控系统中的所有邀请码配置
4. **删除配置**: 移除用户的创建权限

### 普通用户体验
1. **权限提示**: 清楚显示是否有创建权限
2. **时间提示**: 显示下次可创建的具体时间
3. **数量显示**: 显示当前累计数量和剩余额度
4. **批量创建**: 一次可创建多个邀请码

## 📊 默认配置

### 系统默认值
- **间隔天数**: 7天
- **每次数量**: 5个
- **最大累计**: 50个

### 环境变量配置
```env
INVITE_DEFAULT_INTERVAL_DAYS=7
INVITE_DEFAULT_CODES_PER_BATCH=5
INVITE_DEFAULT_MAX_TOTAL_CODES=50
INVITE_ADMIN_ONLY_MODE=true
```

## 🔒 安全特性

### 防滥用机制
1. **严格权限检查**: 只有管理员可以操作
2. **时间锁定**: 强制等待间隔时间
3. **数量上限**: 防止无限制创建
4. **审计日志**: 记录所有创建和使用行为

### 数据完整性
1. **唯一约束**: 每个用户只能有一个活跃配置
2. **外键约束**: 确保数据关联正确
3. **事务处理**: 保证操作的原子性

## 🚀 部署步骤

### 1. 数据库迁移
```sql
-- 执行 database/migrations/remove_linux_do_dependency.sql
-- 创建 invite_configs 表和相关索引
```

### 2. 设置管理员
```sql
-- 将用户设置为管理员
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

### 3. 创建默认配置
```sql
-- 为管理员创建邀请码配置
INSERT INTO invite_configs (user_id, interval_days, codes_per_batch, max_total_codes, created_by)
VALUES ('admin_user_id', 7, 5, 50, 'admin_user_id');
```

## 📈 监控和管理

### 管理员工具
1. **配置管理**: 查看和修改所有用户配置
2. **使用统计**: 监控邀请码的创建和使用情况
3. **用户管理**: 控制谁可以创建邀请码

### 系统监控
1. **创建频率**: 监控邀请码创建的频率
2. **使用率**: 跟踪邀请码的使用情况
3. **用户增长**: 分析通过邀请码注册的用户数量

## 🎯 优势

1. **精确控制**: 可以精确控制邀请码的生成频率和数量
2. **防止滥用**: 多重限制机制防止系统被滥用
3. **灵活配置**: 可以为不同用户设置不同的限制
4. **管理友好**: 提供完整的管理界面和工具
5. **可扩展性**: 系统设计支持未来的功能扩展

这个系统确保了邀请码的生成完全在管理员的控制之下，同时提供了灵活的配置选项来适应不同的需求。
