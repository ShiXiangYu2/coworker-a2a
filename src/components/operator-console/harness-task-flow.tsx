'use client'

/**
 * HARNESS Task Flow — 任务流视图
 *
 * 展示任务在六阶段之间的流转：
 * - 任务列表（按阶段分组）
 * - 任务详情（阶段历史、审计事件）
 * - 任务操作（阶段推进、阻塞、取消）
 */

import { useState, useEffect } from 'react'

interface TaskFlowItem {
  id: string
  title: string
  stage: string
  status: string
  agentId: string
  confidence: number
  createdAt: string
  updatedAt: string
}

interface TaskFlowData {
  tasks: TaskFlowItem[]
  stageCounts: Record<string, number>
}

const STAGE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  intake: { label: '采访', color: 'text-blue-600', bg: 'bg-blue-100' },
  consensus: { label: '共识', color: 'text-purple-600', bg: 'bg-purple-100' },
  planning: { label: '计划', color: 'text-yellow-600', bg: 'bg-yellow-100' },
  execution: { label: '执行', color: 'text-green-600', bg: 'bg-green-100' },
  review: { label: '审查', color: 'text-red-600', bg: 'bg-red-100' },
  repair: { label: '修复', color: 'text-indigo-600', bg: 'bg-indigo-100' },
}

export function HarnessTaskFlow() {
  const [data, setData] = useState<TaskFlowData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedStage, setSelectedStage] = useState<string | null>(null)

  async function fetchTasks() {
    try {
      const res = await fetch('/api/operator/harness-task-flow')
      const json = await res.json()
      if (json.ok) setData(json.data)
    } catch {
      setData({ tasks: [], stageCounts: {} })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(fetchTasks, 0)
    return () => window.clearTimeout(timeout)
  }, [])

  if (loading) return <div className="p-6 text-gray-500">Loading task flow...</div>

  const tasks = data?.tasks ?? []
  const filteredTasks = selectedStage
    ? tasks.filter((t) => t.stage === selectedStage)
    : tasks

  return (
    <div className="space-y-6">
      {/* 阶段筛选器 */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedStage(null)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
            !selectedStage
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          全部 ({tasks.length})
        </button>
        {Object.entries(STAGE_CONFIG).map(([stage, config]) => {
          const count = data?.stageCounts?.[stage] ?? 0
          return (
            <button
              key={stage}
              onClick={() => setSelectedStage(stage === selectedStage ? null : stage)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                selectedStage === stage
                  ? `${config.bg} ${config.color}`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {config.label} ({count})
            </button>
          )
        })}
      </div>

      {/* 任务列表 */}
      <div className="bg-white rounded-lg border">
        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <div className="text-4xl mb-2">📭</div>
            <div>暂无任务</div>
          </div>
        ) : (
          <div className="divide-y">
            {filteredTasks.map((task) => {
              const stageConfig = STAGE_CONFIG[task.stage] ?? STAGE_CONFIG.intake
              return (
                <div key={task.id} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${stageConfig.bg} ${stageConfig.color}`}>
                      {stageConfig.label}
                    </span>
                    <span className="font-medium flex-1">{task.title}</span>
                    <span className="text-sm text-gray-500">{task.agentId}</span>
                    <span className="text-sm text-gray-400">
                      {new Date(task.updatedAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                    <span>置信度: {(task.confidence * 100).toFixed(0)}%</span>
                    <span>状态: {task.status}</span>
                    <span>ID: {task.id.slice(0, 8)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
