'use client'

import { useMemo } from 'react'
import { hasFeature, getFeatureValue } from '../config/features'

/**
 * 检查功能是否启用
 *
 * @example
 * const hasAdmin = useFeature('admin.adminPanel')
 * const hasMCP = useFeature('mcp.server')
 */
export function useFeature(featurePath: string): boolean {
  return useMemo(() => hasFeature(featurePath), [featurePath])
}

/**
 * 获取功能值
 *
 * @example
 * const dbType = useFeatureValue<string>('database.type')
 * const oauthProviders = useFeatureValue<string[]>('auth.oauth.providers')
 */
export function useFeatureValue<T = any>(featurePath: string): T | undefined {
  return useMemo(() => getFeatureValue<T>(featurePath), [featurePath])
}

/**
 * 功能分组 hooks
 */
export function useDatabaseFeatures() {
  return useMemo(() => {
    const type = getFeatureValue<string>('database.type')
    const requiresServerDb = hasFeature('database.requiresServerDb')
    const supportsMultiUser = hasFeature('database.supportsMultiUser')

    return { type, requiresServerDb, supportsMultiUser }
  }, [])
}

export function useAuthFeatures() {
  return useMemo(() => {
    const credentials = hasFeature('auth.credentials')
    const oauthEnabled = hasFeature('auth.oauth.enabled')
    const oauthProviders = getFeatureValue<string[]>('auth.oauth.providers') || []

    return { credentials, oauthEnabled, oauthProviders }
  }, [])
}

export function useAdminFeatures() {
  return useMemo(() => {
    const adminPanel = hasFeature('admin.adminPanel')
    const userManagement = hasFeature('admin.userManagement')
    const systemConfig = hasFeature('admin.systemConfig')

    return { adminPanel, userManagement, systemConfig }
  }, [])
}

export function useMCPFeatures() {
  return useMemo(() => {
    const server = hasFeature('mcp.server')
    const client = hasFeature('mcp.client')
    const configManagement = hasFeature('mcp.configManagement')

    return { server, client, configManagement }
  }, [])
}
