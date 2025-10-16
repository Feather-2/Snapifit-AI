"use client"

// 安全的前端数据获取 Hook
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useCallback } from 'react'

interface DashboardData {
  user: any
  systemMessage?: string
  usageStats?: any
  usageCheck?: any
}

interface SensitiveData {
  memories?: any[]
  logs?: any[]
  profile?: any
}

export function useSecureDashboard() {
  const { data: session, status } = useSession()
  const queryClient = useQueryClient()

  // 1. 基础数据 - 可以缓存，但仍需要认证
  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard
  } = useQuery<DashboardData>({
    queryKey: ['dashboard', 'init', session?.user?.id],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/init', {
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      return response.json()
    },
    enabled: !!session?.user?.id,
    staleTime: 2 * 60 * 1000, // 2分钟内不重新请求
    cacheTime: 5 * 60 * 1000, // 5分钟缓存
    retry: 1,
  })

  // 2. 敏感数据 - 按需获取，不缓存
  const fetchSensitiveData = useCallback(async (operations: string[]): Promise<SensitiveData> => {
    if (!session?.user?.id) {
      throw new Error('Not authenticated')
    }

    const response = await fetch('/api/dashboard/init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.accessToken}`,
      },
      body: JSON.stringify({ operations }),
    })

    if (!response.ok) {
      throw new Error('Failed to fetch sensitive data')
    }

    return response.json()
  }, [session])

  // 3. 特定敏感数据的 hooks
  const {
    data: memoriesData,
    isLoading: isMemoriesLoading,
    error: memoriesError,
    refetch: refetchMemories
  } = useQuery({
    queryKey: ['memories', session?.user?.id],
    queryFn: () => fetchSensitiveData(['memories']),
    enabled: false, // 手动触发
    cacheTime: 0, // 不缓存敏感数据
    staleTime: 0,
  })

  const {
    data: logsData,
    isLoading: isLogsLoading,
    error: logsError,
    refetch: refetchLogs
  } = useQuery({
    queryKey: ['logs', session?.user?.id],
    queryFn: () => fetchSensitiveData(['logs']),
    enabled: false, // 手动触发
    cacheTime: 0, // 不缓存敏感数据
    staleTime: 0,
  })

  const {
    data: profileData,
    isLoading: isProfileLoading,
    error: profileError,
    refetch: refetchProfile
  } = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: () => fetchSensitiveData(['profile']),
    enabled: false, // 手动触发
    cacheTime: 0, // 不缓存敏感数据
    staleTime: 0,
  })

  // 4. 权限检查
  const hasPermission = useCallback((permission: string): boolean => {
    if (!session?.user) return false

    // 检查用户权限
    const userPermissions = (session.user as any).permissions || []
    return userPermissions.includes(permission) || (session.user as any).role === 'admin'
  }, [session])

  // 5. 安全的数据更新
  const invalidateUserData = useCallback(() => {
    // 当用户数据更新时，清除相关缓存
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'init'] })
    queryClient.removeQueries({ queryKey: ['memories'] })
    queryClient.removeQueries({ queryKey: ['logs'] })
    queryClient.removeQueries({ queryKey: ['profile'] })
  }, [queryClient])

  // 6. 条件性数据获取
  const loadMemoriesIfAllowed = useCallback(() => {
    if (hasPermission('read_memories')) {
      refetchMemories()
    } else {
      console.warn('Permission denied: read_memories')
    }
  }, [hasPermission, refetchMemories])

  const loadLogsIfAllowed = useCallback(() => {
    if (hasPermission('read_logs')) {
      refetchLogs()
    } else {
      console.warn('Permission denied: read_logs')
    }
  }, [hasPermission, refetchLogs])

  const loadProfileIfAllowed = useCallback(() => {
    if (hasPermission('read_profile')) {
      refetchProfile()
    } else {
      console.warn('Permission denied: read_profile')
    }
  }, [hasPermission, refetchProfile])

  return {
    // 基础数据
    dashboardData,
    isDashboardLoading,
    dashboardError,
    refetchDashboard,

    // 敏感数据
    memoriesData: (memoriesData as any)?.memories,
    isMemoriesLoading,
    memoriesError,
    loadMemoriesIfAllowed,

    logsData: (logsData as any)?.logs,
    isLogsLoading,
    logsError,
    loadLogsIfAllowed,

    profileData: (profileData as any)?.profile,
    isProfileLoading,
    profileError,
    loadProfileIfAllowed,

    // 工具函数
    hasPermission,
    invalidateUserData,

    // 认证状态
    isAuthenticated: !!session?.user?.id,
    user: session?.user,
  }
}

// 使用示例组件
export function DashboardComponent() {
  const {
    dashboardData,
    isDashboardLoading,
    memoriesData,
    isMemoriesLoading,
    loadMemoriesIfAllowed,
    hasPermission,
    isAuthenticated
  } = useSecureDashboard()

  if (!isAuthenticated) {
    return <div>Please login</div>
  }

  if (isDashboardLoading) {
    return <div>Loading dashboard...</div>
  }

  return (
    <div>
      <h1>Welcome, {dashboardData?.user?.displayName}</h1>

      {dashboardData?.systemMessage && (
        <div className="system-message">
          {dashboardData.systemMessage}
        </div>
      )}

      {dashboardData?.usageStats && (
        <div className="usage-stats">
          {/* 显示使用统计 */}
        </div>
      )}

      {/* 敏感数据按需加载 */}
      {hasPermission('read_memories') && (
        <div>
          <button onClick={loadMemoriesIfAllowed}>
            Load Memories
          </button>
          {isMemoriesLoading && <span>Loading...</span>}
          {memoriesData && (
            <div>
              {/* 显示 memories */}
            </div>
          )}
        </div>
      )}
    </div>
  )
}




