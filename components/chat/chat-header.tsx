"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { CardHeader } from "@/components/ui/card"
import { Trash2, Download } from "lucide-react"
import { useTranslation } from "@/hooks/use-i18n"
import type { ExpertRole, ExpertDisplayInfo } from "@/types/chat"

interface ChatHeaderProps {
  currentExpert: ExpertRole
  expertInfo: ExpertDisplayInfo
  includeHealthData: boolean
  setIncludeHealthData: (value: boolean) => void
  hasMessages: boolean
  isClient: boolean
  checkAIConfig: () => boolean
  error: Error | null
  onClearHistory: () => void
  onExportConversation: () => void
  isMobile: boolean
}

export function ChatHeader({
  currentExpert,
  expertInfo,
  includeHealthData,
  setIncludeHealthData,
  hasMessages,
  isClient,
  checkAIConfig,
  error,
  onClearHistory,
  onExportConversation,
  isMobile,
}: ChatHeaderProps) {
  const t = useTranslation('chat')

  return (
    <CardHeader className={`${isMobile ? 'p-2 pb-1.5' : 'p-3'} border-b border-border`}>
      <div className={`${isMobile ? 'flex flex-col space-y-1.5' : 'flex justify-between items-center'}`}>
        {/* 桌面端专家信息 */}
        {!isMobile && (
          <div className="flex items-center space-x-2">
            <div className={`p-1.5 rounded-md ${currentExpert.color} text-white`}>
              <currentExpert.icon className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-semibold">{expertInfo.name}</h3>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  Snapifit AI
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{expertInfo.title}</p>
            </div>
          </div>
        )}

        {/* 控制按钮区域 */}
        <div className={`${isMobile ? 'flex items-center justify-between' : 'flex items-center space-x-3'}`}>
          <div className="flex items-center space-x-1.5">
            <Switch id="include-data" checked={includeHealthData} onCheckedChange={setIncludeHealthData} />
            <Label htmlFor="include-data" className={`${isMobile ? 'text-xs' : 'text-xs'}`}>
              {t('includeHealthData')}
            </Label>
          </div>
          {isClient && hasMessages && (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onExportConversation}
                className={`text-green-600 hover:text-green-700 hover:bg-green-50 ${isMobile ? 'h-6 px-1.5 text-xs' : 'h-7 px-2 text-xs'}`}
              >
                <Download className={`${isMobile ? 'h-3 w-3' : 'h-3 w-3 mr-1'}`} />
                {!isMobile && t('exportConversation')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onClearHistory}
                className={`text-red-600 hover:text-red-700 hover:bg-red-50 ${isMobile ? 'h-6 px-1.5 text-xs' : 'h-7 px-2 text-xs'}`}
              >
                <Trash2 className={`${isMobile ? 'h-3 w-3' : 'h-3 w-3 mr-1'}`} />
                {!isMobile && t('clearHistory')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* AI配置警告 */}
      {isClient && !checkAIConfig() && (
        <div className={`text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 rounded ${isMobile ? 'p-1.5 mt-1.5' : 'p-2 mt-2'}`}>
          {t('configureAI')}
        </div>
      )}

      {/* 错误提示 */}
      {isClient && error && (
        <div className={`text-sm text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800 ${isMobile ? 'p-2 mt-1.5' : 'p-3 mt-2'}`}>
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className={isMobile ? 'text-xs' : ''}>{error.message}</span>
          </div>
          {error.message.includes('请登录后再使用') && (
            <div className={isMobile ? 'mt-1.5' : 'mt-2'}>
              <button
                onClick={() => window.location.href = '/login'}
                className={`bg-red-600 hover:bg-red-700 text-white rounded transition-colors ${isMobile ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1'}`}
              >
                前往登录
              </button>
            </div>
          )}
        </div>
      )}
    </CardHeader>
  )
}