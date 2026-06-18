import { describe, expect, it } from 'vitest'
import {
  transitionA2AMessage,
  transitionContextPacket,
  transitionKnowledgeItem,
  transitionMemoryEntry,
} from '../state-machine'

describe('Sprint 5 lifecycle state machines', () => {
  it('transitions MemoryEntry lifecycle', () => {
    expect(transitionMemoryEntry('candidate', 'APPROVE')).toBe('approved')
    expect(transitionMemoryEntry('candidate', 'REJECT')).toBe('rejected')
    expect(transitionMemoryEntry('approved', 'SUPERSEDE')).toBe('superseded')
    expect(() => transitionMemoryEntry('rejected', 'APPROVE')).toThrow()
  })

  it('transitions KnowledgeItem lifecycle', () => {
    expect(transitionKnowledgeItem('draft', 'APPROVE')).toBe('approved')
    expect(transitionKnowledgeItem('approved', 'ARCHIVE')).toBe('archived')
    expect(() => transitionKnowledgeItem('superseded', 'APPROVE')).toThrow()
  })

  it('transitions A2AMessage lifecycle without send states', () => {
    expect(transitionA2AMessage('draft', 'SUBMIT_REVIEW')).toBe('queued_for_review')
    expect(transitionA2AMessage('queued_for_review', 'APPROVE_RECORD')).toBe('approved_record')
    expect(() => transitionA2AMessage('approved_record', 'APPROVE_RECORD')).toThrow()
  })

  it('transitions ContextPacket lifecycle', () => {
    expect(transitionContextPacket('draft', 'ATTACH')).toBe('attached')
    expect(transitionContextPacket('draft', 'MARK_AUDIT_ONLY')).toBe('audit_only')
    expect(() => transitionContextPacket('audit_only', 'ATTACH')).toThrow()
  })
})
