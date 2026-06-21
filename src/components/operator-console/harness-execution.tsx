'use client'

/**
 * HARNESS Execution State — 执行态视图
 *
 * 展示当前运行时状态：
 * - 活跃 Agent Run
 * - 工具执行状态
 * - 资源消耗（Token/成本）
 * - 错误和重试
 */

import { useState, useEffect } from 'react'

interface ExecutionState {
  activeRuns: Array<{
    id: string
    agentId: string
    taskId: string
    status: string
    startedAt: string
    durationMs: number
  }>
  recentToolCalls: Array<{
    id: string
    agentId: string
    toolName: string
    status: string
    durationMs: number
    timestamp: string
  }>
  resourceUsage: {
    tokensUsed: number
    costUsd: number
    requestsCount: number
  }
  recentErrors: Array<{
    id: string
    agentId: string
    error: string
    timestamp: string
  }>
}

export function HarnessExecution() {
  const [state, setState] = useState<ExecutionState | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchState() {
    try {
      const res = await fetch('/api/operator/harness-execution')
      const json = await res.json()
      if (json.ok) setState(json.data)
    } catch {
      setState({
        activeRuns: [],
        recentToolCalls: [],
        resourceUsage: { tokensUsed: 0, costUsd: 0, requestsCount: 0 },
        recentErrors: [],
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(fetchState, 0)
    const interval = window.setInterval(fetchState, 10000) // 10s 刷新
    return () => {
      window.clearTimeout(timeout)
      window.clearInterval(interval)
    }
  }, [])

  if (loading) return <div className="p-6 text-gray-500">Loading execution state...</div>

  return (
    <div className="space-y-6">
      {/* 资源消耗概览 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Token 消耗</div>
          <div className="text-2xl font-bold mt-1">
            {state?.resourceUsage.tokensUsed.toLocaleString() ?? 0}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">成本</div>
          <div className="text-2xl font-bold mt-1">
            ${state?.resourceUsage.costUsd.toFixed(4) ?? '0.0000'}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">请求数</div>
          <div className="text-2xl font-bold mt-1">
            {state?.resourceUsage.requestsCount ?? 0}
          </div>
        </div>
      </div>

      {/* 活跃运行 */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">⚡ 活跃运行</h3>
        {state?.activeRuns.length === 0 ? (
          <div className="text-gray-400 text-sm">无活跃运行</div>
        ) : (
          <div className="space-y-3">
            {state?.activeRuns.map((run) => (
              <div key={run.id} className="flex items-center gap-3 text-sm border-b pb-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                  {run.agentId}
                </span>
                <span className="flex-1 text-gray-600">{run.taskId.slice(0, 12)}...</span>
                <span className="text-gray-400">{(run.durationMs / 1000).toFixed(1)}s</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 最近工具调用 */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">🔧 最近工具调用</h3>
        {state?.recentToolCalls.length === 0 ? (
          <div className="text-gray-400 text-sm">暂无工具调用</div>
        ) : (
          <div className="space-y-2">
            {state?.recentToolCalls.map((call) => (
              <div key={call.id} className="flex items-center gap-3 text-sm">
                <span
                  className={`w-2 h-2 rounded-full ${
                    call.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="font-mono text-xs">{call.toolName}</span>
                <span className="text-gray-400 flex-1">{call.agentId}</span>
                <span className="text-gray-400">{call.durationMs}ms</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 最近错误 */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">❌ 最近错误</h3>
        {state?.recentErrors.length === 0 ? (
          <div className="text-gray-400 text-sm">无错误 ✨</div>
        ) : (
          <div className="space-y-2">
            {state?.recentErrors.map((err) => (
              <div key={err.id} className="text-sm border-l-2 border-red-400 pl-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">{err.agentId}</span>
                  <span className="text-gray-400 text-xs">
                    {new Date(err.timestamp).toLocaleTimeString('zh-CN')}
                  </span>
                </div>
                <div className="text-red-600 text-xs mt-1">{err.error.slice(0, 100)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
