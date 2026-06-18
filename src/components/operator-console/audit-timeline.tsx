'use client'

import { useState, useEffect } from 'react'

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

const eventTypeColors: Record<string, string> = {
  task_created: 'bg-blue-100 text-blue-800',
  task_status_changed: 'bg-yellow-100 text-yellow-800',
  agent_run_started: 'bg-purple-100 text-purple-800',
  agent_run_completed: 'bg-green-100 text-green-800',
  confirmation_approved: 'bg-green-100 text-green-800',
  confirmation_rejected: 'bg-red-100 text-red-800',
  tool_call_proposed: 'bg-orange-100 text-orange-800',
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
      // silent
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
    return (
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="animate-pulse text-sm text-gray-500">Loading audit events...</div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <div className="border-b px-4 py-3">
        <h2 className="text-lg font-semibold text-gray-900">操作证据</h2>
        <p className="text-xs text-gray-500">{events.length} 条最近证据</p>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {events.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            暂无操作证据记录
          </div>
        ) : (
          <div className="divide-y">
            {events.map((event) => (
              <div key={event.id} className="px-4 py-3 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${eventTypeColors[event.eventType] ?? 'bg-gray-100 text-gray-600'}`}>
                      {event.eventType}
                    </span>
                    <span className="text-xs text-gray-500">{event.actorType}</span>
                    {event.actorId && (
                      <span className="text-xs text-gray-700">({event.actorId})</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(event.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                {event.reason && (
                  <div className="mt-1 text-xs text-gray-600">{event.reason}</div>
                )}
                {event.beforeStatus && event.afterStatus && (
                  <div className="mt-1 text-xs text-gray-500">
                    {event.beforeStatus} → {event.afterStatus}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
