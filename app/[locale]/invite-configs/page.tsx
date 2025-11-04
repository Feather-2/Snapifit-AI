'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Settings, AlertCircle, CheckCircle, Users, Shield, Clock, Hash } from 'lucide-react'
import { useParams } from "next/navigation"

interface InviteConfig {
  id: string
  user_id: string
  interval_days: number
  codes_per_batch: number
  max_total_codes: number
  is_active: boolean
  created_at: string
  updated_at: string
  user: {
    username: string
    display_name: string
    email: string
  } | null
  creator: {
    username: string
    display_name: string
  }
  isGlobalDefault?: boolean
}

export default function InviteConfigsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const locale = (params as any)?.locale ?? 'en'
  const t = useTranslations('inviteConfigs')

  const [configs, setConfigs] = useState<InviteConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [hasInitialLoad, setHasInitialLoad] = useState(false)

  // 检查用户是否是管理员
  const isAdmin = (session?.user as any)?.role === 'admin' || (session?.user as any)?.role === 'super_admin'

  useEffect(() => {
    if (status === "loading") return
    if (!session) {
      router.push(`/${locale}/signin`)
      return
    }

    // 只在初次加载时自动获取数据
    if (!hasInitialLoad) {
      loadConfigs()
      setHasInitialLoad(true)
    }
  }, [session, status, hasInitialLoad])

  const loadConfigs = async (force = false) => {
    // 如果不是强制刷新且已有数据，则跳过
    if (!force && configs.length > 0) {
      return
    }
    try {
      setIsLoading(true)
      setError("")
      
      // 根据用户权限选择不同的API端点
      const endpoint = isAdmin ? '/api/admin/invite-configs' : '/api/invite-configs'
      const response = await fetch(endpoint)
      const result = await response.json()

      if (result.success) {
        setConfigs(result.data || [])
      } else {
        setError(result.error || '加载配置失败')
      }
    } catch (error) {
      setError('网络错误，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(locale)
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">加载中...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Settings className="h-8 w-8" />
              邀请码配置
            </h1>
            <p className="text-muted-foreground mt-2">
              {isAdmin ? '管理所有用户的邀请码配置' : '查看您的邀请码配置'}
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => router.push(`/${locale}/admin/invite-configs`)}>
              <Settings className="h-4 w-4 mr-2" />
              管理配置
            </Button>
          )}
        </div>

        {/* 错误提示 */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 配置列表 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {isAdmin ? '所有邀请码配置' : '我的邀请码配置'}
            </CardTitle>
            <CardDescription>
              {isAdmin ? '系统中所有用户的邀请码配置' : '您当前的邀请码权限和限制'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {configs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    {isAdmin && <TableHead>用户</TableHead>}
                    <TableHead className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      间隔天数
                    </TableHead>
                    <TableHead className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      每次数量
                    </TableHead>
                    <TableHead className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      最大总数
                    </TableHead>
                    <TableHead>创建者</TableHead>
                    <TableHead>创建时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.map((config) => (
                    <TableRow key={config.id}>
                      {isAdmin && (
                        <TableCell>
                          {config.user_id && config.user ? (
                            <div>
                              <div className="font-medium">{config.user.display_name}</div>
                              <div className="text-sm text-muted-foreground">@{config.user.username}</div>
                              <div className="text-xs text-muted-foreground">{config.user.email}</div>
                            </div>
                          ) : (
                            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                              全局默认
                            </Badge>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {config.interval_days} 天
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {config.codes_per_batch} 个
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          {config.max_total_codes} 个
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {config.creator.display_name}
                          <div className="text-muted-foreground">@{config.creator.username}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(config.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {isAdmin ? '暂无配置' : '暂无邀请码配置'}
                </h3>
                <p className="text-muted-foreground">
                  {isAdmin 
                    ? '系统中还没有任何邀请码配置' 
                    : '您还没有邀请码配置，请联系管理员为您设置权限'
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 说明信息 */}
        {!isAdmin && configs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                配置说明
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <Clock className="h-8 w-8 mx-auto text-green-600 mb-2" />
                  <div className="font-medium text-green-800">间隔天数</div>
                  <div className="text-sm text-green-600">两次创建邀请码之间的最小间隔</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <Hash className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                  <div className="font-medium text-blue-800">每次数量</div>
                  <div className="text-sm text-blue-600">每次可以创建的邀请码数量</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <Users className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                  <div className="font-medium text-purple-800">最大总数</div>
                  <div className="text-sm text-purple-600">累计可创建的邀请码总数</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
