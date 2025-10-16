"use client"

import { useState, useEffect, use } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
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
  Loader2,
  ArrowLeft,
  Shield,
  AlertTriangle,
  Ban,
  Eye,
  Trash2,
  Plus,
  RefreshCw,
  Clock,
  MapPin,
  User
} from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl"


interface SecurityEvent {
  id: string
  user_id: string
  event_type: string
  severity: string
  description: string
  ip_address: string
  user_agent: string
  created_at: string
  metadata?: any
  user_info?: {
    username: string
    email: string
  }
}

interface BlockedIP {
  id: string
  ip_address: string
  reason: string
  severity: string
  banned_at: string
  expires_at?: string
  is_active: boolean
  ban_type: string
  created_by: string
}

export default function SecurityCenterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const resolvedParams = use(params)
  const locale = resolvedParams.locale
  const t = useTranslations('adminSecurity')

  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([])
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showBlockDialog, setShowBlockDialog] = useState(false)
  const [newBlockIP, setNewBlockIP] = useState('')
  const [blockReason, setBlockReason] = useState('')
  const [isBlocking, setIsBlocking] = useState(false)

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
        title: "权限不足",
        description: "只有管理员可以访问此页面",
        variant: "destructive"
      })
      router.push('/admin')
      return
    }
  }, [session, status, router, toast])

  // 加载安全数据
  const loadSecurityData = async () => {
    try {
      const [eventsResponse, ipsResponse] = await Promise.all([
        fetch('/api/admin/security/events'),
        fetch('/api/admin/security/blocked-ips')
      ])

      const eventsData = await eventsResponse.json()
      const ipsData = await ipsResponse.json()

      if (eventsData.success) {
        setSecurityEvents(eventsData.events || [])
      }

      if (ipsData.success) {
        setBlockedIPs(ipsData.blockedIPs || [])
      }
    } catch (error) {
      toast({
        title: "加载失败",
        description: "网络错误，请稍后重试",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user) {
      loadSecurityData()
    }
  }, [session])

  // 封禁IP
  const handleBlockIP = async () => {
    if (!newBlockIP.trim() || !blockReason.trim()) {
      toast({
        title: "请填写完整信息",
        description: "IP地址和封禁原因都是必填项",
        variant: "destructive"
      })
      return
    }

    setIsBlocking(true)
    try {
      const response = await fetch('/api/admin/security/block-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ipAddress: newBlockIP.trim(),
          reason: blockReason.trim()
        })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "封禁成功",
          description: "IP地址已被封禁"
        })
        setShowBlockDialog(false)
        setNewBlockIP('')
        setBlockReason('')
        loadSecurityData()
      } else {
        toast({
          title: "封禁失败",
          description: result.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "封禁失败",
        description: "网络错误，请稍后重试",
        variant: "destructive"
      })
    } finally {
      setIsBlocking(false)
    }
  }

  // 解封IP
  const handleUnblockIP = async (ipId: string) => {
    try {
      const response = await fetch(`/api/admin/security/blocked-ips/${ipId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "解封成功",
          description: "IP地址已解封"
        })
        loadSecurityData()
      } else {
        toast({
          title: "解封失败",
          description: result.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "解封失败",
        description: "网络错误，请稍后重试",
        variant: "destructive"
      })
    }
  }

  // 获取事件类型徽章
  const getEventTypeBadge = (eventType: string, severity: string) => {
    const getSeverityColor = (sev: string) => {
      switch (sev) {
        case 'critical': return 'destructive'
        case 'high': return 'destructive'
        case 'medium': return 'secondary'
        case 'low': return 'outline'
        default: return 'outline'
      }
    }

    const getEventTypeText = (type: string) => {
      switch (type) {
        case 'rate_limit_exceeded': return t('eventTypes.rateLimitExceeded')
        case 'invalid_input': return t('eventTypes.invalidInput')
        case 'unauthorized_access': return t('eventTypes.unauthorizedAccess')
        case 'suspicious_activity': return t('eventTypes.suspiciousActivity')
        case 'brute_force_attempt': return t('eventTypes.bruteForceAttempt')
        case 'data_injection_attempt': return t('eventTypes.dataInjectionAttempt')
        case 'file_upload_violation': return t('eventTypes.fileUploadViolation')
        case 'api_abuse': return t('eventTypes.apiAbuse')
        case 'privilege_escalation_attempt': return t('eventTypes.privilegeEscalationAttempt')
        case 'system_maintenance': return t('eventTypes.systemMaintenance')
        default: return type
      }
    }

    return (
      <Badge variant={getSeverityColor(severity) as any}>
        {getEventTypeText(eventType)}
      </Badge>
    )
  }

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
        <Button onClick={loadSecurityData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('refresh')}
        </Button>
      </div>

      {/* 安全概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">{t('todayEvents')}</p>
                <p className="text-2xl font-bold">
                  {securityEvents.filter(e =>
                    new Date(e.created_at).toDateString() === new Date().toDateString()
                  ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">{t('blockedIPs')}</p>
                <p className="text-2xl font-bold">{blockedIPs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">{t('systemStatus')}</p>
                <p className="text-lg font-semibold text-green-600">{t('secure')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">{t('monitoringStatus')}</p>
                <p className="text-lg font-semibold text-blue-600">{t('normal')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 安全事件日志 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('securityEvents')}</CardTitle>
            <CardDescription>
              {t('securityEventsDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('eventType')}</TableHead>
                    <TableHead>{t('user')}</TableHead>
                    <TableHead>{t('ipAddress')}</TableHead>
                    <TableHead>{t('eventDescription')}</TableHead>
                    <TableHead>{t('time')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {securityEvents.slice(0, 10).map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        {getEventTypeBadge(event.event_type, event.severity)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">
                            {event.user_info?.username || t('unknownUser')}
                          </div>
                          {event.user_info?.email && (
                            <div className="text-xs text-muted-foreground">
                              {event.user_info.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.ip_address}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate" title={event.description}>
                          {event.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(event.created_at).toLocaleString('zh-CN')}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {securityEvents.length === 0 && (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">{t('noSecurityEvents')}</h3>
                <p className="text-muted-foreground">{t('noSecurityEventsDescription')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* IP黑名单管理 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('ipBlacklist')}</CardTitle>
                <CardDescription>
                  {t('ipBlacklistDescription')}
                </CardDescription>
              </div>
              <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('blockIP')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('blockIPTitle')}</DialogTitle>
                    <DialogDescription>
                      {t('blockIPDescription')}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t('ipAddressLabel')}</Label>
                      <Input
                        placeholder={t('ipAddressPlaceholder')}
                        value={newBlockIP}
                        onChange={(e) => setNewBlockIP(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('blockReasonLabel')}</Label>
                      <Input
                        placeholder={t('blockReasonPlaceholder')}
                        value={blockReason}
                        onChange={(e) => setBlockReason(e.target.value)}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowBlockDialog(false)}>
                      {t('cancel')}
                    </Button>
                    <Button onClick={handleBlockIP} disabled={isBlocking}>
                      {isBlocking ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t('blocking')}
                        </>
                      ) : (
                        t('confirmBlock')
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('ipAddress')}</TableHead>
                    <TableHead>{t('blockReasonLabel')}</TableHead>
                    <TableHead>{t('blockTime')}</TableHead>
                    <TableHead>{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blockedIPs.map((ip) => (
                    <TableRow key={ip.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Ban className="h-4 w-4 text-red-500" />
                          <span className="font-mono">{ip.ip_address}</span>
                        </div>
                      </TableCell>
                      <TableCell>{ip.reason}</TableCell>
                      <TableCell>
                        {new Date(ip.banned_at).toLocaleString('zh-CN')}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnblockIP(ip.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {blockedIPs.length === 0 && (
              <div className="text-center py-8">
                <Ban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">{t('noBlockedIPs')}</h3>
                <p className="text-muted-foreground">{t('noBlockedIPsDescription')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
