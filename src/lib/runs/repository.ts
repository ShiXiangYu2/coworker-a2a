import { prisma } from '@/lib/prisma'
import {
  listAgentTaskRunRecordsByCorrelationId,
  type AgentTaskRunRecordSummary,
} from '@/lib/agent-task-runner/repository'
import {
  listRuntimeExecutionRecordsByCorrelationId,
  type RuntimeExecutionRecordSummary,
} from '@/lib/execution-runtime/repository'
import { listAuditEvents } from '@/lib/observability/repository'

export type RunStatus = 'failed' | 'succeeded' | 'withheld' | 'running'

export interface RunTimelineEventSummary {
  id: string
  eventType: string
  actorType: string
  reason: string
  createdAt: string
}

export interface AggregatedRun {
  correlationId: string
  orchestrator: string | null
  status: RunStatus
  startedAt: string | null
  completedAt: string | null
  agentTaskRuns: AgentTaskRunRecordSummary[]
  runtimeExecutions: RuntimeExecutionRecordSummary[]
  timelineEvents: RunTimelineEventSummary[]
  latestReceiptStatus: string | null
  latestRuntimeRecordId: string | null
}

export async function listRecentRuns(input: {
  limit?: number
} = {}): Promise<AggregatedRun[]> {
  const correlationIds = await findRecentCorrelationIds(normalizeLimit(input.limit))
  return Promise.all(correlationIds.map((correlationId) => getRunByCorrelationId({ correlationId })))
}

export async function getRunByCorrelationId(input: {
  correlationId: string
}): Promise<AggregatedRun> {
  const [agentTaskRuns, runtimeExecutions, timelineEvents] = await Promise.all([
    listAgentTaskRunRecordsByCorrelationId({ correlationId: input.correlationId, limit: 50 }),
    listRuntimeExecutionRecordsByCorrelationId({ correlationId: input.correlationId, limit: 50 }),
    listAuditEvents({ correlationId: input.correlationId, limit: 50 }),
  ])

  const timeline = timelineEvents
    .map((event) => ({
      id: event.id,
      eventType: event.eventType,
      actorType: event.actorType,
      reason: event.reason,
      createdAt: event.createdAt,
    }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  return {
    correlationId: input.correlationId,
    orchestrator: agentTaskRuns[0]?.orchestrator ?? null,
    status: deriveRunStatus(agentTaskRuns, runtimeExecutions),
    startedAt: earliest([
      ...agentTaskRuns.map((item) => item.startedAt),
      ...runtimeExecutions.map((item) => item.createdAt),
      ...timeline.map((item) => item.createdAt),
    ]),
    completedAt: latest([
      ...agentTaskRuns.map((item) => item.completedAt).filter((value): value is string => Boolean(value)),
      ...runtimeExecutions.map((item) => item.updatedAt),
      ...timeline.map((item) => item.createdAt),
    ]),
    agentTaskRuns,
    runtimeExecutions,
    timelineEvents: timeline,
    latestReceiptStatus: runtimeExecutions.at(-1)?.status ?? null,
    latestRuntimeRecordId: runtimeExecutions.at(-1)?.id ?? null,
  }
}

function deriveRunStatus(
  agentTaskRuns: AgentTaskRunRecordSummary[],
  runtimeExecutions: RuntimeExecutionRecordSummary[]
): RunStatus {
  if (agentTaskRuns.some((item) => item.status === 'failed') || runtimeExecutions.some((item) => item.status === 'failed')) {
    return 'failed'
  }

  if (runtimeExecutions.some((item) => item.status === 'succeeded')) {
    return 'succeeded'
  }

  if (
    runtimeExecutions.length > 0 &&
    runtimeExecutions.every((item) => ['dry_run', 'withheld', 'denied'].includes(item.status))
  ) {
    return 'withheld'
  }

  return 'running'
}

async function findRecentCorrelationIds(limit: number): Promise<string[]> {
  const [agentRows, runtimeRows, auditRows] = await Promise.all([
    prisma.agentTaskRunRecord.findMany({
      where: { correlationId: { not: null } },
      select: { correlationId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.runtimeExecutionRecord.findMany({
      where: { correlationId: { not: null } },
      select: { correlationId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.harmonyAuditEvent.findMany({
      where: { correlationId: { not: null } },
      select: { correlationId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
  ])

  return [...agentRows, ...runtimeRows, ...auditRows]
    .filter((row): row is { correlationId: string; createdAt: Date } => Boolean(row.correlationId))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .reduce<string[]>((ids, row) => {
      if (!ids.includes(row.correlationId)) ids.push(row.correlationId)
      return ids
    }, [])
    .slice(0, limit)
}

function normalizeLimit(limit: number | undefined): number {
  if (!limit || Number.isNaN(limit)) return 10
  return Math.max(1, Math.min(50, Math.trunc(limit)))
}

function earliest(values: string[]): string | null {
  return values.length ? [...values].sort()[0] : null
}

function latest(values: string[]): string | null {
  return values.length ? [...values].sort().at(-1) ?? null : null
}
