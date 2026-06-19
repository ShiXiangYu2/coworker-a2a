import Link from 'next/link'
import {
  AgentStats,
  AuditTimeline,
  DepartmentAssignmentPanel,
  DepartmentEvidenceMapPanel,
  DepartmentPanel,
  EvalPanel,
  EvidencePanel,
  ExecutionGatewayPanel,
  LatestRuntimeExecutionPanel,
  MultiAgentFlow,
  OperatorOverview,
  RuntimeExecutionPanel,
  TaskBoard,
  ToolBoundaryPanel,
} from '@/components/operator-console'
import type { RuntimeExecutionHighlightedSection } from '@/components/operator-console'

const closureStages = [
  '证据沙箱',
  '部门画像',
  '证据映射',
  '执行网关',
  '分配复核',
  '运行态只读视图',
]

const consoleSections = [
  { id: 'overview', label: '总览 Overview' },
  { id: 'task-flow', label: '任务流 Task Flow' },
  { id: 'runtime', label: '运行态 Runtime' },
  { id: 'governance', label: '治理账本 Governance Ledger' },
]

function stringSearchParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim()
  return undefined
}

function runtimeSectionParam(
  value: string | string[] | undefined
): RuntimeExecutionHighlightedSection | undefined {
  const section = stringSearchParam(value)
  if (
    section === 'summary' ||
    section === 'latest-receipt' ||
    section === 'blocked-signal'
  ) {
    return section
  }
  return undefined
}

export default async function OperatorConsole({
  searchParams,
}: {
  searchParams: Promise<{
    runtimeTaskId?: string | string[] | undefined
    taskFlowTaskId?: string | string[] | undefined
    taskFlowNodeId?: string | string[] | undefined
    runtimeSection?: string | string[] | undefined
  }>
}) {
  const resolvedSearchParams = await searchParams
  const runtimeTaskId = stringSearchParam(resolvedSearchParams.runtimeTaskId)
  const taskFlowTaskId = stringSearchParam(resolvedSearchParams.taskFlowTaskId)
  const taskFlowNodeId = stringSearchParam(resolvedSearchParams.taskFlowNodeId)
  const runtimeSection = runtimeSectionParam(resolvedSearchParams.runtimeSection)

  return (
    <main className="min-h-screen bg-gray-100 text-gray-950">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <Link href="/" className="text-sm font-medium text-gray-500 hover:text-gray-900">
              Back to ChatHub
            </Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal text-gray-950">
              Operator Console
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">
              本地治理控制台，用于查看 Task、Agent、Tool、Workflow、Evidence、Department、
              Execution Gateway、Assignment Review 与 Sprint 22 runtime 只读记录。
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
            <div className="font-semibold text-amber-950">v1 只读安全边界</div>
            <div>本地记录 / 人工门控 / 证据优先 / 建议只读</div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <nav className="sticky top-0 z-10 -mx-4 border-y border-gray-200 bg-white/95 px-4 py-2 shadow-sm backdrop-blur">
          <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto">
            {consoleSections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="shrink-0 rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-950"
              >
                {section.label}
              </a>
            ))}
          </div>
        </nav>

        <section className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-950">Sprint 1-22 分阶段收口</h2>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                复核与审批只改变本地记录，不授予路由、分配、运行态权限、发布、部署或任务完成能力。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {closureStages.map((stage) => (
                <span
                  key={stage}
                  className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200"
                >
                  {stage}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section id="overview" className="scroll-mt-16 space-y-3">
          <SectionHeader
            title="总览 Overview"
            description="本地治理总览，只渲染结构化派生状态，不签发运行态权限。"
          />
          <OperatorOverview />
        </section>

        <section id="task-flow" className="scroll-mt-16 space-y-4">
          <SectionHeader
            title="任务流 Task Flow"
            description="按生产链路聚合本地 task、agent、workflow、runtime、receipt 与 audit 记录；本阶段不改变数据来源。"
          />
          <div className="grid gap-4 xl:grid-cols-2">
            <TaskBoard />
            <AgentStats />
            <div className="xl:col-span-2">
              <MultiAgentFlow
                highlightedTaskId={taskFlowTaskId}
                highlightedNodeId={taskFlowNodeId}
              />
            </div>
          </div>
        </section>

        <section id="runtime" className="scroll-mt-16 space-y-4">
          <SectionHeader
            title="运行态 Runtime"
            description="Sprint 22 单任务运行态只读视图，只展示限定记录，不暴露 worker、token、connector 或 mutation 控制。"
          />
          <div className="grid gap-4">
            <ExecutionGatewayPanel />
            <div className="space-y-3">
              <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
                <div className="text-sm font-semibold text-gray-950">运行态任务过滤</div>
                <p className="mt-1 break-words text-sm text-gray-600">
                  {runtimeTaskId ? (
                    <>正在查看任务 {runtimeTaskId} 的 Sprint 22 运行态只读视图。</>
                  ) : (
                    <>
                      当前未选择 runtimeTaskId。可通过 ?runtimeTaskId=&lt;task-id&gt; 查看指定任务，
                      或使用下方自动选择的最近任务只读视图。
                    </>
                  )}
                </p>
              </div>
              {runtimeTaskId ? (
                <RuntimeExecutionPanel
                  taskId={runtimeTaskId}
                  highlightedSection={runtimeSection}
                />
              ) : (
                <LatestRuntimeExecutionPanel />
              )}
            </div>
          </div>
        </section>

        <section id="governance" className="scroll-mt-16 space-y-4">
          <SectionHeader
            title="治理账本 Governance Ledger"
            description="Audit、Evidence、Eval、Department 与 Assignment 记录。审批仍是本地记录流转，不代表运行态权限。"
          />
          <div className="grid gap-4 xl:grid-cols-2">
            <AuditTimeline />
            <EvalPanel />
            <EvidencePanel />
            <ToolBoundaryPanel />
            <div className="xl:col-span-2">
              <DepartmentPanel />
            </div>
            <div className="xl:col-span-2">
              <DepartmentEvidenceMapPanel />
            </div>
            <div className="xl:col-span-2">
              <DepartmentAssignmentPanel />
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function SectionHeader({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-950">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-gray-600">{description}</p>
    </div>
  )
}
