'use client'

import { useEffect, useState } from 'react'
import { EmptyState, LoadingState, PanelShell, StatusBadge } from './ui'

interface AuditEvent {
  id: string
  eventType: string
  actorType: string
  actorId: string | null
  taskId: string | null
  beforeStatus: string | null
  afterStatus: string | null
  reason: string
  createdAt: string
}

export function AuditTimeline() {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchEvents() {
    try {
      const res = await fetch('/api/audit/events?limit=30')
      if (res.ok) {
        const data = await res.json()
        setEvents(data.data ?? [])
      }
    } catch {
      // Audit is best-effort in the local console.
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchEvents()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [])

  if (loading) {
    return <LoadingState label="正在读取审计事件..." />
  }

  return (
    <PanelShell
      title="审计时间线"
      description={`${events.length} 条最近审计事件。这里是 audit-only 视图，不触发恢复、重试、回放或继续执行。`}
    >
      <div className="max-h-96 overflow-y-auto">
        {events.length === 0 ? (
          <EmptyState title="暂无审计事件" description="本地任务、review record 或治理 API 产生事件后会出现在这里。" />
        ) : (
          <div className="divide-y divide-gray-100">
            {events.map((event) => (
              <div key={event.id} className="px-4 py-3 hover:bg-gray-50">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <StatusBadge status="review" />
                    <span className="break-words text-sm font-medium text-gray-900">{event.eventType}</span>
                    <span className="text-xs text-gray-500">{event.actorType}</span>
                    {event.actorId && <span className="break-all text-xs text-gray-700">({event.actorId})</span>}
                  </div>
                  <span className="shrink-0 text-xs text-gray-400">
                    {new Date(event.createdAt).toLocaleString()}
                  </span>
                </div>
                {event.reason && (
                  <div className="mt-1 break-words text-xs leading-5 text-gray-600">{event.reason}</div>
                )}
                {event.beforeStatus && event.afterStatus && (
                  <div className="mt-1 break-words text-xs text-gray-500">
                    {event.beforeStatus} -&gt; {event.afterStatus}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PanelShell>
  )
}
