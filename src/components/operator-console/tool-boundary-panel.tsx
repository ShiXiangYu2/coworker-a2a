'use client'

import { useEffect, useState } from 'react'
import { EmptyState, LoadingState, PanelShell, RecordMeta, SafetyNote, StatusBadge } from './ui'

interface ToolCallBundle {
  toolCall: {
    id: string
    toolName?: string
    toolId?: string
    status: string
    riskLevel?: string
    createdAt: string
  }
}

export function ToolBoundaryPanel() {
  const [records, setRecords] = useState<ToolCallBundle[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchRecords() {
    try {
      const res = await fetch('/api/tool-calls')
      if (res.ok) {
        const data = await res.json()
        setRecords(data.data ?? [])
      }
    } catch {
      // Optional read-only panel; missing data should not block the console.
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
    return <LoadingState label="正在读取工具边界记录..." />
  }

  return (
    <PanelShell
      title="Tool Boundary Evidence"
      description="只读展示本地工具治理记录。这里不会请求权限、批准工具活动或触发任何工具运行时。"
    >
      <div className="max-h-72 overflow-y-auto">
        {records.length === 0 ? (
          <EmptyState
            title="暂无工具边界记录"
            description="产生 ToolCall 或工具治理证据后，这里会展示状态、风险等级和本地记录时间。"
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {records.map((bundle) => (
              <div key={bundle.toolCall.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="break-words text-sm font-medium text-gray-900">
                      {bundle.toolCall.toolName ?? bundle.toolCall.toolId ?? bundle.toolCall.id}
                    </div>
                    <RecordMeta>
                      风险等级：{bundle.toolCall.riskLevel ?? 'local_record'} / {new Date(bundle.toolCall.createdAt).toLocaleString()}
                    </RecordMeta>
                  </div>
                  <StatusBadge status={bundle.toolCall.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="border-t border-gray-200 p-4">
        <SafetyNote>
          工具边界面板只展示 recommendation-only / evidence-only 记录，不代表 ToolRun、外部 API、文件写入或 Git 操作已经获批。
        </SafetyNote>
      </div>
    </PanelShell>
  )
}
