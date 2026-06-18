import type { FileGitPrEvent, FileGitPrStatus } from './types'

export class InvalidFileGitPrTransitionError extends Error {
  constructor(
    public readonly currentStatus: string,
    public readonly event: string
  ) {
    super(`Invalid File / Git / PR transition: ${currentStatus} -> ${event}`)
    this.name = 'InvalidFileGitPrTransitionError'
  }
}

const transitions = new Map<string, FileGitPrStatus>([
  ['proposal:DRAFT', 'draft'],
  ['proposal:SUBMIT_REVIEW', 'review'],
  ['proposal:REJECT', 'rejected'],
  ['proposal:SUPERSEDE', 'superseded'],
  ['draft:SUBMIT_REVIEW', 'review'],
  ['draft:REJECT', 'rejected'],
  ['draft:SUPERSEDE', 'superseded'],
  ['review:APPROVE_RECORD', 'approved_record'],
  ['review:REJECT', 'rejected'],
  ['review:SUPERSEDE', 'superseded'],
  ['approved_record:ARCHIVE', 'archived'],
  ['approved_record:SUPERSEDE', 'superseded'],
  ['rejected:ARCHIVE', 'archived'],
  ['superseded:ARCHIVE', 'archived'],
])

export const forbiddenFileGitPrStates = [
  'applied',
  'written',
  'formatted',
  'committed',
  'pushed',
  'merged',
  'pr_created',
  'deployed',
  'deleted',
  'executed',
  'rolled_back',
  'replayed',
  'retried',
  'resumed_execution',
] as const

export function transitionFileGitPrRecord(
  currentStatus: FileGitPrStatus,
  event: FileGitPrEvent
): FileGitPrStatus {
  const next = transitions.get(`${currentStatus}:${event}`)
  if (!next) throw new InvalidFileGitPrTransitionError(currentStatus, event)
  return next
}

export function assertNoForbiddenFileGitPrState(status: string): void {
  if ((forbiddenFileGitPrStates as readonly string[]).includes(status)) {
    throw new Error(`Sprint 12 forbidden execution state: ${status}`)
  }
}
