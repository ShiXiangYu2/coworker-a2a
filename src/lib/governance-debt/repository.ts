import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'

export interface GovernanceDebt {
  id: string
  correlationId: string
  taskId?: string
  debtType: string
  severity: string
  title: string
  description: string
  source: string
  sourceId?: string
  evidence: string[]
  blockedByDebtIds: string[]
  blocksExecution: boolean
  status: string
  resolution?: string
  resolvedAt?: Date
  resolvedBy?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export type DebtType =
  | 'drift'
  | 'tool_permission_gap'
  | 'rule_inconsistency'
  | 'prompt_quality'
  | 'execution_reliability'
  | 'evidence_gap'

export type DebtSeverity = 'low' | 'medium' | 'high' | 'critical'

export type DebtStatus = 'open' | 'in_progress' | 'resolved' | 'wontfix' | 'archived'

export interface CreateGovernanceDebtInput {
  correlationId: string
  taskId?: string
  debtType: DebtType
  severity: DebtSeverity
  title: string
  description: string
  source: string
  sourceId?: string
  evidence?: string[]
  blockedByDebtIds?: string[]
  blocksExecution?: boolean
  createdBy: string
}

export async function createGovernanceDebt(
  input: CreateGovernanceDebtInput
): Promise<GovernanceDebt> {
  const id = randomUUID()
  const evidence = input.evidence ?? []
  const blockedByDebtIds = input.blockedByDebtIds ?? []
  const blocksExecution = input.blocksExecution ?? false

  const record = await prisma.governanceDebt.create({
    data: {
      id,
      correlationId: input.correlationId,
      taskId: input.taskId,
      debtType: input.debtType,
      severity: input.severity,
      title: input.title,
      description: input.description,
      source: input.source,
      sourceId: input.sourceId,
      evidence: JSON.stringify(evidence),
      blockedByDebtIdsJson: JSON.stringify(blockedByDebtIds),
      blocksExecution,
      status: 'open',
      createdBy: input.createdBy,
    },
  })

  return serializeGovernanceDebt(record)
}

export async function listGovernanceDebts(filters: {
  taskId?: string
  debtType?: string
  severity?: string
  status?: string
  blocksExecution?: boolean
  limit?: number
} = {}): Promise<GovernanceDebt[]> {
  const limit = filters.limit ?? 50

  const records = await prisma.governanceDebt.findMany({
    where: {
      taskId: filters.taskId,
      debtType: filters.debtType,
      severity: filters.severity,
      status: filters.status,
      blocksExecution: filters.blocksExecution,
    },
    orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  })

  return records.map(serializeGovernanceDebt)
}

export async function getGovernanceDebt(id: string): Promise<GovernanceDebt | null> {
  const record = await prisma.governanceDebt.findUnique({
    where: { id },
  })

  return record ? serializeGovernanceDebt(record) : null
}

export async function resolveGovernanceDebt(
  id: string,
  input: {
    resolution: string
    resolvedBy: string
  }
): Promise<GovernanceDebt> {
  const record = await prisma.governanceDebt.update({
    where: { id },
    data: {
      status: 'resolved',
      resolution: input.resolution,
      resolvedAt: new Date(),
      resolvedBy: input.resolvedBy,
      updatedAt: new Date(),
    },
  })

  return serializeGovernanceDebt(record)
}

export async function getGovernanceDebtStats(): Promise<{
  total: number
  open: number
  blocking: number
  bySeverity: Record<string, number>
  byType: Record<string, number>
}> {
  const total = await prisma.governanceDebt.count()
  const open = await prisma.governanceDebt.count({ where: { status: 'open' } })
  const blocking = await prisma.governanceDebt.count({ where: { blocksExecution: true, status: 'open' } })

  const bySeverityRecords = await prisma.governanceDebt.groupBy({
    by: ['severity'],
    where: { status: 'open' },
    _count: true,
  })

  const byTypeRecords = await prisma.governanceDebt.groupBy({
    by: ['debtType'],
    where: { status: 'open' },
    _count: true,
  })

  const bySeverity: Record<string, number> = {}
  for (const record of bySeverityRecords) {
    bySeverity[record.severity] = record._count
  }

  const byType: Record<string, number> = {}
  for (const record of byTypeRecords) {
    byType[record.debtType] = record._count
  }

  return { total, open, blocking, bySeverity, byType }
}

function serializeGovernanceDebt(record: {
  id: string
  correlationId: string
  taskId: string | null
  debtType: string
  severity: string
  title: string
  description: string
  source: string
  sourceId: string | null
  evidence: string
  blockedByDebtIdsJson: string
  blocksExecution: boolean
  status: string
  resolution: string | null
  resolvedAt: Date | null
  resolvedBy: string | null
  createdBy: string
  createdAt: Date
  updatedAt: Date
}): GovernanceDebt {
  return {
    id: record.id,
    correlationId: record.correlationId,
    taskId: record.taskId ?? undefined,
    debtType: record.debtType,
    severity: record.severity,
    title: record.title,
    description: record.description,
    source: record.source,
    sourceId: record.sourceId ?? undefined,
    evidence: JSON.parse(record.evidence),
    blockedByDebtIds: JSON.parse(record.blockedByDebtIdsJson),
    blocksExecution: record.blocksExecution,
    status: record.status,
    resolution: record.resolution ?? undefined,
    resolvedAt: record.resolvedAt ?? undefined,
    resolvedBy: record.resolvedBy ?? undefined,
    createdBy: record.createdBy,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}
