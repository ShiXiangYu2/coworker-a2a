'use client'

import { useEffect, useState } from 'react'
import { EmptyState, ErrorState, LoadingState, PanelShell, RefreshButton, StatusBadge } from './ui'

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

export function EvalPanel() {
  const [runs, setRuns] = useState<EvalRun[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchRuns() {
    setError(null)
    try {
      const res = await fetch('/api/eval-runs')
      if (!res.ok) {
        throw new Error('读取质量评估记录失败')
      }
      const data = await res.json()
      setRuns(data.data ?? [])
    } catch {
      setError('读取质量评估记录失败，请稍后重试。')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchRuns()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [])

  const grouped = runs.reduce((acc, run) => {
    const key = run.targetType
    if (!acc[key]) acc[key] = []
    acc[key].push(run)
    return acc
  }, {} as Record<string, EvalRun[]>)

  if (loading) {
    return <LoadingState label="正在读取质量评估记录..." />
  }

  return (
    <PanelShell
      title="质量评估"
      description={`${runs.length} 条 EvalRun 记录。评估结果只能作为 recommendation / evidence，不能作为执行、发布或部署许可。`}
      action={
        <RefreshButton
          disabled={refreshing}
          onClick={() => {
            setRefreshing(true)
            void fetchRuns()
          }}
        >
          {refreshing ? '刷新中...' : '刷新'}
        </RefreshButton>
      }
    >
      {error && (
        <ErrorState
          message={error}
          action={
            <RefreshButton
              disabled={refreshing}
              onClick={() => {
                setRefreshing(true)
                void fetchRuns()
              }}
            >
              重试
            </RefreshButton>
          }
        />
      )}
      <div className="max-h-96 overflow-y-auto p-4">
        {Object.keys(grouped).length === 0 ? (
          <EmptyState title="暂无质量评估记录" description="生成本地 EvalRun 后，这里会按目标类型展示 recommendation-only 评估结果。" />
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([targetType, evalRuns]) => (
              <div key={targetType} className="rounded-lg border border-gray-200 p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="break-words text-sm font-semibold text-gray-900">{targetType}</span>
                  <span className="text-xs text-gray-500">{evalRuns.length} 条记录</span>
                </div>
                <div className="space-y-2">
                  {evalRuns.slice(0, 5).map((run) => (
                    <div key={run.id} className="flex flex-col gap-1 rounded bg-gray-50 px-2 py-2 text-xs sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <StatusBadge status={run.status} />
                        <span className="break-words text-gray-600">{run.evaluatorId}</span>
                      </div>
                      <span className="shrink-0 text-gray-400">
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
    </PanelShell>
  )
}
