import type { AgentRunBundle } from '@/lib/agent-runtime/types'
import { agentRuntimeSafetyNote } from '@/lib/agent-runtime/types'
import { sprint5SafetyNote } from '@/lib/memory/types'
import { sprint8SafetyNote } from '@/lib/observability/types'
import { sprint9SafetyNote } from '@/lib/collaboration/types'
import { sprint10SafetyNote } from '@/lib/production-security/types'

interface AgentResultCardProps {
  bundle: AgentRunBundle | null
  isBuildingContext?: boolean
  isCreatingMemory?: boolean
  isDraftingA2A?: boolean
  isProposingTool?: boolean
  isRunningVerification?: boolean
  isCreatingCollaboration?: boolean
  onBuildContextPacket?: (agentRunId: string) => void
  onCreateMemoryCandidate?: (agentRunId: string) => void
  onDraftA2AMessage?: (agentRunId: string) => void
  onProposeToolCall?: (agentRunId: string) => void
  onRunVerification?: (targetType: string, targetId: string) => void
  onCreateCollaborationRecord?: (agentRunId: string) => void
}

export function AgentResultCard({
  bundle,
  isBuildingContext = false,
  isCreatingMemory = false,
  isDraftingA2A = false,
  isProposingTool = false,
  isRunningVerification = false,
  isCreatingCollaboration = false,
  onBuildContextPacket,
  onCreateMemoryCandidate,
  onDraftA2AMessage,
  onProposeToolCall,
  onRunVerification,
  onCreateCollaborationRecord,
}: AgentResultCardProps) {
  const result = bundle?.agentRun.result
  if (!bundle || !result) return null

  const { agentRun } = bundle

  return (
    <section className="border-b bg-sky-50 px-4 py-3 text-sm text-sky-950">
      <div className="mx-auto flex max-w-4xl flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">Agent Analysis</span>
          <span className="rounded bg-white px-2 py-0.5 text-xs font-medium text-sky-800 ring-1 ring-sky-200">
            {agentRun.agentId}
          </span>
          <span className="rounded bg-white px-2 py-0.5 text-xs font-medium text-sky-800 ring-1 ring-sky-200">
            {agentRun.status}
          </span>
          <span className="text-xs text-sky-700">
            confidence {Math.round(result.confidence * 100)}%
          </span>
        </div>

        <div className="font-medium">{result.summary}</div>
        <div className="text-xs font-medium text-sky-700">
          {agentRuntimeSafetyNote}
        </div>
        <div className="text-xs font-medium text-sky-700">
          {sprint5SafetyNote}
        </div>
        <div className="text-xs font-medium text-stone-700">
          {sprint8SafetyNote}
        </div>
        <div className="text-xs font-medium text-teal-700">
          {sprint9SafetyNote}
        </div>
        <div className="text-xs font-medium text-slate-700">
          {sprint10SafetyNote}
        </div>

        {result.findings.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-sky-900">
            {result.findings.map((finding) => (
              <li key={finding}>{finding}</li>
            ))}
          </ul>
        )}

        {result.proposedChanges.length > 0 && (
          <div className="space-y-1">
            {result.proposedChanges.map((change) => (
              <div
                key={`${change.type}-${change.title}`}
                className="rounded-md border border-sky-200 bg-white p-2"
              >
                <div className="text-xs font-semibold uppercase text-sky-700">
                  {change.type} / {change.riskLevel}
                </div>
                <div className="font-medium">{change.title}</div>
                <div className="text-sky-800">{change.description}</div>
              </div>
            ))}
          </div>
        )}

        <div className="text-sky-800">
          <span className="font-medium">Next:</span> {result.next.recommendedAction} -{' '}
          {result.next.reason}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            disabled={isBuildingContext}
            onClick={() => onBuildContextPacket?.(agentRun.id)}
            className="rounded-md bg-sky-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBuildingContext ? 'Building Context Packet...' : 'Build Context Packet'}
          </button>
          <button
            type="button"
            disabled={isCreatingMemory}
            onClick={() => onCreateMemoryCandidate?.(agentRun.id)}
            className="rounded-md bg-sky-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCreatingMemory ? 'Creating Memory Candidate...' : 'Create Memory Candidate'}
          </button>
          <button
            type="button"
            disabled={isDraftingA2A}
            onClick={() => onDraftA2AMessage?.(agentRun.id)}
            className="rounded-md bg-sky-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDraftingA2A ? 'Drafting A2A Message...' : 'Draft A2A Message'}
          </button>
          <button
            type="button"
            disabled={isProposingTool}
            onClick={() => onProposeToolCall?.(agentRun.id)}
            className="rounded-md bg-violet-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isProposingTool ? 'Proposing Tool Call...' : 'Propose Tool Call'}
          </button>
          <button
            type="button"
            disabled={isRunningVerification}
            onClick={() => onRunVerification?.('agent_result', agentRun.id)}
            className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRunningVerification ? 'Running Verification...' : 'Run Verification'}
          </button>
          <button
            type="button"
            disabled={isCreatingCollaboration}
            onClick={() => onCreateCollaborationRecord?.(agentRun.id)}
            className="rounded-md bg-teal-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCreatingCollaboration ? 'Creating Collaboration Record...' : 'Create Collaboration Record'}
          </button>
          <a
            href={`/api/run-journals/by-run/agent_run/${agentRun.id}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-sky-900 ring-1 ring-sky-200 transition-colors hover:bg-sky-100"
          >
            View Run Journal
          </a>
          <a
            href={`/api/observability/resources/agent_run/${agentRun.id}/timeline`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-sky-900 ring-1 ring-sky-200 transition-colors hover:bg-sky-100"
          >
            View Timeline
          </a>
          <a
            href={`/api/agent-profiles/${agentRun.agentId}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-sky-900 ring-1 ring-sky-200 transition-colors hover:bg-sky-100"
          >
            View Agent Profile
          </a>
          <a
            href={`/api/agent-profiles/${agentRun.agentId}/permission-boundary`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-sky-900 ring-1 ring-sky-200 transition-colors hover:bg-sky-100"
          >
            View Permission Boundary
          </a>
        </div>
      </div>
    </section>
  )
}
