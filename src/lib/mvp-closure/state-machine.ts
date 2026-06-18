import type { MVPReadinessEvent, MVPReadinessStatus } from './types'
import { FORBIDDEN_MVP_STATES } from './types'

const transitions = new Map<string, MVPReadinessStatus>([
  ['draft:SUBMIT_REVIEW', 'review'],
  ['draft:ARCHIVE', 'archived'],
  ['review:APPROVE_RECORD', 'approved_record'],
  ['review:REJECT', 'rejected'],
  ['review:ARCHIVE', 'archived'],
  ['approved_record:ARCHIVE', 'archived'],
  ['rejected:ARCHIVE', 'archived'],
])

export class InvalidMVPReadinessTransitionError extends Error {
  constructor(
    public readonly currentStatus: string,
    public readonly event: MVPReadinessEvent
  ) {
    super(`Invalid MVP readiness transition: ${currentStatus} -> ${event}`)
    this.name = 'InvalidMVPReadinessTransitionError'
  }
}

export class ForbiddenMVPStateError extends Error {
  constructor(public readonly state: string) {
    super(`Forbidden MVP readiness state: "${state}"`)
    this.name = 'ForbiddenMVPStateError'
  }
}

export function assertNotForbiddenMVPState(state: string): void {
  if ((FORBIDDEN_MVP_STATES as readonly string[]).includes(state)) {
    throw new ForbiddenMVPStateError(state)
  }
}

export function isValidMVPReadinessStatus(status: string): status is MVPReadinessStatus {
  return (
    status === 'draft' ||
    status === 'review' ||
    status === 'approved_record' ||
    status === 'rejected' ||
    status === 'archived'
  )
}

export function transitionMVPReadiness(
  currentStatus: MVPReadinessStatus | undefined,
  event: MVPReadinessEvent
): MVPReadinessStatus {
  const from = currentStatus ?? 'draft'
  assertNotForbiddenMVPState(from)
  const next = transitions.get(`${from}:${event}`)
  if (!next) {
    throw new InvalidMVPReadinessTransitionError(from, event)
  }
  return next
}

export function canTransitionMVPReadiness(
  currentStatus: MVPReadinessStatus | undefined,
  event: MVPReadinessEvent
): boolean {
  try {
    transitionMVPReadiness(currentStatus, event)
    return true
  } catch {
    return false
  }
}

