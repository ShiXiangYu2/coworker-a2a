import { prisma } from '@/lib/prisma'
import {
  listAgentTaskRunRecordsByCorrelationId,
  type AgentTaskRunRecordSummary,
} from '@/lib/agent-task-runner/repository'
import {
  listRuntimeExecutionRecordsByCorrelationId,
  type RuntimeExecutionRecordSummary,
} from '@/lib/execution-runtime/repository'
import {
  getRunRequestByCorrelationId,
  type RunRequestRecordSummary,
} from '@/lib/run-requests/repository'
import { listAuditEvents } from '@/lib/observability/repository'

export type RunStatus = 'failed' | 'succeeded' | 'withheld' | 'running'

export interface RunTimelineEventSummary {
  id: string
  eventType: string
  actorType: string
  reason: string
  createdAt: string
}

export interface RunFailureSummary {
  hasFailure: boolean
  failedAgentTaskRunIds: string[]
  failedRuntimeExecutionIds: string[]
  withheldRuntimeExecutionIds: string[]
  deniedRuntimeExecutionIds: string[]
  latestFailureReason: string | null
}

export interface AggregatedRun {
  correlationId: string
  runRequestRecordId: string | null
  source: string | null
  userMessage: string | null
  requestStatus: string | null
  orchestrator: string | null
  status: RunStatus
  startedAt: string | null
  completedAt: string | null
  agentTaskRuns: AgentTaskRunRecordSummary[]
  runtimeExecutions: RuntimeExecutionRecordSummary[]
  timelineEvents: RunTimelineEventSummary[]
  latestReceiptStatus: string | null
  latestRuntimeRecordId: string | null
  failureSummary: RunFailureSummary
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
  const [runRequest, agentTaskRuns, runtimeExecutions, timelineEvents] = await Promise.all([
    getRunRequestByCorrelationId({ correlationId: input.correlationId }),
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
    runRequestRecordId: runRequest?.id ?? null,
    source: runRequest?.source ?? null,
    userMessage: runRequest?.userMessage ?? null,
    requestStatus: runRequest?.status ?? null,
    orchestrator: runRequest?.orchestrator ?? agentTaskRuns[0]?.orchestrator ?? null,
    status: deriveRunStatus(runRequest, agentTaskRuns, runtimeExecutions),
    startedAt: earliest([
      runRequest?.startedAt ?? runRequest?.createdAt ?? null,
      ...agentTaskRuns.map((item) => item.startedAt),
      ...runtimeExecutions.map((item) => item.createdAt),
      ...timeline.map((item) => item.createdAt),
    ].filter((value): value is string => Boolean(value))),
    completedAt: latest([
      runRequest?.completedAt ?? null,
      ...agentTaskRuns.map((item) => item.completedAt).filter((value): value is string => Boolean(value)),
      ...runtimeExecutions.map((item) => item.updatedAt),
      ...timeline.map((item) => item.createdAt),
    ].filter((value): value is string => Boolean(value))),
    agentTaskRuns,
    runtimeExecutions,
    timelineEvents: timeline,
    latestReceiptStatus: runtimeExecutions.at(-1)?.status ?? null,
    latestRuntimeRecordId: runtimeExecutions.at(-1)?.id ?? null,
    failureSummary: deriveFailureSummary(agentTaskRuns, runtimeExecutions, timeline),
  }
}

function deriveRunStatus(
  runRequest: RunRequestRecordSummary | null,
  agentTaskRuns: AgentTaskRunRecordSummary[],
  runtimeExecutions: RuntimeExecutionRecordSummary[]
): RunStatus {
  if (agentTaskRuns.some((item) => item.status === 'failed') || runtimeExecutions.some((item) => item.status === 'failed')) {
    return 'failed'
  }

  if (runRequest?.status === 'failed') return 'failed'
  if (runRequest?.status === 'succeeded') return 'succeeded'
  if (runRequest?.status === 'withheld') return 'withheld'

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

function deriveFailureSummary(
  agentTaskRuns: AgentTaskRunRecordSummary[],
  runtimeExecutions: RuntimeExecutionRecordSummary[],
  timelineEvents: RunTimelineEventSummary[]
): RunFailureSummary {
  const failedAgentTaskRunIds = agentTaskRuns
    .filter((item) => item.status === 'failed')
    .map((item) => item.id)
  const failedRuntimeExecutionIds = runtimeExecutions
    .filter((item) => item.status === 'failed')
    .map((item) => item.id)
  const withheldRuntimeExecutionIds = runtimeExecutions
    .filter((item) => item.status === 'withheld' || item.status === 'dry_run')
    .map((item) => item.id)
  const deniedRuntimeExecutionIds = runtimeExecutions
    .filter((item) => item.status === 'denied' || item.policyDecision.toLowerCase().includes('deny'))
    .map((item) => item.id)
  const failureReason = latestFailureReason(timelineEvents)

  return {
    hasFailure:
      failedAgentTaskRunIds.length > 0 ||
      failedRuntimeExecutionIds.length > 0 ||
      withheldRuntimeExecutionIds.length > 0 ||
      deniedRuntimeExecutionIds.length > 0 ||
      Boolean(failureReason),
    failedAgentTaskRunIds,
    failedRuntimeExecutionIds,
    withheldRuntimeExecutionIds,
    deniedRuntimeExecutionIds,
    latestFailureReason: failureReason,
  }
}

function latestFailureReason(timelineEvents: RunTimelineEventSummary[]): string | null {
  return [...timelineEvents]
    .reverse()
    .find((event) => {
      const text = `${event.eventType} ${event.reason}`.toLowerCase()
      return text.includes('fail') || text.includes('denied') || text.includes('withheld')
    })?.reason ?? null
}

async function findRecentCorrelationIds(limit: number): Promise<string[]> {
  const [requestRows, agentRows, runtimeRows, auditRows] = await Promise.all([
    prisma.runRequestRecord.findMany({
      select: { correlationId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
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

  return [...requestRows, ...agentRows, ...runtimeRows, ...auditRows]
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
