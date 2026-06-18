import { describe, expect, it } from 'vitest'
import {
  canTransitionDepartmentAssignmentRecordStatus,
  transitionDepartmentAssignmentRecordStatus,
} from '../state-machine'

describe('Sprint 21 department assignment state machine', () => {
  it('allows local review lifecycle transitions only', () => {
    expect(transitionDepartmentAssignmentRecordStatus('draft', 'SUBMIT_REVIEW')).toBe('review')
    expect(transitionDepartmentAssignmentRecordStatus('review', 'APPROVE_RECORD')).toBe('approved_record')
    expect(transitionDepartmentAssignmentRecordStatus('review', 'REJECT')).toBe('rejected')
    expect(transitionDepartmentAssignmentRecordStatus('approved_record', 'SUPERSEDE')).toBe('superseded')
    expect(transitionDepartmentAssignmentRecordStatus('draft', 'ARCHIVE')).toBe('archived')
  })

  it('rejects invalid or runtime-like transitions', () => {
    expect(canTransitionDepartmentAssignmentRecordStatus('draft', 'APPROVE_RECORD')).toBe(false)
    expect(canTransitionDepartmentAssignmentRecordStatus('archived', 'SUBMIT_REVIEW')).toBe(false)
    expect(() => transitionDepartmentAssignmentRecordStatus('review', 'SUPERSEDE')).toThrow()
  })
})
