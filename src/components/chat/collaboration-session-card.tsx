import type { CollaborationSession } from '@/lib/collaboration/types'
import { sprint9SafetyNote } from '@/lib/collaboration/types'
import type { A2AMessage } from '@/lib/memory/types'
import { sprint10SafetyNote } from '@/lib/production-security/types'

interface CollaborationSessionCardProps {
  sessions: CollaborationSession[]
  a2aMessages?: A2AMessage[]
  isCreating?: boolean
  onCreateFromA2AMessage?: (a2aMessageId: string) => void
}

export function CollaborationSessionCard({
  sessions,
  a2aMessages = [],
  isCreating = false,
  onCreateFromA2AMessage,
}: CollaborationSessionCardProps) {
  const approvedMessages = a2aMessages.filter((message) => message.status === 'approved_record')
  if (sessions.length === 0 && approvedMessages.length === 0) return null

  return (
    <section className="border-b bg-teal-50 px-4 py-3 text-sm text-teal-950">
      <div className="mx-auto flex max-w-4xl flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">Multi-Agent Collaboration</span>
          <span className="rounded bg-white px-2 py-0.5 text-xs font-medium text-teal-800 ring-1 ring-teal-200">
            {sessions.length} local records
          </span>
        </div>
        <div className="text-xs font-medium text-teal-700">{sprint9SafetyNote}</div>
        <div className="text-xs font-medium text-slate-700">{sprint10SafetyNote}</div>

        {approvedMessages.length > 0 && (
          <div className="rounded-md border border-teal-200 bg-white p-2">
            <div className="text-xs font-semibold text-teal-800">Approved A2A records</div>
            <div className="mt-2 flex flex-col gap-2">
              {approvedMessages.map((message) => (
                <div key={message.id} className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{message.subject}</div>
                    <div className="text-xs text-teal-700">
                      {message.fromAgentId} to {message.toAgentId}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isCreating}
                    onClick={() => onCreateFromA2AMessage?.(message.id)}
                    className="rounded-md bg-teal-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isCreating ? 'Creating Record...' : 'Create Collaboration Session'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {sessions.length > 0 && (
          <div className="grid gap-2">
            {sessions.map((session) => (
              <div key={session.id} className="rounded-md border border-teal-200 bg-white p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{session.objective}</span>
                  <span className="rounded bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800">
                    {session.status}
                  </span>
                  <span className="rounded bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800">
                    {session.riskLevel}
                  </span>
                </div>
                {session.summary && <div className="mt-1 text-xs text-teal-800">{session.summary}</div>}
                <div className="mt-2 grid gap-1 text-xs text-teal-700 sm:grid-cols-3">
                  <a href={`/api/collaboration-sessions/${session.id}`} target="_blank" rel="noreferrer" className="font-medium hover:text-teal-950">
                    View Record
                  </a>
                  <a href={`/api/collaboration-sessions/${session.id}/threads`} target="_blank" rel="noreferrer" className="font-medium hover:text-teal-950">
                    View Threads
                  </a>
                  <a href={`/api/observability/resources/collaboration_session/${session.id}/timeline`} target="_blank" rel="noreferrer" className="font-medium hover:text-teal-950">
                    View Timeline
                  </a>
                  <a href="/api/security/effective-policy" target="_blank" rel="noreferrer" className="font-medium hover:text-teal-950">
                    View Permission Boundary
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
