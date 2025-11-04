"use client"

import { useState, useEffect, useMemo } from "react"
import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FaGithub, FaGoogle, FaEye, FaEyeSlash } from 'react-icons/fa'
import { Mail, Lock, AlertCircle, User } from 'lucide-react'
import { useTranslation } from "@/hooks/use-i18n"
import { useParams } from "next/navigation"
import { useAuthFeatures } from "@/hooks/use-feature"

export default function SignInPage() {
  const { credentials, oauthEnabled, oauthProviders } = useAuthFeatures()
  const defaultTab = useMemo(() => {
    if (oauthEnabled && oauthProviders.length > 0) return "oauth"
    if (credentials) return "credentials"
    return "oauth"
  }, [oauthEnabled, oauthProviders, credentials])
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    identifier: "", // 支持邮箱或用户名
    password: ""
  })

  const router = useRouter()
  const params = useParams()
  const locale = (params as any)?.locale ?? 'en'
  const t = useTranslation('auth')
  const { data: session, status } = useSession()
  const linuxdoOnly = oauthEnabled && oauthProviders.length === 1 && oauthProviders[0] === 'linuxdo' && !credentials

  // 如果用户已经登录，重定向到主页
  useEffect(() => {
    if (status === 'loading') return // 等待session加载完成

    if (session?.user) {
      router.push(`/${locale}`)
    }
  }, [session, status, router, locale])

  const handleOAuthSignIn = async (provider: string) => {
    setIsLoading(true)
    setError("")
    try {
      await signIn(provider, { callbackUrl: "/" })
    } catch (error) {
      setError(t('errors.oauthFailed') || "OAuth 登录失败，请重试")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        identifier: formData.identifier,
        password: formData.password,
        redirect: false
      })

      if (result?.error) {
        setError(t('errors.invalidCredentials') || "邮箱或密码错误")
      } else if (result?.ok) {
        router.push("/")
      }
    } catch (error) {
      setError(t('errors.loginFailed') || "登录失败，请重试")
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError("")
  }

  // L站版仅显示 Linux.do 登录
  if (linuxdoOnly) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{t('signin.title') || "欢迎回来"}</CardTitle>
            <CardDescription>
              {t('signin.description') || "选择您的登录方式"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-3">
              <Button
                className="w-full"
                variant="outline"
                onClick={() => handleOAuthSignIn("linuxdo")}
                disabled={isLoading}
              >
                {isLoading ? (t('signin.signingIn') || "登录中...") : ("使用 Linux.do 登录")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t('signin.title') || "欢迎回来"}</CardTitle>
          <CardDescription>
            {t('signin.description') || "选择您的登录方式"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!oauthEnabled && !credentials && (
            <div className="mb-6 text-sm text-muted-foreground text-center">
              {t('signin.noAuthNeeded') || '此版本无需登录，可直接在本地使用（数据保存在本地浏览器）。'}
            </div>
          )}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              {oauthEnabled && oauthProviders.length > 0 && (
                <TabsTrigger value="oauth">{t('signin.oauthTab') || "第三方登录"}</TabsTrigger>
              )}
              {credentials && (
                <TabsTrigger value="credentials">{t('signin.credentialsTab') || "账号密码"}</TabsTrigger>
              )}
            </TabsList>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {oauthEnabled && oauthProviders.length > 0 && (
              <TabsContent value="oauth" className="space-y-4 mt-6">
                <div className="text-center text-sm text-muted-foreground mb-4">
                  {t('signin.oauthDescription') || "使用第三方账号快速登录"}
                </div>
                <div className="space-y-3">
                  {oauthProviders.includes('linuxdo') && (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => handleOAuthSignIn("linuxdo")}
                      disabled={isLoading}
                    >
                      {isLoading ? (t('signin.signingIn') || "登录中...") : ("使用 Linux.do 登录")}
                    </Button>
                  )}
                  {oauthProviders.includes('github') && (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => handleOAuthSignIn("github")}
                      disabled={isLoading}
                    >
                      <FaGithub className="mr-2 h-5 w-5" />
                      {isLoading ? (t('signin.signingIn') || "登录中...") : (t('signin.githubButton') || "使用 GitHub 登录")}
                    </Button>
                  )}
                  {oauthProviders.includes('google') && (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => handleOAuthSignIn("google")}
                      disabled={isLoading}
                    >
                      <FaGoogle className="mr-2 h-5 w-5" />
                      {isLoading ? (t('signin.signingIn') || "登录中...") : (t('signin.googleButton') || "使用 Google 登录")}
                    </Button>
                  )}
                </div>
              </TabsContent>
            )}

            {credentials && (
              <TabsContent value="credentials" className="space-y-4 mt-6">
                <form onSubmit={handleCredentialsSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="identifier">{t('signin.identifier') || "邮箱或用户名"}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="identifier"
                        type="text"
                        placeholder={t('signin.identifierPlaceholder') || "your@email.com 或 username"}
                        value={formData.identifier}
                        onChange={(e) => handleInputChange("identifier", e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">{t('signin.password') || "密码"}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder={t('signin.passwordPlaceholder') || "输入您的密码"}
                        value={formData.password}
                        onChange={(e) => handleInputChange("password", e.target.value)}
                        className="pl-10 pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <FaEyeSlash className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <FaEye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (t('signin.signingIn') || "登录中...") : (t('signin.signInButton') || "登录")}
                  </Button>
                </form>

                <div className="text-center space-y-2">
                  <Button
                    variant="link"
                    className="text-sm"
                    onClick={() => router.push(`/${locale}/forgot-password`)}
                  >
                    {t('signin.forgotPassword') || "忘记密码？"}
                  </Button>
                </div>
              </TabsContent>
            )}
          </Tabs>

          <div className="mt-6">
            <Separator className="my-4" />
            <div className="text-center">
              <span className="text-sm text-muted-foreground">{t('signin.noAccount') || "还没有账号？"}</span>
              <Button
                variant="link"
                className="text-sm p-0 ml-1"
                onClick={() => router.push(`/${locale}/register`)}
              >
                {t('signin.registerLink') || "立即注册"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
