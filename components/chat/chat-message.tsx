"use client"

import React from "react"
import { EnhancedMessageRenderer } from "@/components/enhanced-message-renderer"
import { MessageOperations } from "./message-operations"
import type { Message } from "ai"
import type { ChatMessage } from "@/types/chat"
import styles from "../../app/[locale]/chat/chat.module.css"

interface ChatMessageProps {
  message: ChatMessage
  messageIndex: number
  isMobile: boolean
  isStreaming: boolean
  isLoading: boolean
  onRetry: (index: number) => void
  onCopy: (content: string, hasImages?: boolean) => void
  onDelete: (messageId: string) => void
  onExport: (messageId: string, content: string) => void
  onMemoryUpdateRequest: (request: { newContent: string; reason?: string }) => void
}

export function ChatMessage({
  message,
  messageIndex,
  isMobile,
  isStreaming,
  isLoading,
  onRetry,
  onCopy,
  onDelete,
  onExport,
  onMemoryUpdateRequest,
}: ChatMessageProps) {
  const isUserMessage = message.role === "user"

  return (
    <div className={`flex ${isUserMessage ? "justify-end" : "justify-start"} w-full max-w-full`}>
      <div className={`${isMobile ? 'max-w-[85%]' : 'max-w-[95%]'} w-auto min-w-0`}>
        {/* 操作按钮区域 - 放在对话上方 */}
        <div className={`flex ${isUserMessage ? "justify-end" : "justify-start"} mb-1`}>
          <MessageOperations
            isUserMessage={isUserMessage}
            isLoading={isLoading}
            onRetry={isUserMessage ? () => onRetry(messageIndex) : undefined}
            onCopy={() => {
              const hasImages = message.images && message.images.length > 0
              onCopy(message.content, hasImages)
            }}
            onDelete={() => onDelete(message.id)}
            onExport={!isUserMessage ? () => onExport(message.id, message.content) : undefined}
          />
        </div>

        {/* 消息内容区域 */}
        <div
          className={`rounded-xl shadow-sm overflow-hidden ${styles.messageContainer} ${isMobile ? 'px-2.5 py-1.5' : 'px-4 py-3'} ${
            isUserMessage
              ? "bg-gradient-to-r from-green-500 to-green-600 text-white"
              : "bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
          }`}
        >
          {isUserMessage ? (
            // 用户消息，支持文本和图片
            <div className={`${styles.userMessage} ${isMobile ? 'text-sm' : ''}`}>
              {message.content && <div className="mb-2">{message.content}</div>}
              {message.images && Array.isArray(message.images) && message.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {message.images.map((imageUrl: string, index: number) => (
                    <img
                      key={index}
                      src={imageUrl}
                      alt={`用户上传的图片 ${index + 1}`}
                      className="max-w-48 max-h-48 rounded-lg object-cover border border-white/20"
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            // AI消息使用增强渲染器，支持思考过程显示
            <div className={`${styles.aiMessage} ${isMobile ? 'text-sm' : ''}`}>
              <EnhancedMessageRenderer
                content={message.content}
                className="text-inherit"
                isMobile={isMobile}
                isStreaming={isStreaming}
                onMemoryUpdateRequest={onMemoryUpdateRequest}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}