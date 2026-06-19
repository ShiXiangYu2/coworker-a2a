import { prisma } from '@/lib/prisma'

export interface RuntimeExecutionRecordSummary {
  id: string
  correlationId: string | null
  toolId: string
  action: string
  status: string
  policyDecision: string
  targetPath: string
  approvalRecordId: string | null
  executionPlanId: string
  createdAt: string
  updatedAt: string
}

export async function listRecentRuntimeExecutionRecords(input: {
  limit?: number
} = {}): Promise<RuntimeExecutionRecordSummary[]> {
  const records = await prisma.runtimeExecutionRecord.findMany({
    take: normalizeLimit(input.limit),
    orderBy: { createdAt: 'desc' },
  })

  return records.map(toSummary)
}

export async function listRuntimeExecutionRecordsByCorrelationId(input: {
  correlationId: string
  limit?: number
}): Promise<RuntimeExecutionRecordSummary[]> {
  const records = await prisma.runtimeExecutionRecord.findMany({
    where: { correlationId: input.correlationId },
    take: normalizeLimit(input.limit),
    orderBy: { createdAt: 'asc' },
  })

  return records.map(toSummary)
}

function normalizeLimit(limit: number | undefined): number {
  if (!limit || Number.isNaN(limit)) return 10
  return Math.max(1, Math.min(50, Math.trunc(limit)))
}

function toSummary(record: {
  id: string
  correlationId: string | null
  toolId: string
  action: string
  status: string
  policyDecision: string
  targetPath: string
  approvalRecordId: string | null
  executionPlanId: string
  createdAt: Date
  updatedAt: Date
}): RuntimeExecutionRecordSummary {
  return {
    id: record.id,
    correlationId: record.correlationId,
    toolId: record.toolId,
    action: record.action,
    status: record.status,
    policyDecision: record.policyDecision,
    targetPath: record.targetPath,
    approvalRecordId: record.approvalRecordId,
    executionPlanId: record.executionPlanId,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}
