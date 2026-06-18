import type { ToolCallEvent, ToolCallStatus, ToolRunEvent, ToolRunStatus } from './types'

export class InvalidToolTransitionError extends Error {
  constructor(
    public readonly resource: string,
    public readonly currentStatus: string,
    public readonly event: string
  ) {
    super(`Invalid ${resource} transition: ${currentStatus} -> ${event}`)
    this.name = 'InvalidToolTransitionError'
  }
}

function transition<TStatus extends string, TEvent extends string>(
  resource: string,
  transitions: Map<string, TStatus>,
  currentStatus: TStatus,
  event: TEvent
): TStatus {
  const next = transitions.get(`${currentStatus}:${event}`)
  if (!next) throw new InvalidToolTransitionError(resource, currentStatus, event)
  return next
}

const toolCallTransitions = new Map<string, ToolCallStatus>([
  ['proposed:EVALUATE_PERMISSION', 'proposed'],
  ['proposed:DENY_PERMISSION', 'permission_denied'],
  ['proposed:REQUIRE_CONFIRMATION', 'pending_confirmation'],
  ['proposed:BLOCK_TOOL_CALL', 'blocked'],
  ['proposed:CANCEL_TOOL_CALL', 'cancelled'],
  ['pending_confirmation:APPROVE_RECORD', 'approved_record'],
  ['pending_confirmation:REJECT_TOOL_CALL', 'rejected'],
  ['pending_confirmation:CANCEL_TOOL_CALL', 'cancelled'],
  ['approved_record:CANCEL_TOOL_CALL', 'cancelled'],
  ['blocked:CANCEL_TOOL_CALL', 'cancelled'],
])

export function transitionToolCall(
  currentStatus: ToolCallStatus,
  event: ToolCallEvent
): ToolCallStatus {
  return transition('ToolCall', toolCallTransitions, currentStatus, event)
}

const toolRunTransitions = new Map<string, ToolRunStatus>([
  ['not_started:SKIP_TOOL_RUN', 'skipped'],
  ['not_started:BLOCK_TOOL_RUN', 'blocked'],
  ['not_started:CANCEL_TOOL_RUN', 'cancelled'],
  ['not_started:COMPLETE_MOCK_RUN', 'mock_completed'],
  ['not_started:FAIL_VALIDATION', 'failed_validation'],
  ['created:REQUEST_PERMISSION', 'awaiting_permission'],
  ['awaiting_permission:REQUIRE_EXECUTION_CONFIRMATION', 'awaiting_confirmation'],
  ['awaiting_permission:DENY_EXECUTION', 'denied'],
  ['awaiting_confirmation:APPROVE_FOR_EXECUTION', 'approved_for_execution'],
  ['awaiting_confirmation:REJECT_EXECUTION', 'rejected'],
  ['approved_for_execution:START_APPROVED_EXECUTION', 'executing'],
  ['executing:SUCCEED_EXECUTION', 'succeeded'],
  ['executing:FAIL_EXECUTION', 'failed'],
  ['executing:CANCEL_EXECUTION', 'cancelled'],
])

export function transitionToolRun(
  currentStatus: ToolRunStatus,
  event: ToolRunEvent
): ToolRunStatus {
  return transition('ToolRun', toolRunTransitions, currentStatus, event)
}

export function assertControlledExecutionMode(mode: string): void {
  if (mode !== 'controlled_execution') {
    throw new InvalidToolTransitionError('ToolRun', mode, 'CONTROLLED_EXECUTION_REQUIRED')
  }
}
