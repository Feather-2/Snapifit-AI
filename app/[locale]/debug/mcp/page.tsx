"use client"

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLocalMcp } from '@/hooks/use-local-mcp'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Provider = { id: string; name: string; isActive: boolean }
type Tool = { name: string; description?: string; inputSchema?: any }

export default function MCPDebugPage() {
  const [loading, setLoading] = useState(false)
  const [providers, setProviders] = useState<Provider[]>([])
  const [selectedProvider, setSelectedProvider] = useState<string>("")
  const [tools, setTools] = useState<Tool[]>([])
  const [selectedTool, setSelectedTool] = useState<string>("")
  const [paramsText, setParamsText] = useState<string>("{}")
  const [resultText, setResultText] = useState<string>("")
  const [tab, setTab] = useState<'call' | 'secure' | 'local'>('call')
  const [localBaseUrl, setLocalBaseUrl] = useState<string>('http://127.0.0.1:33789')
  const [localCode, setLocalCode] = useState<string>('')
  const [localTool, setLocalTool] = useState<string>('')
  const [localParams, setLocalParams] = useState<string>('{}')
  const local = useLocalMcp({ baseUrl: localBaseUrl })

  useEffect(() => {
    void refreshProviders()
  }, [])

  async function refreshProviders() {
    setLoading(true)
    try {
      const res = await fetch('/api/mcp/call?action=list_providers')
      const data = await res.json()
      if (data?.success && Array.isArray(data.providers)) {
        setProviders(data.providers)
      } else if (Array.isArray(data.providers)) {
        // 接口旧格式容错
        setProviders(data.providers)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const currentProvider = useMemo(() => providers.find(p => p.id === selectedProvider), [providers, selectedProvider])

  async function refreshTools() {
    if (!selectedProvider) return
    setLoading(true)
    try {
      const res = await fetch(`/api/mcp/call?action=get_tools&provider_id=${encodeURIComponent(selectedProvider)}`)
      const data = await res.json()
      if (data?.success && Array.isArray(data.tools)) {
        setTools(data.tools)
      } else if (Array.isArray(data.tools)) {
        setTools(data.tools)
      } else {
        setTools([])
      }
    } catch (e) {
      console.error(e)
      setTools([])
    } finally {
      setLoading(false)
    }
  }

  function parseParams(): Record<string, any> | null {
    try {
      const obj = paramsText.trim() ? JSON.parse(paramsText) : {}
      return obj
    } catch (e) {
      alert('参数必须为合法的 JSON')
      return null
    }
  }

  async function callViaSimpleGateway() {
    if (!selectedProvider) return alert('请选择 Provider')
    if (!selectedTool) return alert('请选择工具')
    const params = parseParams()
    if (!params) return
    setLoading(true)
    setResultText('')
    try {
      const res = await fetch('/api/mcp/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'call_tool',
          provider_id: selectedProvider,
          tool_name: selectedTool,
          params,
        })
      })
      const data = await res.json()
      setResultText(JSON.stringify(data, null, 2))
    } catch (e) {
      setResultText(String(e))
    } finally {
      setLoading(false)
    }
  }

  async function callViaSecureProxy() {
    if (!selectedTool) return alert('请选择工具')
    const params = parseParams()
    if (!params) return
    setLoading(true)
    setResultText('')
    try {
      // 获取一次性 token
      const tokenRes = await fetch('/api/mcp/secure-proxy/token')
      if (!tokenRes.ok) {
        const err = await tokenRes.text()
        throw new Error('获取安全令牌失败: ' + err)
      }
      const { token } = await tokenRes.json()

      const res = await fetch('/api/mcp/secure-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: selectedTool,
          params,
          context: {},
          securityToken: token,
        })
      })
      const data = await res.json()
      setResultText(JSON.stringify(data, null, 2))
    } catch (e) {
      setResultText(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold">MCP 测试界面</h1>

      <Card>
        <CardHeader>
          <CardTitle>Provider 与工具</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label>Provider</Label>
              <Select value={selectedProvider} onValueChange={(v) => setSelectedProvider(v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="选择 Provider" /></SelectTrigger>
                <SelectContent>
                  {providers.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.isActive ? '启用' : '禁用'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="secondary" onClick={refreshProviders} disabled={loading}>刷新 Providers</Button>
            <Button onClick={refreshTools} disabled={!selectedProvider || loading}>获取工具列表</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>工具</Label>
              <Select value={selectedTool} onValueChange={(v) => setSelectedTool(v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="选择工具" /></SelectTrigger>
                <SelectContent>
                  {tools.map(t => (
                    <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground mt-2 min-h-[2rem]">
                {tools.find(t => t.name === selectedTool)?.description || '—'}
              </div>
            </div>

            <div>
              <Label>参数 (JSON)</Label>
              <Textarea value={paramsText} onChange={(e) => setParamsText(e.target.value)} rows={8} className="font-mono" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>调用</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList>
              <TabsTrigger value="call">简化网关 (/api/mcp/call)</TabsTrigger>
              <TabsTrigger value="secure">安全代理 (/api/mcp/secure-proxy)</TabsTrigger>
              <TabsTrigger value="local">本地 Proxy</TabsTrigger>
            </TabsList>
            <TabsContent value="call" className="space-y-2">
              <div className="flex gap-2">
                <Button onClick={callViaSimpleGateway} disabled={loading || !selectedProvider || !selectedTool}>
                  {loading ? '执行中…' : '调用工具'}
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="secure" className="space-y-2">
              <div className="flex gap-2">
                <Button onClick={callViaSecureProxy} disabled={loading || !selectedTool}>
                  {loading ? '执行中…' : '通过安全代理调用'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="local" className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>本地代理地址</Label>
                  <Input value={localBaseUrl} onChange={e => setLocalBaseUrl(e.target.value)} placeholder="http://127.0.0.1:33789" />
                  <Label>8 位验证码（在本地 UI 查看）</Label>
                  <Input value={localCode} onChange={e => setLocalCode(e.target.value)} placeholder="例如 12345678" />
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => void local.handshakeInit(localCode)} disabled={local.busy || !localCode}>发起握手</Button>
                    <Button onClick={() => void local.handshakeConfirm(localCode)} disabled={local.busy || !localCode}>确认并建立会话</Button>
                    <Button variant="outline" onClick={local.clearSession}>清除会话</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>工具名称</Label>
                  <Input value={localTool} onChange={e => setLocalTool(e.target.value)} placeholder="BMI_CALCULATOR 等" />
                  <Label>参数 (JSON)</Label>
                  <Textarea value={localParams} onChange={e => setLocalParams(e.target.value)} rows={8} className="font-mono" />
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={async () => {
                      try {
                        const data = await local.listTools()
                        setResultText(JSON.stringify(data, null, 2))
                      } catch (e) {
                        setResultText(String(e))
                      }
                    }} disabled={!local.hasSession || local.busy}>列出本地工具</Button>
                    <Button onClick={async () => {
                      try {
                        const params = localParams.trim() ? JSON.parse(localParams) : {}
                        const data = await local.callTool(localTool, params)
                        setResultText(JSON.stringify(data, null, 2))
                      } catch (e) {
                        setResultText(String(e))
                      }
                    }} disabled={!local.hasSession || local.busy || !localTool}>调用本地工具</Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div>
            <Label>结果</Label>
            <Textarea value={resultText} readOnly rows={14} className="font-mono" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}




