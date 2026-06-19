import { prisma } from '@/lib/prisma'

export interface AgentTaskRunRecordSummary {
  id: string
  correlationId: string | null
  orchestrator: string
  agentId: string
  taskId: string
  taskType: string
  status: string
  startedAt: string
  completedAt: string | null
  createdAt: string
}

export async function listRecentAgentTaskRunRecords(input: {
  limit?: number
} = {}): Promise<AgentTaskRunRecordSummary[]> {
  const records = await prisma.agentTaskRunRecord.findMany({
    take: normalizeLimit(input.limit),
    orderBy: { createdAt: 'desc' },
  })

  return records.map(toSummary)
}

export async function listAgentTaskRunRecordsByCorrelationId(input: {
  correlationId: string
  limit?: number
}): Promise<AgentTaskRunRecordSummary[]> {
  const records = await prisma.agentTaskRunRecord.findMany({
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
  orchestrator: string
  agentId: string
  taskId: string
  taskType: string
  status: string
  startedAt: Date
  completedAt: Date | null
  createdAt: Date
}): AgentTaskRunRecordSummary {
  return {
    id: record.id,
    correlationId: record.correlationId,
    orchestrator: record.orchestrator,
    agentId: record.agentId,
    taskId: record.taskId,
    taskType: record.taskType,
    status: record.status,
    startedAt: record.startedAt.toISOString(),
    completedAt: record.completedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
  }
}
