import {
  sprint13SafetyNote,
  type ExternalActionProposal,
} from '@/lib/external-mcp-governance/types'
import type { FileChangeProposal } from '@/lib/file-git-pr/types'
import type { ToolCallBundle } from '@/lib/tools/types'

interface ExternalMcpGovernanceCardProps {
  proposals: ExternalActionProposal[]
  agentRunId?: string
  toolCalls?: ToolCallBundle[]
  fileChangeProposals?: FileChangeProposal[]
  isCreating?: boolean
  onCreateFromAgentResult?: (agentRunId: string) => void
  onCreateFromToolResult?: (toolRunId: string) => void
  onCreateFromToolExecutionReceipt?: (receiptId: string) => void
  onCreateFromFileChangeProposal?: (proposalId: string) => void
  onAssessRisk?: (proposalId: string) => void
  onApproveRecord?: (proposalId: string) => void
  onRejectRecord?: (proposalId: string) => void
}

export function ExternalMcpGovernanceCard({
  proposals,
  agentRunId,
  toolCalls = [],
  fileChangeProposals = [],
  isCreating = false,
  onCreateFromAgentResult,
  onCreateFromToolResult,
  onCreateFromToolExecutionReceipt,
  onCreateFromFileChangeProposal,
  onAssessRisk,
  onApproveRecord,
  onRejectRecord,
}: ExternalMcpGovernanceCardProps) {
  const latestToolRun = toolCalls.flatMap((bundle) => bundle.toolRuns)[0]
  const latestReceipt = toolCalls.flatMap((bundle) => bundle.executionReceipts ?? [])[0]
  const latestFileProposal = fileChangeProposals[0]

  if (!agentRunId && !latestToolRun && !latestReceipt && !latestFileProposal && proposals.length === 0) {
    return null
  }

  return (
    <section className="border-b bg-cyan-50 px-4 py-3 text-sm text-cyan-950">
      <div className="mx-auto flex max-w-4xl flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">External / MCP Governance</span>
          <span className="rounded bg-white px-2 py-0.5 text-xs font-medium text-cyan-800 ring-1 ring-cyan-200">
            {proposals.length} local records
          </span>
        </div>
        <div className="text-xs font-medium text-cyan-700">{sprint13SafetyNote}</div>

        <div className="flex flex-wrap gap-2">
          {agentRunId && (
            <button
              type="button"
              disabled={isCreating}
              onClick={() => onCreateFromAgentResult?.(agentRunId)}
              className="rounded-md bg-cyan-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Create External Proposal
            </button>
          )}
          {latestToolRun && (
            <button
              type="button"
              disabled={isCreating}
              onClick={() => onCreateFromToolResult?.(latestToolRun.id)}
              className="rounded-md bg-cyan-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Create External Proposal From ToolResult
            </button>
          )}
          {latestReceipt && (
            <button
              type="button"
              disabled={isCreating}
              onClick={() => onCreateFromToolExecutionReceipt?.(latestReceipt.id)}
              className="rounded-md bg-cyan-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Create External Proposal From Receipt
            </button>
          )}
          {latestFileProposal && (
            <button
              type="button"
              disabled={isCreating}
              onClick={() => onCreateFromFileChangeProposal?.(latestFileProposal.id)}
              className="rounded-md bg-cyan-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Create External Proposal From Change Proposal
            </button>
          )}
          <a href="/api/external-action-proposals" target="_blank" rel="noreferrer" className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-cyan-900 ring-1 ring-cyan-200 hover:bg-cyan-100">
            View External Proposal
          </a>
          <a href="/api/external-integration-profiles" target="_blank" rel="noreferrer" className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-cyan-900 ring-1 ring-cyan-200 hover:bg-cyan-100">
            View Integration Profile
          </a>
          <a href="/api/mcp-connection-profiles" target="_blank" rel="noreferrer" className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-cyan-900 ring-1 ring-cyan-200 hover:bg-cyan-100">
            View MCP Profile
          </a>
          <a href="/api/integration-risk-assessments" target="_blank" rel="noreferrer" className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-cyan-900 ring-1 ring-cyan-200 hover:bg-cyan-100">
            View Risk Assessment
          </a>
          <a href="/api/external-action-review-records" target="_blank" rel="noreferrer" className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-cyan-900 ring-1 ring-cyan-200 hover:bg-cyan-100">
            Submit External Review
          </a>
          <a href="/api/integration-audit-policy" target="_blank" rel="noreferrer" className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-cyan-900 ring-1 ring-cyan-200 hover:bg-cyan-100">
            View Integration Audit Policy
          </a>
          <a href="/api/audit/events" target="_blank" rel="noreferrer" className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-cyan-900 ring-1 ring-cyan-200 hover:bg-cyan-100">
            View Audit
          </a>
          <a href="/api/observability/events" target="_blank" rel="noreferrer" className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-cyan-900 ring-1 ring-cyan-200 hover:bg-cyan-100">
            View Timeline
          </a>
        </div>

        {proposals.length > 0 && (
          <div className="grid gap-2">
            {proposals.map((proposal) => (
              <div key={proposal.id} className="rounded-md border border-cyan-200 bg-white p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{proposal.title}</span>
                  <span className="rounded bg-cyan-50 px-2 py-0.5 text-xs font-medium text-cyan-800">
                    {proposal.status}
                  </span>
                  <span className="rounded bg-cyan-50 px-2 py-0.5 text-xs font-medium text-cyan-800">
                    {proposal.sourceKind}
                  </span>
                </div>
                <div className="mt-1 text-xs text-cyan-800">{proposal.summary}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isCreating}
                    onClick={() => onAssessRisk?.(proposal.id)}
                    className="rounded-md bg-cyan-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Assess Integration Risk
                  </button>
                  {proposal.status === 'review' && (
                    <>
                      <button
                        type="button"
                        disabled={isCreating}
                        onClick={() => onApproveRecord?.(proposal.id)}
                        className="rounded-md bg-cyan-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Approve External Record
                      </button>
                      <button
                        type="button"
                        disabled={isCreating}
                        onClick={() => onRejectRecord?.(proposal.id)}
                        className="rounded-md bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Reject External Record
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
