import type { RouteDecision } from '@/lib/agents/types'

const agentLabels: Record<string, string> = {
  kelvin: 'Kelvin / Human Chairman',
  elon: 'Elon / CEO Agent',
  jobs: 'Jobs / Product Agent',
  linus: 'Linus / Engineering Agent',
  turing: 'Turing / Verification Agent',
  bezos: 'Bezos / Customer Agent',
}

interface RouteDecisionCardProps {
  decision: RouteDecision | null
  isCreatingTask?: boolean
  onCreateHarmonyTask?: () => void
}

export function RouteDecisionCard({
  decision,
  isCreatingTask = false,
  onCreateHarmonyTask,
}: RouteDecisionCardProps) {
  if (!decision) return null

  const target = decision.targetAgentId
    ? agentLabels[decision.targetAgentId] ?? decision.targetAgentId
    : 'Normal Chat'

  const canCreateTask =
    decision.decisionType !== 'chat_only' &&
    decision.decisionType !== 'unsupported' &&
    decision.status !== 'unsupported'

  return (
    <section className="border-b bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <div className="mx-auto flex max-w-4xl flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">CEO Router</span>
          <span className="rounded bg-white px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
            {decision.decisionType}
          </span>
          <span className="rounded bg-white px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
            {decision.status}
          </span>
          <span className="text-xs text-amber-700">
            confidence {Math.round(decision.confidence * 100)}%
          </span>
        </div>
        <div>
          <span className="font-medium">Suggested route:</span> {target}
        </div>
        <div className="text-xs font-medium text-amber-700">
          Preview plus Sprint 3 task capture: creating a Harmony Task does not execute agents, tools, commands, file edits, PRs, deploys, or deletes.
        </div>
        <div className="text-xs font-medium text-stone-700">
          Sprint 8 observability is view-only: timelines and audit views do not replay, retry, restore, start agents, run tools, dispatch A2A, or change task state.
        </div>
        <div className="text-amber-800">{decision.reason}</div>
        {decision.matchedSignals.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {decision.matchedSignals.map((signal) => (
              <span
                key={signal}
                className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800"
              >
                {signal}
              </span>
            ))}
          </div>
        )}
        {decision.requiresHumanConfirmation && (
          <div className="font-medium text-red-700">
            Kelvin confirmation is required. Sprint 3 approval only queues the task.
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {canCreateTask && (
            <button
              type="button"
              disabled={isCreatingTask}
              onClick={onCreateHarmonyTask}
              className="rounded-md bg-amber-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreatingTask ? 'Creating Harmony Task...' : 'Create Harmony Task'}
            </button>
          )}
          <a
            href={`/api/observability/resources/route_decision/${encodeURIComponent(`${decision.decisionType}:${decision.status}`)}/timeline`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200 transition-colors hover:bg-amber-100"
          >
            View Timeline
          </a>
        </div>
      </div>
    </section>
  )
}
