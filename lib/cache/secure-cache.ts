// 安全的分层缓存系统
interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
}

interface SecurityContext {
  userId: string
  sessionId: string
  permissions: string[]
}

class SecureCache {
  private cache = new Map<string, CacheItem<any>>()

  // 系统配置缓存 - 公开数据，可以长时间缓存
  private systemConfigTTL = 30 * 60 * 1000 // 30分钟

  // 用户基本信息缓存 - 短时间缓存，不包含敏感信息
  private userBasicInfoTTL = 5 * 60 * 1000 // 5分钟

  // 权限相关数据 - 不缓存，每次都验证
  private sensitiveOperations = [
    'user_permissions',
    'admin_operations',
    'financial_data',
    'private_keys'
  ]

  async getSystemConfig(key: string): Promise<any> {
    const cacheKey = `system_config:${key}`
    const cached = this.cache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      console.log('🎯 Cache hit: system config', key)
      return cached.data
    }

    // 从数据库获取
    const data = await this.fetchSystemConfigFromDB(key)
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl: this.systemConfigTTL
    })

    console.log('💾 Cache miss: system config', key)
    return data
  }

  async getUserBasicInfo(userId: string, context: SecurityContext): Promise<any> {
    // 1. 首先验证权限 - 不能缓存
    await this.verifyUserAccess(userId, context)

    // 2. 获取基本信息 - 可以缓存
    const cacheKey = `user_basic:${userId}`
    const cached = this.cache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      console.log('🎯 Cache hit: user basic info', userId)
      return cached.data
    }

    const data = await this.fetchUserBasicInfoFromDB(userId)
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl: this.userBasicInfoTTL
    })

    console.log('💾 Cache miss: user basic info', userId)
    return data
  }

  async getUserSensitiveData(userId: string, context: SecurityContext, operation: string): Promise<any> {
    // 敏感操作永远不缓存，每次都验证
    console.log('🔒 Sensitive operation, no cache:', operation)

    // 1. 验证会话有效性
    await this.verifySession(context.sessionId)

    // 2. 验证用户权限
    await this.verifyUserPermissions(userId, operation, context)

    // 3. 获取数据（不缓存）
    return await this.fetchSensitiveDataFromDB(userId, operation)
  }

  private async verifyUserAccess(userId: string, context: SecurityContext): Promise<void> {
    // 验证用户是否有权限访问自己的数据
    if (context.userId !== userId) {
      // 检查是否是管理员访问其他用户数据
      if (!context.permissions.includes('admin')) {
        throw new Error('Unauthorized access')
      }
    }
  }

  private async verifySession(sessionId: string): Promise<void> {
    // 每次都验证会话有效性
    const session = await this.fetchSessionFromDB(sessionId)
    if (!session || session.expired) {
      throw new Error('Invalid session')
    }
  }

  private async verifyUserPermissions(userId: string, operation: string, context: SecurityContext): Promise<void> {
    // 实时验证用户权限
    const currentPermissions = await this.fetchUserPermissionsFromDB(userId)

    if (!this.hasPermission(currentPermissions, operation)) {
      throw new Error(`Permission denied for operation: ${operation}`)
    }
  }

  private hasPermission(permissions: string[], operation: string): boolean {
    // 权限检查逻辑
    return permissions.includes(operation) || permissions.includes('admin')
  }

  // 清除特定用户的缓存（当用户信息更新时）
  invalidateUserCache(userId: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key =>
      key.includes(`user_basic:${userId}`)
    )

    keysToDelete.forEach(key => this.cache.delete(key))
    console.log('🗑️ Invalidated cache for user:', userId)
  }

  // 清除系统配置缓存（当配置更新时）
  invalidateSystemCache(): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key =>
      key.startsWith('system_config:')
    )

    keysToDelete.forEach(key => this.cache.delete(key))
    console.log('🗑️ Invalidated system config cache')
  }

  // 数据库查询方法（实际实现）
  private async fetchSystemConfigFromDB(key: string): Promise<any> {
    const { getSupabaseAdmin } = await import('@/lib/supabase')
    const supabase = await getSupabaseAdmin()

    const { data, error } = await supabase
      .from('system_configs')
      .select('value')
      .eq('key', key)
      .single()

    if (error) {
      console.log('🔧 System config not found:', key)
      return null
    }

    return data?.value
  }

  private async fetchUserBasicInfoFromDB(userId: string): Promise<any> {
    const { getSupabaseAdmin } = await import('@/lib/supabase')
    const supabase = await getSupabaseAdmin()

    // 只获取非敏感的基本信息
    const { data, error } = await supabase
      .from('users')
      .select('id, email, display_name, trust_level, role, is_active, created_at')
      .eq('id', userId)
      .single()

    if (error) {
      throw new Error(`User not found: ${userId}`)
    }

    return data
  }

  private async fetchSensitiveDataFromDB(userId: string, operation: string): Promise<any> {
    // 敏感数据查询，根据操作类型决定
    const { getSupabaseAdmin } = await import('@/lib/supabase')
    const supabase = await getSupabaseAdmin()

    switch (operation) {
      case 'user_profile':
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .single()
        return profile

      case 'user_keys':
        const { data: keys } = await supabase
          .from('shared_keys')
          .select('*')
          .eq('user_id', userId)
        return keys

      default:
        throw new Error(`Unknown sensitive operation: ${operation}`)
    }
  }

  private async fetchSessionFromDB(sessionId: string): Promise<any> {
    // 简化实现，实际应该查询 sessions 表
    return { id: sessionId, expired: false }
  }

  private async fetchUserPermissionsFromDB(userId: string): Promise<string[]> {
    const userInfo = await this.fetchUserBasicInfoFromDB(userId)

    // 根据用户角色和信任级别确定权限
    const permissions: string[] = ['user']

    if (userInfo.role === 'admin') {
      permissions.push('admin', 'read_all', 'write_all')
    }

    if (userInfo.trust_level >= 3) {
      permissions.push('read_memories', 'read_logs', 'read_profile')
    }

    return permissions
  }
}

export const secureCache = new SecureCache()
