'use client'

import { useEffect, useState } from 'react'
import { EmptyState, ErrorState, LoadingState, PanelShell, RecordMeta, SafetyNote, StatusBadge } from './ui'

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
  ['user_pasted_text', '粘贴文本摘要'],
  ['user_provided_file_summary', '文件摘要'],
  ['user_provided_command_output_summary', '命令输出摘要'],
  ['user_provided_external_screenshot_description', '截图描述'],
  ['user_provided_sanitized_context_snapshot', '脱敏上下文快照'],
  ['manual_note', '人工备注'],
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
        setError(data.error?.message ?? data.error ?? '无法创建证据记录')
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
      setError(err instanceof Error ? err.message : '无法创建证据记录')
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
    return <LoadingState label="正在读取证据沙箱记录..." />
  }

  return (
    <PanelShell
      title="Evidence Sandbox"
      description="Sprint 17 证据沙箱。这里只导入 sanitized evidence summary，不执行、发布、部署或完成任务。"
      action={
        <button
          onClick={() => setShowImport(!showImport)}
          className="rounded-lg bg-indigo-100 px-3 py-1.5 text-sm text-indigo-700 hover:bg-indigo-200"
        >
          {showImport ? '取消导入' : '导入证据摘要'}
        </button>
      }
    >

      {showImport && (
        <div className="border-b bg-indigo-50 px-4 py-3">
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="标题"
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
              placeholder="粘贴已脱敏摘要。不要包含密钥、token、cookie、凭据、原始 header 或原始 payload。"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              rows={4}
              className="rounded border px-3 py-1.5 text-sm"
            />
            {error && <ErrorState message={error} />}
            <button
              onClick={handleCreate}
              disabled={saving || !summary.trim()}
              className="self-end rounded-lg bg-indigo-600 px-4 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存证据摘要'}
            </button>
          </div>
        </div>
      )}

      <div className="max-h-96 overflow-y-auto">
        {records.length === 0 ? (
          <EmptyState
            title="暂无本地证据记录"
            description="导入脱敏摘要后，这里会展示 evidence record、sanitized snapshot 和 review lifecycle。"
          />
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
                          <StatusBadge status={record.status} />
                        </div>
                        <RecordMeta>
                          {record.rawInputHandling} / {new Date(record.createdAt).toLocaleString()}
                        </RecordMeta>
                      </div>
                      <span className="text-xs text-indigo-700">查看脱敏快照</span>
                    </div>
                  </button>

                  {expanded && (
                    <div className="mt-3 rounded border bg-gray-50 p-3">
                      <p className="text-sm text-gray-700">{record.importedContentSummary}</p>
                      <div className="mt-2">
                        <SafetyNote>
                          这里只是本地证据记录。批准该记录不代表权限授予、执行 token、路由 token 或任务完成。
                        </SafetyNote>
                      </div>
                      {riskFindings.length > 0 && (
                        <p className="mt-2 text-xs text-amber-700">
                          脱敏发现：{riskFindings.join(', ')}
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
                          <button className="text-xs text-indigo-700" onClick={() => transition(record.id, 'submit-review')}>提交证据 review</button>
                        )}
                        {record.status === 'review' && (
                          <>
                            <button className="text-xs text-green-700" onClick={() => transition(record.id, 'approve-record')}>批准本地证据记录</button>
                            <button className="text-xs text-red-700" onClick={() => transition(record.id, 'reject')}>拒绝本地证据记录</button>
                          </>
                        )}
                        {record.status !== 'archived' && (
                          <button className="text-xs text-gray-600" onClick={() => transition(record.id, 'archive')}>归档证据记录</button>
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
    </PanelShell>
  )
}

function safeJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}
