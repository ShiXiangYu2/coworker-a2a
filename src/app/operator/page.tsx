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
  MultiAgentFlow,
  OperatorOverview,
  RuntimeExecutionPanel,
  TaskBoard,
  ToolBoundaryPanel,
} from '@/components/operator-console'

const closureStages = [
  'Evidence Sandbox',
  'Department Profiles',
  'Evidence Mapping',
  'Execution Gateway',
  'Assignment Review',
  'Runtime Read-only View',
]

function stringSearchParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim()
  return undefined
}

export default async function OperatorConsole({
  searchParams,
}: {
  searchParams: Promise<{ runtimeTaskId?: string | string[] | undefined }>
}) {
  const runtimeTaskId = stringSearchParam((await searchParams).runtimeTaskId)

  return (
    <main className="min-h-screen bg-gray-100 text-gray-950">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <Link href="/" className="text-sm font-medium text-gray-500 hover:text-gray-900">
              返回 ChatHub
            </Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal text-gray-950">
              Operator Console
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">
              v1 本地治理控制台。这里集中查看 Task、Agent、Tool、Workflow、Evidence、
              Department、Execution Gateway、Assignment Review 和 Runtime 只读记录。
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
            <div className="font-semibold text-amber-950">v1 安全边界</div>
            <div>local-only / human-gated / evidence-only / recommendation-only</div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <section className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-950">Sprint 1-22 阶段性闭环</h2>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                所有审批只改变单个本地 record 状态，不产生真实执行、路由、分配、权限、发布或任务完成效果。
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

        <OperatorOverview />

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-950">本地记录工作台</h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              从任务、分析、审计一路下钻到 Sprint 17-22 的治理记录。所有面板只做本地记录查看、创建和 review lifecycle 管理。
            </p>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <TaskBoard />
            <AgentStats />
            <AuditTimeline />
            <EvalPanel />
            <EvidencePanel />
            <ToolBoundaryPanel />
            <div className="xl:col-span-2">
              <MultiAgentFlow />
            </div>
            <div className="xl:col-span-2">
              <DepartmentPanel />
            </div>
            <div className="xl:col-span-2">
              <DepartmentEvidenceMapPanel />
            </div>
            <div className="xl:col-span-2">
              <ExecutionGatewayPanel />
            </div>
            <div className="xl:col-span-2">
              <div className="space-y-3">
                <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
                  <div className="text-sm font-semibold text-gray-950">Runtime Execution Task Filter</div>
                  <p className="mt-1 break-words text-sm text-gray-600">
                    {runtimeTaskId
                      ? `Showing Sprint 22 read-only runtime view for task ${runtimeTaskId}.`
                      : 'No runtimeTaskId selected. Add ?runtimeTaskId=<task-id> to inspect one Sprint 22 runtime execution view.'}
                  </p>
                </div>
                <RuntimeExecutionPanel taskId={runtimeTaskId} />
              </div>
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
