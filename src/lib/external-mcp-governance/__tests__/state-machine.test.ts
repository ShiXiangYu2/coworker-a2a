import { describe, expect, it } from 'vitest'
import {
  assertNoForbiddenExternalMcpState,
  transitionExternalMcpRecord,
} from '../state-machine'

describe('Sprint 13 External / MCP governance state machine', () => {
  it('allows record-only lifecycle transitions', () => {
    expect(transitionExternalMcpRecord('proposal', 'DRAFT')).toBe('draft')
    expect(transitionExternalMcpRecord('draft', 'SUBMIT_REVIEW')).toBe('review')
    expect(transitionExternalMcpRecord('review', 'APPROVE_RECORD')).toBe('approved_record')
    expect(transitionExternalMcpRecord('approved_record', 'ARCHIVE')).toBe('archived')
  })

  it('rejects execution-shaped transition skips', () => {
    expect(() => transitionExternalMcpRecord('proposal', 'APPROVE_RECORD')).toThrow()
    expect(() => transitionExternalMcpRecord('approved_record', 'SUBMIT_REVIEW')).toThrow()
  })

  it('forbids external execution state names', () => {
    for (const status of ['connected', 'called', 'sent', 'synced', 'webhook_created', 'mcp_invoked', 'external_updated', 'executed']) {
      expect(() => assertNoForbiddenExternalMcpState(status)).toThrow()
    }
  })
})
