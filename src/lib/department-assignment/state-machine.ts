import type { DepartmentAssignmentRecordEvent, DepartmentAssignmentRecordStatus } from './types'
import { FORBIDDEN_DEPARTMENT_ASSIGNMENT_STATES } from './types'

export const DEPARTMENT_ASSIGNMENT_RECORD_STATUSES: readonly DepartmentAssignmentRecordStatus[] = [
  'draft',
  'review',
  'approved_record',
  'rejected',
  'superseded',
  'archived',
]

const transitions: Record<DepartmentAssignmentRecordStatus, Partial<Record<DepartmentAssignmentRecordEvent, DepartmentAssignmentRecordStatus>>> = {
  draft: {
    SUBMIT_REVIEW: 'review',
    ARCHIVE: 'archived',
  },
  review: {
    APPROVE_RECORD: 'approved_record',
    REJECT: 'rejected',
    ARCHIVE: 'archived',
  },
  approved_record: {
    SUPERSEDE: 'superseded',
    ARCHIVE: 'archived',
  },
  rejected: {
    ARCHIVE: 'archived',
  },
  superseded: {
    ARCHIVE: 'archived',
  },
  archived: {},
}

export class InvalidDepartmentAssignmentTransitionError extends Error {
  constructor(
    public readonly currentStatus: string,
    public readonly event: DepartmentAssignmentRecordEvent
  ) {
    super(`Invalid Sprint 21 department assignment transition from "${currentStatus}" via "${event}".`)
    this.name = 'InvalidDepartmentAssignmentTransitionError'
  }
}

export class ForbiddenDepartmentAssignmentStateError extends Error {
  constructor(public readonly state: string) {
    super(`Forbidden Sprint 21 department assignment state "${state}".`)
    this.name = 'ForbiddenDepartmentAssignmentStateError'
  }
}

export function isValidDepartmentAssignmentRecordStatus(status: string): status is DepartmentAssignmentRecordStatus {
  return (DEPARTMENT_ASSIGNMENT_RECORD_STATUSES as readonly string[]).includes(status)
}

export function assertNotForbiddenDepartmentAssignmentState(state: string): void {
  if ((FORBIDDEN_DEPARTMENT_ASSIGNMENT_STATES as readonly string[]).includes(state)) {
    throw new ForbiddenDepartmentAssignmentStateError(state)
  }
}

export function transitionDepartmentAssignmentRecordStatus(
  current: DepartmentAssignmentRecordStatus,
  event: DepartmentAssignmentRecordEvent
): DepartmentAssignmentRecordStatus {
  assertNotForbiddenDepartmentAssignmentState(current)
  const next = transitions[current][event]
  if (!next) throw new InvalidDepartmentAssignmentTransitionError(current, event)
  return next
}

export function canTransitionDepartmentAssignmentRecordStatus(
  current: DepartmentAssignmentRecordStatus,
  event: DepartmentAssignmentRecordEvent
): boolean {
  try {
    transitionDepartmentAssignmentRecordStatus(current, event)
    return true
  } catch {
    return false
  }
}
