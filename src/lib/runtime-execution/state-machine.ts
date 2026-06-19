import type {
  RuntimeDispatchJobEvent,
  RuntimeDispatchJobStatus,
  RuntimeExecutionTokenEvent,
  RuntimeExecutionTokenStatus,
} from './types'
import {
  RUNTIME_DISPATCH_JOB_STATUSES,
  RUNTIME_EXECUTION_TOKEN_STATUSES,
} from './types'

export const RUNTIME_EXECUTION_TOKEN_STATUS_VALUES: readonly RuntimeExecutionTokenStatus[] =
  RUNTIME_EXECUTION_TOKEN_STATUSES

export const RUNTIME_DISPATCH_JOB_STATUS_VALUES: readonly RuntimeDispatchJobStatus[] =
  RUNTIME_DISPATCH_JOB_STATUSES

const tokenTransitions: Record<
  RuntimeExecutionTokenStatus,
  Partial<Record<RuntimeExecutionTokenEvent, RuntimeExecutionTokenStatus>>
> = {
  draft: {
    ACTIVATE: 'active',
    ARCHIVE: 'archived',
  },
  active: {
    CONSUME: 'consumed',
    EXPIRE: 'expired',
    REVOKE: 'revoked',
    ARCHIVE: 'archived',
  },
  consumed: {
    ARCHIVE: 'archived',
  },
  expired: {
    ARCHIVE: 'archived',
  },
  revoked: {
    ARCHIVE: 'archived',
  },
  archived: {},
}

const jobTransitions: Record<
  RuntimeDispatchJobStatus,
  Partial<Record<RuntimeDispatchJobEvent, RuntimeDispatchJobStatus>>
> = {
  queued: {
    LEASE: 'leased',
    CANCEL: 'cancelled',
  },
  leased: {
    START: 'running',
    BLOCK: 'blocked',
    CANCEL: 'cancelled',
    REQUEUE: 'queued',
  },
  running: {
    SUCCEED: 'succeeded',
    FAIL: 'failed',
    BLOCK: 'blocked',
    CANCEL: 'cancelled',
  },
  succeeded: {},
  failed: {
    REQUEUE: 'queued',
    CANCEL: 'cancelled',
  },
  blocked: {
    REQUEUE: 'queued',
    CANCEL: 'cancelled',
  },
  cancelled: {},
}

export class InvalidRuntimeExecutionTokenTransitionError extends Error {
  constructor(
    public readonly currentStatus: string,
    public readonly event: RuntimeExecutionTokenEvent
  ) {
    super(`Invalid Sprint 22 runtime token transition from "${currentStatus}" via "${event}".`)
    this.name = 'InvalidRuntimeExecutionTokenTransitionError'
  }
}

export class InvalidRuntimeDispatchJobTransitionError extends Error {
  constructor(
    public readonly currentStatus: string,
    public readonly event: RuntimeDispatchJobEvent
  ) {
    super(`Invalid Sprint 22 runtime job transition from "${currentStatus}" via "${event}".`)
    this.name = 'InvalidRuntimeDispatchJobTransitionError'
  }
}

export function isValidRuntimeExecutionTokenStatus(
  status: string
): status is RuntimeExecutionTokenStatus {
  return (RUNTIME_EXECUTION_TOKEN_STATUS_VALUES as readonly string[]).includes(status)
}

export function isValidRuntimeDispatchJobStatus(
  status: string
): status is RuntimeDispatchJobStatus {
  return (RUNTIME_DISPATCH_JOB_STATUS_VALUES as readonly string[]).includes(status)
}

export function transitionRuntimeExecutionTokenStatus(
  current: RuntimeExecutionTokenStatus,
  event: RuntimeExecutionTokenEvent
): RuntimeExecutionTokenStatus {
  const next = tokenTransitions[current][event]
  if (!next) throw new InvalidRuntimeExecutionTokenTransitionError(current, event)
  return next
}

export function transitionRuntimeDispatchJobStatus(
  current: RuntimeDispatchJobStatus,
  event: RuntimeDispatchJobEvent
): RuntimeDispatchJobStatus {
  const next = jobTransitions[current][event]
  if (!next) throw new InvalidRuntimeDispatchJobTransitionError(current, event)
  return next
}

export function canTransitionRuntimeExecutionTokenStatus(
  current: RuntimeExecutionTokenStatus,
  event: RuntimeExecutionTokenEvent
): boolean {
  try {
    transitionRuntimeExecutionTokenStatus(current, event)
    return true
  } catch {
    return false
  }
}

export function canTransitionRuntimeDispatchJobStatus(
  current: RuntimeDispatchJobStatus,
  event: RuntimeDispatchJobEvent
): boolean {
  try {
    transitionRuntimeDispatchJobStatus(current, event)
    return true
  } catch {
    return false
  }
}
