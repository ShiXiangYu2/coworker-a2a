import { prisma } from '@/lib/prisma'

export type RunRequestStatus = 'received' | 'running' | 'succeeded' | 'failed' | 'withheld'

export interface RunRequestRecordSummary {
  id: string
  correlationId: string
  source: string
  userMessage: string
  orchestrator: string | null
  status: RunRequestStatus
  metadataJson: string
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export async function createRunRequestRecord(input: {
  correlationId: string
  source: string
  userMessage: string
  orchestrator?: string | null
  status?: RunRequestStatus
  metadata?: Record<string, unknown>
  startedAt?: Date
}) {
  const status = input.status ?? 'received'
  const record = await prisma.runRequestRecord.create({
    data: {
      correlationId: input.correlationId,
      source: input.source,
      userMessage: input.userMessage,
      orchestrator: input.orchestrator ?? null,
      status,
      metadataJson: toJson(input.metadata ?? {}),
      startedAt: input.startedAt ?? new Date(),
    },
  })
  const auditEvent = await createRunRequestAuditEvent({
    correlationId: record.correlationId,
    eventType: `run_request.${status}`,
    afterStatus: status,
    reason: `Run request ${status}.`,
    payload: {
      runRequestRecordId: record.id,
      source: record.source,
      orchestrator: record.orchestrator,
    },
  })

  return { record: toSummary(record), auditEvent }
}

export async function updateRunRequestRecordStatus(input: {
  correlationId: string
  status: RunRequestStatus
  reason?: string
  metadata?: Record<string, unknown>
  completedAt?: Date | null
}) {
  const completedAt = ['succeeded', 'failed', 'withheld'].includes(input.status)
    ? input.completedAt ?? new Date()
    : input.completedAt
  const record = await prisma.runRequestRecord.update({
    where: { correlationId: input.correlationId },
    data: {
      status: input.status,
      ...(input.metadata === undefined ? {} : { metadataJson: toJson(input.metadata) }),
      ...(completedAt === undefined ? {} : { completedAt }),
    },
  })
  const auditEvent = await createRunRequestAuditEvent({
    correlationId: record.correlationId,
    eventType: `run_request.${input.status}`,
    afterStatus: input.status,
    reason: input.reason ?? `Run request ${input.status}.`,
    payload: {
      runRequestRecordId: record.id,
      source: record.source,
      orchestrator: record.orchestrator,
    },
  })

  return { record: toSummary(record), auditEvent }
}

export async function getRunRequestByCorrelationId(input: {
  correlationId: string
}): Promise<RunRequestRecordSummary | null> {
  const record = await prisma.runRequestRecord.findUnique({
    where: { correlationId: input.correlationId },
  })

  return record ? toSummary(record) : null
}

export async function listRecentRunRequestRecords(input: {
  limit?: number
} = {}): Promise<RunRequestRecordSummary[]> {
  const records = await prisma.runRequestRecord.findMany({
    take: normalizeLimit(input.limit),
    orderBy: { createdAt: 'desc' },
  })

  return records.map(toSummary)
}

async function createRunRequestAuditEvent(input: {
  correlationId: string
  eventType: string
  afterStatus: RunRequestStatus
  reason: string
  payload: Record<string, unknown>
}) {
  return prisma.harmonyAuditEvent.create({
    data: {
      correlationId: input.correlationId,
      eventType: input.eventType,
      actorType: 'system',
      afterStatus: input.afterStatus,
      reason: input.reason,
      payloadJson: toJson(input.payload),
    },
  })
}

function toSummary(record: {
  id: string
  correlationId: string
  source: string
  userMessage: string
  orchestrator: string | null
  status: string
  metadataJson: string
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}): RunRequestRecordSummary {
  return {
    id: record.id,
    correlationId: record.correlationId,
    source: record.source,
    userMessage: record.userMessage,
    orchestrator: record.orchestrator,
    status: toRunRequestStatus(record.status),
    metadataJson: record.metadataJson,
    startedAt: record.startedAt?.toISOString() ?? null,
    completedAt: record.completedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function toRunRequestStatus(status: string): RunRequestStatus {
  return ['received', 'running', 'succeeded', 'failed', 'withheld'].includes(status)
    ? status as RunRequestStatus
    : 'running'
}

function normalizeLimit(limit: number | undefined): number {
  if (!limit || Number.isNaN(limit)) return 10
  return Math.max(1, Math.min(50, Math.trunc(limit)))
}

function toJson(value: unknown): string {
  return JSON.stringify(value)
}
