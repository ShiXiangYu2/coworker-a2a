import { createHash, randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { decodeJson, encodeJson, serializeAuditEvent } from '@/lib/harmony/serializers'
import {
  buildRecoverySnapshot,
  canUseResumeToken,
  classifyFailure,
  inheritCorrelationId,
  redactPayload,
  stableHash,
  validateCorrelationId,
} from './rules'
import {
  serializeFailureClassification,
  serializeObservabilityEvent,
  serializeRecoveryPoint,
  serializeResumeToken,
  serializeRunJournal,
} from './serializers'
import type {
  AuditLogQuery,
  FailureClassification,
  ObservabilityEvent,
  RecoveryPoint,
  ResourceType,
  ResumeToken,
  RunJournal,
  RunType,
  TimelineItem,
} from './types'

type RawObservabilityEvent = Parameters<typeof serializeObservabilityEvent>[0]
type RawRunJournal = Parameters<typeof serializeRunJournal>[0]
type RawRecoveryPoint = Parameters<typeof serializeRecoveryPoint>[0]
type RawResumeToken = Parameters<typeof serializeResumeToken>[0]
type RawFailureClassification = Parameters<typeof serializeFailureClassification>[0]
type RawAuditEvent = Parameters<typeof serializeAuditEvent>[0]

export class ObservabilityRepositoryError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message)
    this.name = 'ObservabilityRepositoryError'
  }
}

export async function createObservabilityEvent(input: {
  correlationId?: string
  resourceType: ResourceType
  resourceId: string
  eventType: string
  severity?: ObservabilityEvent['severity']
  message: string
  source?: ObservabilityEvent['source']
  attributes?: Record<string, unknown>
}): Promise<ObservabilityEvent> {
  const correlationId = inheritCorrelationId(input.correlationId, input.resourceId)
  if (!validateCorrelationId(correlationId)) {
    throw new ObservabilityRepositoryError('Invalid correlationId.')
  }
  const redaction = redactPayload(input.attributes ?? {})
  if (redaction.status === 'blocked') {
    throw new ObservabilityRepositoryError(redaction.blockedReason ?? 'Blocked observability payload.')
  }
  const id = randomUUID()
  await prisma.$executeRaw`
    INSERT INTO observability_events (
      id, schemaVersion, correlationId, resourceType, resourceId, eventType,
      severity, message, source, attributesJson, redactionJson, createdAt
    ) VALUES (
      ${id}, ${'sprint-8-v1'}, ${correlationId}, ${input.resourceType},
      ${input.resourceId}, ${input.eventType}, ${input.severity ?? 'info'},
      ${input.message}, ${input.source ?? 'api'}, ${encodeJson(redaction.value ?? {})},
      ${encodeJson(redaction)}, ${new Date()}
    )
  `
  const event = await getObservabilityEvent(id)
  if (!event) throw new ObservabilityRepositoryError('ObservabilityEvent not found after create.', 500)
  return event
}

export async function listObservabilityEvents(filters: {
  correlationId?: string
  resourceType?: string
  resourceId?: string
  limit?: number
} = {}): Promise<ObservabilityEvent[]> {
  const limit = clampLimit(filters.limit)
  const rows = await prisma.$queryRaw<RawObservabilityEvent[]>`
    SELECT * FROM observability_events
    WHERE (${filters.correlationId ?? null} IS NULL OR correlationId = ${filters.correlationId ?? null})
      AND (${filters.resourceType ?? null} IS NULL OR resourceType = ${filters.resourceType ?? null})
      AND (${filters.resourceId ?? null} IS NULL OR resourceId = ${filters.resourceId ?? null})
    ORDER BY createdAt DESC
    LIMIT ${limit}
  `
  return rows.map(serializeObservabilityEvent)
}

export async function getObservabilityEvent(id: string): Promise<ObservabilityEvent | null> {
  const rows = await prisma.$queryRaw<RawObservabilityEvent[]>`
    SELECT * FROM observability_events WHERE id = ${id} LIMIT 1
  `
  return rows[0] ? serializeObservabilityEvent(rows[0]) : null
}

export async function listAuditEvents(query: AuditLogQuery = {}) {
  const limit = clampLimit(query.limit)
  const taskId = query.resourceType === 'task' ? query.resourceId : query.taskId
  const rows = await prisma.$queryRaw<RawAuditEvent[]>`
    SELECT * FROM harmony_audit_events
    WHERE (${query.correlationId ?? null} IS NULL OR correlationId = ${query.correlationId ?? null})
      AND (${taskId ?? null} IS NULL OR taskId = ${taskId ?? null})
      AND (${query.eventType ?? null} IS NULL OR eventType = ${query.eventType ?? null})
    ORDER BY createdAt DESC
    LIMIT ${limit}
  `
  return rows.map(serializeAuditEvent)
}

export async function getAuditSummary(filters: { correlationId?: string } = {}) {
  const rows = await prisma.$queryRaw<Array<{ eventType: string; count: bigint }>>`
    SELECT eventType, COUNT(*) as count
    FROM harmony_audit_events
    WHERE (${filters.correlationId ?? null} IS NULL OR correlationId = ${filters.correlationId ?? null})
    GROUP BY eventType
    ORDER BY count DESC
  `
  return rows.map((row) => ({ eventType: row.eventType, count: Number(row.count) }))
}

export async function getCorrelationTimeline(correlationId: string): Promise<TimelineItem[]> {
  const [audit, observability, journals, recoveryPoints, failures] = await Promise.all([
    listAuditEvents({ correlationId, limit: 200 }),
    listObservabilityEvents({ correlationId, limit: 200 }),
    listRunJournals({ correlationId }),
    listRecoveryPoints({ correlationId }),
    listFailures({ correlationId }),
  ])
  return sortTimeline([
    ...audit.map((event) => ({
      kind: 'audit_event' as const,
      id: event.id,
      correlationId: event.correlationId,
      eventType: event.eventType,
      resourceType: event.taskId ? 'task' : undefined,
      resourceId: event.taskId,
      message: event.reason,
      createdAt: event.createdAt,
      data: event,
    })),
    ...observability.map((event) => ({
      kind: 'observability_event' as const,
      id: event.id,
      correlationId: event.correlationId,
      eventType: event.eventType,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      message: event.message,
      createdAt: event.createdAt,
      data: event,
    })),
    ...journals.map((journal) => ({
      kind: 'run_journal' as const,
      id: journal.id,
      correlationId: journal.correlationId,
      eventType: journal.phase,
      resourceType: journal.runType,
      resourceId: journal.runId,
      message: `Journal ${journal.result}`,
      createdAt: journal.createdAt,
      data: journal,
    })),
    ...recoveryPoints.map((point) => ({
      kind: 'recovery_point' as const,
      id: point.id,
      correlationId: point.correlationId,
      eventType: 'recovery.point_created',
      resourceType: point.resourceType,
      resourceId: point.resourceId,
      message: point.reason,
      createdAt: point.createdAt,
      data: point,
    })),
    ...failures.map((failure) => ({
      kind: 'failure_classification' as const,
      id: failure.id,
      correlationId: failure.correlationId,
      eventType: failure.category,
      resourceType: failure.resourceType,
      resourceId: failure.resourceId,
      message: failure.message,
      createdAt: failure.createdAt,
      data: failure,
    })),
  ])
}

export async function getResourceTimeline(resourceType: string, resourceId: string): Promise<TimelineItem[]> {
  const correlationId = await findCorrelationIdForResource(resourceType, resourceId)
  const [observability, recoveryPoints, failures] = await Promise.all([
    listObservabilityEvents({ resourceType, resourceId }),
    listRecoveryPoints({ resourceType, resourceId }),
    listFailures({ resourceType, resourceId }),
  ])
  const audit = resourceType === 'task' ? await listAuditEvents({ taskId: resourceId }) : []
  const timeline = [
    ...audit.map((event) => ({
      kind: 'audit_event' as const,
      id: event.id,
      correlationId: event.correlationId,
      eventType: event.eventType,
      resourceType: 'task',
      resourceId,
      message: event.reason,
      createdAt: event.createdAt,
      data: event,
    })),
    ...observability.map((event) => ({
      kind: 'observability_event' as const,
      id: event.id,
      correlationId: event.correlationId,
      eventType: event.eventType,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      message: event.message,
      createdAt: event.createdAt,
      data: event,
    })),
    ...recoveryPoints.map((point) => ({
      kind: 'recovery_point' as const,
      id: point.id,
      correlationId: point.correlationId,
      eventType: 'recovery.point_created',
      resourceType: point.resourceType,
      resourceId: point.resourceId,
      message: point.reason,
      createdAt: point.createdAt,
      data: point,
    })),
    ...failures.map((failure) => ({
      kind: 'failure_classification' as const,
      id: failure.id,
      correlationId: failure.correlationId,
      eventType: failure.category,
      resourceType: failure.resourceType,
      resourceId: failure.resourceId,
      message: failure.message,
      createdAt: failure.createdAt,
      data: failure,
    })),
  ]
  if (timeline.length === 0 && correlationId) return getCorrelationTimeline(correlationId)
  return sortTimeline(timeline)
}

export async function appendRunJournal(input: {
  runType: RunType
  runId: string
  correlationId?: string
  eventRefType: RunJournal['eventRefType']
  eventRefId: string
  phase?: string
  stateBefore?: string
  stateAfter?: string
  inputSnapshot?: unknown
  outputSnapshot?: unknown
  result: RunJournal['result']
  failureClassificationId?: string
}): Promise<RunJournal> {
  const correlationId = inheritCorrelationId(input.correlationId, input.runId)
  const existing = await listRunJournals({ runType: input.runType, runId: input.runId })
  const seq = existing.reduce((max, item) => Math.max(max, item.seq), 0) + 1
  const inputRedaction = input.inputSnapshot === undefined ? undefined : redactPayload(input.inputSnapshot)
  const outputRedaction = input.outputSnapshot === undefined ? undefined : redactPayload(input.outputSnapshot)
  if (inputRedaction?.status === 'blocked' || outputRedaction?.status === 'blocked') {
    throw new ObservabilityRepositoryError('Blocked redaction payload is not persisted into RunJournal.')
  }
  const id = randomUUID()
  await prisma.$executeRaw`
    INSERT INTO run_journals (
      id, schemaVersion, runType, runId, correlationId, seq, eventRefType,
      eventRefId, eventId, phase, stateBefore, stateAfter, inputHash,
      outputHash, inputSnapshotJson, outputSnapshotJson, result,
      failureClassificationId, createdAt
    ) VALUES (
      ${id}, ${'sprint-8-v1'}, ${input.runType}, ${input.runId}, ${correlationId},
      ${seq}, ${input.eventRefType}, ${input.eventRefId}, ${input.eventRefId},
      ${input.phase ?? null}, ${input.stateBefore ?? null}, ${input.stateAfter ?? null},
      ${inputRedaction ? stableHash(inputRedaction.value) : null},
      ${outputRedaction ? stableHash(outputRedaction.value) : null},
      ${inputRedaction ? encodeJson(inputRedaction.value) : null},
      ${outputRedaction ? encodeJson(outputRedaction.value) : null},
      ${input.result}, ${input.failureClassificationId ?? null}, ${new Date()}
    )
  `
  const journal = await getRunJournal(id)
  if (!journal) throw new ObservabilityRepositoryError('RunJournal not found after append.', 500)
  return journal
}

export async function listRunJournals(filters: {
  runType?: string
  runId?: string
  correlationId?: string
} = {}): Promise<RunJournal[]> {
  const rows = await prisma.$queryRaw<RawRunJournal[]>`
    SELECT * FROM run_journals
    WHERE (${filters.runType ?? null} IS NULL OR runType = ${filters.runType ?? null})
      AND (${filters.runId ?? null} IS NULL OR runId = ${filters.runId ?? null})
      AND (${filters.correlationId ?? null} IS NULL OR correlationId = ${filters.correlationId ?? null})
    ORDER BY runType ASC, runId ASC, seq ASC
  `
  return rows.map(serializeRunJournal)
}

export async function getRunJournal(id: string): Promise<RunJournal | null> {
  const rows = await prisma.$queryRaw<RawRunJournal[]>`
    SELECT * FROM run_journals WHERE id = ${id} LIMIT 1
  `
  return rows[0] ? serializeRunJournal(rows[0]) : null
}

export async function createRecoveryPoint(input: {
  correlationId?: string
  resourceType: ResourceType
  resourceId: string
  reason: string
  snapshot?: unknown
  resourceStatusAtSnapshot?: string
  createdBy?: string
}): Promise<{ recoveryPoint: RecoveryPoint; observabilityEvents: ObservabilityEvent[] }> {
  const snapshot = input.snapshot ?? await readResourceSnapshot(input.resourceType, input.resourceId)
  const built = buildRecoverySnapshot({
    snapshot,
    resourceStatusAtSnapshot: input.resourceStatusAtSnapshot ?? readStatus(snapshot),
  })
  const correlationId = inheritCorrelationId(input.correlationId, readCorrelationId(snapshot), input.resourceId)
  const id = randomUUID()
  await prisma.$executeRaw`
    INSERT INTO recovery_points (
      id, schemaVersion, snapshotSchemaVersion, correlationId, resourceType,
      resourceId, resourceStatusAtSnapshot, reason, snapshotJson, snapshotHash,
      redactionStatus, redactionJson, restorableViewOnly, canTriggerExecution,
      createdBy, createdAt
    ) VALUES (
      ${id}, ${'sprint-8-v1'}, ${'sprint-8-v1'}, ${correlationId},
      ${input.resourceType}, ${input.resourceId}, ${built.resourceStatusAtSnapshot ?? null},
      ${input.reason}, ${encodeJson(built.snapshot)}, ${built.snapshotHash ?? null},
      ${built.redaction.status}, ${encodeJson(built.redaction)}, ${true}, ${false},
      ${input.createdBy ?? 'system'}, ${new Date()}
    )
  `
  const event = await createObservabilityEvent({
    correlationId,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    eventType: 'recovery.point_created',
    message: 'RecoveryPoint created for view, inspect, and compare only.',
    source: 'repository',
    attributes: { recoveryPointId: id, restorableViewOnly: true, canTriggerExecution: false },
  })
  const recoveryPoint = await getRecoveryPoint(id)
  if (!recoveryPoint) throw new ObservabilityRepositoryError('RecoveryPoint not found after create.', 500)
  return { recoveryPoint, observabilityEvents: [event] }
}

export async function getRecoveryPoint(id: string): Promise<RecoveryPoint | null> {
  const rows = await prisma.$queryRaw<RawRecoveryPoint[]>`
    SELECT * FROM recovery_points WHERE id = ${id} LIMIT 1
  `
  return rows[0] ? serializeRecoveryPoint(rows[0]) : null
}

export async function listRecoveryPoints(filters: {
  correlationId?: string
  resourceType?: string
  resourceId?: string
} = {}): Promise<RecoveryPoint[]> {
  const rows = await prisma.$queryRaw<RawRecoveryPoint[]>`
    SELECT * FROM recovery_points
    WHERE (${filters.correlationId ?? null} IS NULL OR correlationId = ${filters.correlationId ?? null})
      AND (${filters.resourceType ?? null} IS NULL OR resourceType = ${filters.resourceType ?? null})
      AND (${filters.resourceId ?? null} IS NULL OR resourceId = ${filters.resourceId ?? null})
    ORDER BY createdAt DESC
  `
  return rows.map(serializeRecoveryPoint)
}

export async function createResumeToken(input: {
  correlationId?: string
  resourceType: ResourceType
  resourceId: string
  viewContext?: Record<string, unknown>
  maxUses?: number
  expiresAt?: string
  createdBy?: string
}): Promise<{ resumeToken: ResumeToken; observabilityEvents: ObservabilityEvent[] }> {
  const viewContext = input.viewContext ?? {
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    openedAt: new Date().toISOString(),
  }
  const redaction = redactPayload(viewContext)
  if (redaction.status === 'blocked') {
    throw new ObservabilityRepositoryError('Blocked redaction payload is not persisted into ResumeToken context.')
  }
  const id = randomUUID()
  const correlationId = inheritCorrelationId(input.correlationId, input.resourceId)
  const tokenHash = createHash('sha256').update(`${id}:${correlationId}`).digest('hex')
  await prisma.$executeRaw`
    INSERT INTO resume_tokens (
      id, schemaVersion, tokenHash, correlationId, resourceType, resourceId,
      mode, viewContextJson, maxUses, useCount, expiresAt, revokedAt,
      revokedReason, createdBy, lastUsedAt, createdAt, updatedAt
    ) VALUES (
      ${id}, ${'sprint-8-v1'}, ${tokenHash}, ${correlationId}, ${input.resourceType},
      ${input.resourceId}, ${'view_only'}, ${encodeJson(redaction.value ?? {})},
      ${input.maxUses ?? null}, ${0}, ${input.expiresAt ? new Date(input.expiresAt) : null},
      ${null}, ${null}, ${input.createdBy ?? 'system'}, ${null}, ${new Date()}, ${new Date()}
    )
  `
  const event = await createObservabilityEvent({
    correlationId,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    eventType: 'resume.token_created',
    message: 'ResumeToken created for view-only context.',
    source: 'repository',
    attributes: { resumeTokenId: id, mode: 'view_only' },
  })
  const resumeToken = await getResumeToken(id)
  if (!resumeToken) throw new ObservabilityRepositoryError('ResumeToken not found after create.', 500)
  return { resumeToken, observabilityEvents: [event] }
}

export async function getResumeToken(id: string): Promise<ResumeToken | null> {
  const rows = await prisma.$queryRaw<RawResumeToken[]>`
    SELECT * FROM resume_tokens WHERE id = ${id} LIMIT 1
  `
  return rows[0] ? serializeResumeToken(rows[0]) : null
}

export async function useResumeToken(id: string): Promise<{ resumeToken: ResumeToken; viewContext: Record<string, unknown>; observabilityEvents: ObservabilityEvent[] }> {
  const token = await getResumeToken(id)
  if (!token) throw new ObservabilityRepositoryError('ResumeToken not found.', 404)
  const permission = canUseResumeToken(token)
  if (!permission.ok) throw new ObservabilityRepositoryError(permission.reason ?? 'ResumeToken cannot be used.')
  await prisma.$executeRaw`
    UPDATE resume_tokens
    SET useCount = ${token.useCount + 1}, lastUsedAt = ${new Date()}, updatedAt = ${new Date()}
    WHERE id = ${id}
  `
  const event = await createObservabilityEvent({
    correlationId: token.correlationId,
    resourceType: token.resourceType,
    resourceId: token.resourceId,
    eventType: 'resume.token_used',
    message: 'ResumeToken used to open view context only.',
    source: 'repository',
    attributes: { resumeTokenId: id, mode: 'view_only', nextUseCount: token.useCount + 1 },
  })
  const updated = await getResumeToken(id)
  if (!updated) throw new ObservabilityRepositoryError('ResumeToken not found after use.', 500)
  return { resumeToken: updated, viewContext: updated.viewContext, observabilityEvents: [event] }
}

export async function listResumeTokens(filters: {
  correlationId?: string
  resourceType?: string
  resourceId?: string
} = {}): Promise<ResumeToken[]> {
  const rows = await prisma.$queryRaw<RawResumeToken[]>`
    SELECT * FROM resume_tokens
    WHERE (${filters.correlationId ?? null} IS NULL OR correlationId = ${filters.correlationId ?? null})
      AND (${filters.resourceType ?? null} IS NULL OR resourceType = ${filters.resourceType ?? null})
      AND (${filters.resourceId ?? null} IS NULL OR resourceId = ${filters.resourceId ?? null})
    ORDER BY createdAt DESC
  `
  return rows.map(serializeResumeToken)
}

export async function createFailureClassification(input: {
  correlationId?: string
  resourceType: ResourceType
  resourceId: string
  message: string
  createdBy?: string
}): Promise<FailureClassification> {
  const data = classifyFailure({
    correlationId: inheritCorrelationId(input.correlationId, input.resourceId),
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    message: input.message,
    createdBy: input.createdBy,
  })
  const id = randomUUID()
  await prisma.$executeRaw`
    INSERT INTO failure_classifications (
      id, schemaVersion, correlationId, resourceType, resourceId, category,
      severity, retryable, retryableReason, message, evidenceJson, createdBy, createdAt
    ) VALUES (
      ${id}, ${data.schemaVersion}, ${data.correlationId}, ${data.resourceType},
      ${data.resourceId}, ${data.category}, ${data.severity}, ${data.retryable},
      ${data.retryableReason}, ${data.message}, ${encodeJson(data.evidence)},
      ${data.createdBy}, ${new Date()}
    )
  `
  const failure = await getFailureClassification(id)
  if (!failure) throw new ObservabilityRepositoryError('FailureClassification not found after create.', 500)
  return failure
}

export async function listFailures(filters: {
  correlationId?: string
  resourceType?: string
  resourceId?: string
} = {}): Promise<FailureClassification[]> {
  const rows = await prisma.$queryRaw<RawFailureClassification[]>`
    SELECT * FROM failure_classifications
    WHERE (${filters.correlationId ?? null} IS NULL OR correlationId = ${filters.correlationId ?? null})
      AND (${filters.resourceType ?? null} IS NULL OR resourceType = ${filters.resourceType ?? null})
      AND (${filters.resourceId ?? null} IS NULL OR resourceId = ${filters.resourceId ?? null})
    ORDER BY createdAt DESC
  `
  return rows.map(serializeFailureClassification)
}

export async function getFailureClassification(id: string): Promise<FailureClassification | null> {
  const rows = await prisma.$queryRaw<RawFailureClassification[]>`
    SELECT * FROM failure_classifications WHERE id = ${id} LIMIT 1
  `
  return rows[0] ? serializeFailureClassification(rows[0]) : null
}

async function readResourceSnapshot(resourceType: ResourceType, resourceId: string): Promise<Record<string, unknown>> {
  const table = tableForResource(resourceType)
  if (!table) return { resourceType, resourceId, status: 'unknown' }
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM ${table} WHERE id = ? LIMIT 1`,
    resourceId
  )
  if (!rows[0]) throw new ObservabilityRepositoryError(`${resourceType} resource not found.`, 404)
  return sanitizeSnapshot(rows[0])
}

async function findCorrelationIdForResource(resourceType: string, resourceId: string): Promise<string | undefined> {
  const table = tableForResource(resourceType)
  if (!table) return undefined
  const rows = await prisma.$queryRawUnsafe<Array<{ correlationId?: string | null }>>(
    `SELECT correlationId FROM ${table} WHERE id = ? LIMIT 1`,
    resourceId
  ).catch(() => [])
  return rows[0]?.correlationId ?? undefined
}

function tableForResource(resourceType: string): string | undefined {
  const tables: Record<string, string> = {
    task: 'harmony_tasks',
    agent_run: 'agent_runs',
    memory_entry: 'memory_entries',
    knowledge_item: 'knowledge_items',
    context_packet: 'context_packets',
    a2a_message: 'a2a_messages',
    tool_call: 'tool_calls',
    tool_permission: 'tool_permissions',
    eval_run: 'eval_runs',
    collaboration_session: 'collaboration_sessions',
    a2a_thread: 'a2a_threads',
    a2a_turn: 'a2a_turns',
    handoff_request: 'handoff_requests',
    collaboration_decision: 'collaboration_decisions',
  }
  return tables[resourceType]
}

function sanitizeSnapshot(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (key.endsWith('Json') && typeof value === 'string') {
      out[key.replace(/Json$/, '')] = decodeJson(value, null)
    } else if (value instanceof Date) {
      out[key] = value.toISOString()
    } else {
      out[key] = value
    }
  }
  out.snapshotHash = stableHash(out)
  return out
}

function readStatus(snapshot: unknown): string | undefined {
  return snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)
    ? String((snapshot as Record<string, unknown>).status ?? '')
    : undefined
}

function readCorrelationId(snapshot: unknown): string | undefined {
  return snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)
    ? (snapshot as Record<string, unknown>).correlationId as string | undefined
    : undefined
}

function sortTimeline(items: TimelineItem[]): TimelineItem[] {
  return [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

function clampLimit(value: number | undefined): number {
  if (!value || Number.isNaN(value)) return 100
  return Math.max(1, Math.min(500, value))
}
