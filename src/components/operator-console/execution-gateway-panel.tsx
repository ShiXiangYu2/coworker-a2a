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

export function ExecutionGatewayPanel() {
  const [intents, setIntents] = useState<IntentRecord[]>([])
  const [plans, setPlans] = useState<PlanRecord[]>([])
  const [gates, setGates] = useState<GateRecord[]>([])
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([])
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
      const [intentRes, planRes, gateRes, receiptRes] = await Promise.all([
        fetch('/api/execution-intents'),
        fetch('/api/execution-plans'),
        fetch('/api/execution-gates'),
        fetch('/api/execution-receipts'),
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

  async function transition(id: string, action: 'submit-review' | 'approve-record' | 'reject' | 'archive') {
    const res = await fetch(`/api/execution-intents/${id}/${action}`, { method: 'POST' })
    if (!res.ok) return
    const data = await res.json()
    if (!data.ok) return
    setIntents((prev) => prev.map((item) => (item.id === id ? data.data : item)))
  }

  if (loading) {
    return <LoadingState label="正在读取执行网关记录..." />
  }

  return (
    <PanelShell
      title="Human-Gated Execution Gateway"
      description="Sprint 20 local records only. Approval reviews one local record and does not route tasks, assign agents, grant runtime permission, run tools, call external systems, deploy, release, or complete tasks."
      action={
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200"
        >
          {showCreate ? 'Cancel' : 'Create Execution Intent Record'}
        </button>
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
