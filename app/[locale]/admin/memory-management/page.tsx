"use client"

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Brain, Clock, RefreshCw, BarChart3 } from "lucide-react"

export default function MemoryManagementPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [statistics, setStatistics] = useState<any>(null)
  const { toast } = useToast()

  const handleAction = async (action: string) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/update-old-memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "操作成功",
          description: result.message,
        })
        
        // 如果是检查操作，更新统计信息
        if (action === 'check_old_memories') {
          setStatistics(result.statistics)
        }
      } else {
        toast({
          title: "操作失败",
          description: result.error || "未知错误",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "请求失败",
        description: error instanceof Error ? error.message : "网络错误",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Brain className="h-6 w-6" />
        <h1 className="text-2xl font-bold">AI记忆管理</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 操作面板 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>记忆时间管理</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">标记旧记忆</h3>
              <p className="text-sm text-muted-foreground">
                为30天前未更新的记忆添加时间提醒标记，而不是删除它们
              </p>
              <Button 
                onClick={() => handleAction('mark_old_memories')}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                标记旧记忆
              </Button>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">刷新记忆标记</h3>
              <p className="text-sm text-muted-foreground">
                移除最近7天内更新的记忆的时间标记
              </p>
              <Button 
                onClick={() => handleAction('remove_old_memory_markers')}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                刷新标记
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 统计信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>记忆统计</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => handleAction('check_old_memories')}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
              获取统计信息
            </Button>

            {statistics && (
              <div className="space-y-3 pt-4 border-t">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium">总记忆数</div>
                    <div className="text-2xl font-bold text-blue-600">{statistics.total_memories}</div>
                  </div>
                  <div>
                    <div className="font-medium">旧记忆数</div>
                    <div className="text-2xl font-bold text-orange-600">{statistics.old_memories}</div>
                  </div>
                  <div>
                    <div className="font-medium">已标记数</div>
                    <div className="text-2xl font-bold text-green-600">{statistics.marked_memories}</div>
                  </div>
                  <div>
                    <div className="font-medium">未标记旧记忆</div>
                    <div className="text-2xl font-bold text-red-600">{statistics.unmarked_old_memories}</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 说明文档 */}
      <Card>
        <CardHeader>
          <CardTitle>功能说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">新的AI记忆管理策略</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• <strong>不再删除旧记忆</strong>：保留用户的重要信息，如过敏、慢性疾病等</li>
              <li>• <strong>智能标记</strong>：为30天前的记忆添加"[该内容距今时间较长，可能会有更新]"标记</li>
              <li>• <strong>主动确认</strong>：AI在使用旧记忆时会主动询问用户信息是否仍然准确</li>
              <li>• <strong>自动刷新</strong>：当用户确认或更新信息时，自动移除时间标记</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">使用场景示例</h3>
            <div className="bg-muted p-3 rounded text-sm">
              <p><strong>旧逻辑</strong>：30天后直接删除 "用户对乳制品过敏" → 用户需要重新告知</p>
              <p><strong>新逻辑</strong>：标记为 "[该内容距今时间较长，可能会有更新] 用户对乳制品过敏" → AI主动确认："我记得您对乳制品过敏，这个信息是否还准确？"</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
