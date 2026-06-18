/**
 * Workflow Orchestration State Machine
 *
 * Defines allowed transitions for WorkflowProposal, WorkflowStepRecord,
 * WorkflowReviewRecord, and WorkflowReadinessAssessment.
 *
 * Safety: No execution states. No runtime transitions.
 */

import type { WorkflowEvent, WorkflowStatus, WorkflowReviewStatus } from './types'
import { FORBIDDEN_WORKFLOW_STATES } from './types'

// ─── Workflow state transitions (proposal / step / readiness) ──────────

const workflowTransitions = new Map<string, WorkflowStatus>([
  ['proposal:DRAFT', 'draft'],
  ['proposal:ARCHIVE', 'archived'],
  ['draft:SUBMIT_REVIEW', 'review'],
  ['draft:SUPERSEDE', 'superseded'],
  ['draft:ARCHIVE', 'archived'],
  ['review:APPROVE_RECORD', 'approved_record'],
  ['review:REJECT', 'rejected'],
  ['review:SUPERSEDE', 'superseded'],
  ['review:ARCHIVE', 'archived'],
  ['approved_record:ARCHIVE', 'archived'],
  ['rejected:ARCHIVE', 'archived'],
  ['superseded:ARCHIVE', 'archived'],
])

// ─── Review record transitions (subset: no proposal/superseded) ────────

const reviewTransitions = new Map<string, WorkflowReviewStatus>([
  ['draft:SUBMIT_REVIEW', 'review'],
  ['draft:ARCHIVE', 'archived'],
  ['review:APPROVE_RECORD', 'approved_record'],
  ['review:REJECT', 'rejected'],
  ['review:ARCHIVE', 'archived'],
  ['approved_record:ARCHIVE', 'archived'],
  ['rejected:ARCHIVE', 'archived'],
])

// ─── Errors ────────────────────────────────────────────────────────────

export class InvalidWorkflowTransitionError extends Error {
  constructor(
    public readonly currentStatus: string,
    public readonly event: WorkflowEvent
  ) {
    super(`Invalid Workflow transition: ${currentStatus} -> ${event}`)
    this.name = 'InvalidWorkflowTransitionError'
  }
}

export class ForbiddenWorkflowStateError extends Error {
  constructor(public readonly state: string) {
    super(`Forbidden workflow state: "${state}". Must not be one of: ${FORBIDDEN_WORKFLOW_STATES.join(', ')}`)
    this.name = 'ForbiddenWorkflowStateError'
  }
}

// ─── Transition functions ──────────────────────────────────────────────

export function transitionWorkflow(
  currentStatus: WorkflowStatus | undefined,
  event: WorkflowEvent
): WorkflowStatus {
  const from = currentStatus ?? 'proposal'
  assertNotForbidden(from)
  const next = workflowTransitions.get(`${from}:${event}`)
  if (!next) {
    throw new InvalidWorkflowTransitionError(from, event)
  }
  return next
}

export function canTransitionWorkflow(
  currentStatus: WorkflowStatus | undefined,
  event: WorkflowEvent
): boolean {
  try {
    transitionWorkflow(currentStatus, event)
    return true
  } catch {
    return false
  }
}

export function transitionWorkflowReview(
  currentStatus: WorkflowReviewStatus | undefined,
  event: WorkflowEvent
): WorkflowReviewStatus {
  const from = currentStatus ?? 'draft'
  assertNotForbidden(from)
  const next = reviewTransitions.get(`${from}:${event}`)
  if (!next) {
    throw new InvalidWorkflowTransitionError(from, event)
  }
  return next
}

// ─── State validators ──────────────────────────────────────────────────

export function assertNotForbidden(state: string): void {
  if ((FORBIDDEN_WORKFLOW_STATES as readonly string[]).includes(state)) {
    throw new ForbiddenWorkflowStateError(state)
  }
}

export function isValidWorkflowStatus(status: string): status is WorkflowStatus {
  return (
    status === 'proposal' ||
    status === 'draft' ||
    status === 'review' ||
    status === 'approved_record' ||
    status === 'rejected' ||
    status === 'superseded' ||
    status === 'archived'
  )
}

export function isValidReviewStatus(status: string): status is WorkflowReviewStatus {
  return (
    status === 'draft' ||
    status === 'review' ||
    status === 'approved_record' ||
    status === 'rejected' ||
    status === 'archived'
  )
}
