import type { DepartmentRecordEvent, DepartmentRecordStatus } from './types'
import { FORBIDDEN_DEPARTMENT_STATES } from './types'

export const DEPARTMENT_RECORD_STATUSES: readonly DepartmentRecordStatus[] = [
  'draft',
  'review',
  'approved_record',
  'rejected',
  'superseded',
  'archived',
]

const transitions: Record<DepartmentRecordStatus, Partial<Record<DepartmentRecordEvent, DepartmentRecordStatus>>> = {
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

export class InvalidDepartmentTransitionError extends Error {
  constructor(
    public readonly currentStatus: string,
    public readonly event: DepartmentRecordEvent
  ) {
    super(`Invalid Sprint 18 department transition from "${currentStatus}" via "${event}".`)
    this.name = 'InvalidDepartmentTransitionError'
  }
}

export class ForbiddenDepartmentStateError extends Error {
  constructor(public readonly state: string) {
    super(`Forbidden Sprint 18 department state "${state}".`)
    this.name = 'ForbiddenDepartmentStateError'
  }
}

export function isValidDepartmentRecordStatus(status: string): status is DepartmentRecordStatus {
  return (DEPARTMENT_RECORD_STATUSES as readonly string[]).includes(status)
}

export function assertNotForbiddenDepartmentState(state: string): void {
  if ((FORBIDDEN_DEPARTMENT_STATES as readonly string[]).includes(state)) {
    throw new ForbiddenDepartmentStateError(state)
  }
}

export function transitionDepartmentRecordStatus(
  current: DepartmentRecordStatus,
  event: DepartmentRecordEvent
): DepartmentRecordStatus {
  assertNotForbiddenDepartmentState(current)
  const next = transitions[current][event]
  if (!next) throw new InvalidDepartmentTransitionError(current, event)
  return next
}

export function canTransitionDepartmentRecordStatus(
  current: DepartmentRecordStatus,
  event: DepartmentRecordEvent
): boolean {
  try {
    transitionDepartmentRecordStatus(current, event)
    return true
  } catch {
    return false
  }
}

