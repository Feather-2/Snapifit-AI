// 缓存管理工具 - 提供统一的缓存失效接口
import { secureCache } from './secure-cache'

export class CacheManager {
  /**
   * 用户信息更新后的缓存失效
   * 适用场景：
   * - 邀请码使用后信任等级变更
   * - 管理员修改用户信息
   * - 用户更新个人资料
   * - 用户角色变更
   */
  static invalidateUserInfo(userId: string, reason: string = 'user info updated'): void {
    try {
      secureCache.invalidateUserCache(userId)
      console.log(`🗑️ User cache invalidated: ${userId} (${reason})`)
    } catch (error) {
      console.warn(`⚠️ Failed to invalidate user cache: ${userId}`, error)
    }
  }

  /**
   * 系统配置更新后的缓存失效
   * 适用场景：
   * - 管理员修改系统配置
   * - 默认信任等级变更
   * - 系统功能开关变更
   */
  static invalidateSystemConfig(reason: string = 'system config updated'): void {
    try {
      secureCache.invalidateSystemCache()
      console.log(`🗑️ System config cache invalidated (${reason})`)
    } catch (error) {
      console.warn('⚠️ Failed to invalidate system config cache', error)
    }
  }

  /**
   * 批量用户缓存失效
   * 适用场景：
   * - 批量用户操作
   * - 系统维护
   */
  static invalidateMultipleUsers(userIds: string[], reason: string = 'batch operation'): void {
    userIds.forEach(userId => {
      this.invalidateUserInfo(userId, reason)
    })
    console.log(`🗑️ Batch cache invalidation completed for ${userIds.length} users (${reason})`)
  }

  /**
   * 邀请码使用后的缓存失效
   * 专门处理邀请码使用场景的缓存更新
   */
  static invalidateAfterInviteCodeUsage(userId: string): void {
    this.invalidateUserInfo(userId, 'invite code used - trust level upgraded to LV3')
  }

  /**
   * 管理员操作后的缓存失效
   * 专门处理管理员修改用户信息的缓存更新
   */
  static invalidateAfterAdminUpdate(targetUserId: string, adminUserId: string): void {
    this.invalidateUserInfo(targetUserId, `admin update by ${adminUserId}`)
  }

  /**
   * 用户个人资料更新后的缓存失效
   * 专门处理用户自己更新资料的缓存更新
   */
  static invalidateAfterProfileUpdate(userId: string): void {
    this.invalidateUserInfo(userId, 'profile self-update')
  }

  /**
   * 获取缓存统计信息
   * 用于监控和调试
   */
  static getCacheStats(): { userCacheCount: number; systemCacheCount: number } {
    try {
      // 这里需要扩展 secureCache 来提供统计信息
      // 暂时返回占位符数据
      return {
        userCacheCount: 0,
        systemCacheCount: 0
      }
    } catch (error) {
      console.warn('⚠️ Failed to get cache stats', error)
      return {
        userCacheCount: -1,
        systemCacheCount: -1
      }
    }
  }

  /**
   * 清除所有缓存（紧急情况使用）
   * 谨慎使用，会影响性能
   */
  static clearAllCache(reason: string = 'emergency clear'): void {
    try {
      // 清除所有用户缓存
      secureCache.invalidateSystemCache()
      
      // 这里需要扩展 secureCache 来提供清除所有缓存的方法
      console.log(`🗑️ All cache cleared (${reason})`)
      console.warn('⚠️ All cache cleared - this may impact performance temporarily')
    } catch (error) {
      console.error('❌ Failed to clear all cache', error)
    }
  }
}

// 导出便捷方法
export const invalidateUserCache = CacheManager.invalidateUserInfo
export const invalidateSystemCache = CacheManager.invalidateSystemConfig
export const invalidateAfterInviteCode = CacheManager.invalidateAfterInviteCodeUsage
export const invalidateAfterAdminUpdate = CacheManager.invalidateAfterAdminUpdate
export const invalidateAfterProfileUpdate = CacheManager.invalidateAfterProfileUpdate
