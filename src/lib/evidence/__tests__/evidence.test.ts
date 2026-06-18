import { describe, expect, it } from 'vitest'
import {
  EVIDENCE_IMPORT_STATUSES,
  transitionEvidenceImportStatus,
  validateCreateInput,
  validateEvidenceImportInput,
  validateNoForbiddenEvidenceActionTerms,
  validateNoForbiddenEvidenceStates,
  validateNoRawSensitiveContent,
  computeContentHash,
  extractTags,
  EvidenceSafetyViolationError,
  EvidenceValidationError,
} from '../index'

describe('Sprint 17 evidence validators', () => {
  it('accepts user-explicit sources only', () => {
    expect(() => validateEvidenceImportInput({
      sourceKind: 'user_pasted_text',
      title: 'Valid Evidence',
      userProvidedSummary: 'User explicitly pasted this summary.',
    })).not.toThrow()

    expect(() => validateEvidenceImportInput({
      sourceKind: 'invalid_source' as never,
      title: 'Invalid Evidence',
      userProvidedSummary: 'Invalid source.',
    })).toThrow(EvidenceValidationError)
  })

  it('keeps legacy validateCreateInput as summary-only compatibility', () => {
    expect(() => validateCreateInput({
      source: 'manual_text',
      title: 'Test Evidence',
      content: 'This is treated as user-provided summary only.',
    })).not.toThrow()
  })

  it('rejects forbidden execution states and UI/API terms', () => {
    expect(EVIDENCE_IMPORT_STATUSES).toEqual(['draft', 'review', 'approved_record', 'rejected', 'archived'])
    expect(() => validateNoForbiddenEvidenceStates(['draft', 'executed'])).toThrow(EvidenceSafetyViolationError)
    expect(() => validateNoForbiddenEvidenceActionTerms('Fetch URL now', 'button label')).toThrow(EvidenceSafetyViolationError)
  })

  it('detects raw sensitive material before storage', () => {
    const findings = validateNoRawSensitiveContent('cookie: session=abcdefghi')
    expect(findings).toContain('cookie')
  })

  it('allows only documented state transitions', () => {
    expect(transitionEvidenceImportStatus('draft', 'SUBMIT_REVIEW')).toBe('review')
    expect(transitionEvidenceImportStatus('review', 'APPROVE_RECORD')).toBe('approved_record')
    expect(() => transitionEvidenceImportStatus('approved_record', 'SUBMIT_REVIEW')).toThrow()
  })
})

describe('Legacy evidence helper compatibility', () => {
  it('computes stable hashes for sanitized summaries', () => {
    const hash1 = computeContentHash('hello world')
    const hash2 = computeContentHash('hello world')
    expect(hash1).toBe(hash2)
    expect(hash1).toMatch(/^[0-9a-f]{16}$/)
  })

  it('extracts tags from sanitized summaries', () => {
    const tags = extractTags('The database performance is slow #security', 'Authentication Failure Report')
    expect(tags).toContain('authentication')
    expect(tags).toContain('database')
    expect(tags).toContain('security')
    expect(tags.length).toBeLessThanOrEqual(20)
  })
})
