'use client'

import { useState, useEffect, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle, Loader2, Mail } from 'lucide-react'

export default function VerifyEmailPage({ params }: { params: Promise<{ locale: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations()
  const { locale } = use(params)

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired' | 'invalid'>('loading')
  const [message, setMessage] = useState('')
  const [isResending, setIsResending] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  const token = searchParams?.get('token') ?? null

  useEffect(() => {
    if (!token) {
      setStatus('invalid')
      setMessage('验证链接无效，缺少验证令牌')
      return
    }

    verifyEmail(token)
  }, [token])

  const verifyEmail = async (verificationToken: string) => {
    try {
      setStatus('loading')

      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: verificationToken
        })
      })

      const result = await response.json()

      if (result.success) {
        setStatus('success')
        setMessage('邮箱验证成功！您现在可以正常使用所有功能了。')
        setUserEmail(result.data?.email || '')

        // 3秒后自动跳转到登录页面
        setTimeout(() => {
          router.push(`/${locale}/signin?verified=true`)
        }, 3000)
      } else {
        // 设置邮箱地址以便重发功能
        if (result.data?.email) {
          setUserEmail(result.data.email)
        }

        if (result.error?.includes('expired') || result.error?.includes('过期') || result.expired) {
          setStatus('expired')
          setMessage('验证链接已过期，请重新发送验证邮件')
        } else {
          setStatus('error')
          setMessage(result.error || '邮箱验证失败')
        }
      }
    } catch (error) {
      console.error('Email verification error:', error)
      setStatus('error')
      setMessage('网络错误，请稍后重试')
    }
  }

  const handleResendEmail = async () => {
    setIsResending(true)
    setMessage('') // 清除之前的消息

    try {
      // 如果没有邮箱地址，尝试从token获取用户信息
      let emailToUse = userEmail

      if (!emailToUse && token) {
        // 尝试通过token获取邮箱信息
        const tokenResponse = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: token
          })
        })

        const tokenResult = await tokenResponse.json()
        if (tokenResult.data?.email) {
          emailToUse = tokenResult.data.email
          setUserEmail(emailToUse)
        }
      }

      if (!emailToUse) {
        setMessage('无法获取邮箱地址，请返回注册页面重新注册')
        return
      }

      const response = await fetch('/api/auth/verify-email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailToUse
        })
      })

      const result = await response.json()

      if (result.success) {
        setMessage('验证邮件已重新发送，请检查您的邮箱')
        // 不改变状态，让用户知道邮件已发送
      } else {
        if (result.rateLimited) {
          setMessage(`发送过于频繁，请等待 ${result.waitMinutes} 分钟后再试`)
        } else {
          setMessage(result.error || '重新发送失败')
        }
      }
    } catch (error) {
      console.error('Resend email error:', error)
      setMessage('网络错误，请稍后重试')
    } finally {
      setIsResending(false)
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-500" />
      case 'error':
      case 'expired':
      case 'invalid':
        return <AlertCircle className="h-12 w-12 text-red-500" />
      default:
        return <Mail className="h-12 w-12 text-gray-500" />
    }
  }

  const getStatusTitle = () => {
    switch (status) {
      case 'loading':
        return '正在验证邮箱...'
      case 'success':
        return '邮箱验证成功！'
      case 'expired':
        return '验证链接已过期'
      case 'invalid':
        return '验证链接无效'
      case 'error':
        return '验证失败'
      default:
        return '邮箱验证'
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20'
      case 'error':
      case 'expired':
      case 'invalid':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20'
      case 'loading':
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20'
      default:
        return ''
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            SnapFit AI
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            邮箱验证
          </p>
        </div>

        <Card className={`${getStatusColor()}`}>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {getStatusIcon()}
            </div>
            <CardTitle className="text-xl">
              {getStatusTitle()}
            </CardTitle>
            {status === 'success' && (
              <CardDescription className="text-green-700 dark:text-green-300">
                正在跳转到登录页面...
              </CardDescription>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            {message && (
              <Alert className={getStatusColor()}>
                <AlertDescription className={
                  status === 'success'
                    ? 'text-green-800 dark:text-green-200'
                    : status === 'error' || status === 'expired' || status === 'invalid'
                    ? 'text-red-800 dark:text-red-200'
                    : 'text-blue-800 dark:text-blue-200'
                }>
                  {message}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              {status === 'success' && (
                <Button
                  className="w-full"
                  onClick={() => router.push(`/${locale}/signin?verified=true`)}
                >
                  立即登录
                </Button>
              )}

              {(status === 'expired' || status === 'error') && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleResendEmail}
                  disabled={isResending}
                >
                  {isResending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      发送中...
                    </>
                  ) : (
                    '重新发送验证邮件'
                  )}
                </Button>
              )}

              <Button
                variant="ghost"
                className="w-full"
                onClick={() => router.push(`/${locale}/signin`)}
              >
                返回登录
              </Button>

              {status === 'invalid' && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/${locale}/register`)}
                >
                  重新注册
                </Button>
              )}
            </div>

            {/* 帮助信息 */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                💡 验证链接有效期为24小时
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                如果邮件进入垃圾箱，请检查垃圾邮件文件夹
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 调试信息 (仅开发环境) */}
        {process.env.NODE_ENV === 'development' && token && (
          <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20">
            <CardHeader>
              <CardTitle className="text-sm text-yellow-800 dark:text-yellow-200">
                调试信息 (开发环境)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 break-all">
                Token: {token}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
