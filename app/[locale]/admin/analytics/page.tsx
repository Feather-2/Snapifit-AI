"use client"

import { useState, useEffect, useCallback, use } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import {
  Loader2,
  ArrowLeft,
  TrendingUp,
  Users,
  MessageSquare,
  Activity,
  Calendar,
  BarChart3,
  PieChart,
  RefreshCw,
  Play,
  Pause,
  Trash2,
  MoreHorizontal
} from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl"

interface AnalyticsData {
  userStats: {
    totalUsers: number
    activeUsers: number
    newUsersToday: number
    newUsersThisWeek: number
    usersByTrustLevel: Record<string, number>
    usersByProvider: Record<string, number>
  }
  usageStats: {
    totalConversations: number
    conversationsToday: number
    conversationsThisWeek: number
    averageMessagesPerConversation: number
    topSharedServices: Array<{
      id: string
      name: string
      count: number
      modelCount: number
      description: string
      tags: string[]
      isActive: boolean
    }>
  }
  systemStats: {
    totalApiCalls: number
    apiCallsToday: number
    errorRate: number
    averageResponseTime: number
    securityEventsToday: number
    totalSecurityEvents: number
  }
}

function AnalyticsPageContent({ params }: { params: Promise<{ locale: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const resolvedParams = use(params)
  const locale = resolvedParams.locale
  const t = useTranslations('adminAnalytics')

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7d')

  // 权限检查
  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user) {
      router.push('/auth/signin')
      return
    }

    const userRole = (session.user as any)?.role
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      toast({
        title: t('messages.permissionDenied'),
        description: t('messages.adminOnlyAccess'),
        variant: "destructive"
      })
      router.push('/admin')
      return
    }
  }, [session, status, router, toast])

  // 加载分析数据
  const loadAnalytics = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/analytics?timeRange=${timeRange}`)
      const data = await response.json()

      if (data.success) {
        setAnalytics(data.analytics)
      } else {
        toast({
          title: t('messages.loadFailed'),
          description: data.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: t('messages.loadFailed'),
        description: t('messages.networkError'),
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }, [timeRange, toast])

  // 管理共享服务操作
  const handleServiceAction = useCallback(async (serviceId: string, action: 'pause' | 'resume' | 'delete') => {
    try {
      if (action === 'delete') {
        const response = await fetch(`/api/admin/shared-keys/${serviceId}`, {
          method: 'DELETE'
        })
        const data = await response.json()

        if (data.success) {
          toast({
            title: t('messages.deleteSuccess'),
            description: data.message
          })
          loadAnalytics() // 重新加载数据
        } else {
          toast({
            title: t('messages.deleteFailed'),
            description: data.error,
            variant: "destructive"
          })
        }
      } else {
        const response = await fetch(`/api/admin/shared-keys/${serviceId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action })
        })
        const data = await response.json()

        if (data.success) {
          toast({
            title: t('messages.operationSuccess'),
            description: data.message
          })
          loadAnalytics() // 重新加载数据
        } else {
          toast({
            title: t('messages.operationFailed'),
            description: data.error,
            variant: "destructive"
          })
        }
      }
    } catch (error) {
      toast({
        title: t('messages.operationFailed'),
        description: t('messages.networkError'),
        variant: "destructive"
      })
    }
  }, [toast, loadAnalytics])

  useEffect(() => {
    if (session?.user) {
      loadAnalytics()
    }
  }, [session?.user?.id, loadAnalytics])

  if (status === 'loading' || isLoading) {
    return (
      <div className="container mx-auto py-6 px-6 md:px-8 lg:px-12 max-w-7xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">{t('loading')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-6 md:px-8 lg:px-12 max-w-7xl">
      {/* 页面头部 */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToAdmin')}
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">{t('timeRange.1d')}</SelectItem>
              <SelectItem value="7d">{t('timeRange.7d')}</SelectItem>
              <SelectItem value="30d">{t('timeRange.30d')}</SelectItem>
              <SelectItem value="90d">{t('timeRange.90d')}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadAnalytics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('refresh')}
          </Button>
        </div>
      </div>

      {analytics && (
        <>
          {/* 用户统计 */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('userStats.title')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t('userStats.totalUsers')}</p>
                      <p className="text-2xl font-bold">{analytics.userStats.totalUsers}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t('userStats.activeUsers')}</p>
                      <p className="text-2xl font-bold">{analytics.userStats.activeUsers}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t('userStats.newUsersToday')}</p>
                      <p className="text-2xl font-bold">{analytics.userStats.newUsersToday}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t('userStats.newUsersThisWeek')}</p>
                      <p className="text-2xl font-bold">{analytics.userStats.newUsersThisWeek}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 信任等级分布 */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('userStats.trustLevelDistribution')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(analytics.userStats.usersByTrustLevel).map(([level, count]) => (
                      <div key={level} className="flex items-center justify-between">
                        <span className="text-sm">LV{level}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{
                                width: `${(count / analytics.userStats.totalUsers) * 100}%`
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 登录方式分布 */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('userStats.loginMethodDistribution')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(analytics.userStats.usersByProvider).map(([provider, count]) => (
                      <div key={provider} className="flex items-center justify-between">
                        <span className="text-sm capitalize">
                          {provider === 'github' ? 'GitHub' :
                           provider === 'google' ? 'Google' :
                           provider === 'credentials' ? t('userStats.passwordLogin') : provider}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{
                                width: `${(count / analytics.userStats.totalUsers) * 100}%`
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 使用统计 */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {t('usageStats.title')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t('usageStats.totalConversations')}</p>
                      <p className="text-2xl font-bold">{analytics.usageStats.totalConversations}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t('usageStats.conversationsToday')}</p>
                      <p className="text-2xl font-bold">{analytics.usageStats.conversationsToday}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t('usageStats.conversationsThisWeek')}</p>
                      <p className="text-2xl font-bold">{analytics.usageStats.conversationsThisWeek}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t('usageStats.averageMessages')}</p>
                      <p className="text-2xl font-bold">{analytics.usageStats.averageMessagesPerConversation.toFixed(1)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 热门共享服务 */}
            <Card>
              <CardHeader>
                <CardTitle>{t('usageStats.topSharedServices')}</CardTitle>
                <CardDescription>{t('usageStats.topSharedServicesDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('usageStats.serviceName')}</TableHead>
                      <TableHead>{t('usageStats.status')}</TableHead>
                      <TableHead>{t('usageStats.modelCount')}</TableHead>
                      <TableHead>{t('usageStats.usageCount')}</TableHead>
                      <TableHead>{t('usageStats.percentage')}</TableHead>
                      <TableHead className="w-20">{t('usageStats.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.usageStats.topSharedServices.map((service, index) => (
                      <TableRow key={service.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={index < 3 ? "default" : "outline"}>
                                #{index + 1}
                              </Badge>
                              <span className="font-medium">{service.name}</span>
                            </div>
                            {service.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-48">
                                {service.description}
                              </p>
                            )}
                            {service.tags.length > 0 && (
                              <div className="flex gap-1 flex-wrap">
                                {service.tags.slice(0, 2).map((tag, tagIndex) => (
                                  <Badge key={tagIndex} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {service.tags.length > 2 && (
                                  <span className="text-xs text-muted-foreground">+{service.tags.length - 2}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={service.isActive ? "default" : "secondary"}
                            className={service.isActive ? "bg-green-100 text-green-800 border-green-200" : ""}
                          >
                            {service.isActive ? t('usageStats.running') : t('usageStats.paused')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {service.modelCount} {t('usageStats.models')}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{service.count.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{
                                  width: `${analytics.usageStats.topSharedServices[0]?.count > 0 ? (service.count / analytics.usageStats.topSharedServices[0].count) * 100 : 0}%`
                                }}
                              />
                            </div>
                            <span className="text-sm">
                              {analytics.usageStats.topSharedServices.reduce((sum, s) => sum + s.count, 0) > 0
                                ? ((service.count / analytics.usageStats.topSharedServices.reduce((sum, s) => sum + s.count, 0)) * 100).toFixed(1)
                                : '0.0'}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {service.isActive ? (
                                <DropdownMenuItem
                                  onClick={() => handleServiceAction(service.id, 'pause')}
                                  className="text-orange-600"
                                >
                                  <Pause className="h-4 w-4 mr-2" />
                                  {t('usageStats.pauseService')}
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => handleServiceAction(service.id, 'resume')}
                                  className="text-green-600"
                                >
                                  <Play className="h-4 w-4 mr-2" />
                                  {t('usageStats.resumeService')}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleServiceAction(service.id, 'delete')}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t('usageStats.deleteService')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* 系统统计 */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {t('systemStats.title')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t('systemStats.totalApiCalls')}</p>
                      <p className="text-2xl font-bold">{analytics.systemStats.totalApiCalls.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t('systemStats.apiCallsToday')}</p>
                      <p className="text-2xl font-bold">{analytics.systemStats.apiCallsToday.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className={`h-5 w-5 ${analytics.systemStats.errorRate > 5 ? 'text-red-500' : 'text-orange-500'}`} />
                    <div>
                      <p className="text-sm text-muted-foreground">{t('systemStats.errorRate')}</p>
                      <p className="text-2xl font-bold">{analytics.systemStats.errorRate.toFixed(2)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 系统性能 */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('systemStats.systemPerformance')}</CardTitle>
                  <CardDescription>{t('systemStats.systemPerformanceDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{t('systemStats.averageResponseTime')}</span>
                      <span className="text-lg font-semibold">{analytics.systemStats.averageResponseTime}ms</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{t('systemStats.systemStatus')}</span>
                      <span className={`text-sm font-medium ${analytics.systemStats.errorRate < 5 ? 'text-green-600' : 'text-red-600'}`}>
                        {analytics.systemStats.errorRate < 5 ? t('systemStats.normalOperation') : t('systemStats.needsAttention')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 安全统计 */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('systemStats.securityStats')}</CardTitle>
                  <CardDescription>{t('systemStats.securityStatsDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{t('systemStats.securityEventsToday')}</span>
                      <span className={`text-lg font-semibold ${analytics.systemStats.securityEventsToday > 10 ? 'text-red-600' : 'text-green-600'}`}>
                        {analytics.systemStats.securityEventsToday}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{t('systemStats.totalSecurityEvents')}</span>
                      <span className="text-lg font-semibold">{analytics.systemStats.totalSecurityEvents.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// 主导出组件，添加错误边界
export default function AnalyticsPage({ params }: { params: Promise<{ locale: string }> }) {
  return (
    <div>
      <AnalyticsPageContent params={params} />
    </div>
  )
}
