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
  Loader2,
  Search,
  Edit,
  Trash2,
  Users,
  ArrowLeft,
  Crown,
  Shield,
  User,
  Mail,
  Calendar,
  Filter
} from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl"

interface User {
  id: string
  username: string
  email: string
  display_name: string
  trust_level: number
  role: string
  is_active: boolean
  is_silenced: boolean
  email_verified: boolean
  provider_type: string
  created_at: string
  last_login?: string
}

export default function UserManagementPage({ params }: { params: Promise<{ locale: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const resolvedParams = use(params)
  const locale = resolvedParams.locale
  const t = useTranslations('adminUsers')
  const tAdmin = useTranslations('admin')

  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterTrustLevel, setFilterTrustLevel] = useState('all')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

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
        title: tAdmin('errors.insufficientPermission'),
        description: tAdmin('errors.adminOnlyAccess'),
        variant: "destructive"
      })
      router.push(`/${locale}/admin`)
      return
    }
  }, [session, status, router, toast])

  // 加载用户列表
  const loadUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      const data = await response.json()

      if (data.success) {
        setUsers(data.users || [])
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
      loadUsers()
    }
  }, [session])

  // 过滤用户
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.display_name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesRole = filterRole === 'all' || user.role === filterRole
    const matchesTrustLevel = filterTrustLevel === 'all' || user.trust_level.toString() === filterTrustLevel

    return matchesSearch && matchesRole && matchesTrustLevel
  })

  // 更新用户信息
  const handleUpdateUser = async () => {
    if (!selectedUser) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trustLevel: selectedUser.trust_level,
          role: selectedUser.role,
          isActive: selectedUser.is_active,
          isSilenced: selectedUser.is_silenced
        })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: tAdmin('success.updateSuccess'),
          description: tAdmin('success.userUpdated')
        })
        setShowEditDialog(false)
        setSelectedUser(null)
        loadUsers()
      } else {
        toast({
          title: tAdmin('errors.updateFailed'),
          description: result.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: tAdmin('errors.updateFailed'),
        description: tAdmin('errors.networkError'),
        variant: "destructive"
      })
    } finally {
      setIsUpdating(false)
    }
  }

  // 获取角色徽章
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Badge className="bg-red-500 hover:bg-red-600"><Crown className="h-3 w-3 mr-1" />{t('roles.super_admin')}</Badge>
      case 'admin':
        return <Badge className="bg-blue-500 hover:bg-blue-600"><Shield className="h-3 w-3 mr-1" />{t('roles.admin')}</Badge>
      default:
        return <Badge variant="outline"><User className="h-3 w-3 mr-1" />{t('roles.user')}</Badge>
    }
  }

  // 获取信任等级颜色
  const getTrustLevelColor = (level: number) => {
    if (level >= 4) return "text-purple-600 font-bold"
    if (level >= 3) return "text-green-600 font-semibold"
    if (level >= 1) return "text-blue-600"
    return "text-gray-500"
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
          <Link href={`/${locale}/admin`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToAdmin')}
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">{t('stats.totalUsers')}</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">{t('stats.admins')}</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.role === 'admin' || u.role === 'super_admin').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">{t('stats.lv3PlusUsers')}</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.trust_level >= 3).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">{t('stats.activeUsers')}</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.is_active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和过滤 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('searchUsers')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">{t('searchUsers')}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder={t('searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Label>{t('filterByRole')}</Label>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allRoles')}</SelectItem>
                  <SelectItem value="user">{t('roles.user')}</SelectItem>
                  <SelectItem value="admin">{t('roles.admin')}</SelectItem>
                  <SelectItem value="super_admin">{t('roles.super_admin')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-48">
              <Label>{t('filterByTrustLevel')}</Label>
              <Select value={filterTrustLevel} onValueChange={setFilterTrustLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allTrustLevels')}</SelectItem>
                  <SelectItem value="0">LV0</SelectItem>
                  <SelectItem value="1">LV1</SelectItem>
                  <SelectItem value="2">LV2</SelectItem>
                  <SelectItem value="3">LV3</SelectItem>
                  <SelectItem value="4">LV4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 用户列表 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('userList')}</CardTitle>
          <CardDescription>
            {t('foundUsers', { count: filteredUsers.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('userInfo')}</TableHead>
                  <TableHead>{t('role')}</TableHead>
                  <TableHead>{t('trustLevel')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('registrationTime')}</TableHead>
                  <TableHead>{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{user.display_name || user.username}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {user.provider_type === 'github' ? 'GitHub' :
                           user.provider_type === 'google' ? 'Google' : '密码登录'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getRoleBadge(user.role)}
                    </TableCell>
                    <TableCell>
                      <span className={`font-mono ${getTrustLevelColor(user.trust_level)}`}>
                        LV{user.trust_level}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant={user.is_active ? "default" : "secondary"}>
                          {user.is_active ? t('active') : t('inactive')}
                        </Badge>
                        {user.is_silenced && (
                          <Badge variant="destructive">{t('silenced')}</Badge>
                        )}
                        {!user.email_verified && (
                          <Badge variant="outline">{t('emailNotVerified')}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(user.created_at).toLocaleDateString('zh-CN')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user)
                          setShowEditDialog(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 编辑用户对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('editUser')}</DialogTitle>
            <DialogDescription>
              {t('editUserDescription')}
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium mb-2">{t('userInfo')}</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="text-muted-foreground">{t('username')}：</span>{selectedUser.username}</p>
                  <p><span className="text-muted-foreground">{t('email')}：</span>{selectedUser.email}</p>
                  <p><span className="text-muted-foreground">{t('displayName')}：</span>{selectedUser.display_name}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('userRole')}</Label>
                  <Select
                    value={selectedUser.role}
                    onValueChange={(value) => setSelectedUser({...selectedUser, role: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">{t('roles.user')}</SelectItem>
                      <SelectItem value="admin">{t('roles.admin')}</SelectItem>
                      {(session?.user as any)?.role === 'super_admin' && (
                        <SelectItem value="super_admin">{t('roles.super_admin')}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('userTrustLevel')}</Label>
                  <Select
                    value={selectedUser.trust_level.toString()}
                    onValueChange={(value) => setSelectedUser({...selectedUser, trust_level: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">{t('trustLevels.0')}</SelectItem>
                      <SelectItem value="1">{t('trustLevels.1')}</SelectItem>
                      <SelectItem value="2">{t('trustLevels.2')}</SelectItem>
                      <SelectItem value="3">{t('trustLevels.3')}</SelectItem>
                      <SelectItem value="4">{t('trustLevels.4')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>{t('accountStatus')}</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={selectedUser.is_active}
                        onChange={(e) => setSelectedUser({...selectedUser, is_active: e.target.checked})}
                        className="rounded"
                      />
                      <Label htmlFor="is_active">{t('isActive')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_silenced"
                        checked={selectedUser.is_silenced}
                        onChange={(e) => setSelectedUser({...selectedUser, is_silenced: e.target.checked})}
                        className="rounded"
                      />
                      <Label htmlFor="is_silenced">{t('isSilenced')}</Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleUpdateUser} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('updating')}
                </>
              ) : (
                t('saveChanges')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
