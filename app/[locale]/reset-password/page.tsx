"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { FaEye, FaEyeSlash } from 'react-icons/fa'
import { Lock, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import { useTranslation } from "@/hooks/use-i18n"
import { useParams } from "next/navigation"

// 密码强度检查函数
function checkPasswordStrength(password: string) {
  let score = 0
  const feedback = []

  if (password.length >= 8) score++
  else feedback.push("至少8个字符")

  if (/[a-z]/.test(password)) score++
  else feedback.push("包含小写字母")

  if (/[A-Z]/.test(password)) score++
  else feedback.push("包含大写字母")

  if (/[0-9]/.test(password)) score++
  else feedback.push("包含数字")

  if (/[^A-Za-z0-9]/.test(password)) score++
  else feedback.push("包含特殊字符")

  return {
    score,
    isValid: score >= 3,
    feedback
  }
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams()
  const locale = (params as any)?.locale ?? 'en'
  const t = useTranslation('auth')

  const [token, setToken] = useState('')
  const [email, setEmail] = useState('')
  const [isValidating, setIsValidating] = useState(true)
  const [isValidToken, setIsValidToken] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: ""
  })

  const [passwordStrength, setPasswordStrength] = useState<{
    score: number
    isValid: boolean
    feedback: string[]
  } | null>(null)

  // 从URL参数获取token和email
  useEffect(() => {
    const tokenParam = searchParams?.get('token') ?? null
    const emailParam = searchParams?.get('email') ?? null

    if (tokenParam) {
      setToken(tokenParam)
      if (emailParam) {
        setEmail(emailParam)
      }
      validateToken(tokenParam, emailParam)
    } else {
      setError('重置链接无效：缺少令牌')
      setIsValidating(false)
    }
  }, [searchParams])

  // 验证重置令牌
  const validateToken = async (resetToken: string, userEmail?: string | null) => {
    try {
      const params = new URLSearchParams()
      if (userEmail) params.append('email', userEmail)
      params.append('token', resetToken)

      const response = await fetch(`/api/auth/reset-password?${params.toString()}`)
      const result = await response.json()

      if (result.success && result.valid) {
        setIsValidToken(true)
        // 使用API返回的邮箱地址
        if (result.email) {
          setEmail(result.email)
        } else if (!email && userEmail) {
          setEmail(userEmail)
        }
      } else {
        setError(result.error || '重置链接无效或已过期')
        setIsValidToken(false)
      }
    } catch (error) {
      setError('验证重置链接时出错')
      setIsValidToken(false)
    } finally {
      setIsValidating(false)
    }
  }

  // 处理密码重置
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (formData.newPassword !== formData.confirmPassword) {
      setError(t('register.errors.passwordMismatch') || "密码确认不匹配")
      setIsLoading(false)
      return
    }

    if (!passwordStrength?.isValid) {
      setError(t('register.errors.weakPassword') || "密码强度不足")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          token,
          newPassword: formData.newPassword
        })
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(t('forgotPassword.resetSuccess') || "密码重置成功")
        setTimeout(() => {
          router.push(`/${locale}/signin`)
        }, 2000)
      } else {
        setError(result.error || t('forgotPassword.errors.resetFailed') || "重置失败")
      }
    } catch (error) {
      setError(t('forgotPassword.errors.resetFailed') || "重置失败，请重试")
    } finally {
      setIsLoading(false)
    }
  }

  // 处理密码变化
  const handlePasswordChange = (value: string) => {
    setFormData(prev => ({ ...prev, newPassword: value }))
    setPasswordStrength(checkPasswordStrength(value))
    if (error) setError("")
  }

  // 获取密码强度文本
  const getPasswordStrengthText = (score: number) => {
    const labels = [
      t('register.passwordStrength.veryWeak') || "很弱",
      t('register.passwordStrength.weak') || "弱",
      t('register.passwordStrength.fair') || "一般",
      t('register.passwordStrength.good') || "良好",
      t('register.passwordStrength.strong') || "强"
    ]
    return labels[score] || ""
  }

  // 验证中
  if (isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>验证重置链接...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 令牌无效
  if (!isValidToken) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <CardTitle className="text-2xl">链接无效</CardTitle>
            <CardDescription>
              重置链接无效或已过期
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={() => router.push(`/${locale}/forgot-password`)}
              >
                重新申请重置密码
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/${locale}/signin`)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回登录
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 重置密码表单
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t('forgotPassword.resetTitle') || "重置密码"}</CardTitle>
          <CardDescription>
            {t('forgotPassword.resetDescription') || "为您的账户设置新密码"}
          </CardDescription>
          {email && (
            <p className="text-sm text-muted-foreground mt-2">
              账户：<strong>{email}</strong>
            </p>
          )}
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}，正在跳转到登录页面...</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t('forgotPassword.newPassword') || "新密码"}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder={t('forgotPassword.newPasswordPlaceholder') || "至少8个字符"}
                  value={formData.newPassword}
                  onChange={(e) => handlePasswordChange(e.target.value)}
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

              {/* 密码强度指示器 */}
              {formData.newPassword && passwordStrength && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Progress
                      value={(passwordStrength.score / 4) * 100}
                      className="flex-1 h-2"
                    />
                    <span className="text-sm font-medium">
                      {getPasswordStrengthText(passwordStrength.score)}
                    </span>
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {passwordStrength.feedback.map((item, index) => (
                        <li key={index}>• {item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('forgotPassword.confirmPassword') || "确认新密码"}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t('forgotPassword.confirmPasswordPlaceholder') || "再次输入新密码"}
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))
                    if (error) setError("")
                  }}
                  className="pl-10 pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <FaEyeSlash className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <FaEye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                <p className="text-sm text-red-500">{t('register.errors.passwordMismatch') || "密码确认不匹配"}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !passwordStrength?.isValid || !!success}
            >
              {isLoading ? (t('forgotPassword.resetting') || "重置中...") : (t('forgotPassword.resetButton') || "重置密码")}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Button
              variant="link"
              className="text-sm"
              onClick={() => router.push(`/${locale}/signin`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('forgotPassword.backToSignin') || "返回登录"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
