import { sprint12SafetyNote, type FileChangeProposal } from '@/lib/file-git-pr/types'
import type { ToolCallBundle } from '@/lib/tools/types'

interface FileGitPrCardProps {
  proposals: FileChangeProposal[]
  agentRunId?: string
  toolCalls?: ToolCallBundle[]
  isCreating?: boolean
  onCreateFromAgentResult?: (agentRunId: string) => void
  onCreateFromToolResult?: (toolRunId: string) => void
  onCreateFromToolExecutionReceipt?: (receiptId: string) => void
}

export function FileGitPrCard({
  proposals,
  agentRunId,
  toolCalls = [],
  isCreating = false,
  onCreateFromAgentResult,
  onCreateFromToolResult,
  onCreateFromToolExecutionReceipt,
}: FileGitPrCardProps) {
  const latestToolRun = toolCalls.flatMap((bundle) => bundle.toolRuns)[0]
  const latestReceipt = toolCalls.flatMap((bundle) => bundle.executionReceipts ?? [])[0]

  if (!agentRunId && !latestToolRun && !latestReceipt && proposals.length === 0) {
    return null
  }

  return (
    <section className="border-b bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
      <div className="mx-auto flex max-w-4xl flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">File / Git / PR Proposals</span>
          <span className="rounded bg-white px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
            {proposals.length} local records
          </span>
        </div>
        <div className="text-xs font-medium text-emerald-700">{sprint12SafetyNote}</div>

        <div className="flex flex-wrap gap-2">
          {agentRunId && (
            <button
              type="button"
              disabled={isCreating}
              onClick={() => onCreateFromAgentResult?.(agentRunId)}
              className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Create Change Proposal
            </button>
          )}
          {latestToolRun && (
            <button
              type="button"
              disabled={isCreating}
              onClick={() => onCreateFromToolResult?.(latestToolRun.id)}
              className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Create Change Proposal From ToolResult
            </button>
          )}
          {latestReceipt && (
            <button
              type="button"
              disabled={isCreating}
              onClick={() => onCreateFromToolExecutionReceipt?.(latestReceipt.id)}
              className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Create Change Proposal From Receipt
            </button>
          )}
          <a
            href="/api/file-change-proposals"
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-emerald-900 ring-1 ring-emerald-200 hover:bg-emerald-100"
          >
            View Change Proposal
          </a>
          <a
            href="/api/patch-drafts"
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-emerald-900 ring-1 ring-emerald-200 hover:bg-emerald-100"
          >
            View Patch Draft
          </a>
          <a
            href="/api/git-change-plans"
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-emerald-900 ring-1 ring-emerald-200 hover:bg-emerald-100"
          >
            View Git Plan
          </a>
          <a
            href="/api/pull-request-plans"
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-emerald-900 ring-1 ring-emerald-200 hover:bg-emerald-100"
          >
            View PR Plan
          </a>
          <a
            href="/api/review-patch-records"
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-emerald-900 ring-1 ring-emerald-200 hover:bg-emerald-100"
          >
            Submit Proposal Review
          </a>
          <a
            href="/api/audit/events"
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-emerald-900 ring-1 ring-emerald-200 hover:bg-emerald-100"
          >
            View Audit
          </a>
          <a
            href="/api/observability/events"
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-emerald-900 ring-1 ring-emerald-200 hover:bg-emerald-100"
          >
            View Timeline
          </a>
        </div>

        {proposals.length > 0 && (
          <div className="grid gap-2">
            {proposals.map((proposal) => (
              <div key={proposal.id} className="rounded-md border border-emerald-200 bg-white p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{proposal.title}</span>
                  <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                    {proposal.status}
                  </span>
                  <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                    {proposal.sourceType}
                  </span>
                </div>
                <div className="mt-1 text-xs text-emerald-800">{proposal.summary}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
