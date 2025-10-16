"use client"

import { useState } from "react"
import { signIn, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FaGithub, FaGoogle } from 'react-icons/fa'
import { CheckCircle, XCircle, AlertCircle, User, Mail, Shield } from 'lucide-react'

export default function OAuthTestPage() {
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [testResults, setTestResults] = useState<{
    github?: boolean
    google?: boolean
    error?: string
  }>({})

  const handleOAuthTest = async (provider: 'github' | 'google') => {
    setIsLoading(true)
    setTestResults(prev => ({ ...prev, error: undefined }))

    try {
      const result = await signIn(provider, {
        redirect: false,
        callbackUrl: '/debug/oauth-test'
      })

      if (result?.error) {
        setTestResults(prev => ({
          ...prev,
          [provider]: false,
          error: `${provider} 登录失败: ${result.error}`
        }))
      } else {
        setTestResults(prev => ({ ...prev, [provider]: true }))
      }
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [provider]: false,
        error: `${provider} 登录异常: ${error}`
      }))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">OAuth 登录测试</h1>
          <p className="text-muted-foreground">
            测试 GitHub 和 Google OAuth 登录功能
          </p>
        </div>

        {/* 当前会话状态 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              当前会话状态
            </CardTitle>
          </CardHeader>
          <CardContent>
            {status === 'loading' ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span>加载中...</span>
              </div>
            ) : session ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium">已登录</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>用户ID:</strong> {session.user?.id}
                  </div>
                  <div>
                    <strong>用户名:</strong> {session.user?.name}
                  </div>
                  <div>
                    <strong>邮箱:</strong> {session.user?.email}
                  </div>
                  <div>
                    <strong>显示名:</strong> {(session.user as any)?.displayName}
                  </div>
                  <div>
                    <strong>信任等级:</strong>
                    <Badge variant="outline" className="ml-2">
                      LV{(session.user as any)?.trustLevel || 0}
                    </Badge>
                  </div>
                  <div>
                    <strong>角色:</strong>
                    <Badge variant="outline" className="ml-2">
                      {(session.user as any)?.role || 'user'}
                    </Badge>
                  </div>
                  <div>
                    <strong>登录方式:</strong> {(session.user as any)?.provider}
                  </div>
                  <div>
                    <strong>邮箱验证:</strong>
                    {(session.user as any)?.emailVerified ? (
                      <CheckCircle className="h-4 w-4 text-green-500 inline ml-2" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 inline ml-2" />
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span>未登录</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* OAuth 测试按钮 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              OAuth 登录测试
            </CardTitle>
            <CardDescription>
              点击下方按钮测试不同的 OAuth 登录方式
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* GitHub 测试 */}
              <div className="space-y-3">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => handleOAuthTest('github')}
                  disabled={isLoading}
                >
                  <FaGithub className="mr-2 h-5 w-5" />
                  测试 GitHub 登录
                </Button>
                {testResults.github !== undefined && (
                  <div className="flex items-center gap-2">
                    {testResults.github ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-green-600">GitHub 登录成功</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-red-600">GitHub 登录失败</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Google 测试 - 暂时禁用 */}
              <div className="space-y-3">
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={true}
                >
                  <FaGoogle className="mr-2 h-5 w-5" />
                  Google 登录 (暂时禁用)
                </Button>
                <div className="text-sm text-muted-foreground">
                  Google OAuth 需要 HTTPS 和公共域名，暂时禁用
                </div>
              </div>
            </div>

            {/* 错误信息 */}
            {testResults.error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{testResults.error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* 环境变量检查 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              环境变量检查
            </CardTitle>
            <CardDescription>
              检查必要的环境变量是否正确配置
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>NEXTAUTH_URL:</strong> {process.env.NEXTAUTH_URL || '未设置'}
                </div>
                <div>
                  <strong>NEXTAUTH_SECRET:</strong> {process.env.NEXTAUTH_SECRET ? '已设置' : '未设置'}
                </div>
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>注意:</strong> 确保在 .env.local 文件中正确配置了 GOOGLE_CLIENT_ID 和 GOOGLE_CLIENT_SECRET
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>

        {/* 配置指南链接 */}
        <Card>
          <CardHeader>
            <CardTitle>配置指南</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              如果遇到问题，请参考配置指南：
            </p>
            <ul className="text-sm space-y-1">
              <li>• <code>docs/google-oauth-setup.md</code> - Google OAuth 配置指南</li>
              <li>• <code>.env.example</code> - 环境变量配置示例</li>
              <li>• 确保重定向 URI 正确配置</li>
            </ul>
          </CardContent>
        </Card>

        {/* 诊断工具 */}
        <Card>
          <CardHeader>
            <CardTitle>诊断工具</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              如果遇到配置问题，可以运行以下命令进行诊断：
            </p>
            <div className="bg-muted p-3 rounded-md">
              <code className="text-sm">pnpm run diagnose-oauth</code>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
