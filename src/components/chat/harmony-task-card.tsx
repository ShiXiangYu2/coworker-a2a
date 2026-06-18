import type { HarmonyTaskBundle } from '@/lib/harmony/types'
import type { A2AMessage, ContextPacket, MemoryEntry } from '@/lib/memory/types'
import { sprint5SafetyNote } from '@/lib/memory/types'
import type { ToolCallBundle } from '@/lib/tools/types'
import { sprint11SafetyNote, sprint6SafetyNote } from '@/lib/tools/types'
import { sprint8SafetyNote } from '@/lib/observability/types'
import type { CollaborationSession } from '@/lib/collaboration/types'
import { sprint9SafetyNote } from '@/lib/collaboration/types'
import { sprint10SafetyNote } from '@/lib/production-security/types'

interface HarmonyTaskCardProps {
  bundle: HarmonyTaskBundle | null
  contextPackets?: ContextPacket[]
  memoryEntries?: MemoryEntry[]
  a2aMessages?: A2AMessage[]
  toolCalls?: ToolCallBundle[]
  collaborationSessions?: CollaborationSession[]
  isUpdating?: boolean
  isRunningAgent?: boolean
  isRunningVerification?: boolean
  onApprove?: (confirmationId: string) => void
  onReject?: (confirmationId: string) => void
  onRunAgentAnalysis?: (taskId: string) => void
  onRunVerification?: (targetType: string, targetId: string) => void
}

const safetyCopy =
  'Sprint 3 does not execute agents, tools, commands, file edits, PRs, deploys, deletes, or memory writes.'

export function HarmonyTaskCard({
  bundle,
  contextPackets = [],
  memoryEntries = [],
  a2aMessages = [],
  toolCalls = [],
  collaborationSessions = [],
  isUpdating = false,
  isRunningAgent = false,
  isRunningVerification = false,
  onApprove,
  onReject,
  onRunAgentAnalysis,
  onRunVerification,
}: HarmonyTaskCardProps) {
  if (!bundle) return null

  if (bundle.skippedReason) {
    return (
      <section className="border-b bg-gray-50 px-4 py-3 text-sm text-gray-800">
        <div className="mx-auto max-w-4xl">
          Harmony Task skipped: {bundle.skippedReason}. Normal ChatHub flow continues.
        </div>
      </section>
    )
  }

  if (!bundle.task) return null

  const confirmation = bundle.confirmationArtifact
  const canRunAgentAnalysis =
    bundle.task.status === 'queued' &&
    !!bundle.task.targetAgentId &&
    bundle.task.targetAgentId !== 'kelvin' &&
    !confirmation

  return (
    <section className="border-b bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
      <div className="mx-auto flex max-w-4xl flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">Harmony Task</span>
          <span className="rounded bg-white px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
            {bundle.task.status}
          </span>
          <span className="rounded bg-white px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
            {bundle.task.type}
          </span>
          {bundle.task.targetAgentId && (
            <span className="text-xs text-emerald-700">
              target {bundle.task.targetAgentId}
            </span>
          )}
        </div>

        <div className="font-medium">{bundle.task.title}</div>
        <div className="text-emerald-800">{bundle.task.statusReason}</div>
        <div className="text-xs font-medium text-emerald-700">{safetyCopy}</div>
        <div className="text-xs font-medium text-sky-700">
          Sprint 4 only produces structured analysis and does not execute tools, commands, file edits, PRs, deploys, deletes, or memory writes.
        </div>
        <div className="text-xs font-medium text-indigo-700">{sprint5SafetyNote}</div>
        <div className="text-xs font-medium text-violet-700">{sprint6SafetyNote}</div>
        <div className="text-xs font-medium text-amber-700">
          Sprint 7 records verification checks, findings, and quality gate recommendations only. It does not execute tools, call external APIs, modify files, create PRs, deploy, delete, send A2A messages, approve memory, or automatically change task state.
        </div>
        <div className="text-xs font-medium text-stone-700">{sprint8SafetyNote}</div>
        <div className="text-xs font-medium text-teal-700">{sprint9SafetyNote}</div>
        <div className="text-xs font-medium text-slate-700">{sprint10SafetyNote}</div>
        <div className="text-xs font-medium text-rose-700">{sprint11SafetyNote}</div>

        <div className="grid gap-2 rounded-md border border-stone-200 bg-white p-2 text-xs text-stone-900 sm:grid-cols-3">
          <a className="font-medium text-stone-700 hover:text-stone-950" href={`/api/audit/tasks/${bundle.task.id}`} target="_blank" rel="noreferrer">
            View Audit
          </a>
          <a className="font-medium text-stone-700 hover:text-stone-950" href={`/api/observability/resources/task/${bundle.task.id}/timeline`} target="_blank" rel="noreferrer">
            Timeline
          </a>
          <a className="font-medium text-stone-700 hover:text-stone-950" href={`/api/recovery-points?resourceType=task&resourceId=${bundle.task.id}`} target="_blank" rel="noreferrer">
            Recovery Points
          </a>
          <a className="font-medium text-stone-700 hover:text-stone-950" href={`/api/failures?resourceType=task&resourceId=${bundle.task.id}`} target="_blank" rel="noreferrer">
            Failures
          </a>
          <a className="font-medium text-stone-700 hover:text-stone-950" href={`/api/resume-tokens?resourceType=task&resourceId=${bundle.task.id}`} target="_blank" rel="noreferrer">
            Resume View Tokens
          </a>
          <a className="font-medium text-stone-700 hover:text-stone-950" href={`/api/run-journals?runType=task&runId=${bundle.task.id}`} target="_blank" rel="noreferrer">
            Run Journal
          </a>
          <a className="font-medium text-stone-700 hover:text-stone-950" href="/api/release-readiness" target="_blank" rel="noreferrer">
            Release Readiness
          </a>
          <a className="font-medium text-stone-700 hover:text-stone-950" href="/api/regression-gates" target="_blank" rel="noreferrer">
            Regression Gate
          </a>
          <a className="font-medium text-stone-700 hover:text-stone-950" href={`/api/harmony/tasks/${bundle.task.id}/tool-executions`} target="_blank" rel="noreferrer">
            Tool Executions
          </a>
        </div>

        {(contextPackets.length > 0 || memoryEntries.length > 0 || a2aMessages.length > 0 || toolCalls.length > 0 || collaborationSessions.length > 0) && (
          <div className="grid gap-2 rounded-md border border-emerald-200 bg-white p-2 text-xs text-emerald-900 sm:grid-cols-5">
            <div>
              <div className="font-semibold">ContextPacket</div>
              <div>{contextPackets.length} linked</div>
            </div>
            <div>
              <div className="font-semibold">Memory candidates</div>
              <div>{memoryEntries.length} local records</div>
            </div>
            <div>
              <div className="font-semibold">A2A drafts</div>
              <div>{a2aMessages.length} local records</div>
            </div>
            <div>
              <div className="font-semibold">Tool proposals</div>
              <div>{toolCalls.length} local records</div>
            </div>
            <div>
              <div className="font-semibold">Collaboration</div>
              <div>{collaborationSessions.length} local records</div>
            </div>
          </div>
        )}

        {canRunAgentAnalysis && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isRunningAgent}
              onClick={() => onRunAgentAnalysis?.(bundle.task!.id)}
              className="rounded-md bg-sky-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRunningAgent ? 'Running Agent Analysis...' : 'Run Agent Analysis'}
            </button>
            <button
              type="button"
              disabled={isRunningVerification}
              onClick={() => onRunVerification?.('harmony_task', bundle.task!.id)}
              className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRunningVerification ? 'Running Verification...' : 'Run Verification'}
            </button>
          </div>
        )}

        {!canRunAgentAnalysis && (
          <div>
            <button
              type="button"
              disabled={isRunningVerification}
              onClick={() => onRunVerification?.('harmony_task', bundle.task!.id)}
              className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRunningVerification ? 'Running Verification...' : 'Run Verification'}
            </button>
          </div>
        )}

        {confirmation && confirmation.status === 'pending' && (
          <div className="mt-2 rounded-md border border-red-200 bg-white p-3 text-red-900">
            <div className="font-semibold">Kelvin confirmation required</div>
            <div className="mt-1 text-xs">{confirmation.reason}</div>
            <div className="mt-2 text-xs font-medium">
              Approval only moves this task to queued. It will not execute side effects.
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => onApprove?.(confirmation.id)}
                className="rounded-md bg-red-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Approve queue only
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => onReject?.(confirmation.id)}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-800 transition-colors hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reject and block
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
