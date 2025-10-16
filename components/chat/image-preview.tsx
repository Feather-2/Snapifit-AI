"use client"

import React from "react"
import { ImageIcon } from "lucide-react"
import type { ImagePreview } from "@/types/chat"

interface ImagePreviewProps {
  uploadedImages: ImagePreview[]
  onRemoveImage: (index: number) => void
  isMobile: boolean
}

export function ImagePreview({ uploadedImages, onRemoveImage, isMobile }: ImagePreviewProps) {
  if (uploadedImages.length === 0) return null

  return (
    <div className={`${isMobile ? 'p-2' : 'p-4'} border-t border-border`}>
      <p className="text-muted-foreground mb-2 flex items-center font-medium text-sm">
        <ImageIcon className="mr-2 h-4 w-4" /> 已上传图片 ({uploadedImages.length}/5)
      </p>
      <div className="flex flex-wrap gap-2">
        {uploadedImages.map((img, index) => (
          <div key={index} className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-white dark:border-slate-700 shadow-md hover:shadow-lg transition-all group">
            <img
              src={img.url}
              alt={`预览 ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => onRemoveImage(index)}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}