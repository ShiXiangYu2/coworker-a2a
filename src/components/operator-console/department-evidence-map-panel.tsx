'use client'

import { useEffect, useState } from 'react'
import { EmptyState, ErrorState, LoadingState, PanelShell, RecordMeta, SafetyNote, StatusBadge } from './ui'

interface MappingRecord {
  id: string
  title: string
  description: string
  status: string
  evidenceRecordType: string
  evidenceRecordId: string
  departmentRecordType: string
  departmentRecordId: string
  departmentProfileId?: string
  mappingStrength: string
  mappingRationale: string
  createdAt: string
}

interface CoverageRecord {
  id: string
  departmentProfileId: string
  coverageScope: string
  coverageLevel: string
  coverageSummary: string
  recommendationOnly: boolean
}

interface GapRecord {
  id: string
  departmentProfileId: string
  gapType: string
  gapSummary: string
  riskLevel: string
  recommendationOnly: boolean
}

export function DepartmentEvidenceMapPanel() {
  const [mappings, setMappings] = useState<MappingRecord[]>([])
  const [coverages, setCoverages] = useState<CoverageRecord[]>([])
  const [gaps, setGaps] = useState<GapRecord[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [evidenceRecordId, setEvidenceRecordId] = useState('')
  const [departmentRecordId, setDepartmentRecordId] = useState('')
  const [departmentProfileId, setDepartmentProfileId] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchRecords() {
    try {
      const [mappingRes, coverageRes, gapRes] = await Promise.all([
        fetch('/api/department-evidence-mappings'),
        fetch('/api/department-evidence-coverages'),
        fetch('/api/department-review-gaps'),
      ])
      if (mappingRes.ok) {
        const data = await mappingRes.json()
        setMappings(data.data ?? [])
      }
      if (coverageRes.ok) {
        const data = await coverageRes.json()
        setCoverages(data.data ?? [])
      }
      if (gapRes.ok) {
        const data = await gapRes.json()
        setGaps(data.data ?? [])
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

  async function createMapping() {
    if (!title.trim() || !evidenceRecordId.trim() || !departmentRecordId.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/department-evidence-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mappingKey: title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'department_evidence_mapping',
          title,
          description: 'Local evidence-to-department mapping for operator review only.',
          evidenceRecordType: 'sanitized_evidence_snapshot',
          evidenceRecordId,
          evidenceSummary: 'User-selected sanitized evidence reference.',
          departmentRecordType: 'department_profile',
          departmentRecordId,
          departmentProfileId: departmentProfileId || departmentRecordId,
          mappingStrength: 'supporting',
          mappingRationale: 'Links sanitized evidence to a local department record for review presentation only.',
          createdBy: 'operator',
        }),
      })
      const data = await res.json()
      if (!data.ok) {
        setError(data.error?.message ?? 'Unable to create mapping record')
        return
      }
      setMappings((prev) => [data.data, ...prev])
      setTitle('')
      setEvidenceRecordId('')
      setDepartmentRecordId('')
      setDepartmentProfileId('')
      setShowCreate(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create mapping record')
    } finally {
      setSaving(false)
    }
  }

  async function transition(id: string, action: 'submit-review' | 'approve-record' | 'reject' | 'archive') {
    const res = await fetch(`/api/department-evidence-mappings/${id}/${action}`, { method: 'POST' })
    if (!res.ok) return
    const data = await res.json()
    if (!data.ok) return
    setMappings((prev) => prev.map((item) => (item.id === id ? data.data : item)))
  }

  if (loading) {
    return <LoadingState label="正在读取部门证据映射记录..." />
  }

  return (
    <PanelShell
      title="Department Evidence Map"
      description="Sprint 19 local mapping records only. Approval does not route tasks, assign agents, grant runtime permission, import live evidence, or complete tasks."
      action={
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200"
        >
          {showCreate ? 'Cancel' : 'Create Mapping Record'}
        </button>
      }
    >

      {showCreate && (
        <div className="border-b bg-slate-50 px-4 py-3">
          <div className="flex flex-col gap-2">
            <input className="rounded border px-3 py-1.5 text-sm" placeholder="Mapping title" value={title} onChange={(event) => setTitle(event.target.value)} />
            <input className="rounded border px-3 py-1.5 text-sm" placeholder="Sanitized evidence record id" value={evidenceRecordId} onChange={(event) => setEvidenceRecordId(event.target.value)} />
            <input className="rounded border px-3 py-1.5 text-sm" placeholder="Department record id" value={departmentRecordId} onChange={(event) => setDepartmentRecordId(event.target.value)} />
            <input className="rounded border px-3 py-1.5 text-sm" placeholder="Department profile id (optional)" value={departmentProfileId} onChange={(event) => setDepartmentProfileId(event.target.value)} />
            {error && <ErrorState message={error} />}
            <button
              onClick={createMapping}
              disabled={saving || !title.trim() || !evidenceRecordId.trim() || !departmentRecordId.trim()}
              className="self-end rounded-lg bg-slate-800 px-4 py-1.5 text-sm text-white hover:bg-slate-900 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Mapping Record'}
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-0 lg:grid-cols-[1fr_18rem]">
        <div className="max-h-96 overflow-y-auto">
          {mappings.length === 0 ? (
            <EmptyState title="No local department evidence mappings yet." description="Create local mappings between sanitized evidence and department records to review coverage and gaps." />
          ) : (
            <div className="divide-y">
              {mappings.map((record) => {
                const expanded = expandedId === record.id
                return (
                  <div key={record.id} className="px-4 py-3 hover:bg-gray-50">
                    <button type="button" className="w-full text-left" onClick={() => setExpandedId(expanded ? null : record.id)}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={record.status} />
                            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{record.mappingStrength}</span>
                            <span className="text-sm font-medium text-gray-900">View Department Evidence Map</span>
                          </div>
                          <RecordMeta>
                            {record.title} | {record.status} | View Mapping Timeline | {new Date(record.createdAt).toLocaleDateString()}
                          </RecordMeta>
                        </div>
                        <span className="text-xs text-slate-700">View Mapping Audit</span>
                      </div>
                    </button>

                    {expanded && (
                      <div className="mt-3 rounded border bg-gray-50 p-3">
                        <p className="text-sm font-medium text-gray-900">View Evidence Coverage</p>
                        <p className="mt-1 text-sm text-gray-700">{record.mappingRationale}</p>
                        <div className="mt-3 grid gap-2 text-xs text-gray-600 md:grid-cols-2">
                          <div className="rounded bg-white p-2">
                            {record.evidenceRecordType}: {record.evidenceRecordId}
                          </div>
                          <div className="rounded bg-white p-2">
                            {record.departmentRecordType}: {record.departmentRecordId}
                          </div>
                        </div>
                        <p className="mt-3 text-sm font-medium text-gray-900">View Department Review Gaps</p>
                        <div className="mt-2">
                          <SafetyNote>
                            Mapping records are sanitized evidence references only. They are not execution, routing, permission, release, deploy, or task completion tokens.
                          </SafetyNote>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {record.status === 'draft' && (
                            <button className="text-xs text-slate-700" onClick={() => transition(record.id, 'submit-review')}>Submit Mapping Review</button>
                          )}
                          {record.status === 'review' && (
                            <>
                              <button className="text-xs text-green-700" onClick={() => transition(record.id, 'approve-record')}>Approve Mapping Record</button>
                              <button className="text-xs text-red-700" onClick={() => transition(record.id, 'reject')}>Reject Mapping Record</button>
                            </>
                          )}
                          {record.status !== 'archived' && (
                            <button className="text-xs text-gray-600" onClick={() => transition(record.id, 'archive')}>Archive Mapping Record</button>
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
          <p className="text-sm font-medium text-gray-900">View Evidence Coverage</p>
          <p className="mt-1 text-xs text-gray-500">{coverages.length} local coverage records. Recommendation only.</p>
          <p className="mt-4 text-sm font-medium text-gray-900">View Department Review Gaps</p>
          <p className="mt-1 text-xs text-gray-500">{gaps.length} local gap records. No live evidence import or evidence sync.</p>
          <div className="mt-4 space-y-2">
            {gaps.slice(0, 3).map((gap) => (
              <div key={gap.id} className="rounded bg-white p-2 text-xs text-gray-700">
                {gap.gapType} | {gap.riskLevel} | recommendationOnly: {String(gap.recommendationOnly)}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </PanelShell>
  )
}
