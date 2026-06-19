'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { EmptyState, LoadingState, PanelShell, StatusBadge } from './ui'

interface Task {
  id: string
  title: string
  status: string
  targetAgentId: string | null
  confidence: number
  createdAt: string
  type: string
}

const agentLabels: Record<string, string> = {
  jobs: 'Jobs',
  linus: 'Linus',
  turing: 'Turing',
  bezos: 'Bezos',
  elon: 'Elon',
  kelvin: 'Kelvin',
}

export function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  async function fetchTasks() {
    try {
      const res = await fetch('/api/harmony/tasks')
      if (res.ok) {
        const data = await res.json()
        setTasks(Array.isArray(data) ? data : [])
      }
    } catch {
      // Keep the console view resilient when local data is not ready.
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchTasks()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [])

  const filtered = filter === 'all' ? tasks : tasks.filter((task) => task.status === filter)
  const statusCounts = tasks.reduce(
    (acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  if (loading) {
    return <LoadingState label="正在读取本地任务记录..." />
  }

  return (
    <PanelShell
      title="本地任务"
      description={`${tasks.length} 条 Harmony Task 记录。这里展示 Task 状态与建议责任 Agent，不执行自动路由或任务完成。`}
    >
      <div className="flex flex-wrap gap-2 border-b border-gray-200 px-4 py-2">
        <button
          onClick={() => setFilter('all')}
          className={`rounded px-3 py-1 text-xs font-medium ring-1 ${
            filter === 'all'
              ? 'bg-gray-800 text-white ring-gray-800'
              : 'bg-white text-gray-600 ring-gray-200 hover:bg-gray-50'
          }`}
        >
          全部 ({tasks.length})
        </button>
        {Object.entries(statusCounts).map(([status, count]) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`rounded px-3 py-1 text-xs font-medium ring-1 ${
              filter === status
                ? 'bg-gray-800 text-white ring-gray-800'
                : 'bg-white text-gray-600 ring-gray-200 hover:bg-gray-50'
            }`}
          >
            {status} ({count})
          </button>
        ))}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {filtered.length === 0 ? (
          <EmptyState
            title="暂无任务记录"
            description="ChatHub 产生本地 Task 后，这里会展示任务状态、建议 Agent 和审计入口。"
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((task) => (
              <div key={task.id} className="px-4 py-3 hover:bg-gray-50">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <StatusBadge status={task.status} />
                    <span className="break-words text-sm font-medium text-gray-900">{task.title}</span>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-3 text-xs text-gray-500">
                    {task.targetAgentId && (
                      <span className="rounded bg-sky-50 px-2 py-0.5 text-sky-700">
                        {agentLabels[task.targetAgentId] ?? task.targetAgentId}
                      </span>
                    )}
                    <span>{(task.confidence * 100).toFixed(0)}%</span>
                    <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                    <Link
                      href={`/operator?runtimeTaskId=${encodeURIComponent(task.id)}`}
                      className="text-slate-700 underline-offset-2 hover:underline"
                    >
                      View Runtime Status
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PanelShell>
  )
}
