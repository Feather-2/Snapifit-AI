"use client"

import { useState } from 'react'
import Image from 'next/image'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { User } from 'lucide-react'

interface AvatarProxyProps {
  src?: string | null
  alt?: string
  fallback?: string
  className?: string
  size?: number
}

export function AvatarProxy({
  src,
  alt = 'Avatar',
  fallback,
  className = '',
  size = 40
}: AvatarProxyProps) {
  const [imageError, setImageError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // 如果没有图片源或者图片加载失败，显示fallback
  if (!src || imageError) {
    return (
      <Avatar className={className} style={{ width: size, height: size }}>
        <AvatarFallback className="bg-muted">
          {fallback ? (
            <span className="text-sm font-medium">
              {fallback.slice(0, 2).toUpperCase()}
            </span>
          ) : (
            <User className="h-4 w-4" />
          )}
        </AvatarFallback>
      </Avatar>
    )
  }

  // 判断是否需要使用代理
  const needsProxy = src.startsWith('https://') && !src.includes('localhost')
  const imageSrc = needsProxy
    ? `/api/proxy/avatar?url=${encodeURIComponent(src)}`
    : src

  return (
    <Avatar className={className} style={{ width: size, height: size }}>
      <div className="relative w-full h-full">
        {isLoading && (
          <div className="absolute inset-0 bg-muted animate-pulse rounded-full" />
        )}
        <Image
          src={imageSrc}
          alt={alt}
          width={size}
          height={size}
          className="rounded-full object-cover"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setImageError(true)
            setIsLoading(false)
          }}
          unoptimized={needsProxy} // 对于代理图片不进行优化
        />
      </div>
    </Avatar>
  )
}

// 专门用于用户头像的组件
interface UserAvatarProps {
  user?: {
    name?: string | null
    image?: string | null
    displayName?: string | null
  } | null
  className?: string
  size?: number
}

export function UserAvatar({ user, className = '', size = 40 }: UserAvatarProps) {
  const displayName = user?.displayName || user?.name || ''
  const fallback = displayName || 'U'

  return (
    <AvatarProxy
      src={user?.image}
      alt={`${displayName} avatar`}
      fallback={fallback}
      className={className}
      size={size}
    />
  )
}
