import { describe, expect, it } from 'vitest'
import {
  assertNoForbiddenFileGitPrState,
  transitionFileGitPrRecord,
} from '../state-machine'

describe('Sprint 12 File / Git / PR state machine', () => {
  it('allows proposal-only lifecycle transitions', () => {
    expect(transitionFileGitPrRecord('proposal', 'DRAFT')).toBe('draft')
    expect(transitionFileGitPrRecord('draft', 'SUBMIT_REVIEW')).toBe('review')
    expect(transitionFileGitPrRecord('review', 'APPROVE_RECORD')).toBe('approved_record')
    expect(transitionFileGitPrRecord('approved_record', 'ARCHIVE')).toBe('archived')
  })

  it('rejects execution-shaped transition skips', () => {
    expect(() => transitionFileGitPrRecord('proposal', 'APPROVE_RECORD')).toThrow()
    expect(() => transitionFileGitPrRecord('approved_record', 'SUBMIT_REVIEW')).toThrow()
  })

  it('forbids execution state names', () => {
    for (const status of ['applied', 'written', 'formatted', 'committed', 'pushed', 'merged', 'pr_created', 'deployed', 'deleted', 'executed']) {
      expect(() => assertNoForbiddenFileGitPrState(status)).toThrow()
    }
  })
})
