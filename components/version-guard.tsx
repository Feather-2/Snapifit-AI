'use client'

import { useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useFeature } from '@/hooks/use-feature'
import { useToast } from '@/hooks/use-toast'

interface VersionGuardProps {
  /**
   * 要检查的功能路径
   * @example 'admin.adminPanel', 'invite.inviteCodeSystem', 'ai.sharedKeys'
   */
  feature: string
  /**
   * 如果功能不可用，重定向到的路径
   * @default '/'
   */
  redirectTo?: string
  /**
   * 是否显示提示消息
   * @default true
   */
  showToast?: boolean
  /**
   * 自定义错误消息
   */
  errorMessage?: string
  /**
   * 子组件
   */
  children: ReactNode
  /**
   * 加载时显示的组件
   */
  loadingFallback?: ReactNode
}

/**
 * 版本功能保护组件
 *
 * 用于保护需要特定版本功能的页面或组件
 *
 * @example
 * ```tsx
 * <VersionGuard feature="admin.adminPanel" redirectTo="/settings">
 *   <AdminPanel />
 * </VersionGuard>
 * ```
 */
export function VersionGuard({
  feature,
  redirectTo = '/',
  showToast = true,
  errorMessage,
  children,
  loadingFallback
}: VersionGuardProps) {
  const hasFeature = useFeature(feature)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!hasFeature) {
      if (showToast) {
        toast({
          title: 'Feature Not Available',
          description: errorMessage || `This feature is not available in your current version.`,
          variant: 'destructive'
        })
      }
      router.push(redirectTo)
    }
  }, [hasFeature, router, redirectTo, showToast, toast, errorMessage])

  // 如果功能不可用，不渲染子组件
  if (!hasFeature) {
    return loadingFallback || null
  }

  return <>{children}</>
}

/**
 * 条件渲染组件 - 仅在功能可用时渲染
 *
 * 与 VersionGuard 不同，这个组件不会重定向，只是隐藏内容
 *
 * @example
 * ```tsx
 * <ConditionalFeature feature="invite.inviteCodeSystem">
 *   <InviteCodeButton />
 * </ConditionalFeature>
 * ```
 */
export function ConditionalFeature({
  feature,
  children,
  fallback = null
}: {
  feature: string
  children: ReactNode
  fallback?: ReactNode
}) {
  const hasFeature = useFeature(feature)

  if (!hasFeature) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
