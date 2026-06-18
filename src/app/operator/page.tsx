import Link from 'next/link'
import {
  AgentStats,
  DepartmentAssignmentPanel,
  AuditTimeline,
  DepartmentEvidenceMapPanel,
  DepartmentPanel,
  EvalPanel,
  ExecutionGatewayPanel,
  MultiAgentFlow,
  OperatorOverview,
  TaskBoard,
} from '@/components/operator-console'

export default function OperatorConsole() {
  return (
    <main className="min-h-screen bg-gray-100 text-gray-950">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href="/" className="text-sm font-medium text-gray-500 hover:text-gray-900">
              Back to ChatHub
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-gray-950">
              AI 协作交付控制台
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">
              从一句用户需求，到一条可审计的交付链。这里展示本地记录、证据、边界和审阅状态，不提供生产动作。
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs leading-5 text-gray-600">
            <div className="font-semibold text-gray-900">Sprint 16</div>
            <div>只读 Operator Console MVP</div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <OperatorOverview />

        <section className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-950">只读记录明细</h2>
            <p className="mt-1 text-sm text-gray-500">
              下方保留现有记录面板，方便从交付链下钻到任务、专家分析、协作流、质量评估和操作证据。
            </p>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <TaskBoard />
            <AgentStats />
            <AuditTimeline />
            <EvalPanel />
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
              <DepartmentAssignmentPanel />
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
