import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { listAuditEvents } from '@/lib/observability/repository'
import {
  listAgentTaskRunRecordsByCorrelationId,
} from '@/lib/agent-task-runner/repository'
import {
  listRuntimeExecutionRecordsByCorrelationId,
} from '@/lib/execution-runtime/repository'
import type { HarmonyAuditEvent } from '@/lib/harmony/types'
import { getRunByCorrelationId, listRecentRuns } from '../repository'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    agentTaskRunRecord: {
      findMany: vi.fn(),
    },
    runtimeExecutionRecord: {
      findMany: vi.fn(),
    },
    harmonyAuditEvent: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/agent-task-runner/repository', () => ({
  listAgentTaskRunRecordsByCorrelationId: vi.fn(),
}))

vi.mock('@/lib/execution-runtime/repository', () => ({
  listRuntimeExecutionRecordsByCorrelationId: vi.fn(),
}))

vi.mock('@/lib/observability/repository', () => ({
  listAuditEvents: vi.fn(),
}))

const agentRuns = [
  {
    id: 'agent-run-1',
    correlationId: 'corr-1',
    orchestrator: 'elon',
    agentId: 'research.agent',
    taskId: 'research-1',
    taskType: 'research_competitor_evidence',
    status: 'completed',
    startedAt: '2026-06-19T00:00:00.000Z',
    completedAt: '2026-06-19T00:01:00.000Z',
    createdAt: '2026-06-19T00:00:00.000Z',
  },
]

const runtimeExecutions = [
  {
    id: 'runtime-1',
    correlationId: 'corr-1',
    toolId: 'obsidian.write_draft',
    action: 'write_local_markdown_draft',
    status: 'succeeded',
    policyDecision: 'allow_controlled_execution',
    targetPath: 'D:\\AI知识库\\Inbox\\AI Drafts\\demo.md',
    approvalRecordId: 'approval-1',
    executionPlanId: 'plan-1',
    createdAt: '2026-06-19T00:02:00.000Z',
    updatedAt: '2026-06-19T00:03:00.000Z',
  },
]

const timelineEvents: HarmonyAuditEvent[] = [
  {
    id: 'audit-1',
    correlationId: 'corr-1',
    taskId: undefined,
    taskRunId: undefined,
    taskStepId: undefined,
    eventType: 'task.created',
    actorType: 'system',
    actorId: undefined,
    beforeStatus: undefined,
    afterStatus: undefined,
    reason: 'Request received.',
    payload: undefined,
    createdAt: '2026-06-19T00:00:00.000Z',
  },
]

describe('runs repository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(listAgentTaskRunRecordsByCorrelationId).mockResolvedValue(agentRuns)
    vi.mocked(listRuntimeExecutionRecordsByCorrelationId).mockResolvedValue(runtimeExecutions)
    vi.mocked(listAuditEvents).mockResolvedValue(timelineEvents)
  })

  it('returns a full run by correlation id', async () => {
    const run = await getRunByCorrelationId({ correlationId: 'corr-1' })

    expect(run).toMatchObject({
      correlationId: 'corr-1',
      orchestrator: 'elon',
      status: 'succeeded',
      latestReceiptStatus: 'succeeded',
      latestRuntimeRecordId: 'runtime-1',
    })
    expect(run.agentTaskRuns).toHaveLength(1)
    expect(run.runtimeExecutions).toHaveLength(1)
    expect(run.timelineEvents).toHaveLength(1)
  })

  it('lists recent runs from recent correlation ids', async () => {
    vi.mocked(prisma.agentTaskRunRecord.findMany).mockResolvedValueOnce([
      { correlationId: 'corr-1', createdAt: new Date('2026-06-19T00:03:00.000Z') },
    ] as never)
    vi.mocked(prisma.runtimeExecutionRecord.findMany).mockResolvedValueOnce([
      { correlationId: 'corr-1', createdAt: new Date('2026-06-19T00:02:00.000Z') },
    ] as never)
    vi.mocked(prisma.harmonyAuditEvent.findMany).mockResolvedValueOnce([
      { correlationId: 'corr-2', createdAt: new Date('2026-06-19T00:01:00.000Z') },
    ] as never)

    const runs = await listRecentRuns({ limit: 2 })

    expect(runs.map((run) => run.correlationId)).toEqual(['corr-1', 'corr-2'])
    expect(prisma.agentTaskRunRecord.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 2 }))
  })

  it('derives failed and withheld statuses', async () => {
    vi.mocked(listAgentTaskRunRecordsByCorrelationId).mockResolvedValueOnce([
      { ...agentRuns[0], status: 'failed' },
    ])
    vi.mocked(listRuntimeExecutionRecordsByCorrelationId).mockResolvedValueOnce([])
    const failedRun = await getRunByCorrelationId({ correlationId: 'corr-failed' })
    expect(failedRun.status).toBe('failed')

    vi.mocked(listAgentTaskRunRecordsByCorrelationId).mockResolvedValueOnce(agentRuns)
    vi.mocked(listRuntimeExecutionRecordsByCorrelationId).mockResolvedValueOnce([
      { ...runtimeExecutions[0], status: 'dry_run', policyDecision: 'allow_dry_run' },
    ])
    const withheldRun = await getRunByCorrelationId({ correlationId: 'corr-withheld' })
    expect(withheldRun.status).toBe('withheld')
  })
})
