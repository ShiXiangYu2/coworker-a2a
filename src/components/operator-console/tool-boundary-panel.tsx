'use client'

import { useEffect, useState } from 'react'

interface ToolBoundaryRecord {
  id: string
  toolName?: string
  toolId?: string
  status: string
  riskLevel?: string
  createdAt: string
}

export function ToolBoundaryPanel() {
  const [records, setRecords] = useState<ToolBoundaryRecord[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchRecords() {
    try {
      const res = await fetch('/api/tool-calls')
      if (res.ok) {
        const data = await res.json()
        setRecords(data.data ?? [])
      }
    } catch {
      // Optional read-only panel; missing data should not block the console.
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

  if (loading) {
    return (
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="text-sm text-gray-500">Loading local tool boundary records...</div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <div className="border-b px-4 py-3">
        <h2 className="text-lg font-semibold text-gray-900">Tool Boundary Evidence</h2>
        <p className="text-xs text-gray-500">
          Read-only view of local tool records. This console does not request permission, approve tool activity, or trigger tool runtime.
        </p>
      </div>

      <div className="max-h-64 overflow-y-auto">
        {records.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            No local tool boundary records yet.
            <br />
            <span className="text-xs text-gray-400">
              This panel presents status and evidence only.
            </span>
          </div>
        ) : (
          <div className="divide-y">
            {records.map((item) => (
              <div key={item.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {item.toolName ?? item.toolId ?? item.id}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {item.riskLevel ?? 'local_record'} | {new Date(item.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-100">
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
