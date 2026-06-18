import { describe, expect, it } from 'vitest'
import {
  canTransitionExecutionGatewayRecordStatus,
  transitionExecutionGatewayRecordStatus,
} from '../state-machine'

describe('Sprint 20 execution gateway state machine', () => {
  it('allows local review lifecycle transitions only', () => {
    expect(transitionExecutionGatewayRecordStatus('draft', 'SUBMIT_REVIEW')).toBe('review')
    expect(transitionExecutionGatewayRecordStatus('review', 'APPROVE_RECORD')).toBe('approved_record')
    expect(transitionExecutionGatewayRecordStatus('review', 'REJECT')).toBe('rejected')
    expect(transitionExecutionGatewayRecordStatus('approved_record', 'SUPERSEDE')).toBe('superseded')
    expect(transitionExecutionGatewayRecordStatus('draft', 'ARCHIVE')).toBe('archived')
  })

  it('rejects invalid or runtime-like transitions', () => {
    expect(canTransitionExecutionGatewayRecordStatus('draft', 'APPROVE_RECORD')).toBe(false)
    expect(canTransitionExecutionGatewayRecordStatus('archived', 'SUBMIT_REVIEW')).toBe(false)
    expect(() => transitionExecutionGatewayRecordStatus('review', 'SUPERSEDE')).toThrow()
  })
})
