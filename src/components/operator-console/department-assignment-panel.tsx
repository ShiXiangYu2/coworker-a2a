'use client'

import { useEffect, useState } from 'react'

interface IntakeRecord {
  id: string
  sourceTaskId: string
  taskTitle: string
  taskSummary: string
  status: string
  intakeReason: string
  createdAt: string
}

interface ProposalRecord {
  id: string
  intakeRecordId: string
  sourceTaskId: string
  proposedDepartmentProfileId: string
  proposedPrimaryRoleId: string
  status: string
  assignmentRecommendationOnly: boolean
  localReviewOnly: boolean
}

interface RoleFitRecord {
  id: string
  assignmentProposalId: string
  roleId: string
  fitLevel: string
  recommendationOnly: boolean
  doesNotAssignRuntimeAgent: boolean
}

interface AuditRecord {
  id: string
  targetId: string
  eventType: string
  status: string
  localAuditOnly: boolean
  doesNotMutateTargetTask: boolean
}

export function DepartmentAssignmentPanel() {
  const [intakes, setIntakes] = useState<IntakeRecord[]>([])
  const [proposals, setProposals] = useState<ProposalRecord[]>([])
  const [roleFits, setRoleFits] = useState<RoleFitRecord[]>([])
  const [audits, setAudits] = useState<AuditRecord[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [sourceTaskId, setSourceTaskId] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [departmentProfileId, setDepartmentProfileId] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchRecords() {
    try {
      const [intakeRes, proposalRes, roleFitRes, auditRes] = await Promise.all([
        fetch('/api/department-task-intakes'),
        fetch('/api/department-assignment-proposals'),
        fetch('/api/department-role-fit-reviews'),
        fetch('/api/department-assignment-audit-records'),
      ])
      if (intakeRes.ok) setIntakes((await intakeRes.json()).data ?? [])
      if (proposalRes.ok) setProposals((await proposalRes.json()).data ?? [])
      if (roleFitRes.ok) setRoleFits((await roleFitRes.json()).data ?? [])
      if (auditRes.ok) setAudits((await auditRes.json()).data ?? [])
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

  async function createIntake() {
    if (!sourceTaskId.trim() || !taskTitle.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/department-task-intakes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceTaskId,
          taskTitle,
          taskSummary: 'Local task intake for department assignment review only.',
          intakeReason: 'Operator review of department and role fit before any runtime assignment exists.',
          candidateDepartmentProfileIds: departmentProfileId ? [departmentProfileId] : [],
          riskNotes: ['Local record only; approval does not route tasks or assign runtime agents.'],
          createdBy: 'operator',
        }),
      })
      const data = await res.json()
      if (!data.ok) {
        setError(data.error?.message ?? 'Unable to create task intake record')
        return
      }
      setIntakes((prev) => [data.data, ...prev])
      setSourceTaskId('')
      setTaskTitle('')
      setDepartmentProfileId('')
      setShowCreate(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create task intake record')
    } finally {
      setSaving(false)
    }
  }

  async function transition(id: string, action: 'submit-review' | 'approve-record' | 'reject' | 'archive') {
    const res = await fetch(`/api/department-task-intakes/${id}/${action}`, { method: 'POST' })
    if (!res.ok) return
    const data = await res.json()
    if (!data.ok) return
    setIntakes((prev) => prev.map((item) => (item.id === id ? data.data : item)))
  }

  if (loading) {
    return (
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="animate-pulse text-sm text-gray-500">Loading department assignment records...</div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Department Task Intake</h2>
          <p className="text-xs text-gray-500">
            Sprint 21 local records only. Approval reviews one assignment record and does not route tasks, place runtime agents, start agent runs, grant runtime permission, run tools, call external systems, deploy, release, or complete tasks.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200"
        >
          {showCreate ? 'Cancel' : 'Create Task Intake Record'}
        </button>
      </div>

      {showCreate && (
        <div className="border-b bg-slate-50 px-4 py-3">
          <div className="flex flex-col gap-2">
            <input className="rounded border px-3 py-1.5 text-sm" placeholder="Task id" value={sourceTaskId} onChange={(event) => setSourceTaskId(event.target.value)} />
            <input className="rounded border px-3 py-1.5 text-sm" placeholder="Task title" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} />
            <input className="rounded border px-3 py-1.5 text-sm" placeholder="Department profile id (optional)" value={departmentProfileId} onChange={(event) => setDepartmentProfileId(event.target.value)} />
            {error && <div className="text-xs text-red-600">{error}</div>}
            <button
              onClick={createIntake}
              disabled={saving || !sourceTaskId.trim() || !taskTitle.trim()}
              className="self-end rounded-lg bg-slate-800 px-4 py-1.5 text-sm text-white hover:bg-slate-900 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Task Intake Record'}
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-0 lg:grid-cols-[1fr_18rem]">
        <div className="max-h-96 overflow-y-auto">
          {intakes.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">No local department assignment records yet.</div>
          ) : (
            <div className="divide-y">
              {intakes.map((record) => {
                const expanded = expandedId === record.id
                return (
                  <div key={record.id} className="px-4 py-3 hover:bg-gray-50">
                    <button type="button" className="w-full text-left" onClick={() => setExpandedId(expanded ? null : record.id)}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{record.status}</span>
                            <span className="text-sm font-medium text-gray-900">View Task Intake</span>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {record.taskTitle} | View Assignment Timeline | {new Date(record.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <span className="text-xs text-slate-700">View Assignment Audit</span>
                      </div>
                    </button>

                    {expanded && (
                      <div className="mt-3 rounded border bg-gray-50 p-3">
                        <p className="text-sm font-medium text-gray-900">View Department Assignment Proposal</p>
                        <p className="mt-1 text-sm text-gray-700">{record.taskSummary}</p>
                        <div className="mt-3 grid gap-2 text-xs text-gray-600 md:grid-cols-2">
                          <div className="rounded bg-white p-2">Task: {record.sourceTaskId}</div>
                          <div className="rounded bg-white p-2">Reason: {record.intakeReason}</div>
                        </div>
                        <p className="mt-3 text-sm font-medium text-gray-900">View Role Fit Review</p>
                        <p className="mt-1 text-xs text-gray-500">
                          Records are sanitized evidence and local review references only. Proposals are recommendation-only. Role fit reviews never place a runtime agent.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {record.status === 'draft' && (
                            <button className="text-xs text-slate-700" onClick={() => transition(record.id, 'submit-review')}>Submit Assignment Review</button>
                          )}
                          {record.status === 'review' && (
                            <>
                              <button className="text-xs text-green-700" onClick={() => transition(record.id, 'approve-record')}>Approve Assignment Record</button>
                              <button className="text-xs text-red-700" onClick={() => transition(record.id, 'reject')}>Reject Assignment Record</button>
                            </>
                          )}
                          {record.status !== 'archived' && (
                            <button className="text-xs text-gray-600" onClick={() => transition(record.id, 'archive')}>Archive Assignment Record</button>
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
          <p className="text-sm font-medium text-gray-900">View Department Assignment Proposal</p>
          <p className="mt-1 text-xs text-gray-500">{proposals.length} local proposals. Recommendation-only.</p>
          <p className="mt-4 text-sm font-medium text-gray-900">View Role Fit Review</p>
          <p className="mt-1 text-xs text-gray-500">{roleFits.length} local fit reviews. No runtime agent placement.</p>
          <p className="mt-4 text-sm font-medium text-gray-900">View Assignment Audit</p>
          <p className="mt-1 text-xs text-gray-500">{audits.length} audit records. No source Task mutation.</p>
          <div className="mt-4 space-y-2">
            {proposals.slice(0, 3).map((proposal) => (
              <div key={proposal.id} className="rounded bg-white p-2 text-xs text-gray-700">
                {proposal.proposedDepartmentProfileId} | {proposal.proposedPrimaryRoleId} | local: {String(proposal.localReviewOnly)}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
