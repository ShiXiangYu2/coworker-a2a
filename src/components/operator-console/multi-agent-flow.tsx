'use client'

import { useCallback, useEffect, useState } from 'react'
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

export function MultiAgentFlow() {
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
    return <LoadingState label="Loading structured task flows..." />
  }

  if (error) {
    return <ErrorState message={`Task flows unavailable: ${error}`} />
  }

  return (
    <PanelShell
      title="Multi-Agent Task Flow"
      description={`${flows.length} recent structured task flow records. This view is read-only and does not start, claim, retry, approve, or complete any work.`}
    >
      <div className="max-h-96 overflow-y-auto p-4">
        {flows.length === 0 ? (
          <EmptyState
            title="No structured task flows yet"
            description="When Harmony tasks, AgentRuns, runtime jobs, receipts, workflow proposals, or audit events exist, they will appear here as a read-only flow."
          />
        ) : (
          <div className="space-y-4">
            {flows.map((flow) => (
              <article key={flow.taskId} className="rounded-lg border border-gray-200 p-3">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-gray-900">{flow.title}</h3>
                      <StatusBadge status={flow.lifecycle.phase} />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Task {flow.taskId} | {flow.status} | {flow.lifecycle.reason}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                    {flow.nodes.length} nodes
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {flow.nodes.map((node) => (
                    <TaskFlowNodeCard key={`${node.type}-${node.id}`} node={node} />
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </PanelShell>
  )
}

function TaskFlowNodeCard({ node }: { node: OperatorTaskFlowNode }) {
  const metaEntries = Object.entries(node.meta ?? {}).filter(([, value]) => value !== null && value !== '')

  return (
    <div className={`min-w-0 rounded-lg border px-3 py-2 text-xs ${nodeClasses[node.type]}`}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-semibold text-gray-900">{nodeLabels[node.type]}</span>
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
    </div>
  )
}

function formatTimestamp(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}
