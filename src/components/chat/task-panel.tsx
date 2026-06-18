'use client'

import { useState, useEffect, useCallback } from 'react'

interface AgentStep {
  id: string
  agentId: string
  index: number
  kind: string
  status: string
  summary: string
  createdAt: string
}

interface HarmonyTask {
  id: string
  title: string
  description: string
  type: string
  status: string
  targetAgentId: string | null
  confidence: number
  reason: string
  createdAt: string
  steps: AgentStep[]
}

interface HarmonyTaskResponse extends Omit<HarmonyTask, 'steps'> {
  steps?: AgentStep[]
  agentSteps?: AgentStep[]
}

interface TaskPanelProps {
  conversationId: string
  refreshKey?: number
}

const STATUS_STYLES: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  pending:   { dot: 'bg-gray-400', bg: 'bg-gray-50', text: 'text-gray-600', label: '待处理' },
  queued:    { dot: 'bg-blue-400', bg: 'bg-blue-50', text: 'text-blue-600', label: '排队中' },
  running:   { dot: 'bg-yellow-400', bg: 'bg-yellow-50', text: 'text-yellow-700', label: '执行中' },
  completed: { dot: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700', label: '已完成' },
  failed:    { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700', label: '失败' },
  cancelled: { dot: 'bg-gray-400', bg: 'bg-gray-50', text: 'text-gray-500', label: '已取消' },
}

const STEP_STATUS_STYLES: Record<string, { dot: string; text: string }> = {
  pending:   { dot: 'bg-gray-300', text: 'text-gray-500' },
  running:   { dot: 'bg-yellow-400', text: 'text-yellow-600' },
  completed: { dot: 'bg-green-500', text: 'text-green-600' },
  failed:    { dot: 'bg-red-500', text: 'text-red-600' },
}

export function normalizeTask(task: HarmonyTaskResponse): HarmonyTask {
  return {
    ...task,
    steps: task.steps ?? task.agentSteps ?? [],
  }
}

export function TaskPanel({ conversationId, refreshKey = 0 }: TaskPanelProps) {
  const [tasks, setTasks] = useState<HarmonyTask[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/tasks`)
      if (!response.ok) return
      const data = await response.json()
      const nextTasks = Array.isArray(data.data)
        ? data.data.map((task: HarmonyTaskResponse) => normalizeTask(task))
        : []
      setTasks(nextTasks)
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [conversationId])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchTasks()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [fetchTasks, refreshKey])

  // 定时刷新 running 状态的任务
  useEffect(() => {
    const hasRunning = tasks.some((t) => t.status === 'running' || t.status === 'queued')
    if (!hasRunning) return

    const interval = setInterval(() => {
      void fetchTasks()
    }, 3000)
    return () => clearInterval(interval)
  }, [tasks, fetchTasks])

  const toggleExpand = (taskId: string) => {
    setExpandedTaskId((prev) => (prev === taskId ? null : taskId))
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-700">任务状态</h2>
        <p className="mt-0.5 text-xs text-gray-400">
          {tasks.length} 个任务
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-2 text-gray-400">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
            </div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <div className="text-3xl mb-2">📋</div>
            <p className="text-xs">暂无任务</p>
            <p className="text-[10px] mt-1">发送消息后任务将显示在这里</p>
          </div>
        ) : (
          tasks.map((task) => {
            const style = STATUS_STYLES[task.status] ?? STATUS_STYLES.pending
            const isExpanded = expandedTaskId === task.id
            const steps = task.steps ?? []
            const completedSteps = steps.filter((s) => s.status === 'completed').length
            const totalSteps = steps.length

            return (
              <div
                key={task.id}
                className={`mb-2 rounded-lg border border-gray-200 bg-white ${style.bg} transition-colors`}
              >
                {/* 任务头部 */}
                <button
                  onClick={() => toggleExpand(task.id)}
                  className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left"
                >
                  {/* 状态指示点 */}
                  <div className="mt-1 flex shrink-0 items-center gap-1.5">
                    <span className={`inline-block h-2.5 w-2.5 rounded-full ${style.dot} ${task.status === 'running' ? 'animate-pulse' : ''}`} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-medium text-gray-800">
                        {task.title}
                      </span>
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${style.text} ${style.bg}`}>
                        {style.label}
                      </span>
                    </div>

                    {/* 目标 Agent */}
                    {task.targetAgentId && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-gray-500">
                        <span>🎯</span>
                        <span className="truncate">{task.targetAgentId}</span>
                        {task.confidence > 0 && (
                          <span className="text-gray-400">
                            ({Math.round(task.confidence * 100)}%)
                          </span>
                        )}
                      </div>
                    )}

                    {/* 步骤进度 */}
                    {totalSteps > 0 && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full rounded-full bg-blue-500 transition-all duration-500"
                            style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {completedSteps}/{totalSteps}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 展开箭头 */}
                  <svg
                    className={`mt-0.5 h-4 w-4 shrink-0 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* 展开的步骤列表 */}
                {isExpanded && steps.length > 0 && (
                  <div className="border-t border-gray-100 px-3 py-2">
                    <div className="mb-1.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                      执行步骤
                    </div>
                    <div className="space-y-1.5">
                      {[...steps]
                        .sort((a, b) => a.index - b.index)
                        .map((step) => {
                          const stepStyle = STEP_STATUS_STYLES[step.status] ?? STEP_STATUS_STYLES.pending
                          return (
                            <div
                              key={step.id}
                              className="flex items-start gap-2 rounded-md bg-gray-50 px-2 py-1.5"
                            >
                              <span className={`mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${stepStyle.dot} ${step.status === 'running' ? 'animate-pulse' : ''}`} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-medium text-gray-700">
                                    #{step.index + 1}
                                  </span>
                                  <span className={`text-[10px] ${stepStyle.text}`}>
                                    {step.kind}
                                  </span>
                                </div>
                                <p className="mt-0.5 text-[10px] leading-4 text-gray-500 line-clamp-2">
                                  {step.summary}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}

                {/* 展开的描述 */}
                {isExpanded && !steps.length && task.description && (
                  <div className="border-t border-gray-100 px-3 py-2">
                    <p className="text-[10px] leading-4 text-gray-500">
                      {task.description}
                    </p>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
