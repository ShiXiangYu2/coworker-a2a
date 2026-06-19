'use client'

import { useEffect, useState } from 'react'
import { EmptyState, LoadingState, PanelShell, RecordMeta, StatusBadge } from './ui'

interface JudgmentRecord {
  id: string
  judgmentType: string
  targetType: string
  targetId: string
  title: string
  reason: string
  evidence: string[]
  status: string
  confidence: number
  createdBy: string
  createdAt: string
}

const judgmentTypeLabels: Record<string, string> = {
  route_to_agent: '路由决策',
  allow_tool: '允许工具',
  reject_tool: '拒绝工具',
  approve_plan: '批准计划',
  review_conclusion: '审查结论',
  assign_task: '分配任务',
  block_execution: '阻止执行',
}

const targetTypeLabels: Record<string, string> = {
  task: '任务',
  agent_run: 'Agent 运行',
  tool_call: '工具调用',
  workflow: '工作流',
  review: '审查',
  execution: '执行',
}

export function JudgmentPanel() {
  const [records, setRecords] = useState<JudgmentRecord[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchRecords() {
    try {
      const res = await fetch('/api/judgment-records?limit=20')
      if (res.ok) {
        const data = await res.json()
        setRecords(data.data ?? [])
      }
    } catch {
      // Optional panel; missing data should not block the console.
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchRecords()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [])

  if (loading) {
    return <LoadingState label="正在读取判断记录..." />
  }

  return (
    <PanelShell
      title="判断记录 Judgment Records"
      description="记录 AI 为什么做出某个选择，包括路由决策、工具调用、审查结论等。"
    >
      <div className="max-h-96 overflow-y-auto">
        {records.length === 0 ? (
          <EmptyState
            title="暂无判断记录"
            description="当 AI 做出路由、工具调用、审查等决策时，这里会展示判断记录。"
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {records.map((record) => (
              <div key={record.id} className="px-4 py-3 hover:bg-gray-50">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {judgmentTypeLabels[record.judgmentType] ?? record.judgmentType}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {targetTypeLabels[record.targetType] ?? record.targetType}
                      </span>
                      <StatusBadge status={record.status} />
                    </div>
                    <div className="mt-2 break-words text-sm font-medium text-gray-900">
                      {record.title}
                    </div>
                    <div className="mt-1 break-words text-sm text-gray-600">
                      {record.reason}
                    </div>
                    {record.evidence.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {record.evidence.map((e, i) => (
                          <span
                            key={i}
                            className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700"
                          >
                            {e}
                          </span>
                        ))}
                      </div>
                    )}
                    <RecordMeta>
                      置信度：{(record.confidence * 100).toFixed(0)}% / 创建者：{record.createdBy} / {new Date(record.createdAt).toLocaleString()}
                    </RecordMeta>
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
