import type { Message } from "ai"
import type { LucideIcon } from "lucide-react"

export interface ImagePreview {
  file: File
  url: string
  compressedFile?: File
}

export interface ExpertRole {
  id: string
  name: string
  title: string
  description: string
  icon: LucideIcon
  color: string
  systemPrompt: string
}

export interface ChatMessage extends Message {
  images?: string[]
}

export interface ExpertDisplayInfo {
  name: string
  title: string
  description: string
}