import { describe, expect, it } from 'vitest'
import {
  canTransitionRuntimeDispatchJobStatus,
  canTransitionRuntimeExecutionTokenStatus,
  transitionRuntimeDispatchJobStatus,
  transitionRuntimeExecutionTokenStatus,
} from '../state-machine'

describe('Sprint 22 runtime execution state machine', () => {
  it('allows the scoped runtime token lifecycle', () => {
    expect(transitionRuntimeExecutionTokenStatus('draft', 'ACTIVATE')).toBe('active')
    expect(transitionRuntimeExecutionTokenStatus('active', 'CONSUME')).toBe('consumed')
    expect(transitionRuntimeExecutionTokenStatus('active', 'EXPIRE')).toBe('expired')
    expect(transitionRuntimeExecutionTokenStatus('active', 'REVOKE')).toBe('revoked')
    expect(transitionRuntimeExecutionTokenStatus('revoked', 'ARCHIVE')).toBe('archived')
  })

  it('allows the queued job lifecycle only', () => {
    expect(transitionRuntimeDispatchJobStatus('queued', 'LEASE')).toBe('leased')
    expect(transitionRuntimeDispatchJobStatus('leased', 'START')).toBe('running')
    expect(transitionRuntimeDispatchJobStatus('running', 'SUCCEED')).toBe('succeeded')
    expect(transitionRuntimeDispatchJobStatus('running', 'FAIL')).toBe('failed')
    expect(transitionRuntimeDispatchJobStatus('failed', 'REQUEUE')).toBe('queued')
    expect(transitionRuntimeDispatchJobStatus('leased', 'BLOCK')).toBe('blocked')
  })

  it('rejects invalid token and job transitions', () => {
    expect(canTransitionRuntimeExecutionTokenStatus('draft', 'CONSUME')).toBe(false)
    expect(canTransitionRuntimeExecutionTokenStatus('archived', 'ACTIVATE')).toBe(false)
    expect(canTransitionRuntimeDispatchJobStatus('queued', 'SUCCEED')).toBe(false)
    expect(canTransitionRuntimeDispatchJobStatus('succeeded', 'REQUEUE')).toBe(false)
  })
})
