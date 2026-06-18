import type { AgentRunEvent, AgentRunStatus } from './types'

const transitions = new Map<string, AgentRunStatus>([
  ['none:CREATE_FROM_TASK', 'created'],
  ['created:START_ANALYSIS', 'running'],
  ['created:BLOCK', 'blocked'],
  ['created:CANCEL', 'cancelled'],
  ['created:FAIL', 'failed'],
  ['running:COMPLETE_WITH_RESULT', 'completed'],
  ['running:REQUIRE_CONFIRMATION', 'blocked'],
  ['running:BLOCK', 'blocked'],
  ['running:FAIL', 'failed'],
  ['running:CANCEL', 'cancelled'],
  ['blocked:FAIL', 'failed'],
])

export class InvalidAgentRunTransitionError extends Error {
  constructor(
    public readonly currentStatus: AgentRunStatus | 'none',
    public readonly event: AgentRunEvent
  ) {
    super(`Invalid AgentRun transition: ${currentStatus} -> ${event}`)
    this.name = 'InvalidAgentRunTransitionError'
  }
}

export function transitionAgentRun(
  currentStatus: AgentRunStatus | undefined,
  event: AgentRunEvent
): AgentRunStatus {
  const from = currentStatus ?? 'none'
  const next = transitions.get(`${from}:${event}`)

  if (!next) {
    throw new InvalidAgentRunTransitionError(from, event)
  }

  return next
}

export function canTransitionAgentRun(
  currentStatus: AgentRunStatus | undefined,
  event: AgentRunEvent
): boolean {
  try {
    transitionAgentRun(currentStatus, event)
    return true
  } catch {
    return false
  }
}
