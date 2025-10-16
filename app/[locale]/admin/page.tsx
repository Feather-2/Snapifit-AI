"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState, useEffect, use } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Settings,
  Users,
  Ticket,
  Shield,
  Database,
  BarChart3,
  ArrowRight,
  Crown,
  AlertTriangle
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { useTranslations } from "next-intl"

export default function AdminDashboard({ params }: { params: Promise<{ locale: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const resolvedParams = use(params)
  const locale = resolvedParams.locale
  const t = useTranslations('admin')
  const tCommon = useTranslations('common')


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
        title: t('errors.insufficientPermission'),
        description: t('errors.adminOnlyAccess'),
        variant: "destructive"
      })
      router.push('/settings')
      return
    }
  }, [session, status, router, toast])



  if (status === 'loading') {
    return (
      <div className="container mx-auto py-6 px-6 md:px-8 lg:px-12 max-w-6xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{tCommon('loading')}</p>
          </div>
        </div>
      </div>
    )
  }

  const userRole = (session?.user as any)?.role
  const isSuperAdmin = userRole === 'super_admin'

  return (
    <div className="container mx-auto py-6 px-6 md:px-8 lg:px-12 max-w-6xl">
      {/* 页面头部 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Crown className="h-8 w-8 text-yellow-500" />
          <div>
            <h1 className="text-3xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground">{t('description')}</p>
          </div>
        </div>

        {/* 管理员信息 */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  {t('welcome', { name: session?.user?.displayName || session?.user?.name })}
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {t('rolePermission', { role: isSuperAdmin ? t('roleSuperAdmin') : t('roleAdmin') })}
                </p>
              </div>
            </div>
            <Badge variant={isSuperAdmin ? "default" : "secondary"}>
              {isSuperAdmin ? t('roleSuperAdmin') : t('roleAdmin')}
            </Badge>
          </div>
        </div>
      </div>

      {/* 管理功能网格 */}
      <div className="space-y-6">
        {/* 第一行：邀请码配置 + 用户管理 (各占1.5宽度) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 邀请码配置 */}
          <Card className="hover:shadow-lg transition-shadow flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Ticket className="h-6 w-6 text-green-600" />
                <Badge variant="outline">{t('available')}</Badge>
              </div>
              <CardTitle className="text-lg">{t('inviteConfigs')}</CardTitle>
              <CardDescription className="text-sm mb-2">
                {t('inviteConfigsDescription')}
              </CardDescription>
              <div className="text-xs text-muted-foreground leading-relaxed">
                • {t('features.inviteConfigs.item1')}<br/>
                • {t('features.inviteConfigs.item2')}<br/>
                • {t('features.inviteConfigs.item3')}
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-end pt-0">
              <div className="flex justify-end">
                <Link
                  href={`/${locale}/admin/invite-configs`}
                  className="text-sm text-green-600 hover:text-green-700 hover:underline transition-colors flex items-center gap-1"
                >
                  {t('manageConfig')}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* 用户管理 */}
          <Card className="hover:shadow-lg transition-shadow flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Users className="h-6 w-6 text-green-600" />
                <Badge variant="outline">{t('available')}</Badge>
              </div>
              <CardTitle className="text-lg">{t('userManagement')}</CardTitle>
              <CardDescription className="text-sm mb-2">
                {t('userManagementDescription')}
              </CardDescription>
              <div className="text-xs text-muted-foreground leading-relaxed">
                • {t('features.userManagement.item1')}<br/>
                • {t('features.userManagement.item2')}<br/>
                • {t('features.userManagement.item3')}
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-end pt-0">
              <div className="flex justify-end">
                <Link
                  href={`/${locale}/admin/users`}
                  className="text-sm text-green-600 hover:text-green-700 hover:underline transition-colors flex items-center gap-1"
                >
                  {t('manageUsers')}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 第二行：系统设置 + 数据统计 + 安全中心 (各占1宽度) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 系统设置 */}
          <Card className="hover:shadow-lg transition-shadow flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Database className="h-6 w-6 text-green-600" />
                <Badge variant="outline">{t('available')}</Badge>
              </div>
              <CardTitle className="text-lg">{t('systemSettings')}</CardTitle>
              <CardDescription className="text-sm mb-2">
                {t('systemSettingsDescription')}
              </CardDescription>
              <div className="text-xs text-muted-foreground leading-relaxed">
                • {t('features.systemSettings.item1')}<br/>
                • {t('features.systemSettings.item2')}<br/>
                • {t('features.systemSettings.item3')}
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-end pt-0">
              <div className="flex justify-end">
                <Link
                  href={`/${locale}/admin/system`}
                  className="text-sm text-green-600 hover:text-green-700 hover:underline transition-colors flex items-center gap-1"
                >
                  {t('manageSystem')}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* 数据统计 */}
          <Card className="hover:shadow-lg transition-shadow flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <BarChart3 className="h-6 w-6 text-green-600" />
                <Badge variant="outline">{t('available')}</Badge>
              </div>
              <CardTitle className="text-lg">{t('analytics')}</CardTitle>
              <CardDescription className="text-sm mb-2">
                {t('analyticsDescription')}
              </CardDescription>
              <div className="text-xs text-muted-foreground leading-relaxed">
                • {t('features.analytics.item1')}<br/>
                • {t('features.analytics.item2')}<br/>
                • {t('features.analytics.item3')}
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-end pt-0">
              <div className="flex justify-end">
                <Link
                  href={`/${locale}/admin/analytics`}
                  className="text-sm text-green-600 hover:text-green-700 hover:underline transition-colors flex items-center gap-1"
                >
                  {t('viewAnalytics')}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* 安全中心 */}
          <Card className="hover:shadow-lg transition-shadow flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Shield className="h-6 w-6 text-green-600" />
                <Badge variant="outline">{t('available')}</Badge>
              </div>
              <CardTitle className="text-lg">{t('security')}</CardTitle>
              <CardDescription className="text-sm mb-2">
                {t('securityDescription')}
              </CardDescription>
              <div className="text-xs text-muted-foreground leading-relaxed">
                • {t('features.security.item1')}<br/>
                • {t('features.security.item2')}<br/>
                • {t('features.security.item3')}
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-end pt-0">
              <div className="flex justify-end">
                <Link
                  href={`/${locale}/admin/security`}
                  className="text-sm text-green-600 hover:text-green-700 hover:underline transition-colors flex items-center gap-1"
                >
                  {t('manageSecurity')}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 底部提示 */}
      <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
              {t('notice.title')}
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              {t('notice.description')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
