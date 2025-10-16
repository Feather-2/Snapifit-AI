"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RefreshCw, Shield } from 'lucide-react'
import { useTranslation } from '@/hooks/use-i18n'

interface MathCaptchaProps {
  onVerify: (captchaData: { sessionId: string; answer: number }) => void
  onError?: (error: string) => void
  disabled?: boolean
  className?: string
}

interface CaptchaData {
  sessionId: string
  question: string
}

export function MathCaptcha({ onVerify, onError, disabled = false, className = "" }: MathCaptchaProps) {
  const [captchaData, setCaptchaData] = useState<CaptchaData | null>(null)
  const [userAnswer, setUserAnswer] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const t = useTranslation('auth.forgotPassword.captcha')

  // 生成新的验证码
  const generateCaptcha = async () => {
    setIsLoading(true)
    setError('')
    setUserAnswer('')

    try {
      const response = await fetch('/api/captcha/generate')
      const result = await response.json()

      if (result.success) {
        setCaptchaData(result.data)
      } else {
        const errorMsg = t('generateFailed') || '生成验证码失败，请重试'
        setError(errorMsg)
        onError?.(errorMsg)
      }
    } catch (error) {
      const errorMsg = t('networkError') || '网络错误，请检查连接'
      setError(errorMsg)
      onError?.(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  // 验证答案
  const handleVerify = () => {
    if (!captchaData || !userAnswer.trim()) {
      const errorMsg = t('enterAnswer') || '请输入答案'
      setError(errorMsg)
      onError?.(errorMsg)
      return
    }

    const answer = parseInt(userAnswer.trim())
    if (isNaN(answer)) {
      const errorMsg = t('invalidNumber') || '请输入有效的数字'
      setError(errorMsg)
      onError?.(errorMsg)
      return
    }

    // 调用父组件的验证回调
    onVerify({
      sessionId: captchaData.sessionId,
      answer
    })
  }

  // 处理输入变化
  const handleInputChange = (value: string) => {
    setUserAnswer(value)
    if (error) setError('')
  }

  // 处理回车键
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !disabled) {
      handleVerify()
    }
  }

  // 组件挂载时生成验证码
  useEffect(() => {
    generateCaptcha()
  }, [])

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center space-x-2">
        <Shield className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm font-medium">{t('title') || '人机验证'}</Label>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center space-x-3">
        {/* 验证码问题显示 */}
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <div className="bg-muted px-3 py-2 rounded-md font-mono text-sm min-w-[120px] text-center">
              {isLoading ? (t('generating') || '生成中...') : (captchaData?.question || (t('loading') || '加载中...'))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={generateCaptcha}
              disabled={isLoading || disabled}
              className="px-2"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* 答案输入 */}
        <div className="flex items-center space-x-2">
          <Input
            type="number"
            placeholder={t('placeholder') || '答案'}
            value={userAnswer}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={disabled || isLoading || !captchaData}
            className="text-center w-20"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleVerify}
            disabled={disabled || isLoading || !captchaData || !userAnswer.trim()}
            className="px-3"
          >
            ✓
          </Button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        {t('description') || '请计算上面的数学题并输入答案，这有助于防止自动化攻击'}
      </div>
    </div>
  )
}
