"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { FaEye, FaEyeSlash } from 'react-icons/fa'
import { Mail, Lock, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import { useTranslation } from "@/hooks/use-i18n"
import { useParams } from "next/navigation"
import { MathCaptcha } from "@/components/ui/math-captcha"

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1) // 1: 输入邮箱, 2: 邮件已发送, 3: 重置密码
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [email, setEmail] = useState("")
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number
    feedback: string[]
    isValid: boolean
  } | null>(null)

  const [resetData, setResetData] = useState({
    newPassword: "",
    confirmPassword: ""
  })

  const [captchaData, setCaptchaData] = useState<{
    sessionId: string
    answer: number
  } | null>(null)

  const router = useRouter()
  const params = useParams()
  const locale = (params as any)?.locale ?? 'en'
  const searchParams = useSearchParams()
  const token = searchParams?.get('token') ?? null
  const emailParam = searchParams?.get('email') ?? null
  const t = useTranslation('auth')

  // 如果URL中有token和email，直接进入重置密码步骤
  useState(() => {
    if (token && emailParam) {
      setEmail(emailParam)
      setStep(3)
      // 验证token有效性
      validateResetToken(emailParam, token)
    }
  })

  const validateResetToken = async (email: string, token: string) => {
    try {
      const response = await fetch(`/api/auth/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`)
      const result = await response.json()

      if (!result.valid) {
        setError(t('forgotPassword.errors.invalidToken') || "重置链接无效或已过期")
        setStep(1)
      }
    } catch (error) {
      setError(t('forgotPassword.errors.tokenValidationFailed') || "验证重置链接时出错")
      setStep(1)
    }
  }

  const checkPasswordStrength = (password: string) => {
    const feedback: string[] = []
    let score = 0

    if (password.length >= 8) score += 1
    else feedback.push(t('register.passwordFeedback.minLength') || "至少需要8个字符")

    if (/[a-z]/.test(password)) score += 1
    else feedback.push(t('register.passwordFeedback.lowercase') || "需要包含小写字母")

    if (/[A-Z]/.test(password)) score += 1
    else feedback.push(t('register.passwordFeedback.uppercase') || "需要包含大写字母")

    if (/\d/.test(password)) score += 1
    else feedback.push(t('register.passwordFeedback.number') || "需要包含数字")

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1
    else feedback.push(t('register.passwordFeedback.special') || "建议包含特殊字符")

    const isValid = score >= 3 && password.length >= 8

    return { score: Math.min(4, score), feedback, isValid }
  }

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // 检查验证码
    if (!captchaData) {
      setError(t('forgotPassword.errors.captchaRequired') || "请完成人机验证")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          captcha: captchaData
        })
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(t('forgotPassword.emailSent') || "重置邮件已发送")
        setStep(2)
      } else {
        setError(result.error || t('forgotPassword.errors.sendFailed') || "发送失败")
        // 如果是验证码错误，清除验证码数据以要求重新验证
        if (result.error?.includes('验证码') || result.error?.includes('captcha')) {
          setCaptchaData(null)
        }
      }
    } catch (error) {
      setError(t('forgotPassword.errors.sendFailed') || "发送失败，请重试")
      setCaptchaData(null) // 网络错误时也清除验证码
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (resetData.newPassword !== resetData.confirmPassword) {
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
          newPassword: resetData.newPassword
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

  const handlePasswordChange = (value: string) => {
    setResetData(prev => ({ ...prev, newPassword: value }))
    setPasswordStrength(checkPasswordStrength(value))
    if (error) setError("")
  }

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

  // 处理验证码验证
  const handleCaptchaVerify = (data: { sessionId: string; answer: number }) => {
    setCaptchaData(data)
    if (error) setError("") // 清除之前的错误
  }

  // 处理验证码错误
  const handleCaptchaError = (errorMsg: string) => {
    setError(errorMsg)
    setCaptchaData(null)
  }

  // 步骤1：输入邮箱
  if (step === 1) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{t('forgotPassword.title') || "忘记密码"}</CardTitle>
            <CardDescription>
              {t('forgotPassword.description') || "输入您的邮箱地址，我们将发送重置链接"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSendResetEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('forgotPassword.email') || "邮箱地址"}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('forgotPassword.emailPlaceholder') || "your@email.com"}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (error) setError("")
                    }}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* 人机验证 */}
              <MathCaptcha
                onVerify={handleCaptchaVerify}
                onError={handleCaptchaError}
                disabled={isLoading}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !captchaData}
              >
                {isLoading ? (t('forgotPassword.sending') || "发送中...") : (t('forgotPassword.sendButton') || "发送重置邮件")}
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

  // 步骤2：邮件已发送
  if (step === 2) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <CardTitle className="text-2xl">{t('forgotPassword.emailSentTitle') || "邮件已发送"}</CardTitle>
            <CardDescription>
              {t('forgotPassword.emailSentDescription') || "请检查您的邮箱"}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('forgotPassword.emailSentMessage') || "我们已向"} <strong>{email}</strong> {t('forgotPassword.emailSentMessageSuffix') || "发送了密码重置邮件。请点击邮件中的链接重置您的密码。"}
            </p>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/${locale}/signin`)}
              >
                {t('forgotPassword.backToSignin') || "返回登录"}
              </Button>
              <Button
                variant="link"
                className="w-full text-sm"
                onClick={() => setStep(1)}
              >
                {t('forgotPassword.resendEmail') || "没收到邮件？重新发送"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 步骤3：重置密码
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t('forgotPassword.resetTitle') || "重置密码"}</CardTitle>
          <CardDescription>
            {t('forgotPassword.resetDescription') || "为您的账户设置新密码"}
          </CardDescription>
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
              <AlertDescription>{success}{t('forgotPassword.redirecting') || "，正在跳转到登录页面..."}</AlertDescription>
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
                  value={resetData.newPassword}
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
              {resetData.newPassword && passwordStrength && (
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
                  value={resetData.confirmPassword}
                  onChange={(e) => {
                    setResetData(prev => ({ ...prev, confirmPassword: e.target.value }))
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
              {resetData.confirmPassword && resetData.newPassword !== resetData.confirmPassword && (
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
