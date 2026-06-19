'use client'

import { useEffect, useState } from 'react'
import { EmptyState, ErrorState, LoadingState, PanelShell, RefreshButton, StatusBadge } from './ui'

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
  jobs: 'bg-sky-500',
  linus: 'bg-emerald-500',
  turing: 'bg-violet-500',
  bezos: 'bg-amber-500',
  elon: 'bg-rose-500',
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
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchRuns() {
    setError(null)
    try {
      const res = await fetch('/api/audit/agent-runs?limit=100')
      if (!res.ok) {
        throw new Error('读取 Agent 分析记录失败')
      }
      const data = await res.json()
      setRuns(data.data ?? [])
    } catch {
      setError('读取 Agent 分析记录失败，请稍后重试。')
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

  const stats = runs.reduce((acc, run) => {
    if (!acc[run.agentId]) {
      acc[run.agentId] = { total: 0, completed: 0, failed: 0, avgDurationMs: 0, durations: [] }
    }
    const item = acc[run.agentId]
    item.total += 1
    if (run.status === 'completed') item.completed += 1
    if (run.status === 'failed') item.failed += 1
    if (run.startedAt && run.completedAt) {
      const duration = new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()
      item.durations.push(duration)
    }
    return acc
  }, {} as Record<string, { total: number; completed: number; failed: number; avgDurationMs: number; durations: number[] }>)

  for (const item of Object.values(stats)) {
    item.avgDurationMs = item.durations.length > 0
      ? Math.round(item.durations.reduce((a, b) => a + b, 0) / item.durations.length)
      : 0
  }

  if (loading) {
    return <LoadingState label="正在读取 Agent 分析记录..." />
  }

  return (
    <PanelShell
      title="Agent 分析记录"
      description={`${runs.length} 条 AgentRun 审计记录。这里是统计视图，不会启动或继续 Agent。`}
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
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(stats)
          .sort(([, a], [, b]) => b.total - a.total)
          .map(([agentId, item]) => (
            <div key={agentId} className="rounded-lg border border-gray-200 p-4">
              <div className="flex min-w-0 items-center gap-2">
                <div className={`h-3 w-3 shrink-0 rounded-full ${agentColors[agentId] ?? 'bg-gray-400'}`} />
                <span className="break-words text-sm font-semibold text-gray-900">
                  {agentLabels[agentId] ?? agentId}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <Metric label="总次数" value={String(item.total)} />
                <Metric label="成功率" value={item.total > 0 ? `${((item.completed / item.total) * 100).toFixed(0)}%` : '-'} />
                <Metric label="失败数" value={String(item.failed)} />
                <Metric label="平均耗时" value={item.avgDurationMs > 0 ? `${(item.avgDurationMs / 1000).toFixed(1)} 秒` : '-'} />
              </div>
              <div className="mt-3">
                <StatusBadge status={item.failed > 0 ? 'review' : 'approved_record'} />
              </div>
            </div>
          ))}

        {Object.keys(stats).length === 0 && (
          <div className="col-span-full">
            <EmptyState title="暂无 AgentRun 记录" description="产生本地 Agent 分析记录后，这里会展示按 Agent 维度聚合的状态。" />
          </div>
        )}
      </div>
    </PanelShell>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-gray-500">{label}</div>
      <div className="break-words text-lg font-bold text-gray-900">{value}</div>
    </div>
  )
}
