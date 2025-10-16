"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { useChat } from "ai/react"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { useUsageLimit } from "@/hooks/use-usage-limit"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useIndexedDB } from "@/hooks/use-indexed-db"
import { useAIMemory } from "@/hooks/use-ai-memory"
import { useImageUpload } from "@/hooks/use-image-upload"
import { useChatExport } from "@/hooks/use-chat-export"
import type { AIConfig, AIMemoryUpdateRequest } from "@/lib/types"
import { format } from "date-fns"
import type { Message } from "ai"
import { useTranslation } from "@/hooks/use-i18n"
import { expertRoles } from "@/constants/expert-roles"
import type { ExpertRole, ExpertDisplayInfo, ChatMessage } from "@/types/chat"
import { WelcomeGuide, useWelcomeGuide } from "@/components/onboarding/welcome-guide"
import { MCPToolIntegration } from "@/components/mcp/MCPToolIntegration"
import { ToolSelector } from "@/components/mcp/ToolSelector"

// 导入拆分的组件
import { ExpertSelector } from "@/components/chat/expert-selector"
import { ChatHeader } from "@/components/chat/chat-header"
import { WelcomeScreen } from "@/components/chat/welcome-screen"
import { ChatMessage as ChatMessageComponent } from "@/components/chat/chat-message"
import { ImagePreview } from "@/components/chat/image-preview"
import { ChatInput } from "@/components/chat/chat-input"

export default function ChatPage() {
  const { toast } = useToast()
  const { refreshUsageInfo } = useUsageLimit()
  const t = useTranslation('chat')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isLoadingMessagesRef = useRef(false)

  // 引导功能
  const { showGuide, closeGuide } = useWelcomeGuide()
  const [includeHealthData, setIncludeHealthData] = useState(true)
  const [selectedExpert, setSelectedExpert] = useState<string>("general")
  const [isClient, setIsClient] = useState(false)
  const [recentHealthData, setRecentHealthData] = useState<any[]>([])

  // 移动端状态管理
  const [isMobile, setIsMobile] = useState(false)
  const [showExpertDropdown, setShowExpertDropdown] = useState(false)
  const [isCustomLoading, setIsCustomLoading] = useState(false)
  const [allowedTools, setAllowedTools] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('mcp.allowedTools') || '[]') } catch { return [] }
  })

  const [userProfile] = useLocalStorage("userProfile", {})
  const [aiConfig] = useLocalStorage<AIConfig>("aiConfig", {
    agentModel: {
      name: "gpt-4o",
      baseUrl: "https://api.openai.com",
      apiKey: "",
      source: "shared",
    },
    chatModel: {
      name: "gpt-4o",
      baseUrl: "https://api.openai.com",
      apiKey: "",
      source: "shared",
    },
    visionModel: {
      name: "gemini-2.5-flash-preview-05-20",
      baseUrl: "https://api.openai.com",
      apiKey: "",
      source: "shared",
    },
    sharedKey: {
      selectedKeyIds: [],
    },
  })
  const { getData } = useIndexedDB("healthLogs")
  const [todayLog, setTodayLog] = useState(null)

  // AI记忆管理
  const { memories, updateMemory } = useAIMemory()

  // 为每个专家使用独立的聊天记录
  const [allExpertMessages, setAllExpertMessages] = useLocalStorage<Record<string, Message[]>>("expertChatMessages", {})

  // 使用自定义钩子
  const {
    uploadedImages,
    isCompressing,
    fileInputRef,
    handleImageUpload,
    handleRemoveImage,
    clearAllImages,
  } = useImageUpload()

  const {
    handleCopyMessage,
    handleExportAsImage,
    handleExportConversationAsImage,
  } = useChatExport()

  // 检查AI配置是否完整
  const checkAIConfig = () => {
    const modelConfig = aiConfig.chatModel
    if (modelConfig.source === 'shared') {
      return true
    }
    if (!modelConfig?.name || !modelConfig?.baseUrl || !modelConfig?.apiKey) {
      return false
    }
    return true
  }

  // 处理AI记忆更新请求
  const handleMemoryUpdateRequest = async (newContent: string, reason?: string) => {
    try {
      await updateMemory({
        expertId: selectedExpert,
        newContent,
        reason
      })

      toast({
        title: "记忆已更新",
        description: `${currentExpert.name}的记忆已成功更新`,
      })
    } catch (error) {
      console.error("更新记忆失败:", error)
      toast({
        title: "记忆更新失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
    }
  }

  // 设置客户端状态和移动端检测
  useEffect(() => {
    setIsClient(true)

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    const handleClickOutside = (event: MouseEvent) => {
      if (showExpertDropdown && !(event.target as Element).closest('.expert-dropdown')) {
        setTimeout(() => {
          setShowExpertDropdown(false)
        }, 0)
      }
    }

    document.addEventListener('mousedown', handleClickOutside, { passive: true })

    return () => {
      window.removeEventListener('resize', checkMobile)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showExpertDropdown])

  // 获取今日日志
  useEffect(() => {
    const today = format(new Date(), "yyyy-MM-dd")
    getData(today).then((data) => {
      console.log("Today's health data loaded:", {
        hasData: !!data,
        date: data?.date,
        foodEntries: data?.foodEntries?.length || 0,
        exerciseEntries: data?.exerciseEntries?.length || 0,
        summary: data?.summary,
      })
      setTodayLog(data)
    })
  }, [getData])

  // 获取近7天的详细数据
  useEffect(() => {
    const loadRecentData = async () => {
      const logs = []
      const today = new Date()
      for (let i = 0; i < 7; i++) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        const dateKey = format(date, "yyyy-MM-dd")
        try {
          const log = await getData(dateKey)
          if (log && (
            log.foodEntries?.length > 0 ||
            log.exerciseEntries?.length > 0 ||
            log.weight !== undefined ||
            log.dailyStatus ||
            log.calculatedBMR ||
            log.calculatedTDEE
          )) {
            logs.push(log)
          }
        } catch (error) {
          console.log(`No data for ${dateKey}`)
        }
      }
      console.log("Recent health data loaded:", logs.length, "days with data")
      setRecentHealthData(logs)
    }

    loadRecentData()
  }, [getData])

  // 获取当前选择的专家
  const currentExpert = expertRoles.find(expert => expert.id === selectedExpert) || expertRoles[0]

  // 获取翻译后的专家信息
  const tChatExperts = useTranslation('chat.experts')
  const getExpertDisplayInfo = (expert: ExpertRole): ExpertDisplayInfo => ({
    name: tChatExperts(`${expert.id}.name`) || expert.name,
    title: tChatExperts(`${expert.id}.title`) || expert.title,
    description: tChatExperts(`${expert.id}.description`) || expert.description
  })

  const expertInfo = getExpertDisplayInfo(currentExpert)

  // 统一工具调用格式的系统约束
  const TOOL_CALL_INSTRUCTIONS = `
你可以在需要调用工具时，仅输出如下格式的工具指令，不要包含多余解释：
<tool_call name="{tool_name}" provider_id="{optional_provider_id}">{JSON参数}</tool_call>
要求：
- 仅在确需工具时输出上述指令；不需要时正常回答即可。
- JSON 内只包含必要字段，确保可被严格 JSON.parse。
- 若需多个工具，按顺序分别输出多个 <tool_call> 指令（不要包裹在列表中）。
- tool_name 必须与系统提供的“允许的工具集合”之一严格匹配；如无匹配，避免调用。
`

  const { messages, input, handleInputChange, handleSubmit, isLoading, error, setMessages, setInput } = useChat({
    api: "/api/openai/chat",
    initialMessages: [],
    headers: {
      "x-ai-config": JSON.stringify(aiConfig),
      "x-expert-role": selectedExpert,
    },
    onResponse: (response) => {
      console.log("Chat response received:", {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
      })

      if (!response.ok) {
        console.error("Chat response not ok:", response.status, response.statusText)
        toast({
          title: "聊天失败",
          description: `服务器响应错误: ${response.status} ${response.statusText}`,
          variant: "destructive",
        })
      }
    },
    onError: (error) => {
      console.error("Chat error:", error)

      let title = "聊天失败"
      let description = error.message || "聊天服务出现错误，请稍后重试"

      if (error.message.includes('请登录后再使用')) {
        title = "需要登录"
        description = "请登录后再使用AI聊天功能"
      } else if (error.message.includes('使用次数已达上限')) {
        title = "使用次数已达上限"
      } else if (error.message.includes('服务暂时不可用')) {
        title = "服务暂时不可用"
      } else if (!checkAIConfig()) {
        title = "AI 配置不完整"
        description = "请先在设置页面配置聊天模型"
      }

      toast({
        title,
        description,
        variant: "destructive",
      })
    },
    onFinish: async (message) => {
      console.log("Chat finished:", {
        messageLength: message.content.length,
        role: message.role,
      })

      if (message.role === 'assistant') {
        console.log('[Chat] Refreshing usage info after successful chat')
        refreshUsageInfo()

        // 尝试从助理消息中解析并执行 MCP 工具调用指令
        try {
          const directives = parseMCPDirectives(message.content)
          for (const d of directives) {
            const callResult = await routeMCPCall(d)
            const toolResultMessage: Message = {
              id: `assistant-tool-${Date.now()}-${d.name}`,
              role: 'assistant',
              content: formatToolResultForChat(d.name, callResult)
            }
            setMessages(curr => [...curr, toolResultMessage])
          }
        } catch (e) {
          console.warn('解析/执行 MCP 指令失败:', e)
        }
      }
    },
    body: {
      userProfile: includeHealthData ? userProfile : undefined,
      healthData: includeHealthData ? todayLog : undefined,
      recentHealthData: includeHealthData ? recentHealthData : undefined,
      systemPrompt: `${currentExpert.systemPrompt}\n\n${TOOL_CALL_INSTRUCTIONS}\n\n允许的工具：${(() => { try { const allowed = JSON.parse(localStorage.getItem('mcp.allowedTools') || '[]'); return Array.isArray(allowed) && allowed.length > 0 ? allowed.join(', ') : '未限制（优先使用内置健康工具）'; } catch { return '未限制（优先使用内置健康工具）'; } })()}`,
      expertRole: currentExpert,
      aiMemory: memories,
      aiConfig, // 添加缺失的 aiConfig
      allowedTools,
    },
  })

  // 当切换专家时，加载对应的消息记录
  useEffect(() => {
    isLoadingMessagesRef.current = true
    const expertMessages = allExpertMessages[selectedExpert] || []
    setMessages(expertMessages)
    setTimeout(() => {
      isLoadingMessagesRef.current = false
    }, 0)
  }, [selectedExpert, allExpertMessages, setMessages])

  // 保存当前专家的消息到 localStorage
  useEffect(() => {
    if (messages.length > 0 && !isLoadingMessagesRef.current) {
      const newMessages = { ...allExpertMessages }
      newMessages[selectedExpert] = messages as Message[]
      setAllExpertMessages(newMessages)
    }
  }, [messages, selectedExpert, setAllExpertMessages])

  // 处理专家选择
  const handleExpertSelect = (expertId: string) => {
    setSelectedExpert(expertId)
    setShowExpertDropdown(false)
  }

  // 清除当前专家的聊天记录
  const clearChatHistory = () => {
    isLoadingMessagesRef.current = true
    setMessages([])
    const newMessages = { ...allExpertMessages }
    newMessages[selectedExpert] = []
    setAllExpertMessages(newMessages)
    setTimeout(() => {
      isLoadingMessagesRef.current = false
    }, 0)
    toast({
      title: t('historyCleared'),
      description: t('expertHistoryCleared', { expert: expertInfo.name }),
    })
  }

  // 删除指定消息
  const handleDeleteMessage = (messageId: string) => {
    const updatedMessages = messages.filter(msg => msg.id !== messageId)
    setMessages(updatedMessages)

    const newAllMessages = { ...allExpertMessages }
    newAllMessages[selectedExpert] = updatedMessages as Message[]
    setAllExpertMessages(newAllMessages)
  }

  // 重试用户消息
  const handleRetryMessage = async (messageIndex: number) => {
    if (isLoading || isCustomLoading) return

    const messageToRetry = messages[messageIndex]
    if (messageToRetry.role !== 'user') return

    setIsCustomLoading(true)

    const messagesBeforeRetry = messages.slice(0, messageIndex)
    const userMessage = messages[messageIndex]
    const newMessages = [...messagesBeforeRetry, userMessage]
    setMessages(newMessages)

    try {
      const response = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          "x-ai-config": JSON.stringify(aiConfig),
          "x-expert-role": selectedExpert,
        },
        body: JSON.stringify({
          messages: newMessages.map(msg => ({
            role: msg.role,
            content: msg.content,
            // @ts-ignore
            images: msg.images
          })),
          userProfile: includeHealthData ? userProfile : undefined,
          healthData: includeHealthData ? todayLog : undefined,
          recentHealthData: includeHealthData ? recentHealthData : undefined,
          systemPrompt: currentExpert.systemPrompt,
          expertRole: currentExpert,
          aiMemory: memories,
          aiConfig,
          allowedTools
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const newAssistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: ''
      }

      setMessages([...newMessages, newAssistantMessage])

      const reader = response.body?.getReader()
      const decoder = new TextDecoder('utf-8')

      if (reader) {
        try {
          let buffer = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (line.startsWith('0:"')) {
                try {
                  const content = line.slice(3, -1)
                  const decodedContent = content.replace(/\\"/g, '"').replace(/\\n/g, '\n')

                  setMessages(currentMessages => {
                    const updatedMessages = [...currentMessages]
                    const lastMessage = updatedMessages[updatedMessages.length - 1]
                    if (lastMessage && lastMessage.role === 'assistant') {
                      lastMessage.content += decodedContent
                    }
                    return updatedMessages
                  })
                } catch (e) {
                  console.error('Error parsing stream chunk:', e)
                }
              }
            }
          }
        } finally {
          reader.releaseLock()
        }
      }

    } catch (error) {
      console.error('Error retrying message:', error)
      toast({
        title: "重试失败",
        description: error instanceof Error ? error.message : "重试消息时出现错误",
        variant: "destructive",
      })
    } finally {
      setIsCustomLoading(false)
    }
  }

  // 滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // 组合加载状态
  const isAnyLoading = isLoading || isCustomLoading

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if ((!input.trim() && uploadedImages.length === 0) || isAnyLoading) return

    console.log("Submitting chat message:", {
      inputLength: input.length,
      imageCount: uploadedImages.length,
      hasAIConfig: isClient ? checkAIConfig() : false,
      includeHealthData,
      hasUserProfile: !!userProfile,
      hasTodayLog: !!todayLog,
    })

    if (isClient && !checkAIConfig()) {
      toast({
        title: "AI 配置不完整",
        description: "请先在设置页面配置聊天模型",
        variant: "destructive",
      })
      return
    }

    if (uploadedImages.length > 0) {
      await handleSubmitWithImages(e)
    } else {
      handleSubmit(e)
    }
  }

  // 处理包含图片的提交
  const handleSubmitWithImages = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsCustomLoading(true)

    try {
      const imageDataURIs: string[] = []
      for (const img of uploadedImages) {
        const fileToUse = img.compressedFile || img.file
        const arrayBuffer = await fileToUse.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        const dataURI = `data:${fileToUse.type};base64,${base64}`
        imageDataURIs.push(dataURI)
      }

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: input || '请分析这些图片',
        images: imageDataURIs
      }

      const newMessages = [...messages, userMessage]
      setMessages(newMessages)

      setInput('')
      clearAllImages()

      const response = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          "x-ai-config": JSON.stringify(aiConfig),
          "x-expert-role": selectedExpert,
        },
        body: JSON.stringify({
          messages: newMessages.map(msg => ({
            role: msg.role,
            content: msg.content,
            images: (msg as ChatMessage).images
          })),
          userProfile: includeHealthData ? userProfile : undefined,
          healthData: includeHealthData ? todayLog : undefined,
          recentHealthData: includeHealthData ? recentHealthData : undefined,
          systemPrompt: currentExpert.systemPrompt,
          expertRole: currentExpert,
          aiMemory: memories,
          aiConfig,
          allowedTools
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: ''
      }

      setMessages([...newMessages, assistantMessage])

      const reader = response.body?.getReader()
      const decoder = new TextDecoder('utf-8')

      if (reader) {
        try {
          let buffer = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (line.startsWith('0:"')) {
                try {
                  const content = line.slice(3, -1)
                  const decodedContent = content.replace(/\\"/g, '"').replace(/\\n/g, '\n')

                  setMessages(currentMessages => {
                    const updatedMessages = [...currentMessages]
                    const lastMessage = updatedMessages[updatedMessages.length - 1]
                    if (lastMessage && lastMessage.role === 'assistant') {
                      lastMessage.content += decodedContent
                    }
                    return updatedMessages
                  })
                } catch (e) {
                  console.error('Error parsing stream chunk:', e)
                }
              }
            }
          }
        } finally {
          reader.releaseLock()
        }
      }

    } catch (error) {
      console.error('Error submitting with images:', error)
      toast({
        title: "发送失败",
        description: error instanceof Error ? error.message : "发送消息时出现错误",
        variant: "destructive",
      })
    } finally {
      setIsCustomLoading(false)
    }
  }

  // 显示错误信息
  useEffect(() => {
    if (error) {
      console.error("useChat error:", error)
    }
  }, [error])

  return (
    <div className="container mx-auto py-2 md:py-6 max-w-7xl min-w-0 px-3 md:px-6">
      <div className={`${isMobile ? 'flex flex-col h-[calc(100vh-1rem)]' : 'flex gap-6 h-[80vh]'}`}>
        {/* 专家选择区域 */}
        <ExpertSelector
          selectedExpert={selectedExpert}
          onExpertSelect={handleExpertSelect}
          isMobile={isMobile}
          showExpertDropdown={showExpertDropdown}
          setShowExpertDropdown={setShowExpertDropdown}
        />

        {/* 聊天区域 */}
        <Card className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <ChatHeader
            currentExpert={currentExpert}
            expertInfo={expertInfo}
            includeHealthData={includeHealthData}
            setIncludeHealthData={setIncludeHealthData}
            hasMessages={messages.length > 0}
            isClient={isClient}
            checkAIConfig={checkAIConfig}
            error={error || null}
            onClearHistory={clearChatHistory}
            onExportConversation={() => handleExportConversationAsImage(messages, currentExpert, expertInfo)}
            isMobile={isMobile}
          />

          <CardContent className={`flex-1 flex flex-col min-w-0 overflow-hidden ${isMobile ? 'p-1.5' : 'p-4'}`}>
          <ScrollArea className={`flex-1 w-full ${isMobile ? 'pr-1' : 'pr-4'}`}>
            <div className={`pb-4 w-full max-w-full overflow-hidden ${isMobile ? 'space-y-2 px-1' : 'space-y-4'}`}>
              {!isClient ? (
                <div className={`text-center ${isMobile ? 'py-4' : 'py-8'}`}>
                  <p className={`font-medium ${isMobile ? 'text-base' : 'text-lg'}`}>{t('loading')}</p>
                </div>
              ) : messages.length === 0 ? (
                  <WelcomeScreen
                    currentExpert={currentExpert}
                    selectedExpert={selectedExpert}
                    checkAIConfig={checkAIConfig}
                    isMobile={isMobile}
                  />
              ) : (
                <div className={isMobile ? 'space-y-2' : 'space-y-4'}>
                  {messages.map((message, index) => (
                      <ChatMessageComponent
                        key={message.id}
                        message={message as ChatMessage}
                        messageIndex={index}
                                isMobile={isMobile}
                                isStreaming={isAnyLoading && messages[messages.length - 1]?.id === message.id}
                        isLoading={isAnyLoading}
                        onRetry={handleRetryMessage}
                        onCopy={handleCopyMessage}
                        onDelete={handleDeleteMessage}
                        onExport={(messageId, content) => handleExportAsImage(messageId, content, currentExpert, expertInfo)}
                        onMemoryUpdateRequest={(request) => handleMemoryUpdateRequest(request.newContent, request.reason)}
                      />
                  ))}
                </div>
              )}
              {isAnyLoading && (
                <div className="flex justify-start">
                  <div className={`bg-muted rounded-lg ${isMobile ? 'px-2.5 py-1.5' : 'px-4 py-2'}`}>
                    <div className="flex items-center space-x-2">
                      <div className={`bg-gray-500 rounded-full animate-pulse ${isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2'}`}></div>
                      <div
                        className={`bg-gray-500 rounded-full animate-pulse ${isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2'}`}
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                      <div
                        className={`bg-gray-500 rounded-full animate-pulse ${isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2'}`}
                        style={{ animationDelay: "0.4s" }}
                      ></div>
                      <span className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>{t('aiThinking')}</span>
                    </div>
                  </div>
                </div>
              )}
              {/* MCP 工具建议（嵌入模式） */}
              <MCPToolIntegration
                embedded
                currentExpert={selectedExpert}
                currentMessage={messages[messages.length - 1]?.content || ''}
                userProfile={includeHealthData ? userProfile : undefined}
                healthData={includeHealthData ? todayLog : undefined}
                onToolResult={(result, toolName) => {
                  const toolResultMessage: Message = {
                    id: `assistant-tool-${Date.now()}-${toolName}`,
                    role: 'assistant',
                    content: formatToolResultForChat(toolName, { success: true, result })
                  }
                  setMessages(curr => [...curr, toolResultMessage])
                }}
              />
              {/* MCP 工具选择（仅当无消息时显示，避免干扰） */}
              {messages.length === 0 && (
                <div className="mt-2">
                  <ToolSelector onChange={setAllowedTools} />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* 图片预览区域 */}
            <ImagePreview
              uploadedImages={uploadedImages}
              onRemoveImage={handleRemoveImage}
              isMobile={isMobile}
            />

            {/* 聊天输入区域 */}
            <ChatInput
              input={input}
              onInputChange={handleInputChange}
              onSubmit={onSubmit}
              isLoading={isAnyLoading}
              isClient={isClient}
              checkAIConfig={checkAIConfig}
              isMobile={isMobile}
              uploadedImages={uploadedImages}
              isCompressing={isCompressing}
              fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
              onImageUpload={handleImageUpload}
            />
        </CardContent>
      </Card>
      </div>

      {/* 欢迎引导 */}
      <WelcomeGuide isOpen={showGuide} onClose={closeGuide} />
    </div>
  )
}

// ============ MCP 指令解析与路由 ============

type MCPDirective = { name: string; provider_id?: string; params: any }

function parseMCPDirectives(text: string): MCPDirective[] {
  const directives: MCPDirective[] = []
  const regex = /<tool_call\s+name="([^"]+)"(?:\s+provider_id="([^"]+)")?\s*>([\s\S]*?)<\/tool_call>/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    const name = match[1]
    const provider_id = match[2]
    const json = match[3]?.trim()
    try {
      const params = json ? JSON.parse(json) : {}
      directives.push({ name, provider_id, params })
    } catch {
      // 忽略无效 JSON
    }
  }
  return directives
}

async function routeMCPCall(d: MCPDirective): Promise<any> {
  // 若设置了允许工具集合，则做过滤
  try {
    const allowed: string[] = JSON.parse(localStorage.getItem('mcp.allowedTools') || '[]')
    if (Array.isArray(allowed) && allowed.length > 0 && !allowed.includes(d.name)) {
      return { success: false, error: `工具未被允许: ${d.name}` }
    }
  } catch {}

  // 优先：若指定 provider_id 走 bridge
  if (d.provider_id) {
    const res = await fetch('/api/mcp/bridge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'call_tool', provider_id: d.provider_id, tool_name: d.name, params: d.params })
    })
    const data = await res.json()
    return data
  }

  // 其次：尝试安全代理（适用于安全白名单工具）
  try {
    const tokenRes = await fetch('/api/mcp/secure-proxy/token', { method: 'GET' })
    const { token } = await tokenRes.json()
    const res = await fetch('/api/mcp/secure-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: d.name, params: d.params, securityToken: token })
    })
    const data = await res.json()
    if (data?.success) return data
  } catch {}

  // 最后：尝试内置健康工具入口
  try {
    const res = await fetch('/api/mcp/health-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: d.name, params: d.params })
    })
    const data = await res.json()
    return data
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

function formatToolResultForChat(toolName: string, res: any): string {
  if (res?.success) {
    return `【工具结果】${toolName}\n\n\`\`\`json\n${JSON.stringify(res.result ?? res, null, 2)}\n\`\`\``
  }
  return `【工具失败】${toolName}: ${res?.error || '未知错误'}`
}