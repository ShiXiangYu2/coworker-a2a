'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { EmptyState, ErrorState, PanelShell, SafetyNote, StatusBadge } from './ui'
import type {
  OperatorOverviewBlockedItem,
  OperatorOverviewReadModel,
  OperatorOverviewReceiptItem,
  OperatorOverviewRuntimeItem,
} from '@/lib/operator-console/overview-read-model'

type OverviewResponse =
  | { ok: true; data: OperatorOverviewReadModel }
  | { ok: false; error?: { message?: string } }

const emptyOverview: OperatorOverviewReadModel = {
  generatedAt: '',
  totals: {
    taskFlows: 0,
    tasks: 0,
    agentRuns: 0,
    runtimeJobs: 0,
    runtimeReceipts: 0,
    blockedSignals: 0,
  },
  activeRuntime: {
    count: 0,
    items: [],
  },
  blockedSummary: {
    count: 0,
    items: [],
  },
  recentReceipts: {
    count: 0,
    items: [],
  },
  recentFlows: [],
  safetyNote:
    'Operator Overview is a read-only derived view. It does not change execution state.',
}

export function OperatorOverview() {
  const [data, setData] = useState<OperatorOverviewReadModel>(emptyOverview)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadOverview() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/operator/overview?limit=5')
        if (!response.ok) {
          throw new Error(`Operator overview API returned ${response.status}.`)
        }

        const body = (await response.json()) as OverviewResponse
        if (!body.ok) {
          throw new Error(body.error?.message ?? 'Operator overview API returned an error.')
        }

        if (!cancelled) setData(body.data)
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'Unable to load operator overview.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadOverview()
    return () => {
      cancelled = true
    }
  }, [])

  const latestFlow = data.recentFlows[0]
  const latestGeneratedAt = useMemo(
    () => formatTimestamp(data.generatedAt),
    [data.generatedAt]
  )

  if (loading) {
    return (
      <PanelShell
        title="Operator Overview"
        description="Loading structured read-only operator overview..."
      >
        <div className="p-4">
          <div className="h-2 w-40 animate-pulse rounded bg-gray-200" />
          <div className="mt-3 h-2 w-72 animate-pulse rounded bg-gray-100" />
        </div>
      </PanelShell>
    )
  }

  if (error) {
    return <ErrorState message={`Operator overview unavailable: ${error}`} />
  }

  return (
    <section className="space-y-4">
      <SafetyNote>{data.safetyNote}</SafetyNote>

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <aside className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase text-gray-500">
            Current Flow
          </div>
          <h2 className="mt-2 break-words text-lg font-semibold text-gray-950">
            {latestFlow?.title ?? 'No task flow yet'}
          </h2>
          <p className="mt-2 break-words text-sm leading-6 text-gray-600">
            {latestFlow
              ? `${latestFlow.status} / ${latestFlow.lifecycle.phase}: ${latestFlow.lifecycle.reason}`
              : 'Structured task flows will appear here after Harmony tasks and runtime records exist.'}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
            <Metric label="Task flows" value={data.totals.taskFlows} />
            <Metric label="Agent runs" value={data.totals.agentRuns} />
            <Metric label="Runtime jobs" value={data.totals.runtimeJobs} />
            <Metric label="Receipts" value={data.totals.runtimeReceipts} />
          </div>

          <div className="mt-5 rounded-md bg-gray-50 p-3 text-xs leading-5 text-gray-600">
            Generated at
            <span className="block break-words font-medium text-gray-900">
              {latestGeneratedAt ?? 'No records yet'}
            </span>
          </div>
        </aside>

        <div className="space-y-4">
          <SummaryPanel
            title="Active Runtime"
            description="Queued, leased, or running runtime jobs derived from structured task flows."
            count={data.activeRuntime.count}
          >
            {data.activeRuntime.items.length === 0 ? (
              <EmptyState
                title="No active runtime"
                description="No queued, leased, or running runtime jobs are present in the current read-only overview."
              />
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {data.activeRuntime.items.map((item) => (
                  <RuntimeItemCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </SummaryPanel>

          <SummaryPanel
            title="Blocked Summary"
            description="Blocked or failed signals from task, AgentRun, runtime, repair lifecycle, or audit records."
            count={data.blockedSummary.count}
          >
            {data.blockedSummary.items.length === 0 ? (
              <EmptyState
                title="No blocked signals"
                description="No blocked, failed, or repair-lifecycle records are present in the current overview."
              />
            ) : (
              <div className="space-y-2">
                {data.blockedSummary.items.map((item) => (
                  <BlockedItemRow key={`${item.source}-${item.id}`} item={item} />
                ))}
              </div>
            )}
          </SummaryPanel>

          <SummaryPanel
            title="Recent Receipts"
            description="Most recent runtime receipts, sorted by receipt time."
            count={data.recentReceipts.count}
          >
            {data.recentReceipts.items.length === 0 ? (
              <EmptyState
                title="No receipts yet"
                description="Runtime receipts will appear here after dry-run or scoped runtime completion records exist."
              />
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {data.recentReceipts.items.map((item) => (
                  <ReceiptItemCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </SummaryPanel>
        </div>

        <aside className="space-y-4">
          <PanelShell
            title="Read-only Boundary"
            description="Overview renders derived state only. It exposes no worker, connector, permission, or mutation controls."
          >
            <div className="p-4">
              <div className="grid gap-2">
                {[
                  'Derived from existing task-flow records',
                  'No runtime state transitions',
                  'No database schema changes',
                  'No execution controls',
                ].map((item) => (
                  <div key={item} className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </PanelShell>

          <PanelShell
            title="Recent Task Flows"
            description={`${data.recentFlows.length} structured flows are included in this overview response.`}
          >
            <div className="max-h-80 overflow-y-auto p-4">
              {data.recentFlows.length === 0 ? (
                <EmptyState
                  title="No recent task flows"
                  description="Task flow summaries will appear after structured operator records are available."
                />
              ) : (
                <div className="space-y-3">
                  {data.recentFlows.map((flow) => (
                    <div key={flow.taskId} className="border-l-2 border-gray-200 pl-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="break-words text-sm font-medium text-gray-900">
                          {flow.title}
                        </span>
                        <StatusBadge status={flow.lifecycle.phase} />
                      </div>
                      <div className="mt-1 break-words text-xs text-gray-500">
                        {flow.status} / {flow.nodes.length} nodes
                      </div>
                      <p className="mt-1 break-words text-xs leading-5 text-gray-600">
                        {flow.lifecycle.reason}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </PanelShell>
        </aside>
      </div>
    </section>
  )
}

function SummaryPanel({
  title,
  description,
  count,
  children,
}: {
  title: string
  description: string
  count: number
  children: ReactNode
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-gray-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-gray-500">{description}</p>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
          {count} records
        </span>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function RuntimeItemCard({ item }: { item: OperatorOverviewRuntimeItem }) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-semibold text-gray-900">{item.title}</span>
        <StatusBadge status={item.status} />
      </div>
      <p className="mt-2 break-words leading-5 text-gray-600">{item.taskTitle}</p>
      {item.createdAt && <p className="mt-2 text-gray-500">{formatTimestamp(item.createdAt)}</p>}
    </div>
  )
}

function BlockedItemRow({ item }: { item: OperatorOverviewBlockedItem }) {
  return (
    <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="break-words font-semibold text-gray-900">{item.title}</div>
          <div className="mt-1 text-gray-500">{item.source} / {item.taskTitle}</div>
        </div>
        <StatusBadge status={item.status} />
      </div>
      {item.reason && <p className="mt-2 break-words leading-5 text-gray-600">{item.reason}</p>}
    </div>
  )
}

function ReceiptItemCard({ item }: { item: OperatorOverviewReceiptItem }) {
  return (
    <div className="rounded-md border border-teal-200 bg-teal-50 p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-semibold text-gray-900">{item.title}</span>
        <StatusBadge status={item.status} />
      </div>
      <p className="mt-2 break-words leading-5 text-gray-600">
        {item.summary ?? item.taskTitle}
      </p>
      {item.createdAt && <p className="mt-2 text-gray-500">{formatTimestamp(item.createdAt)}</p>}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-gray-950">{value}</div>
    </div>
  )
}

function formatTimestamp(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}
