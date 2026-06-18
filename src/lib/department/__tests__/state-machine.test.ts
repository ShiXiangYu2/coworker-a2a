import { describe, expect, it } from 'vitest'
import {
  canTransitionDepartmentRecordStatus,
  transitionDepartmentRecordStatus,
} from '../state-machine'
import {
  validateNoForbiddenDepartmentStates,
} from '../validators'

describe('Sprint 18 department state machine', () => {
  it('allows local lifecycle transitions only', () => {
    expect(transitionDepartmentRecordStatus('draft', 'SUBMIT_REVIEW')).toBe('review')
    expect(transitionDepartmentRecordStatus('review', 'APPROVE_RECORD')).toBe('approved_record')
    expect(transitionDepartmentRecordStatus('approved_record', 'SUPERSEDE')).toBe('superseded')
    expect(transitionDepartmentRecordStatus('superseded', 'ARCHIVE')).toBe('archived')
  })

  it('rejects invalid reverse or runtime-like transitions', () => {
    expect(canTransitionDepartmentRecordStatus('approved_record', 'SUBMIT_REVIEW')).toBe(false)
    expect(() => validateNoForbiddenDepartmentStates([
      'active_runtime',
      'assigned',
      'executing',
      'running',
      'completed',
      'delegated',
      'escalated_runtime',
      'auto_routed',
      'invoked',
      'connected',
      'deployed',
      'released',
      'resumed',
    ])).toThrow()
  })
})

