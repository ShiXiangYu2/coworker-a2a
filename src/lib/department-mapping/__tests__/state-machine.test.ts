import { describe, expect, it } from 'vitest'
import {
  canTransitionDepartmentMappingRecordStatus,
  transitionDepartmentMappingRecordStatus,
} from '../state-machine'

describe('Sprint 19 department evidence mapping state machine', () => {
  it('allows only local record lifecycle transitions', () => {
    expect(transitionDepartmentMappingRecordStatus('draft', 'SUBMIT_REVIEW')).toBe('review')
    expect(transitionDepartmentMappingRecordStatus('draft', 'ARCHIVE')).toBe('archived')
    expect(transitionDepartmentMappingRecordStatus('review', 'APPROVE_RECORD')).toBe('approved_record')
    expect(transitionDepartmentMappingRecordStatus('review', 'REJECT')).toBe('rejected')
    expect(transitionDepartmentMappingRecordStatus('approved_record', 'SUPERSEDE')).toBe('superseded')
    expect(transitionDepartmentMappingRecordStatus('superseded', 'ARCHIVE')).toBe('archived')
  })

  it('rejects invalid or runtime-shaped transitions', () => {
    expect(canTransitionDepartmentMappingRecordStatus('draft', 'APPROVE_RECORD')).toBe(false)
    expect(canTransitionDepartmentMappingRecordStatus('archived', 'SUBMIT_REVIEW')).toBe(false)
    expect(() => transitionDepartmentMappingRecordStatus('draft', 'APPROVE_RECORD')).toThrow()
  })
})
