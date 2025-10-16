"use client"
import React, { useEffect, useState } from 'react'

type ApiKeyItem = {
  id: string
  prefix: string
  name: string | null
  scopes: string[] | null
  allowed_tools: string[] | null
  expires_at: string | null
  last_used_at: string | null
  revoked_at: string | null
  created_at: string
}

export default function ApiKeysPage() {
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<ApiKeyItem[]>([])
  const [newKey, setNewKey] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [ttlDays, setTtlDays] = useState<number>(90)

  async function refresh() {
    setLoading(true)
    try {
      const res = await fetch('/api/keys', { cache: 'no-store' })
      const data = await res.json()
      if (data.success) setItems(data.keys)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  async function createKey() {
    setLoading(true)
    setNewKey(null)
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name || undefined, ttlDays })
      })
      const data = await res.json()
      if (data.success) {
        setNewKey(data.key)
        await refresh()
      }
    } finally { setLoading(false) }
  }

  async function revokeKey(id: string) {
    if (!confirm('确定要撤销此 API Key 吗？撤销后不可恢复。')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/keys/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) await refresh()
    } finally { setLoading(false) }
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold mb-4">API Key 管理</h1>
      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-3">
          <input className="border rounded px-3 py-2 flex-1" placeholder="备注 (可选)" value={name} onChange={e=>setName(e.target.value)} />
          <input className="border rounded px-3 py-2 w-28" type="number" min={1} max={365} value={ttlDays} onChange={e=>setTtlDays(parseInt(e.target.value||'90',10))} />
          <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={createKey} disabled={loading}>创建 Key</button>
        </div>
        {newKey && (
          <div className="p-3 rounded border bg-yellow-50">
            <div className="font-medium mb-1">请立即复制保存此 Key，之后将无法再次查看：</div>
            <code className="break-all">{newKey}</code>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">我的 Keys</h2>
        <div className="border rounded">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="p-2">前缀</th>
                <th className="p-2">备注</th>
                <th className="p-2">到期</th>
                <th className="p-2">最近使用</th>
                <th className="p-2">状态</th>
                <th className="p-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it.id} className="border-t">
                  <td className="p-2">{it.prefix}</td>
                  <td className="p-2">{it.name || '-'}</td>
                  <td className="p-2">{it.expires_at ? new Date(it.expires_at).toLocaleString() : '永不过期'}</td>
                  <td className="p-2">{it.last_used_at ? new Date(it.last_used_at).toLocaleString() : '-'}</td>
                  <td className="p-2">{it.revoked_at ? '已撤销' : '有效'}</td>
                  <td className="p-2">
                    {!it.revoked_at && (
                      <button className="text-red-600" onClick={()=>revokeKey(it.id)} disabled={loading}>撤销</button>
                    )}
                  </td>
                </tr>
              ))}
              {items.length===0 && (
                <tr><td className="p-3 text-gray-500" colSpan={6}>暂无 Key</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


