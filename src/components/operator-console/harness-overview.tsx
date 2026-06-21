'use client'

/**
 * HARNESS Overview — 总控台总览
 *
 * 展示系统全局状态：
 * - 当前活跃任务数
 * - 运行中的 AgentRun
 * - 最近阻塞点
 * - 最近审查发现
 * - 最近执行回执
 * - 生命周期阶段分布
 */

import { useState, useEffect } from 'react'

interface OverviewStats {
  activeTasks: number
  runningAgentRuns: number
  recentBlockages: number
  recentReviewFindings: number
  recentReceipts: number
  lifecycleDistribution: Record<string, number>
  recentEvents: Array<{
    id: string
    type: string
    agentId: string
    timestamp: string
    summary: string
  }>
}

export function HarnessOverview() {
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchStats() {
    try {
      const res = await fetch('/api/operator/harness-overview')
      const data = await res.json()
      if (data.ok) setStats(data.data)
    } catch {
      // 使用默认数据
      setStats({
        activeTasks: 0,
        runningAgentRuns: 0,
        recentBlockages: 0,
        recentReviewFindings: 0,
        recentReceipts: 0,
        lifecycleDistribution: {},
        recentEvents: [],
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(fetchStats, 0)
    const interval = window.setInterval(fetchStats, 30000) // 30s 刷新
    return () => {
      window.clearTimeout(timeout)
      window.clearInterval(interval)
    }
  }, [])

  if (loading) {
    return <div className="p-6 text-gray-500">Loading HARNESS overview...</div>
  }

  if (!stats) {
    return <div className="p-6 text-red-500">Failed to load overview</div>
  }

  return (
    <div className="space-y-6">
      {/* 顶部统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          title="活跃任务"
          value={stats.activeTasks}
          icon="📋"
          color="blue"
        />
        <StatCard
          title="运行中 Agent"
          value={stats.runningAgentRuns}
          icon="⚡"
          color="green"
        />
        <StatCard
          title="阻塞点"
          value={stats.recentBlockages}
          icon="🚫"
          color="red"
        />
        <StatCard
          title="审查发现"
          value={stats.recentReviewFindings}
          icon="🔍"
          color="yellow"
        />
        <StatCard
          title="执行回执"
          value={stats.recentReceipts}
          icon="✅"
          color="emerald"
        />
      </div>

      {/* 生命周期阶段分布 */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">📊 生命周期阶段分布</h3>
        <LifecycleBar distribution={stats.lifecycleDistribution} />
      </div>

      {/* 最近事件 */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">🕐 最近事件</h3>
        <div className="space-y-3">
          {stats.recentEvents.length === 0 ? (
            <div className="text-gray-400 text-sm">暂无最近事件</div>
          ) : (
            stats.recentEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-3 text-sm border-b pb-2 last:border-0"
              >
                <span className="text-gray-400 w-16 shrink-0">
                  {new Date(event.timestamp).toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                  {event.agentId}
                </span>
                <span className="text-gray-600 flex-1">{event.summary}</span>
                <span className="text-gray-400 text-xs">{event.type}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ─── 子组件 ────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string
  value: number
  icon: string
  color: string
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    red: 'bg-red-50 border-red-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    emerald: 'bg-emerald-50 border-emerald-200',
  }

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color] ?? 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span className="text-3xl font-bold">{value}</span>
      </div>
      <div className="text-sm text-gray-600 mt-2">{title}</div>
    </div>
  )
}

function LifecycleBar({
  distribution,
}: {
  distribution: Record<string, number>
}) {
  const stages = ['intake', 'consensus', 'planning', 'execution', 'review', 'repair']
  const stageColors: Record<string, string> = {
    intake: 'bg-blue-500',
    consensus: 'bg-purple-500',
    planning: 'bg-yellow-500',
    execution: 'bg-green-500',
    review: 'bg-red-500',
    repair: 'bg-indigo-500',
  }
  const stageLabels: Record<string, string> = {
    intake: '采访',
    consensus: '共识',
    planning: '计划',
    execution: '执行',
    review: '审查',
    repair: '修复',
  }

  const total = Object.values(distribution).reduce((s, v) => s + v, 0) || 1

  return (
    <div className="space-y-3">
      {/* 进度条 */}
      <div className="flex h-8 rounded-lg overflow-hidden">
        {stages.map((stage) => {
          const count = distribution[stage] ?? 0
          const pct = (count / total) * 100
          if (pct === 0) return null
          return (
            <div
              key={stage}
              className={`${stageColors[stage]} flex items-center justify-center text-white text-xs font-medium`}
              style={{ width: `${pct}%` }}
              title={`${stageLabels[stage]}: ${count}`}
            >
              {pct > 10 ? `${stageLabels[stage]} ${count}` : ''}
            </div>
          )
        })}
      </div>

      {/* 图例 */}
      <div className="flex flex-wrap gap-4 text-sm">
        {stages.map((stage) => (
          <div key={stage} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded ${stageColors[stage]}`} />
            <span className="text-gray-600">
              {stageLabels[stage]}: {distribution[stage] ?? 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
