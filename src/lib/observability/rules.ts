import { createHash, randomUUID } from 'node:crypto'
import type {
  FailureClassification,
  RedactionResult,
  ResumeToken,
  RunJournal,
} from './types'

const correlationPattern = /^corr_[a-zA-Z0-9_-]{8,80}$/
const secretKeyPattern = /secret|token|password|apiKey|authorization|cookie|env/i
const blockedKeyPattern = /rawPayload|fullFileContent|fullCommandOutput|externalPayload/i

export function generateCorrelationId(seed?: string): string {
  if (!seed) return `corr_${randomUUID()}`
  const hash = createHash('sha256').update(seed).digest('hex').slice(0, 24)
  return `corr_${hash}`
}

export function inheritCorrelationId(...candidates: Array<string | null | undefined>): string {
  const existing = candidates.find((candidate) => candidate && validateCorrelationId(candidate))
  return existing ?? generateCorrelationId(candidates.filter(Boolean).join(':') || undefined)
}

export function validateCorrelationId(value: string | null | undefined): value is string {
  return typeof value === 'string' && correlationPattern.test(value)
}

export function stableHash(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex')
}

export function redactPayload(value: unknown): RedactionResult {
  const redactedFields: string[] = []
  const blocked = findBlockedPath(value)
  if (blocked) {
    return {
      status: 'blocked',
      redactionVersion: 'sprint-8-v1',
      blockedReason: `Payload contains blocked field ${blocked}.`,
    }
  }
  const redacted = redactValue(value, [], redactedFields)
  return {
    status: redactedFields.length > 0 ? 'redacted' : 'not_required',
    redactedFields: redactedFields.length > 0 ? redactedFields : undefined,
    redactionVersion: 'sprint-8-v1',
    value: redacted,
  }
}

export function assertPersistableRedaction(result: RedactionResult): asserts result is RedactionResult & { value: unknown } {
  if (result.status === 'blocked') {
    throw new Error('Blocked redaction payload must not be persisted into snapshots or resume context.')
  }
}

export function nextRunJournalSeq(existing: Array<Pick<RunJournal, 'seq'>>): number {
  return existing.reduce((max, item) => Math.max(max, item.seq), 0) + 1
}

export function assertRunJournalNotReplayable(action: string): void {
  if (/replay|retry|resume execution|restore|execute/i.test(action)) {
    throw new Error('RunJournal cannot be replayed or used for retry/resume execution.')
  }
}

export function buildRecoverySnapshot(input: {
  snapshot: unknown
  resourceStatusAtSnapshot?: string
}): {
  redaction: RedactionResult
  snapshot?: unknown
  snapshotHash?: string
  resourceStatusAtSnapshot?: string
} {
  const redaction = redactPayload(input.snapshot)
  assertPersistableRedaction(redaction)
  return {
    redaction,
    snapshot: redaction.value,
    snapshotHash: stableHash(redaction.value),
    resourceStatusAtSnapshot: input.resourceStatusAtSnapshot,
  }
}

export function canUseResumeToken(token: Pick<ResumeToken, 'mode' | 'useCount' | 'maxUses' | 'expiresAt' | 'revokedAt'>, now = new Date()): {
  ok: boolean
  reason?: string
} {
  if (token.mode !== 'view_only') return { ok: false, reason: 'ResumeToken mode must be view_only.' }
  if (token.revokedAt) return { ok: false, reason: 'ResumeToken is revoked.' }
  if (token.expiresAt && new Date(token.expiresAt).getTime() <= now.getTime()) {
    return { ok: false, reason: 'ResumeToken is expired.' }
  }
  if (token.maxUses !== undefined && token.useCount >= token.maxUses) {
    return { ok: false, reason: 'ResumeToken maxUses exceeded.' }
  }
  return { ok: true }
}

export function assertResumeIsViewOnly(action: string): void {
  if (/agent|tool|eval|memory|knowledge|a2a|dispatch|write|execute|run|start|retry|replay/i.test(action)) {
    throw new Error('ResumeToken use is view-only and cannot invoke execution or writes.')
  }
}

export function classifyFailure(input: {
  message: string
  resourceType: FailureClassification['resourceType']
  resourceId: string
  correlationId: string
  createdBy?: string
}): Omit<FailureClassification, 'id' | 'createdAt'> {
  const message = input.message
  const category: FailureClassification['category'] =
    /redaction/i.test(message) ? 'redaction_blocked'
    : /policy|denied/i.test(message) ? 'policy_denied'
    : /not found/i.test(message) ? 'not_found'
    : /validation|invalid/i.test(message) ? 'validation'
    : 'runtime_error'
  const retryable = /timeout|locked|temporary|unavailable/i.test(message)
  return {
    schemaVersion: 'sprint-8-v1',
    correlationId: input.correlationId,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    category,
    severity: category === 'redaction_blocked' || category === 'policy_denied' ? 'high' : 'medium',
    retryable,
    retryableReason: retryable
      ? 'Advisory only. Sprint 8 does not authorize or trigger retry.'
      : 'Not retryable; Sprint 8 never triggers retry automatically.',
    message,
    evidence: { advisoryOnly: true },
    createdBy: input.createdBy ?? 'system',
  }
}

function findBlockedPath(value: unknown, path = '$'): string | undefined {
  if (!value || typeof value !== 'object') return undefined
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findBlockedPath(value[index], `${path}[${index}]`)
      if (found) return found
    }
    return undefined
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`
    if (blockedKeyPattern.test(key)) return childPath
    const found = findBlockedPath(child, childPath)
    if (found) return found
  }
  return undefined
}

function redactValue(value: unknown, path: string[], redactedFields: string[]): unknown {
  if (Array.isArray(value)) return value.map((item, index) => redactValue(item, [...path, String(index)], redactedFields))
  if (!value || typeof value !== 'object') {
    return typeof value === 'string' && value.length > 1000 ? `${value.slice(0, 1000)}...` : value
  }
  const output: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value)) {
    const nextPath = [...path, key]
    if (secretKeyPattern.test(key)) {
      output[key] = '[REDACTED]'
      redactedFields.push(nextPath.join('.'))
      continue
    }
    output[key] = redactValue(child, nextPath, redactedFields)
  }
  return output
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => {
    const objectValue = value as Record<string, unknown>
    return `${JSON.stringify(key)}:${stableStringify(objectValue[key])}`
  }).join(',')}}`
}

