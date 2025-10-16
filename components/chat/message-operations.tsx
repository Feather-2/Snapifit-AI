"use client"

import React from "react"
import { RotateCcw, Copy, X, Download } from "lucide-react"

interface MessageOperationsProps {
  isUserMessage: boolean
  isLoading: boolean
  onRetry?: () => void
  onCopy: () => void
  onDelete: () => void
  onExport?: () => void
}

export function MessageOperations({
  isUserMessage,
  isLoading,
  onRetry,
  onCopy,
  onDelete,
  onExport,
}: MessageOperationsProps) {
  return (
    <div className="flex space-x-1 opacity-60 hover:opacity-100 transition-opacity duration-200">
      {isUserMessage ? (
        // 用户消息：重试、复制和删除按钮
        <>
          {onRetry && (
            <button
              onClick={onRetry}
              disabled={isLoading}
              className="w-5 h-5 bg-slate-200/60 hover:bg-slate-300/80 dark:bg-slate-700/60 dark:hover:bg-slate-600/80 text-slate-600 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 rounded flex items-center justify-center backdrop-blur-sm transition-colors duration-150"
              title="重试"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={onCopy}
            className="w-5 h-5 bg-slate-200/60 hover:bg-slate-300/80 dark:bg-slate-700/60 dark:hover:bg-slate-600/80 text-slate-600 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 rounded flex items-center justify-center backdrop-blur-sm transition-colors duration-150"
            title="复制"
          >
            <Copy className="h-3 w-3" />
          </button>
          <button
            onClick={onDelete}
            className="w-5 h-5 bg-slate-200/60 hover:bg-slate-300/80 dark:bg-slate-700/60 dark:hover:bg-slate-600/80 text-slate-600 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 rounded flex items-center justify-center backdrop-blur-sm transition-colors duration-150"
            title="删除"
          >
            <X className="h-3 w-3" />
          </button>
        </>
      ) : (
        // AI消息：复制、导出和删除按钮
        <>
          <button
            onClick={onCopy}
            className="w-5 h-5 bg-slate-200/60 hover:bg-slate-300/80 dark:bg-slate-700/60 dark:hover:bg-slate-600/80 text-slate-600 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 rounded flex items-center justify-center backdrop-blur-sm transition-colors duration-150"
            title="复制"
          >
            <Copy className="h-3 w-3" />
          </button>
          {onExport && (
            <button
              onClick={onExport}
              className="w-5 h-5 bg-slate-200/60 hover:bg-slate-300/80 dark:bg-slate-700/60 dark:hover:bg-slate-600/80 text-slate-600 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 rounded flex items-center justify-center backdrop-blur-sm transition-colors duration-150"
              title="导出图片"
            >
              <Download className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={onDelete}
            className="w-5 h-5 bg-slate-200/60 hover:bg-slate-300/80 dark:bg-slate-700/60 dark:hover:bg-slate-600/80 text-slate-600 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 rounded flex items-center justify-center backdrop-blur-sm transition-colors duration-150"
            title="删除"
          >
            <X className="h-3 w-3" />
          </button>
        </>
      )}
    </div>
  )
}