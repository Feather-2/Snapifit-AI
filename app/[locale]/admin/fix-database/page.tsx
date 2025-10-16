'use client'

import { useState } from 'react'

export default function FixDatabasePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const executeAction = async (action: string) => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/admin/fix-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Request failed')
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">数据库修复工具</h1>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h2 className="text-yellow-800 font-semibold mb-2">⚠️ 警告</h2>
        <p className="text-yellow-700">
          这是管理员专用工具，用于修复数据库问题。请谨慎使用！
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">检查约束状态</h3>
          <p className="text-gray-600 mb-3">
            检查 daily_logs 表的唯一约束是否存在
          </p>
          <button
            onClick={() => executeAction('check_constraints')}
            disabled={isLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? '检查中...' : '检查约束'}
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">修复 daily_logs 约束</h3>
          <p className="text-gray-600 mb-3">
            修复 daily_logs 表的唯一约束问题，解决 ON CONFLICT 错误
          </p>
          <button
            onClick={() => executeAction('fix_daily_logs_constraints')}
            disabled={isLoading}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
          >
            {isLoading ? '修复中...' : '修复约束'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold mb-2">错误</h3>
          <pre className="text-red-700 text-sm whitespace-pre-wrap">{error}</pre>
        </div>
      )}

      {result && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-green-800 font-semibold mb-2">
            {result.success ? '✅ 成功' : '❌ 失败'}
          </h3>
          <pre className="text-green-700 text-sm whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold mb-2">当前错误信息</h3>
        <p className="text-gray-600 text-sm">
          错误：<code>there is no unique or exclusion constraint matching the ON CONFLICT specification</code>
        </p>
        <p className="text-gray-600 text-sm mt-2">
          这个错误表明 daily_logs 表缺少 (user_id, date) 的唯一约束，导致 atomic_usage_check_and_increment 函数中的 ON CONFLICT 语句失败。
        </p>
      </div>
    </div>
  )
}
