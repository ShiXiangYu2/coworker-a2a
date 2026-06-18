import { describe, expect, it } from 'vitest'
import { transitionToolCall, transitionToolRun } from '../state-machine'

describe('Sprint 6 tool state machines', () => {
  it('supports ToolCall proposal and confirmation states without execution states', () => {
    expect(transitionToolCall('proposed', 'EVALUATE_PERMISSION')).toBe('proposed')
    expect(transitionToolCall('proposed', 'REQUIRE_CONFIRMATION')).toBe('pending_confirmation')
    expect(transitionToolCall('pending_confirmation', 'APPROVE_RECORD')).toBe('approved_record')
    expect(() => transitionToolCall('approved_record', 'EVALUATE_PERMISSION')).toThrow()
  })

  it('supports ToolRun placeholder states only', () => {
    expect(transitionToolRun('not_started', 'SKIP_TOOL_RUN')).toBe('skipped')
    expect(transitionToolRun('not_started', 'COMPLETE_MOCK_RUN')).toBe('mock_completed')
    expect(() => transitionToolRun('blocked', 'COMPLETE_MOCK_RUN')).toThrow()
  })

  it('supports the Sprint 11 controlled execution chain without skipping gates', () => {
    expect(transitionToolRun('created', 'REQUEST_PERMISSION')).toBe('awaiting_permission')
    expect(transitionToolRun('awaiting_permission', 'REQUIRE_EXECUTION_CONFIRMATION')).toBe('awaiting_confirmation')
    expect(transitionToolRun('awaiting_confirmation', 'APPROVE_FOR_EXECUTION')).toBe('approved_for_execution')
    expect(transitionToolRun('approved_for_execution', 'START_APPROVED_EXECUTION')).toBe('executing')
    expect(transitionToolRun('executing', 'SUCCEED_EXECUTION')).toBe('succeeded')

    expect(() => transitionToolRun('awaiting_permission', 'START_APPROVED_EXECUTION')).toThrow()
    expect(() => transitionToolRun('awaiting_confirmation', 'START_APPROVED_EXECUTION')).toThrow()
    expect(() => transitionToolRun('approved_for_execution', 'SUCCEED_EXECUTION')).toThrow()
  })
})
