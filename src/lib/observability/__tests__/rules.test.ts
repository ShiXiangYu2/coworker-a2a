import { describe, expect, it } from 'vitest'
import {
  assertRunJournalNotReplayable,
  assertResumeIsViewOnly,
  buildRecoverySnapshot,
  canUseResumeToken,
  classifyFailure,
  generateCorrelationId,
  inheritCorrelationId,
  nextRunJournalSeq,
  redactPayload,
  validateCorrelationId,
} from '../rules'

describe('Sprint 8 observability rules', () => {
  it('generates and inherits valid correlation ids', () => {
    const generated = generateCorrelationId('task-1')
    expect(validateCorrelationId(generated)).toBe(true)
    expect(inheritCorrelationId('invalid', generated)).toBe(generated)
  })

  it('redacts secrets and blocks raw payload snapshots', () => {
    const redacted = redactPayload({ apiToken: 'secret', nested: { ok: true } })
    expect(redacted.status).toBe('redacted')
    expect(redacted.redactedFields).toContain('apiToken')
    expect(redacted.value).toMatchObject({ apiToken: '[REDACTED]' })

    const blocked = redactPayload({ rawPayload: 'external body' })
    expect(blocked.status).toBe('blocked')
    expect(blocked.value).toBeUndefined()
  })

  it('keeps RunJournal ordered and not replayable', () => {
    expect(nextRunJournalSeq([{ seq: 1 }, { seq: 3 }])).toBe(4)
    expect(() => assertRunJournalNotReplayable('replay journal')).toThrow(/cannot be replayed/i)
  })

  it('creates view-only recovery snapshots and refuses blocked payloads', () => {
    const snapshot = buildRecoverySnapshot({
      snapshot: { status: 'queued', password: 'hidden' },
    })
    expect(snapshot.redaction.status).toBe('redacted')
    expect(snapshot.snapshotHash).toBeTruthy()

    expect(() => buildRecoverySnapshot({
      snapshot: { fullFileContent: 'do not persist' },
    })).toThrow(/Blocked redaction payload/)
  })

  it('allows resume tokens only as bounded view context', () => {
    expect(canUseResumeToken({
      mode: 'view_only',
      useCount: 0,
      maxUses: 1,
    }).ok).toBe(true)
    expect(canUseResumeToken({
      mode: 'view_only',
      useCount: 1,
      maxUses: 1,
    }).ok).toBe(false)
    expect(() => assertResumeIsViewOnly('start agent')).toThrow(/view-only/)
  })

  it('marks retryable failure classifications as advisory only', () => {
    const failure = classifyFailure({
      correlationId: generateCorrelationId('failure'),
      resourceType: 'task',
      resourceId: 'task-1',
      message: 'temporary timeout',
    })
    expect(failure.retryable).toBe(true)
    expect(failure.retryableReason).toMatch(/Advisory only/)
  })
})

