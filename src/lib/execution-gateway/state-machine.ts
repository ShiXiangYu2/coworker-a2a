import type { ExecutionGatewayRecordEvent, ExecutionGatewayRecordStatus } from './types'
import { FORBIDDEN_EXECUTION_GATEWAY_STATES } from './types'

export const EXECUTION_GATEWAY_RECORD_STATUSES: readonly ExecutionGatewayRecordStatus[] = [
  'draft',
  'review',
  'approved_record',
  'rejected',
  'superseded',
  'archived',
]

const transitions: Record<ExecutionGatewayRecordStatus, Partial<Record<ExecutionGatewayRecordEvent, ExecutionGatewayRecordStatus>>> = {
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

export class InvalidExecutionGatewayTransitionError extends Error {
  constructor(
    public readonly currentStatus: string,
    public readonly event: ExecutionGatewayRecordEvent
  ) {
    super(`Invalid Sprint 20 execution gateway transition from "${currentStatus}" via "${event}".`)
    this.name = 'InvalidExecutionGatewayTransitionError'
  }
}

export class ForbiddenExecutionGatewayStateError extends Error {
  constructor(public readonly state: string) {
    super(`Forbidden Sprint 20 execution gateway state "${state}".`)
    this.name = 'ForbiddenExecutionGatewayStateError'
  }
}

export function isValidExecutionGatewayRecordStatus(status: string): status is ExecutionGatewayRecordStatus {
  return (EXECUTION_GATEWAY_RECORD_STATUSES as readonly string[]).includes(status)
}

export function assertNotForbiddenExecutionGatewayState(state: string): void {
  if ((FORBIDDEN_EXECUTION_GATEWAY_STATES as readonly string[]).includes(state)) {
    throw new ForbiddenExecutionGatewayStateError(state)
  }
}

export function transitionExecutionGatewayRecordStatus(
  current: ExecutionGatewayRecordStatus,
  event: ExecutionGatewayRecordEvent
): ExecutionGatewayRecordStatus {
  assertNotForbiddenExecutionGatewayState(current)
  const next = transitions[current][event]
  if (!next) throw new InvalidExecutionGatewayTransitionError(current, event)
  return next
}

export function canTransitionExecutionGatewayRecordStatus(
  current: ExecutionGatewayRecordStatus,
  event: ExecutionGatewayRecordEvent
): boolean {
  try {
    transitionExecutionGatewayRecordStatus(current, event)
    return true
  } catch {
    return false
  }
}
