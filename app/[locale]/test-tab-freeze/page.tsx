"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { usePageVisibility } from '@/hooks/use-page-visibility'

export default function TestTabFreeze() {
  const { isVisible, createSmartInterval, clearSmartInterval, createSmartTimeout, clearSmartTimeout } = usePageVisibility()
  const [counter, setCounter] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null)

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]) // 保留最近20条日志
  }

  // 启动智能定时器
  const startSmartInterval = () => {
    if (intervalId) return
    
    const id = createSmartInterval(() => {
      setCounter(prev => prev + 1)
      addLog(`智能定时器执行 - 计数器: ${counter + 1}`)
    }, 1000)
    
    setIntervalId(id)
    addLog('智能定时器已启动')
  }

  // 停止智能定时器
  const stopSmartInterval = () => {
    if (intervalId) {
      clearSmartInterval(intervalId)
      setIntervalId(null)
      addLog('智能定时器已停止')
    }
  }

  // 测试智能超时
  const testSmartTimeout = () => {
    addLog('测试智能超时 - 3秒后执行')
    createSmartTimeout(() => {
      addLog('智能超时执行完成')
    }, 3000)
  }

  // 监听页面可见性变化
  useEffect(() => {
    addLog(`页面可见性: ${isVisible ? '可见' : '隐藏'}`)
  }, [isVisible])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (intervalId) {
        clearSmartInterval(intervalId)
      }
    }
  }, [intervalId, clearSmartInterval])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            标签页冻结机制测试
            <Badge variant={isVisible ? "default" : "secondary"}>
              {isVisible ? "页面可见" : "页面隐藏"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="text-2xl font-bold">
              计数器: {counter}
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={startSmartInterval}
                disabled={!!intervalId}
                variant={intervalId ? "secondary" : "default"}
              >
                启动智能定时器
              </Button>
              <Button 
                onClick={stopSmartInterval}
                disabled={!intervalId}
                variant="destructive"
              >
                停止智能定时器
              </Button>
              <Button 
                onClick={testSmartTimeout}
                variant="outline"
              >
                测试智能超时
              </Button>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <p><strong>测试说明：</strong></p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>启动智能定时器后，每秒计数器会增加1</li>
              <li>当切换到其他标签页时，页面状态会变为"隐藏"</li>
              <li>在后台标签页中，智能定时器会自动暂停</li>
              <li>切换回当前标签页时，定时器会自动恢复</li>
              <li>智能超时也会在页面隐藏时延迟执行</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>执行日志</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-muted-foreground text-center">暂无日志</div>
            ) : (
              <div className="space-y-1 font-mono text-sm">
                {logs.map((log, index) => (
                  <div key={index} className="text-xs">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>页面可见性状态</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">当前状态</div>
              <div className="text-lg font-semibold">
                {isVisible ? "🟢 页面可见" : "🔴 页面隐藏"}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">定时器状态</div>
              <div className="text-lg font-semibold">
                {intervalId ? "🟢 运行中" : "⚪ 已停止"}
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">如何测试：</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
              <li>点击"启动智能定时器"开始计数</li>
              <li>观察计数器每秒增加</li>
              <li>切换到其他标签页（如新建标签页或切换到其他网站）</li>
              <li>等待几秒钟后切换回来</li>
              <li>观察页面状态变化和计数器是否在后台暂停了</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
