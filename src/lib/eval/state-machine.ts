import type { EvalRunEvent, EvalRunStatus } from './types'

const transitions: Record<EvalRunStatus, Partial<Record<EvalRunEvent, EvalRunStatus>>> = {
  created: {
    START: 'running',
    CANCEL: 'cancelled',
  },
  running: {
    COMPLETE: 'completed',
    BLOCK: 'blocked',
    FAIL: 'failed',
    CANCEL: 'cancelled',
  },
  completed: {},
  blocked: {},
  failed: {},
  cancelled: {},
}

export function transitionEvalRun(
  status: EvalRunStatus,
  event: EvalRunEvent
): EvalRunStatus {
  const next = transitions[status][event]
  if (!next) {
    throw new Error(`Illegal EvalRun transition: ${status} -> ${event}`)
  }
  return next
}

export function isTerminalEvalRunStatus(status: EvalRunStatus): boolean {
  return ['completed', 'blocked', 'failed', 'cancelled'].includes(status)
}
