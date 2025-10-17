'use client'

import { useMemo } from 'react'
import { getVersion, getVersionConfig, getFeatures } from '../config/features'
import type { AppVersion, VersionConfig, VersionFeatures } from '../config/version-types'

/**
 * 获取当前版本
 */
export function useAppVersion(): AppVersion {
  return useMemo(() => getVersion(), [])
}

/**
 * 获取版本配置
 */
export function useVersionConfig(): VersionConfig {
  return useMemo(() => getVersionConfig(), [])
}

/**
 * 获取功能配置
 */
export function useFeatures(): VersionFeatures {
  return useMemo(() => getFeatures(), [])
}

/**
 * 获取版本元信息
 */
export function useVersionMetadata() {
  const config = useVersionConfig()
  return config.metadata
}

/**
 * 版本判断 hooks
 */
export function useIsPersonalVersion(): boolean {
  const version = useAppVersion()
  return version === 'personal'
}

export function useIsLinuxdoVersion(): boolean {
  const version = useAppVersion()
  return version === 'linuxdo'
}

export function useIsCommunityVersion(): boolean {
  const version = useAppVersion()
  return version === 'community'
}
