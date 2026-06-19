import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listOperatorTaskFlows } from '../task-flow-read-model'

vi.mock('@/lib/harmony/repository', () => ({
  listTasks: vi.fn(async () => [
    {
      task: {
        id: 'task-1',
        title: 'Prepare launch checklist',
        description: 'Coordinate launch readiness.',
        type: 'coordination',
        status: 'assigned',
        targetAgentId: 'jobs',
        confidence: 0.86,
        reason: 'Needs product coordination.',
        createdAt: '2026-06-19T01:00:00.000Z',
      },
    },
  ]),
  getTaskBundle: vi.fn(async () => ({
    task: {
      id: 'task-1',
      title: 'Prepare launch checklist',
      description: 'Coordinate launch readiness.',
      type: 'coordination',
      status: 'assigned',
      targetAgentId: 'jobs',
      confidence: 0.86,
      reason: 'Needs product coordination.',
      createdAt: '2026-06-19T01:00:00.000Z',
    },
  })),
}))

vi.mock('@/lib/agent-runtime/repository', () => ({
  listAgentRunsForTask: vi.fn(async () => [
    {
      agentRun: {
        id: 'agent-run-1',
        agentId: 'jobs',
        status: 'completed',
        runtimeMode: 'analysis_only',
        trigger: 'task_ui',
        correlationId: 'corr-1',
        result: { summary: 'Launch checklist analysis completed.' },
        createdAt: '2026-06-19T01:02:00.000Z',
      },
    },
  ]),
}))

vi.mock('@/lib/runtime-execution/task-summary', () => ({
  getTaskRuntimeExecutionSummary: vi.fn(async () => ({
    taskStatus: 'assigned',
    hasEvalOrReview: false,
    counts: {
      blocked: 0,
      failed: 0,
    },
    jobs: [
      {
        job: {
          id: 'runtime-job-1',
          connectorId: 'obsidian_local',
          actionType: 'write_local_markdown_draft',
          status: 'queued',
          priority: 100,
          attemptCount: 0,
          createdAt: new Date('2026-06-19T01:03:00.000Z'),
        },
        receipt: {
          id: 'receipt-1',
          jobId: 'runtime-job-1',
          connectorId: 'obsidian_local',
          actionType: 'write_local_markdown_draft',
          status: 'dry_run',
          targetRef: 'dry-run:runtime-job-1',
          summary: 'Dry-run receipt recorded.',
          completedAt: new Date('2026-06-19T01:04:00.000Z'),
        },
        derived: {
          receiptStatus: 'dry_run',
        },
      },
    ],
  })),
}))

vi.mock('@/lib/observability/repository', () => ({
  listAuditEvents: vi.fn(async () => [
    {
      id: 'audit-1',
      eventType: 'agent.run_completed',
      actorType: 'agent_placeholder',
      actorId: 'jobs',
      afterStatus: 'completed',
      reason: 'AgentRun completed analysis only.',
      createdAt: '2026-06-19T01:05:00.000Z',
    },
  ]),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    workflowProposal: {
      findMany: vi.fn(async () => [
        {
          id: 'workflow-1',
          title: 'Launch workflow proposal',
          status: 'draft',
          summary: 'A read-only workflow proposal.',
          workflowIntent: 'coordinate',
          riskLevel: 'low',
          correlationId: 'corr-1',
          createdAt: new Date('2026-06-19T01:01:00.000Z'),
        },
      ]),
    },
  },
}))

describe('operator task flow read model', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('aggregates task, workflow, agent run, runtime, receipt, and audit nodes as read-only flow data', async () => {
    const flows = await listOperatorTaskFlows({ limit: 5 })

    expect(flows).toHaveLength(1)
    expect(flows[0]).toMatchObject({
      taskId: 'task-1',
      title: 'Prepare launch checklist',
      lifecycle: {
        phase: 'execution',
        source: 'runtime',
      },
      navigation: {
        taskFlowHref: '/operator?taskFlowTaskId=task-1#task-flow',
        runtimeHref: '/operator?runtimeTaskId=task-1#runtime',
      },
    })
    expect(flows[0].nodes.map((node) => node.type)).toEqual([
      'task',
      'workflow',
      'agent_run',
      'runtime_job',
      'runtime_receipt',
      'audit',
    ])
    expect(flows[0].nodes.find((node) => node.id === 'runtime-job-1')).toMatchObject({
      navigation: {
        taskFlowHref: '/operator?taskFlowTaskId=task-1&taskFlowNodeId=runtime-job-1#task-flow',
        runtimeHref: '/operator?runtimeTaskId=task-1&runtimeSection=summary#runtime',
        runtimeSection: 'summary',
      },
    })
    expect(flows[0].nodes.find((node) => node.id === 'receipt-1')).toMatchObject({
      navigation: {
        taskFlowHref: '/operator?taskFlowTaskId=task-1&taskFlowNodeId=receipt-1#task-flow',
        runtimeHref: '/operator?runtimeTaskId=task-1&runtimeSection=latest-receipt#runtime',
        runtimeSection: 'latest-receipt',
      },
    })
  })
})
