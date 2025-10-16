"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MathCaptcha } from '@/components/ui/math-captcha'
import { Button } from '@/components/ui/button'

export default function TestCaptchaPage() {
  const [captchaData, setCaptchaData] = useState<{
    sessionId: string
    answer: number
  } | null>(null)
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  const handleCaptchaVerify = (data: { sessionId: string; answer: number }) => {
    setCaptchaData(data)
    setMessage('验证码已验证，可以提交表单')
    setIsSuccess(true)
  }

  const handleCaptchaError = (error: string) => {
    setMessage(error)
    setIsSuccess(false)
    setCaptchaData(null)
  }

  const handleSubmit = async () => {
    if (!captchaData) {
      setMessage('请先完成验证码验证')
      setIsSuccess(false)
      return
    }

    try {
      // 这里可以测试验证码验证
      const response = await fetch('/api/captcha/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(captchaData)
      })

      const result = await response.json()
      
      if (result.success) {
        setMessage('验证码验证成功！')
        setIsSuccess(true)
      } else {
        setMessage('验证码验证失败：' + result.error)
        setIsSuccess(false)
      }
    } catch (error) {
      setMessage('网络错误')
      setIsSuccess(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>验证码测试页面</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <Alert variant={isSuccess ? "default" : "destructive"}>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          
          <MathCaptcha
            onVerify={handleCaptchaVerify}
            onError={handleCaptchaError}
          />
          
          <Button 
            onClick={handleSubmit}
            className="w-full"
            disabled={!captchaData}
          >
            测试提交
          </Button>
          
          <div className="text-sm text-muted-foreground">
            <p>验证码状态：{captchaData ? '✅ 已验证' : '❌ 未验证'}</p>
            {captchaData && (
              <p>会话ID：{captchaData.sessionId.substring(0, 8)}...</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
