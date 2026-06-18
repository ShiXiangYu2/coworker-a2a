'use client'

import { useEffect, useState } from 'react'

interface DepartmentProfile {
  id: string
  departmentKey: string
  displayName: string
  profileKind: string
  mission: string
  responsibilitySummary: string
  status: string
  safetyNote: string
  createdAt: string
}

interface DepartmentRole {
  id: string
  displayName: string
  roleKey: string
  status: string
}

interface DepartmentBoundary {
  id: string
  boundaryVersion: string
  status: string
  approvalMeaning: string
  grantsRuntimePermission: boolean
}

interface LinkedDepartmentData {
  profile: DepartmentProfile
  roles: DepartmentRole[]
  permissionBoundaries: DepartmentBoundary[]
}

export function DepartmentPanel() {
  const [records, setRecords] = useState<DepartmentProfile[]>([])
  const [linked, setLinked] = useState<Record<string, LinkedDepartmentData>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [mission, setMission] = useState('')
  const [responsibilitySummary, setResponsibilitySummary] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchRecords() {
    try {
      const res = await fetch('/api/department-profiles')
      if (res.ok) {
        const data = await res.json()
        setRecords(data.data ?? [])
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

  async function loadLinked(profileId: string) {
    if (linked[profileId]) return
    const res = await fetch(`/api/department-profiles/${profileId}/linked`)
    if (!res.ok) return
    const data = await res.json()
    setLinked((prev) => ({ ...prev, [profileId]: data.data }))
  }

  async function createProfile() {
    if (!displayName.trim() || !mission.trim() || !responsibilitySummary.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/department-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentKey: displayName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'department',
          displayName,
          profileKind: 'custom',
          mission,
          responsibilitySummary,
          createdBy: 'operator',
        }),
      })
      const data = await res.json()
      if (!data.ok) {
        setError(data.error?.message ?? 'Unable to create department record')
        return
      }
      setRecords((prev) => [data.data, ...prev])
      setDisplayName('')
      setMission('')
      setResponsibilitySummary('')
      setShowCreate(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create department record')
    } finally {
      setSaving(false)
    }
  }

  async function transition(id: string, action: 'submit-review' | 'approve-record' | 'reject' | 'archive') {
    const res = await fetch(`/api/department-profiles/${id}/${action}`, { method: 'POST' })
    if (!res.ok) return
    const data = await res.json()
    if (!data.ok) return
    setRecords((prev) => prev.map((item) => (item.id === id ? data.data : item)))
  }

  if (loading) {
    return (
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="animate-pulse text-sm text-gray-500">Loading department records...</div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Department Profiles</h2>
          <p className="text-xs text-gray-500">
            Sprint 18 local organization records only. Approval does not route tasks, continue agents, grant runtime permission, or complete tasks.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200"
        >
          {showCreate ? 'Cancel' : 'Create Department Profile'}
        </button>
      </div>

      {showCreate && (
        <div className="border-b bg-slate-50 px-4 py-3">
          <div className="flex flex-col gap-2">
            <input className="rounded border px-3 py-1.5 text-sm" placeholder="Department name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            <textarea className="rounded border px-3 py-1.5 text-sm" placeholder="Mission" rows={2} value={mission} onChange={(event) => setMission(event.target.value)} />
            <textarea className="rounded border px-3 py-1.5 text-sm" placeholder="Responsibility summary" rows={3} value={responsibilitySummary} onChange={(event) => setResponsibilitySummary(event.target.value)} />
            {error && <div className="text-xs text-red-600">{error}</div>}
            <button
              onClick={createProfile}
              disabled={saving || !displayName.trim() || !mission.trim() || !responsibilitySummary.trim()}
              className="self-end rounded-lg bg-slate-800 px-4 py-1.5 text-sm text-white hover:bg-slate-900 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Department Record'}
            </button>
          </div>
        </div>
      )}

      <div className="max-h-96 overflow-y-auto">
        {records.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">No local department profiles yet.</div>
        ) : (
          <div className="divide-y">
            {records.map((record) => {
              const expanded = expandedId === record.id
              const linkedData = linked[record.id]
              return (
                <div key={record.id} className="px-4 py-3 hover:bg-gray-50">
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => {
                      setExpandedId(expanded ? null : record.id)
                      if (!expanded) void loadLinked(record.id)
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{record.profileKind}</span>
                          <span className="text-sm font-medium text-gray-900">{record.displayName}</span>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {record.status} | View Department Timeline | {new Date(record.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <span className="text-xs text-slate-700">View Department Profile</span>
                    </div>
                  </button>

                  {expanded && (
                    <div className="mt-3 rounded border bg-gray-50 p-3">
                      <p className="text-sm font-medium text-gray-900">View Responsibility Matrix</p>
                      <p className="mt-1 text-sm text-gray-700">{record.responsibilitySummary}</p>
                      <p className="mt-3 text-sm font-medium text-gray-900">View Department Permission Boundary</p>
                      <p className="mt-1 text-xs text-gray-500">
                        DepartmentPermissionBoundary is not consumed by runtime permission systems. It is a local review record only.
                      </p>
                      {linkedData?.permissionBoundaries?.map((boundary) => (
                        <div key={boundary.id} className="mt-2 rounded bg-white p-2 text-xs text-gray-700">
                          {boundary.boundaryVersion} | {boundary.status} | grantsRuntimePermission: {String(boundary.grantsRuntimePermission)}
                        </div>
                      ))}
                      <p className="mt-3 text-sm font-medium text-gray-900">View Department Agent Role</p>
                      <div className="mt-1 space-y-1">
                        {(linkedData?.roles ?? []).map((role) => (
                          <div key={role.id} className="rounded bg-white p-2 text-xs text-gray-700">
                            {role.displayName} | {role.roleKey} | {role.status}
                          </div>
                        ))}
                        {(linkedData?.roles ?? []).length === 0 && (
                          <div className="text-xs text-gray-500">No linked local roles yet.</div>
                        )}
                      </div>
                      <p className="mt-3 text-xs text-gray-500">{record.safetyNote}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {record.status === 'draft' && (
                          <button className="text-xs text-slate-700" onClick={() => transition(record.id, 'submit-review')}>Submit Department Review</button>
                        )}
                        {record.status === 'review' && (
                          <>
                            <button className="text-xs text-green-700" onClick={() => transition(record.id, 'approve-record')}>Approve Department Record</button>
                            <button className="text-xs text-red-700" onClick={() => transition(record.id, 'reject')}>Reject Department Record</button>
                          </>
                        )}
                        {record.status !== 'archived' && (
                          <button className="text-xs text-gray-600" onClick={() => transition(record.id, 'archive')}>Archive Department Record</button>
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
    </div>
  )
}

