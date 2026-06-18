'use client'

import { useEffect, useState } from 'react'

interface EvidenceImportRecord {
  id: string
  title: string
  summary: string
  sourceKind: string
  status: string
  importedContentSummary: string
  rawInputHandling: string
  riskFindingsJson: string
  createdBy: string
  createdAt: string
}

interface SanitizedEvidenceSnapshot {
  id: string
  importRecordId: string
  snapshotKind: string
  sanitizedTitle: string
  sanitizedSummary: string
  redactionStatus: string
  evidenceOnly: boolean
}

const sourceOptions = [
  ['user_pasted_text', 'Pasted text summary'],
  ['user_provided_file_summary', 'File summary'],
  ['user_provided_command_output_summary', 'Command output summary'],
  ['user_provided_external_screenshot_description', 'Screenshot description'],
  ['user_provided_sanitized_context_snapshot', 'Sanitized context snapshot'],
  ['manual_note', 'Manual note'],
]

export function EvidencePanel() {
  const [records, setRecords] = useState<EvidenceImportRecord[]>([])
  const [snapshots, setSnapshots] = useState<Record<string, SanitizedEvidenceSnapshot[]>>({})
  const [loading, setLoading] = useState(true)
  const [showImport, setShowImport] = useState(false)
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [sourceKind, setSourceKind] = useState('user_pasted_text')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function fetchRecords() {
    try {
      const res = await fetch('/api/evidence-import-records')
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

  async function loadSnapshots(recordId: string) {
    if (snapshots[recordId]) return
    const res = await fetch(`/api/evidence-import-records/${recordId}/snapshots`)
    if (!res.ok) return
    const data = await res.json()
    setSnapshots((prev) => ({ ...prev, [recordId]: data.data ?? [] }))
  }

  async function handleCreate() {
    if (!summary.trim()) return
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/evidence-import-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceKind,
          title: title || 'Evidence Summary',
          userProvidedSummary: summary,
          createdBy: 'operator',
        }),
      })
      const data = await res.json()
      if (!data.ok) {
        setError(data.error?.message ?? data.error ?? 'Unable to create evidence record')
        return
      }
      setRecords((prev) => [data.data, ...prev])
      if (data.snapshot) {
        setSnapshots((prev) => ({ ...prev, [data.data.id]: [data.snapshot] }))
      }
      setTitle('')
      setSummary('')
      setShowImport(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create evidence record')
    } finally {
      setSaving(false)
    }
  }

  async function transition(id: string, action: 'submit-review' | 'approve-record' | 'reject' | 'archive') {
    const res = await fetch(`/api/evidence-import-records/${id}/${action}`, { method: 'POST' })
    if (!res.ok) return
    const data = await res.json()
    if (!data.ok) return
    setRecords((prev) => prev.map((item) => (item.id === id ? data.data : item)))
  }

  if (loading) {
    return (
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="animate-pulse text-sm text-gray-500">Loading evidence records...</div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Evidence Sandbox</h2>
          <p className="text-xs text-gray-500">
            Sprint 17 extension. Sprint 16 core remains read-only presentation; these local evidence record actions do not execute, release, deploy, or complete tasks.
          </p>
        </div>
        <button
          onClick={() => setShowImport(!showImport)}
          className="rounded-lg bg-indigo-100 px-3 py-1.5 text-sm text-indigo-700 hover:bg-indigo-200"
        >
          {showImport ? 'Cancel' : 'Import Evidence Summary'}
        </button>
      </div>

      {showImport && (
        <div className="border-b bg-indigo-50 px-4 py-3">
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="rounded border px-3 py-1.5 text-sm"
            />
            <select
              value={sourceKind}
              onChange={(event) => setSourceKind(event.target.value)}
              className="rounded border px-3 py-1.5 text-sm"
            >
              {sourceOptions.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <textarea
              placeholder="Paste a sanitized summary. Do not include secrets, tokens, cookies, credentials, raw headers, or raw payloads."
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              rows={4}
              className="rounded border px-3 py-1.5 text-sm"
            />
            {error && <div className="text-xs text-red-600">{error}</div>}
            <button
              onClick={handleCreate}
              disabled={saving || !summary.trim()}
              className="self-end rounded-lg bg-indigo-600 px-4 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Evidence Summary'}
            </button>
          </div>
        </div>
      )}

      <div className="max-h-96 overflow-y-auto">
        {records.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            No local evidence records yet.
          </div>
        ) : (
          <div className="divide-y">
            {records.map((record) => {
              const expanded = expandedId === record.id
              const riskFindings: string[] = safeJson(record.riskFindingsJson, [])
              return (
                <div key={record.id} className="px-4 py-3 hover:bg-gray-50">
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => {
                      setExpandedId(expanded ? null : record.id)
                      if (!expanded) void loadSnapshots(record.id)
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{record.sourceKind}</span>
                          <span className="text-sm font-medium text-gray-900">{record.title}</span>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {record.status} | {record.rawInputHandling} | {new Date(record.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <span className="text-xs text-indigo-700">View Sanitized Snapshot</span>
                    </div>
                  </button>

                  {expanded && (
                    <div className="mt-3 rounded border bg-gray-50 p-3">
                      <p className="text-sm text-gray-700">{record.importedContentSummary}</p>
                      <p className="mt-2 text-xs text-gray-500">
                        Local evidence record only. Approval here is not a permission grant or execution token.
                      </p>
                      {riskFindings.length > 0 && (
                        <p className="mt-2 text-xs text-amber-700">
                          Redaction findings: {riskFindings.join(', ')}
                        </p>
                      )}
                      <div className="mt-3 space-y-2">
                        {(snapshots[record.id] ?? []).map((snapshot) => (
                          <div key={snapshot.id} className="rounded bg-white p-2 text-xs text-gray-700">
                            <div className="font-medium">{snapshot.snapshotKind} | {snapshot.redactionStatus}</div>
                            <div>{snapshot.sanitizedSummary}</div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {record.status === 'draft' && (
                          <button className="text-xs text-indigo-700" onClick={() => transition(record.id, 'submit-review')}>Submit Evidence Review</button>
                        )}
                        {record.status === 'review' && (
                          <>
                            <button className="text-xs text-green-700" onClick={() => transition(record.id, 'approve-record')}>Approve Evidence Record</button>
                            <button className="text-xs text-red-700" onClick={() => transition(record.id, 'reject')}>Reject Evidence Record</button>
                          </>
                        )}
                        {record.status !== 'archived' && (
                          <button className="text-xs text-gray-600" onClick={() => transition(record.id, 'archive')}>Archive Evidence Record</button>
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

function safeJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}
