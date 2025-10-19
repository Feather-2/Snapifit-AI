import { getCurrentVersionConfig, getCurrentVersion } from './versions'
import type { VersionFeatures, VersionConfig } from './version-types'

/**
 * 获取版本配置
 */
export function getVersionConfig(): VersionConfig {
  return getCurrentVersionConfig()
}

/**
 * 获取功能配置
 */
export function getFeatures(): VersionFeatures {
  const cfg = getCurrentVersionConfig()
  const base = cfg.features

  // 生成拷贝，避免污染原始配置对象
  const features: VersionFeatures = JSON.parse(JSON.stringify(base))

  // 个人体验版（IndexedDB）下，关闭所有鉴权与多用户相关功能
  const version = getCurrentVersion()
  const personalMode = process.env.PERSONAL_DB_MODE || 'indexeddb'
  if (version === 'personal' && personalMode === 'indexeddb') {
    features.auth.credentials = false
    features.auth.oauth.enabled = false
    features.userSystem.multiUser = false
    features.admin.adminPanel = false
  }

  return features
}

/**
 * 获取当前版本名称
 */
export function getVersion() {
  return getCurrentVersion()
}

/**
 * 检查功能是否启用
 *
 * @example
 * hasFeature('admin.adminPanel') // 返回 boolean
 * hasFeature('mcp.server') // 返回 boolean
 */
export function hasFeature(featurePath: string): boolean {
  const features = getFeatures()
  const parts = featurePath.split('.')

  let current: any = features
  for (const part of parts) {
    if (current === undefined || current === null) {
      return false
    }
    current = current[part]
  }

  return Boolean(current)
}

/**
 * 获取嵌套功能值
 *
 * @example
 * getFeatureValue('database.type') // 返回 'postgresql' 等
 * getFeatureValue('auth.oauth.providers') // 返回 ['github', 'google']
 */
export function getFeatureValue<T = any>(featurePath: string): T | undefined {
  const features = getFeatures()
  const parts = featurePath.split('.')

  let current: any = features
  for (const part of parts) {
    if (current === undefined || current === null) {
      return undefined
    }
    current = current[part]
  }

  return current as T
}

/**
 * 是否是个人版
 */
export function isPersonalVersion(): boolean {
  return getVersion() === 'personal'
}

/**
 * 是否是 L站版
 */
export function isLinuxdoVersion(): boolean {
  return getVersion() === 'linuxdo'
}

/**
 * 是否是社区版
 */
export function isCommunityVersion(): boolean {
  return getVersion() === 'community'
}

/**
 * 获取版本显示名称
 */
export function getVersionDisplayName(): string {
  return getVersionConfig().metadata.displayName
}

/**
 * 获取环境变量配置
 */
export function getEnvConfig() {
  return getVersionConfig().env
}

/**
 * 验证必需的环境变量
 */
export function validateEnv(): { valid: boolean; missing: string[] } {
  const envConfig = getEnvConfig()
  const missing: string[] = []

  for (const key of envConfig.required) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }

  return {
    valid: missing.length === 0,
    missing
  }
}
