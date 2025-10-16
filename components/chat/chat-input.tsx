"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload } from "lucide-react"
import { useTranslation } from "@/hooks/use-i18n"
import type { ImagePreview } from "@/types/chat"

interface ChatInputProps {
  input: string
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  isLoading: boolean
  isClient: boolean
  checkAIConfig: () => boolean
  isMobile: boolean
  uploadedImages: ImagePreview[]
  isCompressing: boolean
  fileInputRef: React.RefObject<HTMLInputElement>
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function ChatInput({
  input,
  onInputChange,
  onSubmit,
  isLoading,
  isClient,
  checkAIConfig,
  isMobile,
  uploadedImages,
  isCompressing,
  fileInputRef,
  onImageUpload,
}: ChatInputProps) {
  const t = useTranslation('chat')

  return (
    <div className={`${isMobile ? 'p-2' : 'p-4'} border-t border-border`}>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="flex space-x-2">
          <Input
            value={input}
            onChange={onInputChange}
            placeholder={isClient && checkAIConfig() ? t('inputPlaceholder') : t('configureAI')}
            disabled={isLoading || (isClient && !checkAIConfig())}
            className={`flex-1 ${isMobile ? 'text-base h-9' : ''}`}
          />
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onImageUpload}
            disabled={isLoading || isCompressing || uploadedImages.length >= 5}
            ref={fileInputRef}
          />
          <Button
            type="button"
            variant="outline"
            size={isMobile ? "sm" : "default"}
            disabled={isLoading || isCompressing || uploadedImages.length >= 5}
            onClick={() => fileInputRef.current?.click()}
            className={isMobile ? 'px-3 h-9' : 'px-4'}
          >
            <Upload className="h-4 w-4" />
          </Button>
          <Button
            type="submit"
            disabled={isLoading || (!input.trim() && uploadedImages.length === 0) || (isClient && !checkAIConfig())}
            size={isMobile ? "sm" : "default"}
            className={isMobile ? 'px-3 h-9 text-sm' : ''}
          >
            {isLoading ? t('sending') : t('send')}
          </Button>
        </div>
      </form>
    </div>
  )
}