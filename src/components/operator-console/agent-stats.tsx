'use client'

import { useState, useEffect } from 'react'

interface AgentRun {
  id: string
  agentId: string
  status: string
  trigger: string
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

const agentColors: Record<string, string> = {
  jobs: 'bg-blue-500',
  linus: 'bg-green-500',
  turing: 'bg-purple-500',
  bezos: 'bg-orange-500',
  elon: 'bg-red-500',
  kelvin: 'bg-gray-500',
}

const agentLabels: Record<string, string> = {
  jobs: 'Jobs / Product',
  linus: 'Linus / Engineering',
  turing: 'Turing / Verification',
  bezos: 'Bezos / Customer',
  elon: 'Elon / CEO',
  kelvin: 'Kelvin / Human',
}

export function AgentStats() {
  const [runs, setRuns] = useState<AgentRun[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchRuns() {
    try {
      const res = await fetch('/api/audit/agent-runs?limit=100')
      if (res.ok) {
        const data = await res.json()
        setRuns(data.data ?? [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchRuns()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [])

  // 计算每个 Agent 的统计
  const stats = runs.reduce((acc, run) => {
    if (!acc[run.agentId]) {
      acc[run.agentId] = { total: 0, completed: 0, failed: 0, avgDurationMs: 0, durations: [] }
    }
    const s = acc[run.agentId]
    s.total++
    if (run.status === 'completed') s.completed++
    if (run.status === 'failed') s.failed++
    if (run.startedAt && run.completedAt) {
      const duration = new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()
      s.durations.push(duration)
    }
    return acc
  }, {} as Record<string, { total: number; completed: number; failed: number; avgDurationMs: number; durations: number[] }>)

  // 计算平均耗时
  for (const s of Object.values(stats)) {
    s.avgDurationMs = s.durations.length > 0
      ? Math.round(s.durations.reduce((a, b) => a + b, 0) / s.durations.length)
      : 0
  }

  if (loading) {
    return (
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="animate-pulse text-sm text-gray-500">Loading agent stats...</div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <div className="border-b px-4 py-3">
        <h2 className="text-lg font-semibold text-gray-900">专家分析</h2>
        <p className="text-xs text-gray-500">{runs.length} 条分析记录</p>
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(stats)
          .sort(([, a], [, b]) => b.total - a.total)
          .map(([agentId, s]) => (
            <div key={agentId} className="rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${agentColors[agentId] ?? 'bg-gray-400'}`} />
                <span className="text-sm font-semibold text-gray-900">
                  {agentLabels[agentId] ?? agentId}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-gray-500">Total</div>
                  <div className="text-lg font-bold text-gray-900">{s.total}</div>
                </div>
                <div>
                  <div className="text-gray-500">Success Rate</div>
                  <div className="text-lg font-bold text-green-600">
                    {s.total > 0 ? `${((s.completed / s.total) * 100).toFixed(0)}%` : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Failed</div>
                  <div className="text-lg font-bold text-red-600">{s.failed}</div>
                </div>
                <div>
                  <div className="text-gray-500">Avg Duration</div>
                  <div className="text-lg font-bold text-gray-900">
                    {s.avgDurationMs > 0 ? `${(s.avgDurationMs / 1000).toFixed(1)}s` : '—'}
                  </div>
                </div>
              </div>
            </div>
          ))}

        {Object.keys(stats).length === 0 && (
          <div className="col-span-full py-8 text-center text-sm text-gray-500">
            No agent runs recorded yet
          </div>
        )}
      </div>
    </div>
  )
}
