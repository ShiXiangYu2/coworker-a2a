import type {
  A2AThreadEvent,
  A2AThreadStatus,
  A2ATurnEvent,
  A2ATurnStatus,
  CollaborationDecisionEvent,
  CollaborationDecisionStatus,
  CollaborationSessionEvent,
  CollaborationSessionStatus,
  HandoffRequestEvent,
  HandoffRequestStatus,
} from './types'

export class InvalidCollaborationTransitionError extends Error {
  constructor(
    public readonly resource: string,
    public readonly currentStatus: string,
    public readonly event: string
  ) {
    super(`Invalid ${resource} transition: ${currentStatus} -> ${event}`)
    this.name = 'InvalidCollaborationTransitionError'
  }
}

function transition<TStatus extends string, TEvent extends string>(
  label: string,
  transitions: Map<string, TStatus>,
  currentStatus: TStatus,
  event: TEvent
) {
  const next = transitions.get(`${currentStatus}:${event}`)
  if (!next) throw new InvalidCollaborationTransitionError(label, currentStatus, event)
  return next
}

const sessionTransitions = new Map<string, CollaborationSessionStatus>([
  ['draft:SUBMIT_REVIEW', 'queued_for_review'],
  ['draft:OPEN_RECORD', 'active'],
  ['draft:CANCEL', 'cancelled'],
  ['queued_for_review:OPEN_RECORD', 'active'],
  ['queued_for_review:REJECT', 'rejected'],
  ['queued_for_review:CANCEL', 'cancelled'],
  ['active:PAUSE', 'paused'],
  ['active:WAIT_HUMAN', 'waiting_human'],
  ['active:COMPLETE_RECORD', 'completed_record'],
  ['active:BLOCK', 'blocked'],
  ['active:CANCEL', 'cancelled'],
  ['active:SUPERSEDE', 'superseded'],
  ['paused:OPEN_RECORD', 'active'],
  ['paused:CANCEL', 'cancelled'],
  ['waiting_human:OPEN_RECORD', 'active'],
  ['waiting_human:BLOCK', 'blocked'],
  ['completed_record:ARCHIVE', 'archived'],
  ['completed_record:SUPERSEDE', 'superseded'],
  ['superseded:ARCHIVE', 'archived'],
  ['blocked:ARCHIVE', 'archived'],
  ['rejected:ARCHIVE', 'archived'],
  ['cancelled:ARCHIVE', 'archived'],
])

export function transitionCollaborationSession(
  currentStatus: CollaborationSessionStatus,
  event: CollaborationSessionEvent
) {
  return transition('CollaborationSession', sessionTransitions, currentStatus, event)
}

const threadTransitions = new Map<string, A2AThreadStatus>([
  ['draft:OPEN', 'open'],
  ['draft:CANCEL', 'cancelled'],
  ['open:WAIT_HUMAN', 'waiting_human'],
  ['open:CLOSE_RECORD', 'closed_record'],
  ['open:BLOCK', 'blocked'],
  ['open:CANCEL', 'cancelled'],
  ['waiting_human:OPEN', 'open'],
  ['waiting_human:BLOCK', 'blocked'],
  ['closed_record:ARCHIVE', 'archived'],
  ['blocked:ARCHIVE', 'archived'],
  ['cancelled:ARCHIVE', 'archived'],
])

export function transitionA2AThread(currentStatus: A2AThreadStatus, event: A2AThreadEvent) {
  return transition('A2AThread', threadTransitions, currentStatus, event)
}

const turnTransitions = new Map<string, A2ATurnStatus>([
  ['draft:RECORD', 'recorded'],
  ['draft:SUBMIT_REVIEW', 'queued_for_review'],
  ['draft:ARCHIVE', 'archived'],
  ['recorded:SUBMIT_REVIEW', 'queued_for_review'],
  ['recorded:APPROVE_RECORD', 'approved_record'],
  ['queued_for_review:APPROVE_RECORD', 'approved_record'],
  ['queued_for_review:REJECT', 'rejected'],
  ['approved_record:SUPERSEDE', 'superseded'],
  ['approved_record:ARCHIVE', 'archived'],
  ['rejected:ARCHIVE', 'archived'],
  ['superseded:ARCHIVE', 'archived'],
])

export function transitionA2ATurn(currentStatus: A2ATurnStatus, event: A2ATurnEvent) {
  return transition('A2ATurn', turnTransitions, currentStatus, event)
}

const handoffTransitions = new Map<string, HandoffRequestStatus>([
  ['draft:SUBMIT_REVIEW', 'queued_for_review'],
  ['draft:APPROVE_RECORD', 'approved_record'],
  ['draft:CANCEL', 'cancelled'],
  ['queued_for_review:APPROVE_RECORD', 'approved_record'],
  ['queued_for_review:REJECT', 'rejected'],
  ['approved_record:SUPERSEDE', 'superseded'],
  ['approved_record:ARCHIVE', 'archived'],
  ['rejected:ARCHIVE', 'archived'],
  ['cancelled:ARCHIVE', 'archived'],
  ['superseded:ARCHIVE', 'archived'],
])

export function transitionHandoffRequest(currentStatus: HandoffRequestStatus, event: HandoffRequestEvent) {
  return transition('HandoffRequest', handoffTransitions, currentStatus, event)
}

const decisionTransitions = new Map<string, CollaborationDecisionStatus>([
  ['draft:SUBMIT_REVIEW', 'queued_for_review'],
  ['draft:APPROVE_RECORD', 'approved_record'],
  ['draft:ARCHIVE', 'archived'],
  ['queued_for_review:APPROVE_RECORD', 'approved_record'],
  ['queued_for_review:REJECT', 'rejected'],
  ['approved_record:SUPERSEDE', 'superseded'],
  ['approved_record:ARCHIVE', 'archived'],
  ['rejected:ARCHIVE', 'archived'],
  ['superseded:ARCHIVE', 'archived'],
])

export function transitionCollaborationDecision(
  currentStatus: CollaborationDecisionStatus,
  event: CollaborationDecisionEvent
) {
  return transition('CollaborationDecision', decisionTransitions, currentStatus, event)
}

