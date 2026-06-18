'use client'

import { SPRINT_15_SAFETY_NOTE } from '@/lib/mvp-closure/types'
import type {
  DemoScenarioRecord,
  GovernanceSummaryRecord,
  MVPReadinessRecord,
  MVPReviewRecord,
} from '@/lib/mvp-closure/types'
import type { WorkflowProposal } from '@/lib/workflow/types'

interface MVPClosureCardProps {
  readinessRecord: MVPReadinessRecord | null
  demoScenarios?: DemoScenarioRecord[]
  governanceSummaries?: GovernanceSummaryRecord[]
  reviews?: MVPReviewRecord[]
  workflowProposal?: WorkflowProposal | null
  isCreating?: boolean
  onCreateReadiness?: () => void
  onCreateDemoScenario?: () => void
  onCreateGovernanceSummary?: () => void
  onSubmitReview?: (recordId: string) => void
  onApproveRecord?: (recordId: string) => void
  onRejectRecord?: (recordId: string) => void
  onArchiveRecord?: (recordId: string) => void
}

const statusColors: Record<string, string> = {
  draft: 'bg-blue-100 text-blue-800',
  review: 'bg-purple-100 text-purple-800',
  approved_record: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  archived: 'bg-gray-50 text-gray-500',
}

export function MVPClosureCard({
  readinessRecord,
  demoScenarios = [],
  governanceSummaries = [],
  reviews = [],
  workflowProposal,
  isCreating = false,
  onCreateReadiness,
  onCreateDemoScenario,
  onCreateGovernanceSummary,
  onSubmitReview,
  onApproveRecord,
  onRejectRecord,
  onArchiveRecord,
}: MVPClosureCardProps) {
  if (!readinessRecord && !workflowProposal) return null

  return (
    <section className="border-b bg-slate-50 px-4 py-3 text-sm text-slate-950">
      <div className="mx-auto flex max-w-4xl flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">MVP Closure</span>
          {readinessRecord && (
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusColors[readinessRecord.status] ?? 'bg-gray-100 text-gray-700'}`}>
              {readinessRecord.status}
            </span>
          )}
          <span className="rounded bg-white px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
            Sprint 15
          </span>
        </div>

        {readinessRecord ? (
          <div>
            <p className="font-medium">{readinessRecord.title}</p>
            <p className="text-xs text-slate-700">{readinessRecord.summary}</p>
          </div>
        ) : (
          <p className="text-xs font-medium text-slate-700">
            Create MVP readiness records from existing local evidence only.
          </p>
        )}

        {readinessRecord && (
          <div className="flex flex-wrap gap-2 text-xs text-slate-600">
            <span>Scope: {readinessRecord.readinessScope}</span>
            <span>/</span>
            <span>Recommendation: {readinessRecord.recommendation}</span>
            <span>/</span>
            <span>Correlation: {readinessRecord.correlationId.slice(0, 12)}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {workflowProposal && onCreateReadiness && (
            <button type="button" onClick={onCreateReadiness} disabled={isCreating} className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50">
              Create MVP Readiness Record
            </button>
          )}
          {onCreateDemoScenario && (
            <button type="button" onClick={onCreateDemoScenario} disabled={isCreating} className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50">
              View Demo Scenario
            </button>
          )}
          {onCreateGovernanceSummary && (
            <button type="button" onClick={onCreateGovernanceSummary} disabled={isCreating} className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50">
              View Governance Summary
            </button>
          )}
          <a href="/api/mvp-readiness-records" target="_blank" rel="noreferrer" className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-slate-800 ring-1 ring-slate-200 hover:bg-slate-100">
            View MVP Readiness
          </a>
          <a href="/api/demo-scenario-records" target="_blank" rel="noreferrer" className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-slate-800 ring-1 ring-slate-200 hover:bg-slate-100">
            View Demo Scenario
          </a>
          <a href="/api/governance-summary-records" target="_blank" rel="noreferrer" className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-slate-800 ring-1 ring-slate-200 hover:bg-slate-100">
            View Governance Summary
          </a>
          <a href="/api/observability/events" target="_blank" rel="noreferrer" className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-slate-800 ring-1 ring-slate-200 hover:bg-slate-100">
            View Timeline
          </a>
          <a href="/api/audit/events" target="_blank" rel="noreferrer" className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-slate-800 ring-1 ring-slate-200 hover:bg-slate-100">
            View Audit
          </a>
        </div>

        {readinessRecord && (
          <div className="flex flex-wrap gap-2">
            {readinessRecord.status === 'draft' && onSubmitReview && (
              <button type="button" onClick={() => onSubmitReview(readinessRecord.id)} disabled={isCreating} className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50">
                Submit MVP Review
              </button>
            )}
            {readinessRecord.status === 'review' && onApproveRecord && (
              <button type="button" onClick={() => onApproveRecord(readinessRecord.id)} disabled={isCreating} className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50">
                Approve MVP Record
              </button>
            )}
            {readinessRecord.status === 'review' && onRejectRecord && (
              <button type="button" onClick={() => onRejectRecord(readinessRecord.id)} disabled={isCreating} className="rounded-md bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50">
                Reject MVP Record
              </button>
            )}
            {readinessRecord.status !== 'archived' && onArchiveRecord && (
              <button type="button" onClick={() => onArchiveRecord(readinessRecord.id)} disabled={isCreating} className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-slate-800 ring-1 ring-slate-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50">
                Archive MVP Record
              </button>
            )}
          </div>
        )}

        {(demoScenarios.length > 0 || governanceSummaries.length > 0 || reviews.length > 0) && (
          <div className="grid gap-1 text-xs text-slate-700">
            {demoScenarios.length > 0 && <p>Demo scenarios: {demoScenarios.length}</p>}
            {governanceSummaries.length > 0 && <p>Governance summaries: {governanceSummaries.length}</p>}
            {reviews.length > 0 && <p>MVP reviews: {reviews.length}</p>}
          </div>
        )}

        <p className="text-xs font-medium text-slate-600">{SPRINT_15_SAFETY_NOTE}</p>
      </div>
    </section>
  )
}

