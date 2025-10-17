import { personalConfig } from './personal'
import { linuxdoConfig } from './linuxdo'
import { communityConfig } from './community'
import type { AppVersion, VersionConfig } from '../version-types'

/**
 * 版本配置映射
 */
export const VERSION_CONFIGS: Record<AppVersion, VersionConfig> = {
  personal: personalConfig,
  linuxdo: linuxdoConfig,
  community: communityConfig
}

/**
 * 获取当前版本
 */
export function getCurrentVersion(): AppVersion {
  const version = process.env.NEXT_PUBLIC_VERSION as AppVersion

  // 验证版本有效性
  if (!version || !VERSION_CONFIGS[version]) {
    console.warn(`Invalid version: ${version}, falling back to 'community'`)
    return 'community'
  }

  return version
}

/**
 * 获取当前版本配置
 */
export function getCurrentVersionConfig(): VersionConfig {
  const version = getCurrentVersion()
  return VERSION_CONFIGS[version]
}

/**
 * 导出所有配置
 */
export { personalConfig, linuxdoConfig, communityConfig }
export * from '../version-types'
