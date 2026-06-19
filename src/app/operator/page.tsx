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

const closureStages = [
  'Evidence Sandbox',
  'Department Profiles',
  'Evidence Mapping',
  'Execution Gateway',
  'Assignment Review',
  'Runtime Read-only View',
]

const consoleSections = [
  { id: 'overview', label: 'Overview' },
  { id: 'task-flow', label: 'Task Flow' },
  { id: 'runtime', label: 'Runtime' },
  { id: 'governance', label: 'Governance Ledger' },
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
              Back to ChatHub
            </Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal text-gray-950">
              Operator Console
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">
              Local governance control surface for Task, Agent, Tool, Workflow, Evidence,
              Department, Execution Gateway, Assignment Review, and Sprint 22 runtime read-only records.
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
            <div className="font-semibold text-amber-950">v1 Safety Boundary</div>
            <div>local-only / human-gated / evidence-only / recommendation-only</div>
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
              <h2 className="text-sm font-semibold text-gray-950">Sprint 1-22 staged closure</h2>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                Reviews and approvals change only individual local records. They do not grant routing,
                assignment, runtime permission, release, deployment, or task completion.
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
            title="Overview"
            description="HARNESS-style local governance overview. This view remains read-only and does not issue runtime permission."
          />
          <OperatorOverview />
        </section>

        <section id="task-flow" className="scroll-mt-16 space-y-4">
          <SectionHeader
            title="Task Flow"
            description="Local task, agent, and collaboration records grouped as a production flow. Existing data sources are unchanged in this sprint slice."
          />
          <div className="grid gap-4 xl:grid-cols-2">
            <TaskBoard />
            <AgentStats />
            <div className="xl:col-span-2">
              <MultiAgentFlow />
            </div>
          </div>
        </section>

        <section id="runtime" className="scroll-mt-16 space-y-4">
          <SectionHeader
            title="Runtime"
            description="Sprint 22 runtime status view. It displays scoped runtime records only and exposes no worker, token issuance, connector, or mutation controls."
          />
          <div className="grid gap-4">
            <ExecutionGatewayPanel />
            <div className="space-y-3">
              <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
                <div className="text-sm font-semibold text-gray-950">Runtime Execution Task Filter</div>
                <p className="mt-1 break-words text-sm text-gray-600">
                  {runtimeTaskId ? (
                    <>Showing Sprint 22 read-only runtime view for task {runtimeTaskId}.</>
                  ) : (
                    <>
                      No runtimeTaskId selected. Add ?runtimeTaskId=&lt;task-id&gt; to inspect one
                      Sprint 22 runtime execution view, or use the automatic latest-task view below.
                    </>
                  )}
                </p>
              </div>
              {runtimeTaskId ? (
                <RuntimeExecutionPanel taskId={runtimeTaskId} />
              ) : (
                <LatestRuntimeExecutionPanel />
              )}
            </div>
          </div>
        </section>

        <section id="governance" className="scroll-mt-16 space-y-4">
          <SectionHeader
            title="Governance Ledger"
            description="Audit, evidence, evaluation, department, and assignment records. Approvals remain local record transitions, not runtime permission."
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
