"use client"

import { useState, useEffect } from 'react'
import { AlertTriangle, X, Info } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface SystemMessage {
  message: string
  type: 'info' | 'warning' | 'error'
}

export function SystemMessageBanner() {
  const [systemMessage, setSystemMessage] = useState<SystemMessage | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    fetchSystemMessage()
  }, [])

  const fetchSystemMessage = async () => {
    try {
      const response = await fetch('/api/system/message')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.message && data.message.trim()) {
          setSystemMessage({
            message: data.message,
            type: data.type || 'info'
          })
          setIsVisible(true)
        }
      }
    } catch (error) {
      console.error('Failed to fetch system message:', error)
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    setIsVisible(false)
    // 存储到 localStorage，避免在同一会话中重复显示
    if (systemMessage) {
      localStorage.setItem('dismissed-system-message', systemMessage.message)
    }
  }

  // 检查是否已经被用户关闭过
  useEffect(() => {
    if (systemMessage) {
      const dismissedMessage = localStorage.getItem('dismissed-system-message')
      if (dismissedMessage === systemMessage.message) {
        setIsDismissed(true)
        setIsVisible(false)
      }
    }
  }, [systemMessage])

  if (!systemMessage || !isVisible || isDismissed) {
    return null
  }

  const getIcon = () => {
    switch (systemMessage.type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />
      case 'error':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  const getVariant = () => {
    switch (systemMessage.type) {
      case 'warning':
        return 'default' as const
      case 'error':
        return 'destructive' as const
      default:
        return 'default' as const
    }
  }

  return (
    <div className="w-full">
      <Alert variant={getVariant()} className="relative">
        <div className="flex items-start gap-2">
          {getIcon()}
          <AlertDescription className="flex-1 pr-8">
            {systemMessage.message}
          </AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-transparent"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">关闭</span>
          </Button>
        </div>
      </Alert>
    </div>
  )
}
