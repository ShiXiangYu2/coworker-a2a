'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { EmptyState, ErrorState, LoadingState, PanelShell, StatusBadge } from './ui'
import type {
  OperatorTaskFlowNode,
  OperatorTaskFlowReadModel,
} from '@/lib/operator-console/task-flow-read-model'

type TaskFlowResponse =
  | { ok: true; data: OperatorTaskFlowReadModel[] }
  | { ok: false; error?: { message?: string } }

const nodeLabels: Record<OperatorTaskFlowNode['type'], string> = {
  task: 'Task',
  agent_run: 'AgentRun',
  workflow: 'Workflow',
  runtime_job: 'RuntimeJob',
  runtime_receipt: 'Receipt',
  audit: 'Audit',
}

const nodeClasses: Record<OperatorTaskFlowNode['type'], string> = {
  task: 'border-sky-200 bg-sky-50',
  agent_run: 'border-emerald-200 bg-emerald-50',
  workflow: 'border-violet-200 bg-violet-50',
  runtime_job: 'border-amber-200 bg-amber-50',
  runtime_receipt: 'border-teal-200 bg-teal-50',
  audit: 'border-gray-200 bg-gray-50',
}

export function MultiAgentFlow({
  highlightedTaskId,
  highlightedNodeId,
}: {
  highlightedTaskId?: string
  highlightedNodeId?: string
}) {
  const [flows, setFlows] = useState<OperatorTaskFlowReadModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTaskFlows = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/operator/task-flows?limit=5')
      if (!response.ok) {
        throw new Error(`Task flow API returned ${response.status}.`)
      }

      const body = (await response.json()) as TaskFlowResponse
      if (!body.ok) {
        throw new Error(body.error?.message ?? 'Task flow API returned an error.')
      }

      setFlows(body.data)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load task flows.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchTaskFlows()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [fetchTaskFlows])

  if (loading) {
    return <LoadingState label="正在读取结构化任务流..." />
  }

  if (error) {
    return <ErrorState message={`Task Flow 暂不可用：${error}`} />
  }

  return (
    <PanelShell
      title="结构化任务流 Task Flow"
      description={`当前展示 ${flows.length} 个最近的结构化任务流。本视图只读，不启动、认领、重试、审批或完成任何任务。`}
    >
      <div className="max-h-96 overflow-y-auto p-4">
        {flows.length === 0 ? (
          <EmptyState
            title="暂无结构化任务流"
            description="当 Harmony task、AgentRun、runtime job、receipt、workflow proposal 或 audit event 存在后，这里会以只读任务流展示。"
          />
        ) : (
          <div className="space-y-4">
            {flows.map((flow) => {
              const highlighted = highlightedTaskId === flow.taskId
              return (
              <article
                key={flow.taskId}
                className={`rounded-lg border p-3 ${
                  highlighted
                    ? 'border-sky-300 bg-sky-50/60 ring-2 ring-sky-100'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-gray-900">{flow.title}</h3>
                      <StatusBadge status={flow.lifecycle.phase} />
                      {highlighted && (
                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
                          当前定位任务
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Task {flow.taskId} | {flow.status} | {flow.lifecycle.reason}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs font-medium">
                      <Link href={flow.navigation.taskFlowHref} className="text-sky-700 hover:text-sky-900">
                        任务流定位
                      </Link>
                      <Link href={flow.navigation.runtimeHref} className="text-sky-700 hover:text-sky-900">
                        运行态视图
                      </Link>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                    {flow.nodes.length} nodes
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {flow.nodes.map((node) => (
                    <TaskFlowNodeCard
                      key={`${node.type}-${node.id}`}
                      node={node}
                      highlighted={highlightedNodeId === node.id}
                    />
                  ))}
                </div>
              </article>
              )
            })}
          </div>
        )}
      </div>
    </PanelShell>
  )
}

function TaskFlowNodeCard({
  node,
  highlighted,
}: {
  node: OperatorTaskFlowNode
  highlighted: boolean
}) {
  const metaEntries = Object.entries(node.meta ?? {}).filter(([, value]) => value !== null && value !== '')

  return (
    <div
      className={`min-w-0 rounded-lg border px-3 py-2 text-xs ${
        highlighted
          ? 'border-sky-300 ring-2 ring-sky-100'
          : nodeClasses[node.type]
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-gray-900">{nodeLabels[node.type]}</span>
          {highlighted && (
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-700">
              当前定位节点
            </span>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-white/70 px-2 py-0.5 font-medium text-gray-600">
          {node.status}
        </span>
      </div>
      <div className="truncate font-medium text-gray-800">{node.title}</div>
      {node.summary && (
        <p className="mt-1 line-clamp-2 break-words leading-5 text-gray-600">{node.summary}</p>
      )}
      {node.createdAt && (
        <p className="mt-2 text-[11px] text-gray-500">{formatTimestamp(node.createdAt)}</p>
      )}
      {metaEntries.length > 0 && (
        <dl className="mt-2 space-y-1 text-[11px] text-gray-500">
          {metaEntries.slice(0, 2).map(([key, value]) => (
            <div key={key} className="flex min-w-0 gap-1">
              <dt className="shrink-0 font-medium">{key}:</dt>
              <dd className="truncate">{String(value)}</dd>
            </div>
          ))}
        </dl>
      )}
      {node.navigation?.runtimeHref && (
        <div className="mt-2 text-[11px] font-medium">
          <Link href={node.navigation.runtimeHref} className="text-sky-700 hover:text-sky-900">
            查看运行态区块
          </Link>
        </div>
      )}
    </div>
  )
}

function formatTimestamp(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}
