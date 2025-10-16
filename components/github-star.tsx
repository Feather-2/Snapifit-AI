"use client"

import { useState, useEffect } from "react"
import { Github, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/hooks/use-i18n"

interface GitHubStarProps {
  repo: string // 格式: "owner/repo"
  className?: string
}

interface GitHubRepoData {
  stargazers_count: number
  html_url: string
}

export function GitHubStar({ repo, className }: GitHubStarProps) {
  const [starCount, setStarCount] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const t = useTranslation('navigation')

  useEffect(() => {
    const fetchStarCount = async () => {
      try {
        // 检查缓存
        const cacheKey = `github-stars-${repo}`
        const cached = localStorage.getItem(cacheKey)
        const cacheTime = localStorage.getItem(`${cacheKey}-time`)

        // 如果缓存存在且未过期（24小时）- 延长缓存时间减少API调用
        if (cached && cacheTime) {
          const isExpired = Date.now() - parseInt(cacheTime) > 24 * 60 * 60 * 1000
          if (!isExpired) {
            setStarCount(parseInt(cached))
            setIsLoading(false)
            return
          }
        }

        // 检查是否在速率限制期间
        const rateLimitKey = `github-rate-limit-${repo}`
        const rateLimitTime = localStorage.getItem(rateLimitKey)
        if (rateLimitTime) {
          const timeSinceLimit = Date.now() - parseInt(rateLimitTime)
          // 如果在1小时内遇到过速率限制，使用缓存数据
          if (timeSinceLimit < 60 * 60 * 1000) {
            if (cached) {
              setStarCount(parseInt(cached))
            } else {
              // 如果没有缓存，显示默认值
              setStarCount(0)
            }
            setIsLoading(false)
            return
          }
        }

        // 获取GitHub API数据
        const response = await fetch(`https://api.github.com/repos/${repo}`, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Snapifit-AI-App'
          }
        })

        if (!response.ok) {
          if (response.status === 403) {
            // 记录速率限制时间
            localStorage.setItem(rateLimitKey, Date.now().toString())
            throw new Error('GitHub API rate limit exceeded')
          }
          throw new Error(`GitHub API error: ${response.status}`)
        }

        const data: GitHubRepoData = await response.json()

        // 更新状态
        setStarCount(data.stargazers_count)

        // 缓存结果
        localStorage.setItem(cacheKey, data.stargazers_count.toString())
        localStorage.setItem(`${cacheKey}-time`, Date.now().toString())

        // 清除速率限制标记
        localStorage.removeItem(rateLimitKey)

        setError(null)
      } catch (err) {
        console.error('Failed to fetch GitHub stars:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')

        // 如果有缓存数据，即使过期也使用它
        const cacheKey = `github-stars-${repo}`
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          setStarCount(parseInt(cached))
        } else {
          // 如果没有缓存且API失败，显示默认值
          setStarCount(0)
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchStarCount()
  }, [repo])

  const formatStarCount = (count: number): string => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`
    }
    return count.toString()
  }

  const handleClick = () => {
    window.open(`https://github.com/${repo}`, '_blank', 'noopener,noreferrer')
  }

  // 即使出错也显示组件，使用缓存数据或默认值

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className={`h-10 px-3 rounded-xl hover:bg-green-50 dark:hover:bg-slate-700/50 hover:scale-105 transition-all duration-300
        border border-green-200/60 dark:border-green-600/40
        hover:border-green-400 dark:hover:border-green-500 hover:shadow-sm hover:shadow-green-500/20
        ${className}`}
      title={`Star this project on GitHub${starCount ? ` (${starCount} stars)` : ''}`}
    >
      <Github className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
      <span className="text-sm font-medium text-slate-600 dark:text-slate-200 group-hover:text-green-600 dark:group-hover:text-green-300">
        {isLoading ? '...' : starCount !== null ? formatStarCount(starCount) : 'Star'}
      </span>
      <ExternalLink className="h-3 w-3 ml-1.5 text-slate-400 dark:text-slate-500" />
    </Button>
  )
}
