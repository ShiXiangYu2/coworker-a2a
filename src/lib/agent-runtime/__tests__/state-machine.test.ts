import { describe, expect, it } from 'vitest'
import {
  InvalidAgentRunTransitionError,
  canTransitionAgentRun,
  transitionAgentRun,
} from '../state-machine'

describe('AgentRun state machine', () => {
  it('creates and completes an analysis run', () => {
    expect(transitionAgentRun(undefined, 'CREATE_FROM_TASK')).toBe('created')
    expect(transitionAgentRun('created', 'START_ANALYSIS')).toBe('running')
    expect(transitionAgentRun('running', 'COMPLETE_WITH_RESULT')).toBe('completed')
  })

  it('rejects invalid transitions', () => {
    expect(() => transitionAgentRun('completed', 'START_ANALYSIS')).toThrow(
      InvalidAgentRunTransitionError
    )
    expect(canTransitionAgentRun('cancelled', 'START_ANALYSIS')).toBe(false)
    expect(canTransitionAgentRun('failed', 'START_ANALYSIS')).toBe(false)
  })
})
