"use client"

import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { useState } from "react"

export default function SessionDebugPage() {
  const { data: session, status, update } = useSession()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefreshSession = async () => {
    setIsRefreshing(true)
    try {
      await update()
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Session Debug</h1>
        <Button 
          onClick={handleRefreshSession} 
          disabled={isRefreshing}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          刷新Session
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Session状态
            <Badge variant={status === 'authenticated' ? 'default' : 'secondary'}>
              {status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
            {JSON.stringify({ status, session }, null, 2)}
          </pre>
        </CardContent>
      </Card>

      {session?.user && (
        <Card>
          <CardHeader>
            <CardTitle>用户信息详情</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => { const user = session.user as any; return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">用户ID</label>
                <p className="font-mono text-sm">{user.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">用户名</label>
                <p>{user.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">显示名称</label>
                <p>{user.displayName || '未设置'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">邮箱</label>
                <p>{user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">信任等级</label>
                <div className="flex items-center gap-2">
                  <Badge variant={(user?.trustLevel ?? 0) >= 1 ? 'default' : 'secondary'}>
                    LV{user?.trustLevel ?? 0}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {(user?.trustLevel ?? 0) >= 1 && (user?.trustLevel ?? 0) <= 4 ? '有权限' : '权限不足'}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">角色</label>
                <Badge variant="outline">{user.role || 'user'}</Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">账户状态</label>
                <div className="flex gap-2">
                  <Badge variant={user.isActive ? 'default' : 'destructive'}>
                    {user.isActive ? '活跃' : '非活跃'}
                  </Badge>
                  {user.isSilenced && (
                    <Badge variant="destructive">已禁言</Badge>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">登录方式</label>
                <Badge variant="outline">{user.provider || 'unknown'}</Badge>
              </div>
            </div>
            ) })()}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>调试说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• 如果信任等级显示为0但数据库中不是0，说明session数据没有正确更新</p>
          <p>• 点击"刷新Session"按钮可以强制更新session数据</p>
          <p>• 检查浏览器控制台的日志，查看auth回调函数的调试信息</p>
          <p>• 如果问题持续存在，可能需要清除浏览器缓存或重新登录</p>
        </CardContent>
      </Card>
    </div>
  )
}
