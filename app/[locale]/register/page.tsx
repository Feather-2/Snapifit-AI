"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { FaEye, FaEyeSlash, FaCheck, FaTimes } from 'react-icons/fa'
import { Mail, Lock, User, Gift, AlertCircle, CheckCircle, Crown } from 'lucide-react'
import { useTranslation } from "@/hooks/use-i18n"
import { useParams } from "next/navigation"

interface PasswordStrength {
  score: number
  feedback: string[]
  isValid: boolean
}

export default function RegisterPage() {
  const [step, setStep] = useState(1) // 1: 注册表单, 2: 邮箱验证
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [availability, setAvailability] = useState<{
    username: { checked: boolean; available: boolean; error?: string }
    email: { checked: boolean; available: boolean; error?: string }
  }>({
    username: { checked: false, available: false },
    email: { checked: false, available: false }
  })

  const [systemStatus, setSystemStatus] = useState<{
    isFirstUser: boolean
    hasAdmins: boolean
    userCount: number
  } | null>(null)

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
    inviteCode: ""
  })

  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const t = useTranslation('auth')

  // 获取系统状态
  useEffect(() => {
    const fetchSystemStatus = async () => {
      try {
        const response = await fetch('/api/system/status')
        const result = await response.json()
        if (result.success) {
          setSystemStatus(result.data)
        }
      } catch (error) {
        console.error('Error fetching system status:', error)
      }
    }

    fetchSystemStatus()
  }, [])

  // 检查密码强度
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

  // 检查用户名/邮箱可用性
  const checkAvailability = async (type: 'username' | 'email', value: string) => {
    if (!value) return

    try {
      const response = await fetch(`/api/auth/register?check=${type}&value=${encodeURIComponent(value)}`)
      const result = await response.json()

      setAvailability(prev => ({
        ...prev,
        [type]: {
          checked: true,
          available: result.available,
          error: result.error
        }
      }))
    } catch (error) {
      console.error(`Error checking ${type} availability:`, error)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError("")

    // 检查密码强度
    if (field === 'password') {
      setPasswordStrength(checkPasswordStrength(value))
    }

    // 重置可用性检查
    if (field === 'username' || field === 'email') {
      setAvailability(prev => ({
        ...prev,
        [field]: { checked: false, available: false }
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // 验证表单
    if (formData.password !== formData.confirmPassword) {
      setError(t('register.errors.passwordMismatch') || "密码确认不匹配")
      setIsLoading(false)
      return
    }

    if (passwordStrength && !passwordStrength.isValid) {
      setError(t('register.errors.weakPassword') || "密码强度不足")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          displayName: formData.displayName || formData.username,
          inviteCode: formData.inviteCode || undefined
        })
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error || t('register.errors.registrationFailed') || "注册失败")
      } else {
        setSuccess(t('register.success') || "注册成功！请检查您的邮箱进行验证。")
        setStep(2)
      }
    } catch (error) {
      setError(t('register.errors.registrationFailed') || "注册失败，请重试")
    } finally {
      setIsLoading(false)
    }
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

  // 重新发送验证邮件
  const handleResendEmail = async () => {
    if (resendCooldown > 0 || isResending) return

    setIsResending(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      })

      const result = await response.json()

      if (result.success) {
        setSuccess("验证邮件已重新发送")
        // 设置30秒冷却时间
        setResendCooldown(30)
        const timer = setInterval(() => {
          setResendCooldown(prev => {
            if (prev <= 1) {
              clearInterval(timer)
              return 0
            }
            return prev - 1
          })
        }, 1000)
      } else {
        if (result.rateLimited) {
          setError(`发送过于频繁，请等待 ${result.waitMinutes} 分钟后再试`)
          setResendCooldown(result.waitMinutes * 60)
          const timer = setInterval(() => {
            setResendCooldown(prev => {
              if (prev <= 1) {
                clearInterval(timer)
                return 0
              }
              return prev - 1
            })
          }, 1000)
        } else {
          setError(result.error || "重新发送失败")
        }
      }
    } catch (error) {
      setError("网络错误，请重试")
    } finally {
      setIsResending(false)
    }
  }

  if (step === 2) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <CardTitle className="text-2xl">{t('register.successTitle') || "注册成功"}</CardTitle>
            <CardDescription>
              {t('register.successDescription') || "请检查您的邮箱进行验证"}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('register.emailSent') || "我们已向"} <strong>{formData.email}</strong> {t('register.emailSentSuffix') || "发送了验证邮件。请点击邮件中的链接完成账户验证。"}
            </p>

            {/* 成功/错误消息 */}
            {success && (
              <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  {success}
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/${locale}/signin`)}
              >
                {t('register.backToSignin') || "返回登录"}
              </Button>
              <Button
                variant="link"
                className="w-full text-sm"
                onClick={handleResendEmail}
                disabled={isResending || resendCooldown > 0}
              >
                {isResending
                  ? "发送中..."
                  : resendCooldown > 0
                    ? `请等待 ${resendCooldown} 秒`
                    : (t('register.resendEmail') || "没收到邮件？重新发送")
                }
              </Button>

              {/* 频率限制提示 */}
              <p className="text-xs text-muted-foreground mt-2">
                邮件发送有频率限制
              </p>
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
          <CardTitle className="text-2xl">{t('register.title') || "创建账户"}</CardTitle>
          <CardDescription>
            {t('register.description') || "填写信息创建您的新账户"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* 第一个用户特殊提示 */}
          {systemStatus?.isFirstUser && (
            <Alert className="mb-4 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
              <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <strong>🎉 欢迎！</strong> 您将成为第一个注册用户，系统将自动为您分配超级管理员权限，您可以管理邀请码和用户权限。
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 用户名 */}
            <div className="space-y-2">
              <Label htmlFor="username">{t('register.username') || "用户名"} *</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder={t('register.usernamePlaceholder') || "2-50个字符，字母数字下划线"}
                  value={formData.username}
                  onChange={(e) => handleInputChange("username", e.target.value)}
                  onBlur={() => checkAvailability('username', formData.username)}
                  className="pl-10"
                  required
                />
                {availability.username.checked && (
                  <div className="absolute right-3 top-3">
                    {availability.username.available ? (
                      <FaCheck className="h-4 w-4 text-green-500" />
                    ) : (
                      <FaTimes className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                )}
              </div>
              {availability.username.checked && !availability.username.available && (
                <p className="text-sm text-red-500">
                  {availability.username.error || t('register.errors.usernameTaken') || "用户名已被使用"}
                </p>
              )}
            </div>

            {/* 邮箱 */}
            <div className="space-y-2">
              <Label htmlFor="email">{t('register.email') || "邮箱地址"} *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t('register.emailPlaceholder') || "your@email.com"}
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  onBlur={() => checkAvailability('email', formData.email)}
                  className="pl-10"
                  required
                />
                {availability.email.checked && (
                  <div className="absolute right-3 top-3">
                    {availability.email.available ? (
                      <FaCheck className="h-4 w-4 text-green-500" />
                    ) : (
                      <FaTimes className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                )}
              </div>
              {availability.email.checked && !availability.email.available && (
                <p className="text-sm text-red-500">
                  {availability.email.error || t('register.errors.emailTaken') || "邮箱已被使用"}
                </p>
              )}
            </div>

            {/* 密码 */}
            <div className="space-y-2">
              <Label htmlFor="password">{t('register.password') || "密码"} *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t('register.passwordPlaceholder') || "至少8个字符"}
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

              {/* 密码强度指示器 */}
              {formData.password && passwordStrength && (
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
                        <li key={index} className="flex items-center space-x-2">
                          <FaTimes className="h-3 w-3 text-red-500" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* 确认密码 */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('register.confirmPassword') || "确认密码"} *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t('register.confirmPasswordPlaceholder') || "再次输入密码"}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
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
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-sm text-red-500">{t('register.errors.passwordMismatch') || "密码确认不匹配"}</p>
              )}
            </div>

            {/* 显示名称 */}
            <div className="space-y-2">
              <Label htmlFor="displayName">{t('register.displayName') || "显示名称"}</Label>
              <Input
                id="displayName"
                type="text"
                placeholder={t('register.displayNamePlaceholder') || "可选，默认使用用户名"}
                value={formData.displayName}
                onChange={(e) => handleInputChange("displayName", e.target.value)}
              />
            </div>

            {/* 邀请码 */}
            {!systemStatus?.isFirstUser && (
              <div className="space-y-2">
                <Label htmlFor="inviteCode">{t('register.inviteCode') || "邀请码"}</Label>
                <div className="relative">
                  <Gift className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="inviteCode"
                    type="text"
                    placeholder="XXXX-YYYY-ZZZZ（可选）"
                    value={formData.inviteCode}
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
                      handleInputChange("inviteCode", value)
                    }}
                    maxLength={14}
                    className="pl-10 font-mono"
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !passwordStrength?.isValid}
            >
              {isLoading ? (t('register.registering') || "注册中...") : (t('register.createAccount') || "创建账户")}
            </Button>
          </form>

          <div className="mt-6">
            <Separator className="my-4" />
            <div className="text-center">
              <span className="text-sm text-muted-foreground">{t('register.hasAccount') || "已有账号？"}</span>
              <Button
                variant="link"
                className="text-sm p-0 ml-1"
                onClick={() => router.push(`/${locale}/signin`)}
              >
                {t('register.signinLink') || "立即登录"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
