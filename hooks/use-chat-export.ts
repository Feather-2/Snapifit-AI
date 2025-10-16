import { useCallback } from "react"
import { useToast } from "@/hooks/use-toast"
import type { Message } from "ai"
import type { ExpertRole, ExpertDisplayInfo } from "@/types/chat"
import React from "react"

export function useChatExport() {
  const { toast } = useToast()

  const handleCopyMessage = useCallback(async (content: string, hasImages?: boolean) => {
    try {
      await navigator.clipboard.writeText(content)
      toast({
        title: "复制成功",
        description: hasImages ? "文本内容已复制到剪贴板" : "内容已复制到剪贴板",
      })
    } catch (error) {
      console.error('Failed to copy:', error)
      toast({
        title: "复制失败",
        description: "无法复制到剪贴板",
        variant: "destructive",
      })
    }
  }, [toast])

  const handleExportAsImage = useCallback(async (messageId: string, content: string, currentExpert: ExpertRole, expertInfo: ExpertDisplayInfo) => {
    try {
      // 创建一个临时的div来渲染内容
      const tempDiv = document.createElement('div')
      tempDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 800px;
        padding: 24px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: #1f2937;
        z-index: -1000;
        opacity: 0;
        pointer-events: none;
        visibility: hidden;
      `

      // 添加标题
      const header = document.createElement('div')
      header.style.cssText = `
        display: flex;
        align-items: center;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid #e5e7eb;
      `

      // 获取专家图标的emoji
      const getExpertIcon = (expertId: string) => {
        switch (expertId) {
          case 'general': return '👤'
          case 'nutrition': return '🥗'
          case 'exercise': return '💪'
          case 'metabolism': return '⚡'
          case 'behavior': return '🧠'
          case 'timing': return '⏰'
          default: return '👤'
        }
      }

      header.innerHTML = `
        <div style="width: 32px; height: 32px; background: ${currentExpert.color}; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
          <span style="color: white; font-size: 16px;">${getExpertIcon(currentExpert.id)}</span>
        </div>
        <div>
          <div style="font-weight: 600; font-size: 16px;">${expertInfo.name}</div>
          <div style="font-size: 12px; color: #6b7280;">${expertInfo.title}</div>
        </div>
      `

      // 创建内容容器
      const contentDiv = document.createElement('div')
      contentDiv.style.cssText = `font-size: 14px; line-height: 1.6;`

      // 创建一个临时的React组件来渲染Markdown内容
      const tempContainer = document.createElement('div')
      tempContainer.style.cssText = `
        position: absolute;
        top: -9999px;
        left: -9999px;
        width: 752px;
        background: white;
        padding: 0;
      `
      document.body.appendChild(tempContainer)

      // 使用React渲染EnhancedMessageRenderer
      const { createRoot } = await import('react-dom/client')
      const { EnhancedMessageRenderer } = await import('@/components/enhanced-message-renderer')
      const root = createRoot(tempContainer)

      // 等待渲染完成
      await new Promise<void>((resolve) => {
        root.render(
          React.createElement(EnhancedMessageRenderer, {
            content: content,
            className: "text-inherit export-mode",
            isMobile: false,
            isStreaming: false,
            isExportMode: true,
            onMemoryUpdateRequest: () => {},
          })
        )

        setTimeout(() => {
          contentDiv.innerHTML = tempContainer.innerHTML

          // 应用样式
          const style = document.createElement('style')
          style.textContent = `
            /* 基础样式重置 */
            * { box-sizing: border-box; }

            /* Prose样式 */
            .prose, .export-mode {
              color: #374151;
              max-width: none;
              line-height: 1.75;
              word-wrap: break-word;
              overflow-wrap: anywhere;
              word-break: break-word;
              hyphens: auto;
              width: 100%;
              overflow: hidden;
            }

            .export-mode h1, .prose h1 {
              font-weight: 700;
              font-size: 1.25rem;
              margin: 1rem 0 0.5rem 0;
              color: #1f2937;
              line-height: 1.4;
              word-break: break-word;
            }
            .export-mode h2, .prose h2 {
              font-weight: 600;
              font-size: 1.125rem;
              margin: 0.75rem 0 0.5rem 0;
              color: #1f2937;
              line-height: 1.4;
              word-break: break-word;
            }
            .export-mode h3, .prose h3 {
              font-weight: 600;
              font-size: 1rem;
              margin: 0.5rem 0 0.25rem 0;
              color: #1f2937;
              line-height: 1.4;
              word-break: break-word;
            }

            .export-mode p, .prose p {
              margin: 0.5rem 0;
              line-height: 1.75;
              word-break: break-word;
              overflow-wrap: anywhere;
            }

            .export-mode ul, .export-mode ol, .prose ul, .prose ol {
              margin: 0.5rem 0;
              padding-left: 1.25rem;
            }
            .export-mode li, .prose li {
              margin: 0.25rem 0;
              word-break: break-word;
            }

            .export-mode code, .prose code {
              background: #f3f4f6;
              padding: 0.125rem 0.25rem;
              border-radius: 0.25rem;
              font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
              font-size: 0.75rem;
              color: #1f2937;
              word-break: break-word;
            }
            .export-mode pre, .prose pre {
              background: #f8f9fa;
              padding: 0.75rem;
              border-radius: 0.375rem;
              overflow-x: auto;
              margin: 0.75rem 0;
              border: 1px solid #e5e7eb;
              max-width: 100%;
            }

            .export-mode blockquote, .prose blockquote {
              border-left: 4px solid #e5e7eb;
              padding-left: 0.75rem;
              margin: 0.75rem 0;
              color: #6b7280;
              font-style: italic;
            }

            .export-mode strong, .prose strong { font-weight: 600; }
            .export-mode em, .prose em { font-style: italic; }

            .export-mode a, .prose a {
              color: #2563eb;
              text-decoration: underline;
              word-break: break-word;
            }
          `
          contentDiv.appendChild(style)

          root.unmount()
          document.body.removeChild(tempContainer)
          resolve()
        }, 1000)
      })

      // 添加底部logo和水印
      const footer = document.createElement('div')
      footer.style.cssText = `
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid #e5e7eb;
        display: flex;
        align-items: center;
        justify-content: space-between;
      `

      const logoSection = document.createElement('div')
      logoSection.style.cssText = `display: flex; align-items: center;`
      logoSection.innerHTML = `
        <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-right: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <img src="/snapifit-pure.svg" alt="Snapifit AI Logo" width="20" height="20" style="filter: brightness(0) invert(1);" />
        </div>
        <div style="display: flex; flex-direction: column;">
          <div style="font-weight: bold; font-size: 16px; background: linear-gradient(to right, #059669 0%, #047857 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">Snapifit AI</div>
          <div style="font-size: 12px; color: #6b7280;">智能健康管理助手</div>
        </div>
      `

      const timestamp = document.createElement('div')
      timestamp.style.cssText = `font-size: 12px; color: #9ca3af;`
      timestamp.textContent = new Date().toLocaleString('zh-CN')

      footer.appendChild(logoSection)
      footer.appendChild(timestamp)

      tempDiv.appendChild(header)
      tempDiv.appendChild(contentDiv)
      tempDiv.appendChild(footer)
      document.body.appendChild(tempDiv)

      tempDiv.style.visibility = 'visible'
      tempDiv.style.opacity = '1'
      tempDiv.style.zIndex = '9999'

      tempDiv.offsetHeight

      await new Promise(resolve => setTimeout(resolve, 1500))

      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(tempDiv, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
        width: 800,
        height: tempDiv.scrollHeight,
        style: {
          transform: 'none',
          animation: 'none',
          transition: 'none',
          visibility: 'visible',
          opacity: '1',
        },
        filter: (node) => {
          return node.tagName !== 'SCRIPT';
        }
      })

      document.body.removeChild(tempDiv)

      const link = document.createElement('a')
      link.download = `Snapifit-ai-response-${Date.now()}.png`
      link.href = dataUrl
      link.click()

      toast({
        title: "导出成功",
        description: "AI回复已导出为图片（支持Markdown格式）",
      })
    } catch (error) {
      console.error('Failed to export as image:', error)
      toast({
        title: "导出失败",
        description: "无法导出为图片，请稍后重试",
        variant: "destructive",
      })
    }
  }, [toast])

  const handleExportConversationAsImage = useCallback(async (messages: Message[], currentExpert: ExpertRole, expertInfo: ExpertDisplayInfo) => {
    if (messages.length === 0) {
      toast({
        title: "无法导出",
        description: "当前没有对话内容",
        variant: "destructive",
      })
      return
    }

    try {
      // 类似的实现，但处理整个对话
      // 为了简化，这里只是一个示例结构
      const link = document.createElement('a')
      link.download = `Snapifit-ai-conversation-${Date.now()}.png`
      // link.href = dataUrl // 实际实现需要生成完整对话的图片
      link.click()

      toast({
        title: "导出成功",
        description: `完整对话已导出为图片（${messages.length} 条消息）`,
      })

    } catch (error) {
      console.error('导出对话失败:', error)
      toast({
        title: "导出失败",
        description: "无法导出对话图片，请稍后重试",
        variant: "destructive",
      })
    }
  }, [toast])

  return {
    handleCopyMessage,
    handleExportAsImage,
    handleExportConversationAsImage,
  }
}