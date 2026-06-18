import type { DepartmentMappingRecordEvent, DepartmentMappingRecordStatus } from './types'
import { FORBIDDEN_DEPARTMENT_MAPPING_STATES } from './types'

export const DEPARTMENT_MAPPING_RECORD_STATUSES: readonly DepartmentMappingRecordStatus[] = [
  'draft',
  'review',
  'approved_record',
  'rejected',
  'superseded',
  'archived',
]

const transitions: Record<DepartmentMappingRecordStatus, Partial<Record<DepartmentMappingRecordEvent, DepartmentMappingRecordStatus>>> = {
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

export class InvalidDepartmentMappingTransitionError extends Error {
  constructor(
    public readonly currentStatus: string,
    public readonly event: DepartmentMappingRecordEvent
  ) {
    super(`Invalid Sprint 19 department mapping transition from "${currentStatus}" via "${event}".`)
    this.name = 'InvalidDepartmentMappingTransitionError'
  }
}

export class ForbiddenDepartmentMappingStateError extends Error {
  constructor(public readonly state: string) {
    super(`Forbidden Sprint 19 department mapping state "${state}".`)
    this.name = 'ForbiddenDepartmentMappingStateError'
  }
}

export function isValidDepartmentMappingRecordStatus(status: string): status is DepartmentMappingRecordStatus {
  return (DEPARTMENT_MAPPING_RECORD_STATUSES as readonly string[]).includes(status)
}

export function assertNotForbiddenDepartmentMappingState(state: string): void {
  if ((FORBIDDEN_DEPARTMENT_MAPPING_STATES as readonly string[]).includes(state)) {
    throw new ForbiddenDepartmentMappingStateError(state)
  }
}

export function transitionDepartmentMappingRecordStatus(
  current: DepartmentMappingRecordStatus,
  event: DepartmentMappingRecordEvent
): DepartmentMappingRecordStatus {
  assertNotForbiddenDepartmentMappingState(current)
  const next = transitions[current][event]
  if (!next) throw new InvalidDepartmentMappingTransitionError(current, event)
  return next
}

export function canTransitionDepartmentMappingRecordStatus(
  current: DepartmentMappingRecordStatus,
  event: DepartmentMappingRecordEvent
): boolean {
  try {
    transitionDepartmentMappingRecordStatus(current, event)
    return true
  } catch {
    return false
  }
}
