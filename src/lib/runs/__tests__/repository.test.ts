import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { listAuditEvents } from '@/lib/observability/repository'
import {
  listAgentTaskRunRecordsByCorrelationId,
} from '@/lib/agent-task-runner/repository'
import {
  listRuntimeExecutionRecordsByCorrelationId,
} from '@/lib/execution-runtime/repository'
import {
  getRunRequestByCorrelationId,
} from '@/lib/run-requests/repository'
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
    runRequestRecord: {
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

vi.mock('@/lib/run-requests/repository', () => ({
  getRunRequestByCorrelationId: vi.fn(),
}))

vi.mock('@/lib/observability/repository', () => ({
  listAuditEvents: vi.fn(),
}))

const runRequest = {
  id: 'run-request-1',
  correlationId: 'corr-1',
  source: 'demo.competitor_weekly',
  userMessage: '帮我把今天的竞品资料整理成周报草稿',
  orchestrator: 'elon',
  status: 'succeeded' as const,
  metadataJson: '{}',
  startedAt: '2026-06-19T00:00:00.000Z',
  completedAt: '2026-06-19T00:03:00.000Z',
  createdAt: '2026-06-19T00:00:00.000Z',
  updatedAt: '2026-06-19T00:03:00.000Z',
}

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

const failureTimelineEvents: HarmonyAuditEvent[] = [
  ...timelineEvents,
  {
    id: 'audit-2',
    correlationId: 'corr-1',
    taskId: undefined,
    taskRunId: undefined,
    taskStepId: undefined,
    eventType: 'task.failed',
    actorType: 'system',
    actorId: undefined,
    beforeStatus: undefined,
    afterStatus: undefined,
    reason: 'Runtime denied by policy.',
    payload: undefined,
    createdAt: '2026-06-19T00:04:00.000Z',
  },
]

describe('runs repository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getRunRequestByCorrelationId).mockResolvedValue(runRequest)
    vi.mocked(listAgentTaskRunRecordsByCorrelationId).mockResolvedValue(agentRuns)
    vi.mocked(listRuntimeExecutionRecordsByCorrelationId).mockResolvedValue(runtimeExecutions)
    vi.mocked(listAuditEvents).mockResolvedValue(timelineEvents)
  })

  it('returns a full run by correlation id', async () => {
    const run = await getRunByCorrelationId({ correlationId: 'corr-1' })

    expect(run).toMatchObject({
      correlationId: 'corr-1',
      runRequestRecordId: 'run-request-1',
      source: 'demo.competitor_weekly',
      userMessage: '帮我把今天的竞品资料整理成周报草稿',
      requestStatus: 'succeeded',
      orchestrator: 'elon',
      status: 'succeeded',
      latestReceiptStatus: 'succeeded',
      latestRuntimeRecordId: 'runtime-1',
    })
    expect(run.agentTaskRuns).toHaveLength(1)
    expect(run.runtimeExecutions).toHaveLength(1)
    expect(run.timelineEvents).toHaveLength(1)
    expect(run.failureSummary).toEqual({
      hasFailure: false,
      failedAgentTaskRunIds: [],
      failedRuntimeExecutionIds: [],
      withheldRuntimeExecutionIds: [],
      deniedRuntimeExecutionIds: [],
      latestFailureReason: null,
    })
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
    vi.mocked(prisma.runRequestRecord.findMany).mockResolvedValueOnce([
      { correlationId: 'corr-request', createdAt: new Date('2026-06-19T00:04:00.000Z') },
    ] as never)

    const runs = await listRecentRuns({ limit: 2 })

    expect(runs.map((run) => run.correlationId)).toEqual(['corr-request', 'corr-1'])
    expect(prisma.agentTaskRunRecord.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 2 }))
  })

  it('returns a chathub run from request record and audit events only', async () => {
    vi.mocked(getRunRequestByCorrelationId).mockResolvedValueOnce({
      ...runRequest,
      id: 'run-request-chat',
      correlationId: 'corr-chat',
      source: 'chathub',
      userMessage: 'hello from ChatHub',
      status: 'succeeded',
    })
    vi.mocked(listAgentTaskRunRecordsByCorrelationId).mockResolvedValueOnce([])
    vi.mocked(listRuntimeExecutionRecordsByCorrelationId).mockResolvedValueOnce([])
    vi.mocked(listAuditEvents).mockResolvedValueOnce([
      {
        ...timelineEvents[0],
        id: 'audit-chat',
        correlationId: 'corr-chat',
        eventType: 'chathub.response_completed',
        actorType: 'chathub',
        reason: 'ChatHub streamed the response to completion.',
      },
    ])

    const run = await getRunByCorrelationId({ correlationId: 'corr-chat' })

    expect(run).toMatchObject({
      correlationId: 'corr-chat',
      runRequestRecordId: 'run-request-chat',
      source: 'chathub',
      userMessage: 'hello from ChatHub',
      requestStatus: 'succeeded',
      status: 'succeeded',
    })
    expect(run.agentTaskRuns).toHaveLength(0)
    expect(run.runtimeExecutions).toHaveLength(0)
    expect(run.timelineEvents[0]?.eventType).toBe('chathub.response_completed')
  })

  it('aggregates chathub request and agent task runs together', async () => {
    vi.mocked(getRunRequestByCorrelationId).mockResolvedValueOnce({
      ...runRequest,
      id: 'run-request-chat-agent',
      correlationId: 'corr-chat-agent',
      source: 'chathub',
      userMessage: 'route to jobs agent',
      orchestrator: 'route_engine',
      status: 'running',
    })
    vi.mocked(listAgentTaskRunRecordsByCorrelationId).mockResolvedValueOnce([
      {
        ...agentRuns[0],
        id: 'agent-run-chat-1',
        correlationId: 'corr-chat-agent',
        orchestrator: 'route_engine',
        agentId: 'jobs',
        taskId: 'chathub-single-agent',
        taskType: 'chat_single_agent',
      },
    ])
    vi.mocked(listRuntimeExecutionRecordsByCorrelationId).mockResolvedValueOnce([])
    vi.mocked(listAuditEvents).mockResolvedValueOnce([
      {
        ...timelineEvents[0],
        id: 'audit-chat-agent',
        correlationId: 'corr-chat-agent',
        eventType: 'agent_task.started',
        actorType: 'agent',
        reason: 'ChatHub agent task execution started.',
      },
    ])

    const run = await getRunByCorrelationId({ correlationId: 'corr-chat-agent' })

    expect(run).toMatchObject({
      correlationId: 'corr-chat-agent',
      source: 'chathub',
      requestStatus: 'running',
      orchestrator: 'route_engine',
    })
    expect(run.agentTaskRuns).toHaveLength(1)
    expect(run.agentTaskRuns[0]?.taskType).toBe('chat_single_agent')
    expect(run.timelineEvents[0]?.eventType).toBe('agent_task.started')
  })

  it('derives failed and withheld statuses', async () => {
    vi.mocked(getRunRequestByCorrelationId).mockResolvedValueOnce(null)
    vi.mocked(listAgentTaskRunRecordsByCorrelationId).mockResolvedValueOnce([
      { ...agentRuns[0], status: 'failed' },
    ])
    vi.mocked(listRuntimeExecutionRecordsByCorrelationId).mockResolvedValueOnce([])
    const failedRun = await getRunByCorrelationId({ correlationId: 'corr-failed' })
    expect(failedRun.status).toBe('failed')
    expect(failedRun.failureSummary.failedAgentTaskRunIds).toEqual(['agent-run-1'])

    vi.mocked(getRunRequestByCorrelationId).mockResolvedValueOnce(null)
    vi.mocked(listAgentTaskRunRecordsByCorrelationId).mockResolvedValueOnce(agentRuns)
    vi.mocked(listRuntimeExecutionRecordsByCorrelationId).mockResolvedValueOnce([
      { ...runtimeExecutions[0], status: 'dry_run', policyDecision: 'allow_dry_run' },
    ])
    const withheldRun = await getRunByCorrelationId({ correlationId: 'corr-withheld' })
    expect(withheldRun.status).toBe('withheld')
    expect(withheldRun.failureSummary.withheldRuntimeExecutionIds).toEqual(['runtime-1'])
  })

  it('derives failed and denied runtime failure summaries', async () => {
    vi.mocked(listRuntimeExecutionRecordsByCorrelationId).mockResolvedValueOnce([
      { ...runtimeExecutions[0], status: 'failed' },
      { ...runtimeExecutions[0], id: 'runtime-2', status: 'denied', policyDecision: 'deny_execution' },
    ])
    vi.mocked(listAuditEvents).mockResolvedValueOnce(failureTimelineEvents)

    const run = await getRunByCorrelationId({ correlationId: 'corr-runtime-failures' })

    expect(run.failureSummary.hasFailure).toBe(true)
    expect(run.failureSummary.failedRuntimeExecutionIds).toEqual(['runtime-1'])
    expect(run.failureSummary.deniedRuntimeExecutionIds).toEqual(['runtime-2'])
    expect(run.failureSummary.latestFailureReason).toBe('Runtime denied by policy.')
  })
})
