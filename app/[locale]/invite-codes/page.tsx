"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
import { Gift, Plus, Copy, Trash2, AlertCircle, CheckCircle, Clock, User, Settings } from 'lucide-react'
import { useParams } from "next/navigation"

interface InviteCode {
  id: string
  code: string
  created_at: string
  used_at?: string
  expires_at?: string
  is_active: boolean
  description?: string
  used_user?: {
    username: string
    display_name: string
  }
}

interface QuotaInfo {
  user_id: string
  interval_days: number
  codes_per_batch: number
  max_total_codes: number
  current_total: number
  last_created_at: string | null
  next_allowed_at: string | null
  can_create: boolean
  can_create_reason: string
}

export default function InviteCodesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const t = useTranslations('inviteCodes')

  const [codes, setCodes] = useState<InviteCode[]>([])
  const [quota, setQuota] = useState<QuotaInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showUseDialog, setShowUseDialog] = useState(false)

  const [createForm, setCreateForm] = useState({
    description: "",
    expiresInDays: "",
    count: ""
  })

  const [useForm, setUseForm] = useState({
    code: ""
  })

  // 优化的数据加载逻辑
  const [hasInitialLoad, setHasInitialLoad] = useState(false)

  useEffect(() => {
    if (status === "loading") return
    if (!session) {
      router.push(`/${locale}/signin`)
      return
    }
    // 只在初次加载时自动获取数据
    if (!hasInitialLoad) {
      loadData()
      setHasInitialLoad(true)
    }
  }, [session, status, hasInitialLoad])

  const loadData = async (force = false) => {
    // 如果不是强制刷新且已有数据，则跳过
    if (!force && codes.length > 0 && quota) {
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch('/api/invite-codes')
      const result = await response.json()

      if (result.error) {
        setError(result.error)
      } else {
        setCodes(result.codes || [])
        setQuota(result.quota)
      }
    } catch (error) {
      setError(t('messages.loadFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateCode = async () => {
    setIsCreating(true)
    setError("")

    try {
      const response = await fetch('/api/invite-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: createForm.description,
          expiresInDays: createForm.expiresInDays ? parseInt(createForm.expiresInDays) : undefined,
          count: createForm.count ? parseInt(createForm.count) : undefined
        })
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(t('messages.createSuccess'))
        setShowCreateDialog(false)
        setCreateForm({ description: "", expiresInDays: "", count: "" })
        loadData(true) // 强制刷新数据
      } else {
        setError(result.error)
      }
    } catch (error) {
      setError(t('messages.createFailed'))
    } finally {
      setIsCreating(false)
    }
  }

  const handleUseCode = async () => {
    setIsCreating(true)
    setError("")

    try {
      const response = await fetch('/api/invite-codes/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: useForm.code })
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(t('messages.useSuccess'))
        setShowUseDialog(false)
        setUseForm({ code: "" })
        // 延迟刷新页面以显示成功消息
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setError(result.error)
      }
    } catch (error) {
      setError(t('messages.useFailed'))
    } finally {
      setIsCreating(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setSuccess(t('messages.copied'))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN')
  }

  const getStatusBadge = (code: InviteCode) => {
    if (code.used_at) {
      return <Badge variant="secondary">已使用</Badge>
    }
    if (code.expires_at && new Date(code.expires_at) < new Date()) {
      return <Badge variant="destructive">已过期</Badge>
    }
    if (code.is_active) {
      return <Badge variant="default">有效</Badge>
    }
    return <Badge variant="outline">已禁用</Badge>
  }

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

  const userTrustLevel = (session?.user as any)?.trustLevel || 0

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {t('title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('description')}
          </p>
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

        {/* 用户等级和额度信息 */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('userLevel')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('currentLevel')}</span>
                <Badge
                  variant={userTrustLevel >= 3 ? "default" : "secondary"}
                  className={userTrustLevel >= 3 ? 'bg-green-600' : ''}
                >
                  LV{userTrustLevel}
                </Badge>
              </div>

              {userTrustLevel < 3 ? (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p>• {t('dailyUsage')}：0次</p>
                  <p>• 使用邀请码可升级到LV3</p>
                </div>
              ) : (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p>• {t('dailyUsage')}：150次</p>
                  <p>• {t('canCreateCodes')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {quota ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('quota')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-600">{quota.interval_days}</div>
                      <div className="text-xs text-gray-500">{t('intervalDays')}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{quota.codes_per_batch}</div>
                      <div className="text-xs text-gray-500">{t('codesPerBatch')}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{quota.current_total}/{quota.max_total_codes}</div>
                      <div className="text-xs text-gray-500">{t('progress')}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('status')}</span>
                    <Badge variant={quota.can_create ? "default" : "secondary"} className={quota.can_create ? 'bg-green-600' : ''}>
                      {quota.can_create ? t('canCreate') : t('restricted')}
                    </Badge>
                  </div>

                  {!quota.can_create && (
                    <div className="text-sm text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg">
                      {quota.can_create_reason}
                    </div>
                  )}

                  {quota.next_allowed_at && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {t('nextAllowedAt')}：{new Date(quota.next_allowed_at).toLocaleString(locale)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/10">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 mx-auto rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                    <Settings className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{t('noQuota')}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('noQuotaDesc')}</p>
                  </div>
                  <Button
                    onClick={() => window.open(`/${locale}/admin/invite-configs`, '_blank')}
                    variant="outline"
                    className="border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-950/20"
                  >
                    {t('goToConfig')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-4">
          {quota && quota.can_create && (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('createInviteCode')}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{t('createDialog.title')}</DialogTitle>
                  <DialogDescription>
                    {t('createDialog.description')}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="count">{t('createDialog.count')}</Label>
                    <Input
                      id="count"
                      type="number"
                      placeholder={`最多 ${quota?.codes_per_batch || 1} 个`}
                      value={createForm.count}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, count: e.target.value }))}
                      max={quota?.codes_per_batch || 1}
                      min="1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expiresInDays">{t('createDialog.expiresInDays')}</Label>
                    <Input
                      id="expiresInDays"
                      type="number"
                      placeholder="永不过期"
                      value={createForm.expiresInDays}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, expiresInDays: e.target.value }))}
                      min="1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">{t('createDialog.description')}</Label>
                    <Input
                      id="description"
                      placeholder="为这批邀请码添加备注"
                      value={createForm.description}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="flex-1" disabled={isCreating}>
                      {t('createDialog.cancel')}
                    </Button>
                    <Button onClick={handleCreateCode} disabled={isCreating} className="flex-1 bg-green-600 hover:bg-green-700">
                      {isCreating ? t('createDialog.creating') : t('createDialog.create')}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {userTrustLevel < 3 && (
            <Dialog open={showUseDialog} onOpenChange={setShowUseDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/20">
                  <Gift className="h-4 w-4 mr-2" />
                  {t('useInviteCode')}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader className="text-center pb-4">
                  <div className="mx-auto w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full flex items-center justify-center mb-4">
                    <Gift className="h-6 w-6 text-white" />
                  </div>
                  <DialogTitle className="text-xl font-semibold">使用邀请码</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    输入邀请码升级到LV3，解锁更多功能和权限
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  {/* 升级说明卡片 */}
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-sm font-medium text-amber-900 dark:text-amber-100">升级到LV3后您将获得</span>
                    </div>
                    <div className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                        每日使用次数：150次
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                        创建邀请码权限（需管理员配置）
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                        更多社区功能访问权限
                      </div>
                    </div>
                  </div>

                  {/* 邀请码输入 */}
                  <div className="space-y-2">
                    <Label htmlFor="code" className="text-sm font-medium flex items-center gap-2">
                      <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                      邀请码
                    </Label>
                    <Input
                      id="code"
                      placeholder="XXXX-YYYY-ZZZZ"
                      value={useForm.code}
                      onChange={(e) => {
                        let value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '')
                        // 自动添加分隔符
                        if (value.length <= 14) {
                          if (value.length > 4 && value.charAt(4) !== '-') {
                            value = value.slice(0, 4) + '-' + value.slice(4)
                          }
                          if (value.length > 9 && value.charAt(9) !== '-') {
                            value = value.slice(0, 9) + '-' + value.slice(9)
                          }
                        }
                        setUseForm(prev => ({ ...prev, code: value }))
                      }}
                      maxLength={14}
                      className="text-center text-lg font-mono tracking-wider transition-all duration-200 focus:ring-2 focus:ring-amber-500"
                      style={{ letterSpacing: '0.1em' }}
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      邀请码格式：XXXX-YYYY-ZZZZ（12位字符+分隔符）
                    </p>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowUseDialog(false)}
                      className="flex-1"
                      disabled={isCreating}
                    >
                      取消
                    </Button>
                    <Button
                      onClick={handleUseCode}
                      disabled={isCreating || !useForm.code || useForm.code.length !== 14}
                      className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg"
                    >
                      {isCreating ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          升级中...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          升级到LV3
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* 邀请码列表 */}
        {codes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>我的邀请码</CardTitle>
              <CardDescription>您创建的所有邀请码</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>邀请码</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead>使用时间</TableHead>
                    <TableHead>使用者</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell>
                        <div className="font-mono text-sm bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 px-3 py-2 rounded-lg border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 inline-block">
                          {code.code}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(code)}</TableCell>
                      <TableCell>{formatDate(code.created_at)}</TableCell>
                      <TableCell>
                        {code.used_at ? formatDate(code.used_at) : '-'}
                      </TableCell>
                      <TableCell>
                        {code.used_user ?
                          `${code.used_user.display_name} (@${code.used_user.username})` :
                          '-'
                        }
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(code.code)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {codes.length === 0 && !isLoading && (
          <Card>
            <CardContent className="text-center py-8">
              <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('empty.title')}</h3>
              <p className="text-muted-foreground mb-4">
                {quota && quota.can_create ?
                  t('empty.createFirst') :
                  (userTrustLevel < 3 ? t('empty.upgradeFirst') : '您没有创建邀请码的权限，请联系管理员配置权限')
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
