'use client'

import { SPRINT_14_SAFETY_NOTE } from '@/lib/workflow/types'
import type {
  WorkflowDependencyGraph,
  WorkflowProposal,
  WorkflowReadinessAssessment,
  WorkflowReviewRecord,
  WorkflowStepRecord,
} from '@/lib/workflow/types'
import type { ExternalActionProposal } from '@/lib/external-mcp-governance/types'
import type { FileChangeProposal } from '@/lib/file-git-pr/types'
import type { ToolCallBundle } from '@/lib/tools/types'

interface WorkflowProposalCardProps {
  proposal: WorkflowProposal | null
  steps?: WorkflowStepRecord[]
  graph?: WorkflowDependencyGraph | null
  reviews?: WorkflowReviewRecord[]
  assessments?: WorkflowReadinessAssessment[]
  agentRunId?: string
  toolCalls?: ToolCallBundle[]
  fileChangeProposals?: FileChangeProposal[]
  externalActionProposals?: ExternalActionProposal[]
  isCreating?: boolean
  onCreateFromAgentRun?: (agentRunId: string) => void
  onCreateFromToolRun?: (toolRunId: string) => void
  onCreateFromToolExecutionReceipt?: (receiptId: string) => void
  onCreateFromFileChangeProposal?: (proposalId: string) => void
  onCreateFromExternalActionProposal?: (proposalId: string) => void
  onCreateStep?: (proposalId: string) => void
  onMoveToDraft?: (proposalId: string) => void
  onAssessReadiness?: (proposalId: string) => void
  onSubmitReview?: (proposalId: string) => void
  onApproveRecord?: (proposalId: string) => void
  onReject?: (proposalId: string) => void
  onArchive?: (proposalId: string) => void
}

const statusColors: Record<string, string> = {
  proposal: 'bg-yellow-100 text-yellow-800',
  draft: 'bg-blue-100 text-blue-800',
  review: 'bg-purple-100 text-purple-800',
  approved_record: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  superseded: 'bg-gray-100 text-gray-800',
  archived: 'bg-gray-50 text-gray-500',
}

const stepKindLabels: Record<string, string> = {
  inspect_record: 'Inspect Record',
  review_record: 'Review Record',
  approve_record: 'Approve Record Intent',
  reject_record: 'Reject Record Intent',
  compare_evidence: 'Compare Evidence',
  assess_risk: 'Assess Risk',
  document_decision: 'Document Decision',
}

const recommendationLabels: Record<string, string> = {
  needs_review: 'Needs Review',
  request_changes: 'Request Changes',
  approve_record: 'Approve Record',
  reject_record: 'Reject Record',
}

export function WorkflowProposalCard({
  proposal,
  steps = [],
  graph = null,
  reviews = [],
  assessments = [],
  agentRunId,
  toolCalls = [],
  fileChangeProposals = [],
  externalActionProposals = [],
  isCreating = false,
  onCreateFromAgentRun,
  onCreateFromToolRun,
  onCreateFromToolExecutionReceipt,
  onCreateFromFileChangeProposal,
  onCreateFromExternalActionProposal,
  onCreateStep,
  onMoveToDraft,
  onAssessReadiness,
  onSubmitReview,
  onApproveRecord,
  onReject,
  onArchive,
}: WorkflowProposalCardProps) {
  const latestToolRun = toolCalls.flatMap((bundle) => bundle.toolRuns)[0]
  const latestReceipt = toolCalls.flatMap((bundle) => bundle.executionReceipts ?? [])[0]
  const latestFileProposal = fileChangeProposals[0]
  const latestExternalProposal = externalActionProposals[0]

  if (!proposal && !agentRunId && !latestToolRun && !latestReceipt && !latestFileProposal && !latestExternalProposal) {
    return null
  }

  return (
    <section className="border-b bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <div className="mx-auto flex max-w-4xl flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">Workflow Proposal</span>
          {proposal && (
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusColors[proposal.status] ?? 'bg-gray-100 text-gray-700'}`}>
              {proposal.status}
            </span>
          )}
          <span className="rounded bg-white px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
            Sprint 14
          </span>
        </div>

        {proposal ? (
          <div>
            <p className="font-medium">{proposal.title}</p>
            <p className="text-xs text-amber-800">{proposal.summary}</p>
          </div>
        ) : (
          <p className="text-xs font-medium text-amber-800">
            Create Workflow Proposal records from existing local evidence only. No workflow or step is executed.
          </p>
        )}

        {proposal && (
          <div className="flex flex-wrap gap-2 text-xs text-amber-700">
            <span>Intent: {proposal.workflowIntent}</span>
            <span>/</span>
            <span>Risk: {proposal.riskLevel}</span>
            <span>/</span>
            <span>Source: {proposal.sourceKind}</span>
            <span>/</span>
            <span>Correlation: {proposal.correlationId.slice(0, 12)}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {agentRunId && (
            <button type="button" onClick={() => onCreateFromAgentRun?.(agentRunId)} disabled={isCreating} className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50">
              Create Workflow Proposal
            </button>
          )}
          {latestToolRun && (
            <button type="button" onClick={() => onCreateFromToolRun?.(latestToolRun.id)} disabled={isCreating} className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50">
              Create Workflow Proposal From ToolRun
            </button>
          )}
          {latestReceipt && (
            <button type="button" onClick={() => onCreateFromToolExecutionReceipt?.(latestReceipt.id)} disabled={isCreating} className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50">
              Create Workflow Proposal From Receipt
            </button>
          )}
          {latestFileProposal && (
            <button type="button" onClick={() => onCreateFromFileChangeProposal?.(latestFileProposal.id)} disabled={isCreating} className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50">
              Create Workflow Proposal From Change Proposal
            </button>
          )}
          {latestExternalProposal && (
            <button type="button" onClick={() => onCreateFromExternalActionProposal?.(latestExternalProposal.id)} disabled={isCreating} className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50">
              Create Workflow Proposal From External Proposal
            </button>
          )}
          <a href="/api/workflow-proposals" target="_blank" rel="noreferrer" className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100">
            View Workflow Proposal
          </a>
          {proposal && (
            <>
              <a href={`/api/workflow-proposals/${proposal.id}/steps`} target="_blank" rel="noreferrer" className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100">
                View Workflow Steps
              </a>
              <a href={`/api/workflow-proposals/${proposal.id}/dependency-graph`} target="_blank" rel="noreferrer" className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100">
                View Dependency Graph
              </a>
              <a href={`/api/workflow-proposals/${proposal.id}/readiness-assessments`} target="_blank" rel="noreferrer" className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100">
                View Readiness Assessment
              </a>
              <a href={`/api/workflow-proposals/${proposal.id}/reviews`} target="_blank" rel="noreferrer" className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100">
                View Workflow Audit
              </a>
            </>
          )}
          <a href="/api/observability/events" target="_blank" rel="noreferrer" className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100">
            View Timeline
          </a>
        </div>

        {proposal && graph && (
          <div className="rounded bg-white px-2 py-1 text-xs text-amber-800">
            Dependency graph: {graph.graphIntegrityStatus} / {graph.nodes.length} nodes / {graph.edges.length} edges
          </div>
        )}

        {proposal && steps.length > 0 && (
          <div className="grid gap-1">
            <p className="text-xs font-medium">Workflow steps ({steps.length})</p>
            {steps.map((step) => (
              <div key={step.id} className="flex flex-wrap items-center gap-2 rounded bg-white px-2 py-1 text-xs">
                <span>#{step.stepIndex}</span>
                <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800">
                  {stepKindLabels[step.stepKind] ?? step.stepKind}
                </span>
                <span className="min-w-0 flex-1 truncate">{step.title}</span>
                <span>{step.status}</span>
              </div>
            ))}
          </div>
        )}

        {proposal && assessments.length > 0 && (
          <div className="grid gap-1">
            <p className="text-xs font-medium">Readiness assessments</p>
            {assessments.map((assessment) => (
              <div key={assessment.id} className="rounded bg-white px-2 py-1 text-xs">
                <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800">
                  {recommendationLabels[assessment.recommendation] ?? assessment.recommendation}
                </span>
                {assessment.riskFindings.length > 0 && (
                  <span className="ml-2 text-amber-700">/ {assessment.riskFindings.length} risk findings</span>
                )}
              </div>
            ))}
          </div>
        )}

        {proposal && reviews.length > 0 && (
          <div className="grid gap-1">
            <p className="text-xs font-medium">Workflow reviews ({reviews.length})</p>
            {reviews.map((review) => (
              <div key={review.id} className="rounded bg-white px-2 py-1 text-xs">
                <span className="font-medium">{review.reviewer}</span>: {review.verdict} / {review.reviewNotes.slice(0, 100)}
              </div>
            ))}
          </div>
        )}

        {proposal && (
          <div className="flex flex-wrap gap-2">
          {proposal.status === 'proposal' && onCreateStep && (
            <button type="button" onClick={() => onCreateStep(proposal.id)} disabled={isCreating} className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50">
              View Workflow Steps
            </button>
          )}
          {proposal.status === 'proposal' && onMoveToDraft && (
            <button type="button" onClick={() => onMoveToDraft(proposal.id)} disabled={isCreating} className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50">
              Draft Workflow Record
            </button>
          )}
          {onAssessReadiness && (
            <button type="button" onClick={() => onAssessReadiness(proposal.id)} disabled={isCreating} className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50">
              Assess Workflow Readiness
            </button>
          )}
          {proposal.status === 'draft' && onSubmitReview && (
            <button type="button" onClick={() => onSubmitReview(proposal.id)} disabled={isCreating} className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50">
              Submit Workflow Review
            </button>
          )}
          {proposal.status === 'review' && onApproveRecord && (
            <button type="button" onClick={() => onApproveRecord(proposal.id)} disabled={isCreating} className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50">
              Approve Workflow Record
            </button>
          )}
          {proposal.status === 'review' && onReject && (
            <button type="button" onClick={() => onReject(proposal.id)} disabled={isCreating} className="rounded-md bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50">
              Reject Workflow Record
            </button>
          )}
          {proposal.status !== 'archived' && onArchive && (
            <button type="button" onClick={() => onArchive(proposal.id)} disabled={isCreating} className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50">
              Archive Workflow Record
            </button>
          )}
          </div>
        )}

        <p className="text-xs font-medium text-amber-700">{SPRINT_14_SAFETY_NOTE}</p>
      </div>
    </section>
  )
}
