import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'

export interface JudgmentRecord {
  id: string
  correlationId: string
  taskId?: string
  judgmentType: string
  targetType: string
  targetId: string
  title: string
  reason: string
  evidence: string[]
  status: string
  supersededByRecordId?: string
  confidence: number
  metadata: Record<string, unknown>
  createdBy: string
  reviewedBy?: string
  reviewedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export type JudgmentType =
  | 'route_to_agent'
  | 'allow_tool'
  | 'reject_tool'
  | 'approve_plan'
  | 'review_conclusion'
  | 'assign_task'
  | 'block_execution'

export type JudgmentTargetType =
  | 'task'
  | 'agent_run'
  | 'tool_call'
  | 'workflow'
  | 'review'
  | 'execution'

export interface CreateJudgmentRecordInput {
  correlationId: string
  taskId?: string
  judgmentType: JudgmentType
  targetType: JudgmentTargetType
  targetId: string
  title: string
  reason: string
  evidence?: string[]
  confidence?: number
  metadata?: Record<string, unknown>
  createdBy: string
}

export async function createJudgmentRecord(
  input: CreateJudgmentRecordInput
): Promise<JudgmentRecord> {
  const id = randomUUID()
  const evidence = input.evidence ?? []
  const metadata = input.metadata ?? {}
  const confidence = input.confidence ?? 0

  const record = await prisma.judgmentRecord.create({
    data: {
      id,
      correlationId: input.correlationId,
      taskId: input.taskId,
      judgmentType: input.judgmentType,
      targetType: input.targetType,
      targetId: input.targetId,
      title: input.title,
      reason: input.reason,
      evidence: JSON.stringify(evidence),
      status: 'active',
      confidence,
      metadataJson: JSON.stringify(metadata),
      createdBy: input.createdBy,
    },
  })

  return serializeJudgmentRecord(record)
}

export async function listJudgmentRecords(filters: {
  taskId?: string
  judgmentType?: string
  targetType?: string
  status?: string
  limit?: number
} = {}): Promise<JudgmentRecord[]> {
  const limit = filters.limit ?? 50

  const records = await prisma.judgmentRecord.findMany({
    where: {
      taskId: filters.taskId,
      judgmentType: filters.judgmentType,
      targetType: filters.targetType,
      status: filters.status,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return records.map(serializeJudgmentRecord)
}

export async function getJudgmentRecord(id: string): Promise<JudgmentRecord | null> {
  const record = await prisma.judgmentRecord.findUnique({
    where: { id },
  })

  return record ? serializeJudgmentRecord(record) : null
}

export async function supersedeJudgmentRecord(
  id: string,
  supersededByRecordId: string
): Promise<JudgmentRecord> {
  const record = await prisma.judgmentRecord.update({
    where: { id },
    data: {
      status: 'superseded',
      supersededByRecordId,
      updatedAt: new Date(),
    },
  })

  return serializeJudgmentRecord(record)
}

function serializeJudgmentRecord(record: {
  id: string
  correlationId: string
  taskId: string | null
  judgmentType: string
  targetType: string
  targetId: string
  title: string
  reason: string
  evidence: string
  status: string
  supersededByRecordId: string | null
  confidence: number
  metadataJson: string
  createdBy: string
  reviewedBy: string | null
  reviewedAt: Date | null
  createdAt: Date
  updatedAt: Date
}): JudgmentRecord {
  return {
    id: record.id,
    correlationId: record.correlationId,
    taskId: record.taskId ?? undefined,
    judgmentType: record.judgmentType,
    targetType: record.targetType,
    targetId: record.targetId,
    title: record.title,
    reason: record.reason,
    evidence: JSON.parse(record.evidence),
    status: record.status,
    supersededByRecordId: record.supersededByRecordId ?? undefined,
    confidence: record.confidence,
    metadata: JSON.parse(record.metadataJson),
    createdBy: record.createdBy,
    reviewedBy: record.reviewedBy ?? undefined,
    reviewedAt: record.reviewedAt ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}
