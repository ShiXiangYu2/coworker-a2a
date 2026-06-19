'use client'

import { useEffect, useState } from 'react'
import type { RuntimeOperatorTaskViewModel } from '@/lib/runtime-execution'
import { EmptyState, ErrorState, LoadingState, PanelShell, RecordMeta, SafetyNote, StatusBadge } from './ui'

export type RuntimeExecutionHighlightedSection =
  | 'summary'
  | 'latest-receipt'
  | 'blocked-signal'

type LatestTask = {
  id: string
  title: string
  status: string
  createdAt: string
}

async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(url)
    if (!response.ok) return fallback
    const data = await response.json()
    if (Array.isArray(data)) return data as T
    if (Array.isArray(data.data)) return data.data as T
    return data as T
  } catch {
    return fallback
  }
}

export function LatestRuntimeExecutionPanel() {
  const [task, setTask] = useState<LatestTask | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadLatestTask() {
      const tasks = await fetchJson<LatestTask[]>('/api/harmony/tasks', [])
      if (!cancelled) {
        setTask(tasks[0] ?? null)
        setLoading(false)
      }
    }

    void loadLatestTask()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return <LoadingState label="正在读取最近任务的运行时只读视图..." />
  }

  if (!task) {
    return (
      <PanelShell title="Runtime Execution" description="Sprint 22 单任务运行时只读视图。">
        <EmptyState
          title="暂无可关联的本地任务"
          description="ChatHub 产生本地 Task 后，这里会自动展示最近任务的运行时 job、receipt 和队列状态。"
        />
      </PanelShell>
    )
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="text-sm font-semibold text-gray-950">当前运行时视图任务</div>
        <p className="mt-1 break-words text-sm text-gray-600">
          {task.title} / {task.status} / {new Date(task.createdAt).toLocaleString()}
        </p>
      </div>
      <RuntimeExecutionPanel taskId={task.id} />
    </div>
  )
}

export function RuntimeExecutionPanel({
  taskId,
  highlightedSection,
}: {
  taskId?: string | null
  highlightedSection?: RuntimeExecutionHighlightedSection
}) {
  const [data, setData] = useState<RuntimeOperatorTaskViewModel | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const normalizedTaskId = taskId?.trim()

  useEffect(() => {
    if (!normalizedTaskId) return

    let cancelled = false
    const taskIdForRequest = normalizedTaskId

    async function loadRuntimeView() {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`/api/tasks/${encodeURIComponent(taskIdForRequest)}/runtime-operator-view`)
        const payload = await response.json()
        if (!response.ok || !payload.ok) {
          throw new Error(payload.error?.message ?? '无法读取运行时只读视图。')
        }
        if (!cancelled) {
          setData(payload.data as RuntimeOperatorTaskViewModel)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : '无法读取运行时只读视图。')
          setData(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadRuntimeView()
    return () => {
      cancelled = true
    }
  }, [normalizedTaskId])

  if (!normalizedTaskId) {
    return (
      <PanelShell
        title="Runtime Execution"
        description="Sprint 22 单任务运行时只读视图。"
      >
        <EmptyState
          title="未选择运行时任务"
          description="选择一个本地任务后，可查看 Sprint 22 runtime job、receipt 和队列状态；面板不会提供任何执行入口。"
        />
      </PanelShell>
    )
  }

  if (loading) {
    return <LoadingState label="正在读取 Sprint 22 运行时只读视图..." />
  }

  if (error) {
    return (
      <PanelShell
        title="Runtime Execution"
        description="Sprint 22 单任务运行时只读视图。"
      >
        <ErrorState message={error} />
      </PanelShell>
    )
  }

  if (!data || data.summary.counts.total === 0) {
    return (
      <PanelShell
        title="Runtime Execution"
        description="Sprint 22 单任务运行时只读视图。"
      >
        <EmptyState
          title="暂无运行时记录"
          description="该任务还没有 Sprint 22 runtime job。这里保持只读，不提供执行、worker、token 或连接器入口。"
        />
      </PanelShell>
    )
  }

  return (
    <PanelShell
      title="Runtime Execution"
      description="Sprint 22 单任务运行时只读视图。"
    >
      <div className="space-y-4 p-4">
        <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
          <div className={sectionCardClass(highlightedSection === 'summary')}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-900">主状态</span>
              <StatusBadge status={data.highlight.primaryStatus} />
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100">
                Lifecycle: {data.lifecycle.phase}
              </span>
            </div>
            <RecordMeta>
              Task {data.taskId} | 最新 job {data.highlight.latestJobId ?? 'none'} | 最新 receipt {data.highlight.latestReceiptStatus ?? 'none'} | {data.lifecycle.reason}
            </RecordMeta>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
              <Metric label="Jobs" value={data.summary.counts.total} />
              <Metric label="Dry-run receipts" value={data.summary.receipts.dryRunCount} />
              <Metric label="Succeeded receipts" value={data.summary.receipts.succeededCount} />
              <Metric label="Live jobs" value={data.statusBands.live.length} />
            </div>
            {highlightedSection === 'summary' && (
              <p className="mt-3 text-xs font-medium text-sky-700">当前定位到运行态摘要区块</p>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-slate-50 p-3">
            <p className="text-sm font-medium text-gray-900">最新运行时快照</p>
            <RecordMeta>
              最新 receipt: {data.highlight.latestReceiptStatus ?? 'none'} | 存在可行动 live job: {String(data.highlight.hasActionableLiveJob)}
            </RecordMeta>
            <div className="mt-3 space-y-2 text-xs text-gray-600">
              <div className="rounded bg-white p-2">Queued: {data.summary.counts.queued}</div>
              <div className="rounded bg-white p-2">Leased: {data.summary.counts.leased}</div>
              <div className="rounded bg-white p-2">Running: {data.summary.counts.running}</div>
              <div className="rounded bg-white p-2">Blocked: {data.summary.counts.blocked}</div>
              <div className="rounded bg-white p-2">Failed: {data.summary.counts.failed}</div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <StatusColumn title="Live" items={data.statusBands.live} emptyLabel="暂无 live runtime job。" />
          <StatusColumn title="Succeeded" items={data.statusBands.succeeded} emptyLabel="暂无 succeeded runtime job。" />
          <StatusColumn
            title="Blocked"
            items={data.statusBands.blocked}
            emptyLabel="暂无 blocked runtime job。"
            highlighted={highlightedSection === 'blocked-signal'}
            highlightLabel="当前定位到 blocked signal 区块"
          />
          <StatusColumn title="Failed" items={data.statusBands.failed} emptyLabel="暂无 failed runtime job。" />
        </div>

        {(data.latestJob || data.latestReceipt) && (
          <div className={sectionCardClass(highlightedSection === 'latest-receipt')}>
            <p className="text-sm font-medium text-gray-900">最新 Job 明细</p>
            <RecordMeta>
              Job {data.latestJob?.job?.id ?? 'none'} | 状态 {data.latestJob?.job?.status ?? 'none'} | Receipt {data.latestReceipt?.status ?? 'none'}
            </RecordMeta>
            <div className="mt-3 grid gap-2 text-xs text-gray-600 md:grid-cols-2">
              <div className="rounded bg-slate-50 p-2">Attempts: {data.latestJob?.derived.attemptCount ?? 0}</div>
              <div className="rounded bg-slate-50 p-2">Recovery points: {data.latestJob?.derived.recoveryCount ?? 0}</div>
              <div className="rounded bg-slate-50 p-2">Lease active: {String(data.latestJob?.derived.leaseActive ?? false)}</div>
              <div className="rounded bg-slate-50 p-2">Has receipt: {String(data.latestJob?.derived.hasReceipt ?? false)}</div>
            </div>
            {highlightedSection === 'latest-receipt' && (
              <p className="mt-3 text-xs font-medium text-sky-700">当前定位到最新 receipt 区块</p>
            )}
          </div>
        )}

        <SafetyNote>
          {data.safetyNote} 本面板只读，不暴露 mutation、worker、token issuance 或 connector 控制。
        </SafetyNote>
      </div>
    </PanelShell>
  )
}

function sectionCardClass(highlighted: boolean): string {
  return highlighted
    ? 'rounded-lg border border-sky-300 bg-sky-50/60 p-3 ring-2 ring-sky-100'
    : 'rounded-lg border border-gray-200 bg-white p-3'
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-gray-200 bg-slate-50 p-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-base font-semibold text-gray-950">{value}</div>
    </div>
  )
}

function StatusColumn({
  title,
  items,
  emptyLabel,
  highlighted = false,
  highlightLabel,
}: {
  title: string
  items: RuntimeOperatorTaskViewModel['jobs']
  emptyLabel: string
  highlighted?: boolean
  highlightLabel?: string
}) {
  return (
    <div className={sectionCardClass(highlighted)}>
      <p className="text-sm font-medium text-gray-900">{title}</p>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-gray-500">{emptyLabel}</p>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <div key={item.job?.id ?? title} className="rounded border border-gray-100 bg-slate-50 p-2">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={item.job?.status ?? 'unknown'} />
                <span className="text-xs font-medium text-gray-900">{item.job?.id ?? 'unknown-job'}</span>
              </div>
              <RecordMeta>
                Receipt {item.receipt?.status ?? 'none'} | Attempts {item.derived.attemptCount} | Recovery {item.derived.recoveryCount}
              </RecordMeta>
            </div>
          ))}
        </div>
      )}
      {highlighted && highlightLabel ? (
        <p className="mt-3 text-xs font-medium text-sky-700">{highlightLabel}</p>
      ) : null}
    </div>
  )
}
