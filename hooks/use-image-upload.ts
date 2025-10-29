import { useState, useRef, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"
import { compressImage } from "@/lib/utils/image"
import type { ImagePreview } from "@/types/chat"

export function useImageUpload() {
  const { toast } = useToast()
  const [uploadedImages, setUploadedImages] = useState<ImagePreview[]>([])
  const [isCompressing, setIsCompressing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    if (uploadedImages.length + files.length > 5) {
      toast({
        title: "图片数量超限",
        description: "最多只能上传5张图片",
        variant: "destructive",
      })
      return
    }

    setIsCompressing(true)

    try {
      const newImages: ImagePreview[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        if (!file.type.startsWith("image/")) {
          toast({
            title: "文件类型错误",
            description: `${file.name} 不是图片文件`,
            variant: "destructive",
          })
          continue
        }

        const previewUrl = URL.createObjectURL(file)
        const compressedFile = await compressImage(file, 500 * 1024) // 500KB

        newImages.push({
          file,
          url: previewUrl,
          compressedFile,
        })
      }

      setUploadedImages((prev) => [...prev, ...newImages])
    } catch (error) {
      console.error("Error processing images:", error)
      toast({
        title: "图片处理失败",
        description: "无法处理上传的图片",
        variant: "destructive",
      })
    } finally {
      setIsCompressing(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleRemoveImage = useCallback((index: number) => {
    setUploadedImages((prev) => {
      const newImages = [...prev]
      URL.revokeObjectURL(newImages[index].url)
      newImages.splice(index, 1)
      return newImages
    })
  }, [])

  const clearAllImages = useCallback(() => {
    uploadedImages.forEach(img => URL.revokeObjectURL(img.url))
    setUploadedImages([])
  }, [uploadedImages])

  return {
    uploadedImages,
    isCompressing,
    fileInputRef,
    handleImageUpload,
    handleRemoveImage,
    clearAllImages,
  }
}