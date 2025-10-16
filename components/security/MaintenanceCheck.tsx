'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { MainNav } from "@/components/main-nav"
import { Toaster } from "@/components/ui/toaster"

interface MaintenanceCheckProps {
  children: React.ReactNode
  excludePaths?: string[] // 排除的路径，如管理页面
  locale: string // 添加 locale 参数
}

export default function MaintenanceCheck({
  children,
  excludePaths = ['/admin'],
  locale
}: MaintenanceCheckProps) {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasRedirected, setHasRedirected] = useState(false)
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status !== 'loading') {
      // 如果已经在维护页面，快速检查而不重定向
      const currentPath = window.location.pathname
      const isMaintenancePage = currentPath.includes('/maintenance')

      if (isMaintenancePage) {
        quickMaintenanceCheck()
      } else {
        checkMaintenanceMode()
      }
    }
  }, [status])

  const quickMaintenanceCheck = async () => {
    try {
      const response = await fetch('/api/security/check?action=checkMaintenanceMode')
      const data = await response.json()

      if (data.result === true) {
        setIsMaintenanceMode(true)
      } else {
        setIsMaintenanceMode(false)
        // 如果维护模式关闭了，重定向回首页
        const pathSegments = window.location.pathname.split('/').filter(Boolean)
        const locale = pathSegments[0] || 'zh'
        router.replace(`/${locale}`)
        return
      }
    } catch (error) {
      setIsMaintenanceMode(false)
    } finally {
      setIsLoading(false)
    }
  }

  const checkMaintenanceMode = async () => {
    try {
      const response = await fetch('/api/security/check?action=checkMaintenanceMode')
      const data = await response.json()

      if (data.result === true) {
        setIsMaintenanceMode(true)

        // 检查用户是否是管理员
        const userRole = (session?.user as any)?.role
        const isAdmin = userRole === 'admin' || userRole === 'super_admin'

        // 检查当前路径
        const currentPath = window.location.pathname
        const isMaintenancePage = currentPath.includes('/maintenance')
        const isExcluded = excludePaths.some(path => currentPath.startsWith(path))

        // 检查是否是管理员路径
        const isAdminPath = currentPath.includes('/admin')

        // 如果是管理员路径但用户不是管理员，立即重定向
        if (isAdminPath && !isAdmin && !hasRedirected) {
          setHasRedirected(true)

          // 获取当前语言前缀
          const pathSegments = currentPath.split('/').filter(Boolean)
          const locale = pathSegments[0] || 'zh'

          router.replace(`/${locale}/maintenance`)
          return
        }

        // 如果不是管理员且不在排除路径中且不在维护页面，则重定向
        if (!isAdmin && !isExcluded && !isMaintenancePage && !hasRedirected) {
          setHasRedirected(true)

          // 获取当前语言前缀
          const pathSegments = currentPath.split('/').filter(Boolean)
          const locale = pathSegments[0] || 'zh'

          // 使用 replace 而不是 push 避免历史记录问题
          router.replace(`/${locale}/maintenance`)
          return
        }
      } else {
        setIsMaintenanceMode(false)
      }
    } catch (error) {
      // 如果检查失败，默认不启用维护模式
      setIsMaintenanceMode(false)
    } finally {
      setIsLoading(false)
    }
  }

  // 如果正在检查维护模式或会话加载中，显示加载状态
  if (isLoading || status === 'loading') {
    // 如果已经在维护页面，直接显示页面内容，后台检查
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
    const isMaintenancePage = currentPath.includes('/maintenance')

    if (isMaintenancePage && status === 'authenticated') {
      return (
        <>
          <div className="min-h-screen bg-background">
            <main>{children}</main>
          </div>
          <Toaster />
        </>
      )
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // 如果是维护模式，检查是否应该阻止访问
  if (isMaintenanceMode) {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
    const userRole = (session?.user as any)?.role
    const isAdmin = userRole === 'admin' || userRole === 'super_admin'
    const isMaintenancePage = currentPath.includes('/maintenance')
    const isExcluded = excludePaths.some(path => currentPath.startsWith(path))

    // 检查是否是管理员路径
    const isAdminPath = currentPath.includes('/admin')

    // 对于非管理员用户的处理
    if (!isAdmin) {
      // 如果是管理员路径，立即阻止访问
      if (isAdminPath) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )
      }

      // 如果不在维护页面，显示加载状态（等待重定向）
      if (!isMaintenancePage) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )
      }

      // 如果在维护页面，只渲染页面内容，不包含导航栏
      return (
        <>
          <div className="min-h-screen bg-background">
            <main>{children}</main>
          </div>
          <Toaster />
        </>
      )
    }
  }

  // 正常渲染：包含导航栏的完整布局
  return (
    <>
      <div className="min-h-screen bg-background">
        <MainNav locale={locale} />
        <main>{children}</main>
      </div>
      <Toaster />
    </>
  )
}
