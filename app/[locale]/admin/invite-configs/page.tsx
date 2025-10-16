"use client"

import { useState, useEffect, useCallback, use } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { Settings, Plus, Edit, Trash2, AlertCircle, CheckCircle, Users } from 'lucide-react'

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
  }
  creator: {
    username: string
    display_name: string
  }
}

export default function InviteConfigsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const resolvedParams = use(params)
  const locale = resolvedParams.locale
  const t = useTranslations('inviteConfigs')

  const [configs, setConfigs] = useState<InviteConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [createForm, setCreateForm] = useState({
    configType: "default", // "default" 或 "specific"
    userId: "",
    userEmail: "",
    intervalDays: "7",
    codesPerBatch: "5",
    maxTotalCodes: "50"
  })

  const [hasInitialLoad, setHasInitialLoad] = useState(false)

  // 自动清除错误和成功消息
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError("")
        setSuccess("")
      }, 5000) // 5秒后自动清除消息

      return () => clearTimeout(timer)
    }
  }, [error, success])

  // 使用 useCallback 优化 loadConfigs 函数，避免无限循环
  const loadConfigs = useCallback(async (force = false) => {
    // 如果不是强制刷新且已有数据，则跳过
    if (!force && configs.length > 0) {
      return
    }
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/invite-configs')
      const result = await response.json()

      if (result.success) {
        setConfigs(result.data || [])
      } else {
        setError(result.error || t('messages.loadFailed'))
      }
    } catch (error) {
      setError(t('messages.networkError'))
    } finally {
      setIsLoading(false)
    }
  }, [configs.length, t]) // 依赖 configs.length 和 t

  useEffect(() => {
    if (status === "loading") return
    if (!session) {
      router.push(`/${locale}/signin`)
      return
    }

    // 检查是否是管理员
    const userRole = (session.user as any)?.role
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      router.push(`/${locale}`)
      return
    }

    // 只在初次加载时自动获取数据
    if (!hasInitialLoad) {
      loadConfigs()
      setHasInitialLoad(true)
    }
  }, [session, status, hasInitialLoad, router, locale, loadConfigs]) // 添加缺失的依赖项

  // 使用 useCallback 优化 handleCreateConfig 函数
  const handleCreateConfig = useCallback(async () => {
    setIsSubmitting(true)
    setError("")

    try {
      // 验证和转换数值参数
      const intervalDays = parseInt(createForm.intervalDays)
      const codesPerBatch = parseInt(createForm.codesPerBatch)
      const maxTotalCodes = parseInt(createForm.maxTotalCodes)

      // 验证数值有效性
      if (isNaN(intervalDays) || isNaN(codesPerBatch) || isNaN(maxTotalCodes)) {
        setError('请输入有效的数字')
        setIsSubmitting(false)
        return
      }

      if (intervalDays < 1 || codesPerBatch < 1 || maxTotalCodes < 1) {
        setError('所有数值必须大于0')
        setIsSubmitting(false)
        return
      }

      let requestData

      if (createForm.configType === "default") {
        // 创建全局默认配置
        requestData = {
          configType: "default",
          intervalDays,
          codesPerBatch,
          maxTotalCodes
        }
      } else {
        // 创建用户特定配置
        if (!createForm.userEmail && !createForm.userId) {
          setError(t('messages.userEmailOrIdRequired'))
          setIsSubmitting(false)
          return
        }

        requestData = {
          configType: "specific",
          userId: createForm.userId || undefined,
          userEmail: createForm.userEmail || undefined,
          intervalDays,
          codesPerBatch,
          maxTotalCodes
        }
      }

      const response = await fetch('/api/admin/invite-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(t('messages.createSuccess'))
        setShowCreateDialog(false)
        setCreateForm({
          configType: "default",
          userId: "",
          userEmail: "",
          intervalDays: "7",
          codesPerBatch: "5",
          maxTotalCodes: "50"
        })
        loadConfigs(true) // 强制刷新数据
      } else {
        setError(result.error)
      }
    } catch (error) {
      setError(t('messages.createFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }, [createForm, t, loadConfigs]) // 添加依赖项

  // 使用 useCallback 优化 handleDeleteConfig 函数
  const handleDeleteConfig = useCallback(async (userId: string) => {
    if (!confirm(t('messages.confirmDelete'))) return

    try {
      const response = await fetch(`/api/admin/invite-configs/${userId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(t('messages.deleteSuccess'))
        loadConfigs(true) // 强制刷新数据
      } else {
        setError(result.error)
      }
    } catch (error) {
      setError(t('messages.deleteFailed'))
    }
  }, [t, loadConfigs]) // 添加依赖项

  // 使用 useCallback 优化 formatDate 函数
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleString(locale)
  }, [locale]) // 依赖 locale

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>{t('messages.loading')}</p>
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
              {t('title')}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t('description')}
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('createConfig')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('createConfig')}</DialogTitle>
                <DialogDescription>
                  设置全局默认配置或为特定用户设置权限和限制
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* 配置类型选择 */}
                <div className="space-y-2">
                  <Label>{t('configType')}</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="default"
                        checked={createForm.configType === "default"}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, configType: e.target.value }))}
                      />
                      <span>{t('globalDefault')}</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="specific"
                        checked={createForm.configType === "specific"}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, configType: e.target.value }))}
                      />
                      <span>{t('userSpecific')}</span>
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {createForm.configType === "default"
                      ? t('globalDefaultDesc')
                      : t('userSpecificDesc')
                    }
                  </p>
                </div>

                {/* 用户选择（仅在特定配置时显示） */}
                {createForm.configType === "specific" && (
                  <div className="space-y-2">
                    <Label>{t('targetUser')}</Label>
                    <div className="space-y-2">
                      <Input
                        placeholder={t('userEmail')}
                        value={createForm.userEmail}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, userEmail: e.target.value, userId: "" }))}
                      />
                      <div className="text-center text-xs text-muted-foreground">或</div>
                      <Input
                        placeholder={t('userId')}
                        value={createForm.userId}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, userId: e.target.value, userEmail: "" }))}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('emailRecommended')}
                    </p>
                  </div>
                )}
                <div>
                  <Label htmlFor="intervalDays">{t('intervalDays')}</Label>
                  <Input
                    id="intervalDays"
                    type="number"
                    min="1"
                    placeholder="7"
                    value={createForm.intervalDays}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, intervalDays: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    间隔天数，必须大于0
                  </p>
                </div>
                <div>
                  <Label htmlFor="codesPerBatch">{t('codesPerBatch')}</Label>
                  <Input
                    id="codesPerBatch"
                    type="number"
                    min="1"
                    placeholder="5"
                    value={createForm.codesPerBatch}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, codesPerBatch: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    每次可创建的邀请码数量
                  </p>
                </div>
                <div>
                  <Label htmlFor="maxTotalCodes">{t('maxTotalCodes')}</Label>
                  <Input
                    id="maxTotalCodes"
                    type="number"
                    min="1"
                    placeholder="50"
                    value={createForm.maxTotalCodes}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, maxTotalCodes: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    最大累计邀请码数量
                  </p>
                </div>
                <Button
                  onClick={handleCreateConfig}
                  disabled={
                    isSubmitting ||
                    (createForm.configType === "specific" && !createForm.userEmail && !createForm.userId)
                  }
                  className="w-full"
                >
                  {isSubmitting ? t('creating') :
                   createForm.configType === "default" ? t('createGlobalConfig') : t('createUserConfig')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* 错误和成功提示 */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* 配置列表 */}
        <Card>
          <CardHeader>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </CardHeader>
          <CardContent>
            {configs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table.user')}</TableHead>
                    <TableHead>{t('table.intervalDays')}</TableHead>
                    <TableHead>{t('table.codesPerBatch')}</TableHead>
                    <TableHead>{t('table.maxTotalCodes')}</TableHead>
                    <TableHead>{t('table.creator')}</TableHead>
                    <TableHead>{t('table.createdAt')}</TableHead>
                    <TableHead>{t('table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell>
                        {config.user_id && config.user ? (
                          <div>
                            <div className="font-medium">{config.user.display_name}</div>
                            <div className="text-sm text-muted-foreground">@{config.user.username}</div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Settings className="h-4 w-4 text-green-500" />
                            <div>
                              <div className="font-medium text-green-600">{t('table.globalDefaultConfig')}</div>
                              <div className="text-sm text-muted-foreground">{t('table.forAllUsers')}</div>
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{config.interval_days} 天</TableCell>
                      <TableCell>{config.codes_per_batch} 个</TableCell>
                      <TableCell>{config.max_total_codes} 个</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {config.creator.display_name}
                          <div className="text-muted-foreground">@{config.creator.username}</div>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(config.created_at)}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteConfig(config.user_id || 'default')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">{t('empty.title')}</h3>
                <p className="text-muted-foreground">
                  {t('empty.description')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
