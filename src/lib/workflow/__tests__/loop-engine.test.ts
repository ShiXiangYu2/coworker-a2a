import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  createInitialLoopState,
  shouldTerminate,
  transitionLoopState,
  InvalidLoopTransitionError,
  DEFAULT_LOOP_CONFIG,
  type LoopConfig,
  type LoopState,
} from '../loop-state'

describe('Loop State', () => {
  describe('createInitialLoopState', () => {
    it('creates state with idle status', () => {
      const state = createInitialLoopState('loop-1')
      expect(state.loopId).toBe('loop-1')
      expect(state.status).toBe('idle')
      expect(state.currentIteration).toBe(0)
      expect(state.tasksProcessed).toBe(0)
    })

    it('uses default config when not provided', () => {
      const state = createInitialLoopState('loop-1')
      expect(state.config).toEqual(DEFAULT_LOOP_CONFIG)
    })

    it('accepts custom config', () => {
      const config: LoopConfig = {
        maxIterations: 5,
        maxConcurrent: 3,
        timeoutMs: 30_000,
        retryAttempts: 1,
        humanGateOnFailure: false,
      }
      const state = createInitialLoopState('loop-1', config)
      expect(state.config.maxIterations).toBe(5)
      expect(state.config.maxConcurrent).toBe(3)
    })
  })

  describe('transitionLoopState', () => {
    it('transitions idle → running on START', () => {
      const next = transitionLoopState('idle', 'START')
      expect(next).toBe('running')
    })

    it('transitions running → paused on PAUSE', () => {
      const next = transitionLoopState('running', 'PAUSE')
      expect(next).toBe('paused')
    })

    it('transitions running → completed on COMPLETE', () => {
      const next = transitionLoopState('running', 'COMPLETE')
      expect(next).toBe('completed')
    })

    it('transitions running → failed on FAIL', () => {
      const next = transitionLoopState('running', 'FAIL')
      expect(next).toBe('failed')
    })

    it('transitions paused → running on RESUME', () => {
      const next = transitionLoopState('paused', 'RESUME')
      expect(next).toBe('running')
    })

    it('throws on invalid transition', () => {
      expect(() => transitionLoopState('idle', 'PAUSE')).toThrow(InvalidLoopTransitionError)
    })
  })

  describe('shouldTerminate', () => {
    it('terminates when max iterations reached', () => {
      const state = createInitialLoopState('loop-1')
      state.currentIteration = 10
      const result = shouldTerminate(state)
      expect(result.terminate).toBe(true)
      expect(result.reason).toBe('MAX_ITERATIONS_REACHED')
    })

    it('terminates when consecutive failures >= 3', () => {
      const state = createInitialLoopState('loop-1')
      state.consecutiveFailures = 3
      const result = shouldTerminate(state)
      expect(result.terminate).toBe(true)
      expect(result.reason).toBe('CONSECUTIVE_FAILURES')
    })

    it('does not terminate when under limits', () => {
      const state = createInitialLoopState('loop-1')
      state.currentIteration = 5
      state.consecutiveFailures = 1
      const result = shouldTerminate(state)
      expect(result.terminate).toBe(false)
    })
  })
})
