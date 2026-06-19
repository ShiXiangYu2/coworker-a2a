'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
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
    'Operator Overview 是只读派生视图，只汇总现有记录，不改变执行状态。',
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
        description="正在读取结构化只读总览..."
      >
        <div className="p-4">
          <div className="h-2 w-40 animate-pulse rounded bg-gray-200" />
          <div className="mt-3 h-2 w-72 animate-pulse rounded bg-gray-100" />
        </div>
      </PanelShell>
    )
  }

  if (error) {
    return <ErrorState message={`Operator Overview 暂不可用：${error}`} />
  }

  return (
    <section className="space-y-4">
      <SafetyNote>{data.safetyNote}</SafetyNote>

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <aside className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase text-gray-500">
            当前任务流
          </div>
          <h2 className="mt-2 break-words text-lg font-semibold text-gray-950">
            {latestFlow?.title ?? '暂无任务流'}
          </h2>
          <p className="mt-2 break-words text-sm leading-6 text-gray-600">
            {latestFlow
              ? `${latestFlow.status} / ${latestFlow.lifecycle.phase}: ${latestFlow.lifecycle.reason}`
              : '当 Harmony task 与 runtime 记录存在后，这里会展示结构化任务流摘要。'}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
            <Metric label="任务流" value={data.totals.taskFlows} />
            <Metric label="AgentRun" value={data.totals.agentRuns} />
            <Metric label="Runtime Job" value={data.totals.runtimeJobs} />
            <Metric label="Receipt" value={data.totals.runtimeReceipts} />
          </div>

          <div className="mt-5 rounded-md bg-gray-50 p-3 text-xs leading-5 text-gray-600">
            生成时间
            <span className="block break-words font-medium text-gray-900">
              {latestGeneratedAt ?? '暂无记录'}
            </span>
          </div>
        </aside>

        <div className="space-y-4">
          <SummaryPanel
            title="Active Runtime"
            description="从结构化任务流派生的 queued、leased 或 running runtime job。"
            count={data.activeRuntime.count}
          >
            {data.activeRuntime.items.length === 0 ? (
              <EmptyState
                title="No active runtime"
                description="当前只读总览中没有 queued、leased 或 running runtime job。"
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
            description="来自 task、AgentRun、runtime、repair lifecycle 或 audit 记录的 blocked / failed 信号。"
            count={data.blockedSummary.count}
          >
            {data.blockedSummary.items.length === 0 ? (
              <EmptyState
                title="No blocked signals"
                description="当前总览中没有 blocked、failed 或 repair lifecycle 记录。"
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
            description="按 receipt 时间倒序展示最近的 runtime receipt。"
            count={data.recentReceipts.count}
          >
            {data.recentReceipts.items.length === 0 ? (
              <EmptyState
                title="No receipts yet"
                description="当 dry-run 或限定运行态完成记录存在后，这里会展示 runtime receipt。"
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
            description="Overview 只渲染派生状态，不暴露 worker、connector、permission 或 mutation 控制。"
          >
            <div className="p-4">
              <div className="grid gap-2">
                {[
                  '仅派生自现有任务流记录',
                  '不触发运行态状态流转',
                  '不变更数据库结构',
                  '不提供执行控制',
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
            description={`当前总览响应包含 ${data.recentFlows.length} 个结构化任务流。`}
          >
            <div className="max-h-80 overflow-y-auto p-4">
              {data.recentFlows.length === 0 ? (
                <EmptyState
                  title="No recent task flows"
                  description="当结构化 operator 记录可用后，这里会展示任务流摘要。"
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
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-medium">
        <Link href={item.navigation.taskFlowHref} className="text-sky-700 hover:text-sky-900">
          查看任务流
        </Link>
        <Link href={item.navigation.runtimeHref} className="text-sky-700 hover:text-sky-900">
          查看运行态
        </Link>
      </div>
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
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-medium">
        <Link href={item.navigation.taskFlowHref} className="text-sky-700 hover:text-sky-900">
          查看任务流
        </Link>
        {item.navigation.runtimeHref && (
          <Link href={item.navigation.runtimeHref} className="text-sky-700 hover:text-sky-900">
            查看运行态
          </Link>
        )}
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
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-medium">
        <Link href={item.navigation.taskFlowHref} className="text-sky-700 hover:text-sky-900">
          查看任务流
        </Link>
        <Link href={item.navigation.runtimeHref} className="text-sky-700 hover:text-sky-900">
          查看运行态
        </Link>
      </div>
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
