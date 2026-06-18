import { describe, expect, it } from 'vitest'
import {
  InvalidHarmonyTransitionError,
  canTransitionHarmonyTask,
  transitionHarmonyTask,
} from '../state-machine'

describe('Harmony state machine', () => {
  it('creates a draft task from a route event', () => {
    expect(transitionHarmonyTask(undefined, 'CREATE_FROM_ROUTE')).toBe('draft')
  })

  it('queues normal draft tasks', () => {
    expect(transitionHarmonyTask('draft', 'QUEUE')).toBe('queued')
  })

  it('moves approved confirmations to queued only', () => {
    expect(transitionHarmonyTask('pending_confirmation', 'APPROVE_CONFIRMATION')).toBe(
      'queued'
    )
  })

  it('rejects invalid direct execution-like transitions', () => {
    expect(() => transitionHarmonyTask('pending_confirmation', 'ASSIGN_PLACEHOLDER'))
      .toThrow(InvalidHarmonyTransitionError)
    expect(canTransitionHarmonyTask('queued', 'MARK_COMPLETED')).toBe(false)
    expect(canTransitionHarmonyTask('cancelled', 'QUEUE')).toBe(false)
  })
})
