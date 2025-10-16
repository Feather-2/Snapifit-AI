"use client"

import { useState, useEffect, use } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  ArrowLeft,
  Settings,
  AlertTriangle,
  Save
} from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl"


interface SystemConfig {
  maintenance_mode: boolean
  registration_enabled: boolean
  require_invite_code: boolean
  max_daily_usage: number
  default_trust_level: number
  system_message: string
}

export default function SystemSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const resolvedParams = use(params)
  const locale = resolvedParams.locale
  const t = useTranslations('adminSystem')
  const tAdmin = useTranslations('admin')

  const [config, setConfig] = useState<SystemConfig>({
    maintenance_mode: false,
    registration_enabled: true,
    require_invite_code: false,
    max_daily_usage: 150,
    default_trust_level: 0,
    system_message: ''
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // 权限检查
  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user) {
      router.push('/auth/signin')
      return
    }

    const userRole = (session.user as any)?.role
    if (userRole !== 'super_admin') {
      toast({
        title: tAdmin('errors.insufficientPermission'),
        description: tAdmin('errors.superAdminOnlyAccess'),
        variant: "destructive"
      })
      router.push(`/${locale}/admin`)
      return
    }
  }, [session, status, router, toast])

  // 加载系统配置
  const loadConfig = async () => {
    try {
      const response = await fetch('/api/admin/system/config')
      const data = await response.json()

      if (data.success) {
        setConfig(data.config)
      } else {
        toast({
          title: tAdmin('errors.loadFailed'),
          description: data.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: tAdmin('errors.loadFailed'),
        description: tAdmin('errors.networkError'),
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user) {
      loadConfig()
    }
  }, [session])

  // 保存配置
  const handleSaveConfig = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/admin/system/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: tAdmin('success.saveSuccess'),
          description: tAdmin('success.configUpdated')
        })
      } else {
        toast({
          title: tAdmin('errors.saveFailed'),
          description: result.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: tAdmin('errors.saveFailed'),
        description: tAdmin('errors.networkError'),
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }



  if (status === 'loading' || isLoading) {
    return (
      <div className="container mx-auto py-6 px-6 md:px-8 lg:px-12 max-w-6xl">
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
    <div className="container mx-auto py-6 px-6 md:px-8 lg:px-12 max-w-6xl">
      {/* 页面头部 */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${locale}/admin`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToAdmin')}
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <Button onClick={handleSaveConfig} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('saving')}
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {t('saveSettings')}
            </>
          )}
        </Button>
      </div>

      {/* 警告提示 */}
      <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-800 dark:text-red-200 mb-1">
              {t('warning.title')}
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300">
              {t('warning.description')}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* 基本设置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {t('basicSettings')}
            </CardTitle>
            <CardDescription>
              {t('description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>{t('maintenanceMode')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('maintenanceModeDescription')}
                </p>
              </div>
              <Switch
                checked={config.maintenance_mode}
                onCheckedChange={(checked) =>
                  setConfig(prev => ({ ...prev, maintenance_mode: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>{t('registrationEnabled')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('registrationEnabledDescription')}
                </p>
              </div>
              <Switch
                checked={config.registration_enabled}
                onCheckedChange={(checked) =>
                  setConfig(prev => ({ ...prev, registration_enabled: checked }))
                }
              />
            </div>

            {config.registration_enabled && (
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>{t('requireInviteCode')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('requireInviteCodeDescription')}
                  </p>
                </div>
                <Switch
                  checked={config.require_invite_code}
                  onCheckedChange={(checked) =>
                    setConfig(prev => ({ ...prev, require_invite_code: checked }))
                  }
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>{t('maxDailyUsage')}</Label>
              <Input
                type="number"
                min="0"
                max="1000"
                value={config.max_daily_usage}
                onChange={(e) =>
                  setConfig(prev => ({ ...prev, max_daily_usage: parseInt(e.target.value) || 0 }))
                }
              />
              <p className="text-sm text-muted-foreground">
                {t('maxDailyUsageDescription')}
              </p>
            </div>

            <div className="space-y-2">
              <Label>{t('defaultTrustLevel')}</Label>
              <Select
                value={config.default_trust_level.toString()}
                onValueChange={(value) =>
                  setConfig(prev => ({ ...prev, default_trust_level: parseInt(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{t('trustLevels.0')}</SelectItem>
                  <SelectItem value="1">{t('trustLevels.1')}</SelectItem>
                  <SelectItem value="2">{t('trustLevels.2')}</SelectItem>
                  <SelectItem value="3">{t('trustLevels.3')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {t('defaultTrustLevelDescription')}
              </p>
            </div>

            <div className="space-y-2">
              <Label>{t('systemAnnouncement')}</Label>
              <Textarea
                placeholder={t('systemAnnouncementPlaceholder')}
                value={config.system_message}
                onChange={(e) =>
                  setConfig(prev => ({ ...prev, system_message: e.target.value }))
                }
                className="min-h-[100px]"
              />
              <p className="text-sm text-muted-foreground">
                {t('systemAnnouncementDescription')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
