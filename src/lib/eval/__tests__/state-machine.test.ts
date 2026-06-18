import { describe, expect, it } from 'vitest'
import { isTerminalEvalRunStatus, transitionEvalRun } from '../state-machine'

describe('Sprint 7 EvalRun state machine', () => {
  it('supports only Sprint 7 legal transitions', () => {
    expect(transitionEvalRun('created', 'START')).toBe('running')
    expect(transitionEvalRun('created', 'CANCEL')).toBe('cancelled')
    expect(transitionEvalRun('running', 'COMPLETE')).toBe('completed')
    expect(transitionEvalRun('running', 'BLOCK')).toBe('blocked')
    expect(transitionEvalRun('running', 'FAIL')).toBe('failed')
    expect(transitionEvalRun('running', 'CANCEL')).toBe('cancelled')
  })

  it('rejects terminal transitions', () => {
    expect(isTerminalEvalRunStatus('completed')).toBe(true)
    expect(isTerminalEvalRunStatus('blocked')).toBe(true)
    expect(() => transitionEvalRun('completed', 'CANCEL')).toThrow()
    expect(() => transitionEvalRun('blocked', 'COMPLETE')).toThrow()
  })
})
