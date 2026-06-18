import { describe, expect, it } from 'vitest'
import {
  assertNotForbiddenMVPState,
  canTransitionMVPReadiness,
  ForbiddenMVPStateError,
  InvalidMVPReadinessTransitionError,
  isValidMVPReadinessStatus,
  transitionMVPReadiness,
} from '../state-machine'
import type { MVPReadinessStatus } from '../types'

describe('Sprint 15 MVP readiness state machine', () => {
  it('allows draft -> review -> approved_record -> archived', () => {
    expect(transitionMVPReadiness('draft', 'SUBMIT_REVIEW')).toBe('review')
    expect(transitionMVPReadiness('review', 'APPROVE_RECORD')).toBe('approved_record')
    expect(transitionMVPReadiness('approved_record', 'ARCHIVE')).toBe('archived')
  })

  it('allows review -> rejected -> archived', () => {
    expect(transitionMVPReadiness('review', 'REJECT')).toBe('rejected')
    expect(transitionMVPReadiness('rejected', 'ARCHIVE')).toBe('archived')
  })

  it('defaults to draft for new local records', () => {
    expect(transitionMVPReadiness(undefined, 'SUBMIT_REVIEW')).toBe('review')
  })

  it('rejects invalid transitions', () => {
    expect(() => transitionMVPReadiness('draft', 'APPROVE_RECORD')).toThrow(InvalidMVPReadinessTransitionError)
    expect(canTransitionMVPReadiness('draft', 'APPROVE_RECORD')).toBe(false)
  })

  it('validates allowed states only', () => {
    const statuses: MVPReadinessStatus[] = ['draft', 'review', 'approved_record', 'rejected', 'archived']
    for (const status of statuses) {
      expect(isValidMVPReadinessStatus(status)).toBe(true)
      expect(() => assertNotForbiddenMVPState(status)).not.toThrow()
    }
  })

  it('rejects execution and release oriented states', () => {
    for (const state of [
      'running',
      'executed',
      'deployed',
      'published',
      'released',
      'auto_fixed',
      'auto_remediated',
      'completed',
      'retried',
      'replayed',
      'rolled_back',
      'resumed',
    ]) {
      expect(() => assertNotForbiddenMVPState(state)).toThrow(ForbiddenMVPStateError)
    }
  })
})

