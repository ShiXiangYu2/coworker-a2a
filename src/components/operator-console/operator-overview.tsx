'use client'

import { useEffect, useMemo, useState } from 'react'

type ConversationSummary = {
  id: string
  title: string
  updatedAt: string
  messages?: { content: string; role: string }[]
}

type TaskSummary = {
  id: string
  title: string
  status: string
  type: string
  targetAgentId: string | null
  confidence: number
  reason: string
  requiresHumanConfirmation: boolean
  createdAt: string
}

type AgentRunSummary = {
  id: string
  agentId: string
  status: string
  taskId?: string
  createdAt: string
}

type ToolCallSummary = {
  id: string
  toolName: string
  status: string
  riskLevel: string
  createdAt: string
}

type EvalRunSummary = {
  id: string
  status: string
  targetType: string
  targetId: string
  createdAt: string
}

type WorkflowSummary = {
  id: string
  title: string
  status: string
  riskLevel: string
  createdAt: string
}

type ReadinessSummary = {
  id: string
  title: string
  status: string
  recommendation: string
  createdAt: string
}

type AuditSummary = {
  id: string
  eventType: string
  actorType: string
  actorId: string | null
  reason: string
  createdAt: string
}

type OverviewData = {
  conversations: ConversationSummary[]
  tasks: TaskSummary[]
  agentRuns: AgentRunSummary[]
  toolCalls: ToolCallSummary[]
  evalRuns: EvalRunSummary[]
  workflows: WorkflowSummary[]
  readiness: ReadinessSummary[]
  auditEvents: AuditSummary[]
}

type ChainStep = {
  label: string
  productName: string
  status: 'done' | 'active' | 'empty'
  detail: string
  count: number
}

const allowedDisplayActions = ['分析', '记录', '提案', '评估', '只读展示']

const deniedRuntimeActions = [
  '执行 Agent',
  '执行工具',
  '执行工作流',
  '写文件',
  '运行 Git',
  '创建 PR',
  '调用外部 API',
  '连接 MCP',
  '部署 / 发布 / 上线',
  '自动完成任务',
]

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ')
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

function latestDate(items: { createdAt?: string; updatedAt?: string }[]) {
  const dates = items
    .map((item) => item.createdAt ?? item.updatedAt)
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value))

  if (dates.length === 0) return null
  return new Date(Math.max(...dates)).toLocaleString()
}

export function OperatorOverview() {
  const [data, setData] = useState<OverviewData>({
    conversations: [],
    tasks: [],
    agentRuns: [],
    toolCalls: [],
    evalRuns: [],
    workflows: [],
    readiness: [],
    auditEvents: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadOverview() {
      const [
        conversations,
        tasks,
        agentRuns,
        toolCalls,
        evalRuns,
        workflows,
        readiness,
        auditEvents,
      ] = await Promise.all([
        fetchJson<ConversationSummary[]>('/api/conversations', []),
        fetchJson<TaskSummary[]>('/api/harmony/tasks', []),
        fetchJson<AgentRunSummary[]>('/api/audit/agent-runs?limit=50', []),
        fetchJson<ToolCallSummary[]>('/api/tool-calls', []),
        fetchJson<EvalRunSummary[]>('/api/eval-runs', []),
        fetchJson<WorkflowSummary[]>('/api/workflow-proposals', []),
        fetchJson<ReadinessSummary[]>('/api/mvp-readiness-records', []),
        fetchJson<AuditSummary[]>('/api/audit/events?limit=12', []),
      ])

      if (!cancelled) {
        setData({
          conversations,
          tasks,
          agentRuns,
          toolCalls,
          evalRuns,
          workflows,
          readiness,
          auditEvents,
        })
        setLoading(false)
      }
    }

    void loadOverview()
    return () => {
      cancelled = true
    }
  }, [])

  const latestConversation = data.conversations[0]
  const latestTask = data.tasks[0]
  const latestRequest =
    latestConversation?.messages?.[0]?.content ?? latestTask?.title ?? '还没有可展示的用户需求'

  const chain = useMemo<ChainStep[]>(() => {
    const routeReady = data.tasks.length > 0
    const activeIndex = [
      data.conversations.length,
      Number(routeReady),
      data.tasks.length,
      data.agentRuns.length,
      data.toolCalls.length,
      data.evalRuns.length,
      data.workflows.length,
      data.readiness.length,
    ].findLastIndex((count) => count > 0)

    const steps: Omit<ChainStep, 'status'>[] = [
      {
        label: 'User Request',
        productName: '用户需求',
        count: data.conversations.length,
        detail: latestConversation ? latestConversation.title : '等待用户在 ChatHub 发起需求',
      },
      {
        label: 'Route Decision',
        productName: '意图分流',
        count: routeReady ? 1 : 0,
        detail: latestTask?.targetAgentId
          ? `已指派给 ${latestTask.targetAgentId}，置信度 ${Math.round(latestTask.confidence * 100)}%`
          : '等待路由结果或交付任务',
      },
      {
        label: 'Harmony Task',
        productName: '交付任务',
        count: data.tasks.length,
        detail: latestTask ? `${latestTask.title} · ${latestTask.status}` : '尚未形成交付任务',
      },
      {
        label: 'Agent Analysis',
        productName: '专家分析',
        count: data.agentRuns.length,
        detail: data.agentRuns[0]
          ? `${data.agentRuns[0].agentId} · ${data.agentRuns[0].status}`
          : '尚无专家分析记录',
      },
      {
        label: 'Tool Proposal',
        productName: '工具提案',
        count: data.toolCalls.length,
        detail: data.toolCalls[0]
          ? `${data.toolCalls[0].toolName} · ${data.toolCalls[0].status}`
          : '尚无工具提案记录',
      },
      {
        label: 'Eval / Quality Gate',
        productName: '质量评估',
        count: data.evalRuns.length,
        detail: data.evalRuns[0] ? `${data.evalRuns[0].targetType} · ${data.evalRuns[0].status}` : '尚无评估记录',
      },
      {
        label: 'Workflow Proposal',
        productName: '交付方案',
        count: data.workflows.length,
        detail: data.workflows[0] ? `${data.workflows[0].title} · ${data.workflows[0].status}` : '尚无交付方案记录',
      },
      {
        label: 'MVP Readiness',
        productName: '准备度证据',
        count: data.readiness.length,
        detail: data.readiness[0]
          ? `${data.readiness[0].title} · ${data.readiness[0].recommendation}`
          : '尚无准备度证据',
      },
    ]

    return steps.map((step, index) => ({
      ...step,
      status: step.count > 0 ? (index === activeIndex ? 'active' : 'done') : 'empty',
    }))
  }, [data, latestConversation, latestTask])

  const totalEvidence =
    data.tasks.length +
    data.agentRuns.length +
    data.toolCalls.length +
    data.evalRuns.length +
    data.workflows.length +
    data.readiness.length +
    data.auditEvents.length

  if (loading) {
    return (
      <section className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="text-sm text-gray-500">正在读取本地记录并生成控制台视图...</div>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Sprint 16 Operator Console 是只读演示和治理视图。它只展示本地记录与证据，不代表执行、发布、部署、任务完成或未来授权。
      </div>

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <aside className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            当前需求
          </div>
          <h2 className="mt-2 text-lg font-semibold text-gray-950">
            {latestConversation?.title ?? latestTask?.title ?? '暂无需求'}
          </h2>
          <p className="mt-2 line-clamp-5 text-sm leading-6 text-gray-600">
            {latestRequest}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
            <Metric label="交付任务" value={data.tasks.length} />
            <Metric label="专家分析" value={data.agentRuns.length} />
            <Metric label="工具提案" value={data.toolCalls.length} />
            <Metric label="证据总数" value={totalEvidence} />
          </div>

          <div className="mt-5 rounded-md bg-gray-50 p-3 text-xs leading-5 text-gray-600">
            最新记录时间：
            <span className="block font-medium text-gray-900">
              {latestDate([
                ...data.tasks,
                ...data.agentRuns,
                ...data.toolCalls,
                ...data.evalRuns,
                ...data.workflows,
                ...data.readiness,
              ]) ?? '暂无记录'}
            </span>
          </div>
        </aside>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-950">交付链 Timeline</h2>
              <p className="text-sm text-gray-500">
                从一句需求到一条可审计的 AI 协作交付链
              </p>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              本地派生视图
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {chain.map((step, index) => (
              <div key={step.label} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={cx(
                      'flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold',
                      step.status === 'done' && 'border-emerald-500 bg-emerald-50 text-emerald-700',
                      step.status === 'active' && 'border-blue-500 bg-blue-50 text-blue-700',
                      step.status === 'empty' && 'border-gray-200 bg-gray-50 text-gray-400'
                    )}
                  >
                    {index + 1}
                  </div>
                  {index < chain.length - 1 && <div className="h-full min-h-8 w-px bg-gray-200" />}
                </div>
                <div
                  className={cx(
                    'rounded-md border p-3',
                    step.status === 'active' && 'border-blue-200 bg-blue-50',
                    step.status === 'done' && 'border-emerald-100 bg-white',
                    step.status === 'empty' && 'border-gray-100 bg-gray-50'
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-gray-950">{step.productName}</div>
                      <div className="text-xs text-gray-500">{step.label}</div>
                    </div>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
                      {step.count} 条
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-950">安全边界</h2>
            <p className="mt-1 text-sm text-gray-500">
              Kelvin 审批和 readiness 只表示本地审阅证据。
            </p>

            <div className="mt-4">
              <div className="text-xs font-semibold text-emerald-700">允许展示</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {allowedDisplayActions.map((item) => (
                  <span key={item} className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 ring-1 ring-emerald-100">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs font-semibold text-red-700">禁止越界</div>
              <div className="mt-2 grid gap-1.5">
                {deniedRuntimeActions.map((item) => (
                  <div key={item} className="rounded bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-950">操作证据</h2>
            <div className="mt-3 space-y-3">
              {data.auditEvents.length === 0 ? (
                <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-500">
                  还没有操作证据。产生任务、分析或评估记录后，这里会显示时间线。
                </p>
              ) : (
                data.auditEvents.slice(0, 6).map((event) => (
                  <div key={event.id} className="border-l-2 border-gray-200 pl-3">
                    <div className="text-sm font-medium text-gray-900">{event.eventType}</div>
                    <div className="text-xs text-gray-500">
                      {event.actorType}
                      {event.actorId ? ` / ${event.actorId}` : ''} · {new Date(event.createdAt).toLocaleString()}
                    </div>
                    {event.reason && <p className="mt-1 text-xs leading-5 text-gray-600">{event.reason}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-white p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-gray-950">{value}</div>
    </div>
  )
}
