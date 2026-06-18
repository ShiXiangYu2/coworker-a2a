'use client'

import { useState, useEffect } from 'react'

interface EvalRun {
  id: string
  targetType: string
  targetId: string
  evaluatorId: string
  status: string
  trigger: string
  checksSummaryJson: string
  createdAt: string
}

const layerColors: Record<string, string> = {
  functional: 'bg-blue-100 text-blue-800',
  performance: 'bg-green-100 text-green-800',
  boundary: 'bg-yellow-100 text-yellow-800',
  business: 'bg-purple-100 text-purple-800',
}

const statusColors: Record<string, string> = {
  passed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  pending: 'bg-gray-100 text-gray-600',
}

export function EvalPanel() {
  const [runs, setRuns] = useState<EvalRun[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchRuns() {
    try {
      const res = await fetch('/api/eval-runs')
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

  // 按 targetType 分组
  const grouped = runs.reduce((acc, run) => {
    const key = run.targetType
    if (!acc[key]) acc[key] = []
    acc[key].push(run)
    return acc
  }, {} as Record<string, EvalRun[]>)

  if (loading) {
    return (
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="text-sm text-gray-500">正在读取质量评估记录...</div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <div className="border-b px-4 py-3">
        <h2 className="text-lg font-semibold text-gray-900">质量评估</h2>
        <p className="text-xs text-gray-500">{runs.length} 条评估记录</p>
      </div>

      <div className="max-h-96 overflow-y-auto p-4">
        {Object.keys(grouped).length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            暂无质量评估记录
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([targetType, evalRuns]) => (
              <div key={targetType} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${layerColors[targetType] ?? 'bg-gray-100 text-gray-600'}`}>
                    {targetType}
                  </span>
                  <span className="text-xs text-gray-500">{evalRuns.length} runs</span>
                </div>
                <div className="space-y-1">
                  {evalRuns.slice(0, 5).map((run) => (
                    <div key={run.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${statusColors[run.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {run.status}
                        </span>
                        <span className="text-gray-600">{run.evaluatorId}</span>
                      </div>
                      <span className="text-gray-400">
                        {new Date(run.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
