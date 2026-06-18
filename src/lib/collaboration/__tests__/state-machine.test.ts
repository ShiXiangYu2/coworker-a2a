import { describe, expect, it } from 'vitest'
import {
  transitionA2AThread,
  transitionA2ATurn,
  transitionCollaborationDecision,
  transitionCollaborationSession,
  transitionHandoffRequest,
} from '../state-machine'
import {
  assertLocalRecordOnly,
  buildCeoCollaborationPlan,
  nextTurnSeq,
  sanitizeCollaborationSnapshot,
} from '../rules'

describe('Sprint 9 collaboration state machines', () => {
  it('opens a CollaborationSession as a local record without execution states', () => {
    expect(transitionCollaborationSession('draft', 'OPEN_RECORD')).toBe('active')
    expect(transitionCollaborationSession('active', 'COMPLETE_RECORD')).toBe('completed_record')
    expect(() => transitionCollaborationSession('completed_record', 'OPEN_RECORD')).toThrow()
  })

  it('keeps A2ATurn approval as approved_record only', () => {
    expect(transitionA2AThread('draft', 'OPEN')).toBe('open')
    expect(transitionA2AThread('open', 'CLOSE_RECORD')).toBe('closed_record')
    expect(() => transitionA2AThread('closed_record', 'OPEN')).toThrow()
    expect(transitionA2ATurn('draft', 'SUBMIT_REVIEW')).toBe('queued_for_review')
    expect(transitionA2ATurn('queued_for_review', 'APPROVE_RECORD')).toBe('approved_record')
    expect(() => transitionA2ATurn('approved_record', 'SUBMIT_REVIEW')).toThrow()
  })

  it('keeps handoff and decision approval local-record only', () => {
    expect(transitionHandoffRequest('draft', 'APPROVE_RECORD')).toBe('approved_record')
    expect(transitionCollaborationDecision('queued_for_review', 'APPROVE_RECORD')).toBe('approved_record')
    expect(() => transitionHandoffRequest('approved_record', 'APPROVE_RECORD')).toThrow()
  })
})

describe('Sprint 9 collaboration safety rules', () => {
  it('calculates deterministic next turn sequence', () => {
    expect(nextTurnSeq([])).toBe(1)
    expect(nextTurnSeq([{ seq: 1 }, { seq: 3 }, { seq: 2 }])).toBe(4)
  })

  it('blocks execution-semantics actions', () => {
    expect(() => assertLocalRecordOnly('open local collaboration record')).not.toThrow()
    expect(() => assertLocalRecordOnly('dispatch A2A message')).toThrow()
    expect(() => assertLocalRecordOnly('start agent')).toThrow()
    expect(() => assertLocalRecordOnly('execute tool')).toThrow()
  })

  it('sanitizes source snapshots and blocks unsafe payloads', () => {
    expect(sanitizeCollaborationSnapshot({ token: 'abc', note: 'ok' })).toEqual({
      token: '[REDACTED]',
      note: 'ok',
    })
    expect(() => sanitizeCollaborationSnapshot({ fullFileContent: 'secret body' })).toThrow()
  })

  it('builds CEO collaboration plans as local record plans', () => {
    const plan = buildCeoCollaborationPlan({
      objective: 'Review Sprint 9',
      sourceSnapshot: { taskId: 'task_1' },
    })
    expect(plan.plannedByAgentId).toBe('elon')
    expect(plan.planSource).toBe('ceo_record')
    expect(plan.forbiddenActions).toContain('start-agent')
    expect(plan.forbiddenActions).toContain('execute-tool')
  })
})
