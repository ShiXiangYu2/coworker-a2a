'use client'

import { useEffect, useState } from 'react'
import { EmptyState, LoadingState, PanelShell, StatusBadge } from './ui'

interface RuntimeStats {
  queueWatermark: number
  activeLeases: number
  recentBlockedReasons: string[]
  recentReceipts: Array<{
    id: string
    jobId: string
    status: string
    summary: string
    createdAt: string
  }>
  recentRecoveryPoints: Array<{
    id: string
    jobId: string
    recoveryKind: string
    createdAt: string
  }>
  idempotencyHits: number
  totalJobs: number
  completedJobs: number
  failedJobs: number
}

export function RuntimeControlCenter() {
  const [stats, setStats] = useState<RuntimeStats | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchStats() {
    try {
      const res = await fetch('/api/operator/runtime-control')
      if (res.ok) {
        const result = await res.json()
        if (result.ok) {
          setStats(result.data)
        }
      }
    } catch {
      // Optional panel
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchStats()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [])

  if (loading) {
    return <LoadingState label="正在加载运行控制中枢..." />
  }

  if (!stats) {
    return (
      <PanelShell
        title="运行控制中枢 Runtime Control Center"
        description="全局运行时总览，展示队列水位、活跃 lease、阻塞原因、receipt 和 recovery point。"
      >
        <EmptyState
          title="暂无运行时数据"
          description="当 runtime job 存在后，这里会展示运行控制中枢数据。"
        />
      </PanelShell>
    )
  }

  return (
    <PanelShell
      title="运行控制中枢 Runtime Control Center"
      description="全局运行时总览，展示队列水位、活跃 lease、阻塞原因、receipt 和 recovery point。"
    >
      <div className="space-y-4">
        {/* 核心指标 */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-md border border-gray-200 bg-white p-3 text-center">
            <div className="text-xs text-gray-500">队列水位</div>
            <div className="mt-1 text-xl font-semibold text-gray-950">{stats.queueWatermark}</div>
          </div>
          <div className="rounded-md border border-gray-200 bg-white p-3 text-center">
            <div className="text-xs text-gray-500">活跃 Lease</div>
            <div className="mt-1 text-xl font-semibold text-amber-600">{stats.activeLeases}</div>
          </div>
          <div className="rounded-md border border-gray-200 bg-white p-3 text-center">
            <div className="text-xs text-gray-500">总 Job 数</div>
            <div className="mt-1 text-xl font-semibold text-gray-950">{stats.totalJobs}</div>
          </div>
          <div className="rounded-md border border-gray-200 bg-white p-3 text-center">
            <div className="text-xs text-gray-500">成功率</div>
            <div className="mt-1 text-xl font-semibold text-emerald-600">
              {stats.totalJobs > 0 ? ((stats.completedJobs / stats.totalJobs) * 100).toFixed(0) : 0}%
            </div>
          </div>
        </div>

        {/* 阻塞原因 */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-gray-950">最近阻塞原因</div>
          <div className="mt-3">
            {stats.recentBlockedReasons.length === 0 ? (
              <div className="text-sm text-gray-500">暂无阻塞原因</div>
            ) : (
              <div className="space-y-2">
                {stats.recentBlockedReasons.map((reason, index) => (
                  <div key={index} className="rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
                    {reason}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 最近 Receipt */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-gray-950">最近 Receipt</div>
          <div className="mt-3">
            {stats.recentReceipts.length === 0 ? (
              <div className="text-sm text-gray-500">暂无 Receipt</div>
            ) : (
              <div className="space-y-2">
                {stats.recentReceipts.map((receipt) => (
                  <div key={receipt.id} className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{receipt.jobId}</span>
                      <StatusBadge status={receipt.status} />
                    </div>
                    <div className="mt-1 text-xs text-gray-600">{receipt.summary}</div>
                    <div className="mt-1 text-xs text-gray-500">{new Date(receipt.createdAt).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 最近 Recovery Point */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-gray-950">最近 Recovery Point</div>
          <div className="mt-3">
            {stats.recentRecoveryPoints.length === 0 ? (
              <div className="text-sm text-gray-500">暂无 Recovery Point</div>
            ) : (
              <div className="space-y-2">
                {stats.recentRecoveryPoints.map((point) => (
                  <div key={point.id} className="rounded-md border border-indigo-200 bg-indigo-50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{point.jobId}</span>
                      <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">
                        {point.recoveryKind}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">{new Date(point.createdAt).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Idempotency 命中情况 */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-gray-950">Idempotency 命中</div>
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-semibold text-gray-950">{stats.idempotencyHits}</span>
              <span className="text-sm text-gray-500">次命中</span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Idempotency 机制确保相同操作不会重复执行
            </div>
          </div>
        </div>

        {/* 安全边界说明 */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-semibold text-amber-900">安全边界</div>
          <div className="mt-2 space-y-1 text-xs text-amber-700">
            <div>• 运行控制中枢只展示只读数据</div>
            <div>• 不暴露 worker、connector、permission 或 mutation 控制</div>
            <div>• 所有操作都维持 Sprint 22 的安全边界</div>
          </div>
        </div>
      </div>
    </PanelShell>
  )
}
