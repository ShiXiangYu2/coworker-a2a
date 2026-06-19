'use client'

import { useEffect, useState } from 'react'
import { EmptyState, ErrorState, LoadingState, PanelShell, RecordMeta, SafetyNote, StatusBadge } from './ui'

interface IntentRecord {
  id: string
  intentTitle: string
  intentSummary: string
  status: string
  requestedActionType: string
  requestedActionSummary: string
  riskSummary: string
  departmentProfileId?: string
  createdAt: string
}

interface PlanRecord {
  id: string
  intentRecordId: string
  planTitle: string
  status: string
  nonExecutablePlanOnly: boolean
}

interface GateRecord {
  id: string
  gateName: string
  status: string
  gateDecision: string
  doesNotGrantRuntimePermission: boolean
}

interface ReceiptRecord {
  id: string
  receiptTitle: string
  status: string
  actualExecutionPerformed: boolean
  receiptIsNotToolExecutionReceipt: boolean
}

interface DemoAgentTaskRun {
  id?: string
  agentId?: string
  agent?: string
  taskType?: string
  title?: string
  status: string
  startedAt?: string
  completedAt?: string | null
  agentTaskRunRecordId?: string
}

interface DemoRuntimeExecution {
  id: string
  toolId: string
  status: string
  policyDecision: string
  targetPath: string
}

interface RecentRun {
  correlationId: string
  orchestrator: string | null
  status: string
  startedAt: string | null
  completedAt: string | null
  agentTaskRuns: DemoAgentTaskRun[]
  runtimeExecutions: DemoRuntimeExecution[]
  timelineEvents: Array<{
    id: string
    eventType: string
    actorType: string
    reason: string
    createdAt: string
  }>
  latestReceiptStatus: string | null
  latestRuntimeRecordId: string | null
}

export function ExecutionGatewayPanel() {
  const [intents, setIntents] = useState<IntentRecord[]>([])
  const [plans, setPlans] = useState<PlanRecord[]>([])
  const [gates, setGates] = useState<GateRecord[]>([])
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([])
  const [demoDraftPath, setDemoDraftPath] = useState<string | null>(null)
  const [demoApprovalState, setDemoApprovalState] = useState<'pending_review' | 'approved_record' | 'draft'>('draft')
  const [demoReceiptStatus, setDemoReceiptStatus] = useState<string>('idle')
  const [demoToolId, setDemoToolId] = useState<string>('obsidian.write_draft')
  const [demoPolicyDecision, setDemoPolicyDecision] = useState<string>('not_checked')
  const [demoRuntimeRecordId, setDemoRuntimeRecordId] = useState<string>('not_created')
  const [demoOrchestratorName, setDemoOrchestratorName] = useState<string>('not_planned')
  const [demoAgentTaskCount, setDemoAgentTaskCount] = useState<number>(0)
  const [demoAgentTaskRuns, setDemoAgentTaskRuns] = useState<DemoAgentTaskRun[]>([])
  const [demoRuntimeExecutions, setDemoRuntimeExecutions] = useState<DemoRuntimeExecution[]>([])
  const [demoCorrelationId, setDemoCorrelationId] = useState<string>('not_created')
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([])
  const [selectedRun, setSelectedRun] = useState<RecentRun | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [intentTitle, setIntentTitle] = useState('')
  const [requestedActionType, setRequestedActionType] = useState('')
  const [departmentProfileId, setDepartmentProfileId] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchRecords() {
    try {
      const [intentRes, planRes, gateRes, receiptRes, recentRunsRes] = await Promise.all([
        fetch('/api/execution-intents'),
        fetch('/api/execution-plans'),
        fetch('/api/execution-gates'),
        fetch('/api/execution-receipts'),
        fetch('/api/runs?limit=5'),
      ])
      if (intentRes.ok) {
        const data = await intentRes.json()
        setIntents(data.data ?? [])
      }
      if (planRes.ok) {
        const data = await planRes.json()
        setPlans(data.data ?? [])
      }
      if (gateRes.ok) {
        const data = await gateRes.json()
        setGates(data.data ?? [])
      }
      if (receiptRes.ok) {
        const data = await receiptRes.json()
        setReceipts(data.data ?? [])
      }
      if (recentRunsRes.ok) {
        const data = await recentRunsRes.json()
        const runs = data.data ?? []
        setRecentRuns(runs)
        setSelectedRun((prev) =>
          prev
            ? runs.find((run: RecentRun) => run.correlationId === prev.correlationId) ?? runs[0] ?? null
            : runs[0] ?? null
        )
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchRecords()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [])

  async function createIntent() {
    if (!intentTitle.trim() || !requestedActionType.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/execution-intents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intentTitle,
          intentSummary: 'Local execution intent for human-gated review only.',
          requestedBy: 'operator',
          departmentProfileId: departmentProfileId || undefined,
          requestedActionType,
          requestedActionSummary: 'A proposed action described for local review without runtime invocation.',
          expectedOutcome: 'A reviewed local record chain that remains non-executable.',
          riskSummary: 'No runtime permission, routing, task assignment, file, Git, external API, MCP, deploy, release, or task completion effect.',
          createdBy: 'operator',
        }),
      })
      const data = await res.json()
      if (!data.ok) {
        setError(data.error?.message ?? 'Unable to create execution intent record')
        return
      }
      setIntents((prev) => [data.data, ...prev])
      setIntentTitle('')
      setRequestedActionType('')
      setDepartmentProfileId('')
      setShowCreate(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create execution intent record')
    } finally {
      setSaving(false)
    }
  }

  async function runDemo() {
    setDemoReceiptStatus('running')
    try {
      const res = await fetch('/api/demo/competitor-weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: '帮我把今天的竞品资料整理成周报草稿',
          approved: false,
        }),
      })
      const data = await res.json()
      if (!data.ok) {
        setDemoReceiptStatus(data.error?.message ?? 'demo_failed')
        return
      }
      setDemoDraftPath(data.data?.executionPlan?.targetPath ?? null)
      setDemoApprovalState(data.data?.executionGateway?.approvalRecordId ? 'approved_record' : 'pending_review')
      setDemoReceiptStatus(data.data?.receipt?.status ?? 'unknown')
      setDemoToolId(data.data?.toolExecution?.toolId ?? 'obsidian.write_draft')
      setDemoPolicyDecision(data.data?.toolExecution?.policyDecision ?? 'unknown')
      setDemoRuntimeRecordId(data.data?.runtimeRecordId ?? 'unknown')
      setDemoCorrelationId(data.data?.correlationId ?? 'unknown')
      setDemoOrchestratorName(data.data?.taskBundle?.orchestrator ?? 'unknown')
      setDemoAgentTaskCount(data.data?.taskBundle?.tasks?.length ?? 0)
      setDemoAgentTaskRuns(data.data?.taskBundle?.tasks ?? [])
      if (data.data?.correlationId) {
        await fetchDemoRunRecords(data.data.correlationId)
      }
      await fetchRecords()
    } catch (error) {
      setDemoReceiptStatus(error instanceof Error ? error.message : 'demo_failed')
    }
  }

  async function fetchDemoRunRecords(correlationId: string) {
    const [agentRunRes, runtimeRes] = await Promise.all([
      fetch(`/api/agent-task-runs?correlationId=${encodeURIComponent(correlationId)}&limit=10`),
      fetch(`/api/runtime-executions?correlationId=${encodeURIComponent(correlationId)}&limit=10`),
    ])

    if (agentRunRes.ok) {
      const agentRunData = await agentRunRes.json()
      if (agentRunData.ok) {
        setDemoAgentTaskRuns(agentRunData.data ?? [])
        setDemoAgentTaskCount(agentRunData.data?.length ?? 0)
      }
    }

    if (runtimeRes.ok) {
      const runtimeData = await runtimeRes.json()
      if (runtimeData.ok) {
        setDemoRuntimeExecutions(runtimeData.data ?? [])
      }
    }
  }

  async function transition(id: string, action: 'submit-review' | 'approve-record' | 'reject' | 'archive') {
    const res = await fetch(`/api/execution-intents/${id}/${action}`, { method: 'POST' })
    if (!res.ok) return
    const data = await res.json()
    if (!data.ok) return
    setIntents((prev) => prev.map((item) => (item.id === id ? data.data : item)))
  }

  if (loading) {
    return <LoadingState label="姝ｅ湪璇诲彇鎵ц缃戝叧璁板綍..." />
  }

  return (
    <PanelShell
      title="Human-Gated Execution Gateway"
      description="Sprint 20 local records only. Approval reviews one local record and does not route tasks, assign agents, grant runtime permission, run tools, call external systems, deploy, release, or complete tasks."
      action={
        <div className="flex flex-wrap gap-2">
          <button
            onClick={runDemo}
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200"
          >
            Generate Weekly Draft
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200"
          >
            {showCreate ? 'Cancel' : 'Create Execution Intent Record'}
          </button>
        </div>
      }
    >

      {showCreate && (
        <div className="border-b bg-slate-50 px-4 py-3">
          <div className="flex flex-col gap-2">
            <input className="rounded border px-3 py-1.5 text-sm" placeholder="Intent title" value={intentTitle} onChange={(event) => setIntentTitle(event.target.value)} />
            <input className="rounded border px-3 py-1.5 text-sm" placeholder="Requested action type" value={requestedActionType} onChange={(event) => setRequestedActionType(event.target.value)} />
            <input className="rounded border px-3 py-1.5 text-sm" placeholder="Department profile id (optional)" value={departmentProfileId} onChange={(event) => setDepartmentProfileId(event.target.value)} />
            {error && <ErrorState message={error} />}
            <button
              onClick={createIntent}
              disabled={saving || !intentTitle.trim() || !requestedActionType.trim()}
              className="self-end rounded-lg bg-slate-800 px-4 py-1.5 text-sm text-white hover:bg-slate-900 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Execution Intent Record'}
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-0 lg:grid-cols-[1fr_18rem]">
        <div className="max-h-96 overflow-y-auto">
          {intents.length === 0 ? (
            <EmptyState title="No local execution gateway records yet." description="Create local execution intent records to review plans, gates and receipts without real runtime effects." />
          ) : (
            <div className="divide-y">
              {intents.map((record) => {
                const expanded = expandedId === record.id
                return (
                  <div key={record.id} className="px-4 py-3 hover:bg-gray-50">
                    <button type="button" className="w-full text-left" onClick={() => setExpandedId(expanded ? null : record.id)}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={record.status} />
                            <span className="text-sm font-medium text-gray-900">View Execution Intent</span>
                          </div>
                          <RecordMeta>
                            {record.intentTitle} | View Execution Timeline | {new Date(record.createdAt).toLocaleDateString()}
                          </RecordMeta>
                        </div>
                        <span className="text-xs text-slate-700">View Execution Audit</span>
                      </div>
                    </button>

                    {expanded && (
                      <div className="mt-3 rounded border bg-gray-50 p-3">
                        <p className="text-sm font-medium text-gray-900">View Execution Plan</p>
                        <p className="mt-1 text-sm text-gray-700">{record.requestedActionSummary}</p>
                        <div className="mt-3 grid gap-2 text-xs text-gray-600 md:grid-cols-2">
                          <div className="rounded bg-white p-2">Action type: {record.requestedActionType}</div>
                          <div className="rounded bg-white p-2">Department: {record.departmentProfileId ?? 'unlinked'}</div>
                        </div>
                        <p className="mt-3 text-sm font-medium text-gray-900">View Execution Gate</p>
                        <p className="mt-1 text-sm font-medium text-gray-900">View Execution Receipt</p>
                        <div className="mt-2">
                          <SafetyNote>
                            Records are sanitized evidence and local review references only. Gate decisions do not grant runtime permission. Receipts do not claim real execution and are not ToolExecutionReceipt.
                          </SafetyNote>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {record.status === 'draft' && (
                            <button className="text-xs text-slate-700" onClick={() => transition(record.id, 'submit-review')}>Submit Execution Review</button>
                          )}
                          {record.status === 'review' && (
                            <>
                              <button className="text-xs text-green-700" onClick={() => transition(record.id, 'approve-record')}>Approve Execution Record</button>
                              <button className="text-xs text-red-700" onClick={() => transition(record.id, 'reject')}>Reject Execution Record</button>
                            </>
                          )}
                          {record.status !== 'archived' && (
                            <button className="text-xs text-gray-600" onClick={() => transition(record.id, 'archive')}>Archive Execution Record</button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <aside className="border-t bg-slate-50 p-4 lg:border-l lg:border-t-0">
          <p className="text-sm font-medium text-gray-900">View Execution Plan</p>
          <p className="mt-1 text-xs text-gray-500">{plans.length} local plan records. Non-executable only.</p>
          <p className="mt-4 text-sm font-medium text-gray-900">View Execution Gate</p>
          <p className="mt-1 text-xs text-gray-500">{gates.length} local gate records. No runtime permission grants.</p>
          <p className="mt-4 text-sm font-medium text-gray-900">View Execution Receipt</p>
          <p className="mt-1 text-xs text-gray-500">{receipts.length} local receipt records. No real runtime receipt claims.</p>
          <p className="mt-4 text-sm font-medium text-gray-900">View Demo Receipt</p>
          <p className="mt-1 break-all text-xs text-gray-500">Correlation: {demoCorrelationId}</p>
          <p className="mt-1 text-xs text-gray-500">Orchestrator: {demoOrchestratorName}</p>
          <p className="mt-1 text-xs text-gray-500">Agent tasks: {demoAgentTaskCount}</p>
          <p className="mt-1 break-all text-xs text-gray-500">Runtime: {demoRuntimeRecordId}</p>
          <p className="mt-1 text-xs text-gray-500">Tool: {demoToolId}</p>
          <p className="mt-1 text-xs text-gray-500">Policy: {demoPolicyDecision}</p>
          <p className="mt-1 text-xs text-gray-500">Approval: {demoApprovalState}</p>
          <p className="mt-1 text-xs text-gray-500">Receipt: {demoReceiptStatus}</p>
          <p className="mt-1 break-all text-xs text-gray-500">Path: {demoDraftPath ?? 'pending approval'}</p>
          <p className="mt-4 text-sm font-medium text-gray-900">Recent Runs</p>
          <p className="mt-1 text-xs text-gray-500">{recentRuns.length} aggregated run records.</p>
          <div className="mt-3 space-y-2">
            {recentRuns.map((run) => {
              const active = selectedRun?.correlationId === run.correlationId
              return (
                <button
                  key={run.correlationId}
                  type="button"
                  onClick={() => setSelectedRun(run)}
                  className={`w-full rounded border p-2 text-left text-xs ${
                    active ? 'border-slate-400 bg-white text-slate-900' : 'border-transparent bg-white text-gray-700'
                  }`}
                >
                  <p className="break-all">{run.correlationId}</p>
                  <p className="mt-1 text-gray-500">
                    {run.status} | agent tasks: {run.agentTaskRuns.length} | runtime: {run.runtimeExecutions.length}
                  </p>
                  <p className="mt-1 text-gray-500">Receipt: {run.latestReceiptStatus ?? 'pending'}</p>
                </button>
              )
            })}
          </div>
          {selectedRun && (
            <div className="mt-4 space-y-2">
              <div className="rounded bg-white p-2 text-xs text-gray-700">
                <p className="break-all">Run: {selectedRun.correlationId}</p>
                <p className="mt-1">Status: {selectedRun.status}</p>
                <p className="mt-1">Orchestrator: {selectedRun.orchestrator ?? 'unknown'}</p>
                <p className="mt-1 break-all">Latest runtime: {selectedRun.latestRuntimeRecordId ?? 'pending'}</p>
              </div>
              {selectedRun.agentTaskRuns.map((task) => (
                <div key={task.id ?? task.agentTaskRunRecordId} className="rounded bg-white p-2 text-xs text-gray-700">
                  <p>{task.agentId ?? task.agent} | {task.taskType ?? task.title} | {task.status}</p>
                  <p className="mt-1 break-all text-gray-500">{task.id ?? task.agentTaskRunRecordId}</p>
                </div>
              ))}
              {selectedRun.runtimeExecutions.map((execution) => (
                <div key={execution.id} className="rounded bg-white p-2 text-xs text-gray-700">
                  <p>{execution.toolId} | {execution.status}</p>
                  <p className="mt-1">{execution.policyDecision}</p>
                  <p className="mt-1 break-all text-gray-500">{execution.targetPath}</p>
                </div>
              ))}
              {selectedRun.timelineEvents.map((event) => (
                <div key={event.id} className="rounded bg-white p-2 text-xs text-gray-700">
                  <p>{event.eventType} | {event.actorType}</p>
                  <p className="mt-1 text-gray-500">{event.reason}</p>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 space-y-2">
            {demoAgentTaskRuns.map((task) => (
              <div key={task.id ?? task.agentTaskRunRecordId} className="rounded bg-white p-2 text-xs text-gray-700">
                <p>{task.agentId ?? task.agent} | {task.taskType ?? task.title} | {task.status}</p>
                {task.startedAt && <p className="mt-1 text-gray-500">Started: {new Date(task.startedAt).toLocaleTimeString()}</p>}
                {task.completedAt && <p className="mt-1 text-gray-500">Completed: {new Date(task.completedAt).toLocaleTimeString()}</p>}
                <p className="mt-1 break-all text-gray-500">{task.id ?? task.agentTaskRunRecordId}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {demoRuntimeExecutions.map((execution) => (
              <div key={execution.id} className="rounded bg-white p-2 text-xs text-gray-700">
                <p>{execution.toolId} | {execution.policyDecision} | {execution.status}</p>
                <p className="mt-1 break-all text-gray-500">{execution.targetPath}</p>
                <p className="mt-1 break-all text-gray-500">{execution.id}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {gates.slice(0, 3).map((gate) => (
              <div key={gate.id} className="rounded bg-white p-2 text-xs text-gray-700">
                {gate.gateName} | {gate.gateDecision} | permissionGrant: {String(!gate.doesNotGrantRuntimePermission)}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </PanelShell>
  )
}
