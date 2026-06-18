'use client'

import { useState, useEffect } from 'react'

interface Task {
  id: string
  title: string
  status: string
  targetAgentId: string | null
  confidence: number
  createdAt: string
  type: string
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 ring-yellow-200',
  running: 'bg-blue-100 text-blue-800 ring-blue-200',
  completed: 'bg-green-100 text-green-800 ring-green-200',
  blocked: 'bg-red-100 text-red-800 ring-red-200',
  cancelled: 'bg-gray-100 text-gray-800 ring-gray-200',
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
      // silent
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

  const filtered = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter)
  const statusCounts = tasks.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  if (loading) {
    return (
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="animate-pulse text-sm text-gray-500">Loading tasks...</div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <div className="border-b px-4 py-3">
        <h2 className="text-lg font-semibold text-gray-900">交付任务</h2>
        <p className="text-xs text-gray-500">{tasks.length} 条本地任务记录</p>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 border-b px-4 py-2">
        <button
          onClick={() => setFilter('all')}
          className={`rounded px-3 py-1 text-xs font-medium ring-1 ${
            filter === 'all'
              ? 'bg-gray-800 text-white ring-gray-800'
              : 'bg-white text-gray-600 ring-gray-200 hover:bg-gray-50'
          }`}
        >
          All ({tasks.length})
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

      {/* Task list */}
      <div className="max-h-96 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            暂无交付任务记录
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map((task) => (
              <div key={task.id} className="px-4 py-3 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ring-1 ${statusColors[task.status] ?? 'bg-gray-100 text-gray-600 ring-gray-200'}`}>
                      {task.status}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{task.title}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {task.targetAgentId && (
                      <span className="rounded bg-purple-50 px-2 py-0.5 text-purple-700">
                        {agentLabels[task.targetAgentId] ?? task.targetAgentId}
                      </span>
                    )}
                    <span>{(task.confidence * 100).toFixed(0)}%</span>
                    <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
