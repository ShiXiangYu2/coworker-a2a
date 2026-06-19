import { describe, expect, it } from 'vitest'
import { buildOperatorOverviewFromFlows } from '../overview-read-model'
import type { OperatorTaskFlowReadModel } from '../task-flow-read-model'

const flows: OperatorTaskFlowReadModel[] = [
  {
    taskId: 'task-1',
    title: 'Active task',
    status: 'assigned',
    lifecycle: {
      phase: 'execution',
      source: 'runtime',
      reason: 'Latest runtime job is running.',
    },
    nodes: [
      {
        id: 'task-1',
        type: 'task',
        title: 'Active task',
        status: 'assigned',
        createdAt: '2026-06-19T01:00:00.000Z',
      },
      {
        id: 'agent-run-1',
        type: 'agent_run',
        title: 'Agent jobs',
        status: 'completed',
        createdAt: '2026-06-19T01:01:00.000Z',
      },
      {
        id: 'runtime-job-1',
        type: 'runtime_job',
        title: 'obsidian_local / write_local_markdown_draft',
        status: 'running',
        summary: 'Runtime dispatch job read-only status.',
        createdAt: '2026-06-19T01:02:00.000Z',
      },
      {
        id: 'receipt-1',
        type: 'runtime_receipt',
        title: 'dry-run:runtime-job-1',
        status: 'dry_run',
        summary: 'Dry-run receipt recorded.',
        createdAt: '2026-06-19T01:03:00.000Z',
      },
    ],
  },
  {
    taskId: 'task-2',
    title: 'Blocked task',
    status: 'blocked',
    lifecycle: {
      phase: 'repair',
      source: 'runtime',
      reason: 'A blocked runtime record requires repair.',
    },
    nodes: [
      {
        id: 'task-2',
        type: 'task',
        title: 'Blocked task',
        status: 'blocked',
        summary: 'Task is blocked.',
        createdAt: '2026-06-19T02:00:00.000Z',
      },
      {
        id: 'agent-run-2',
        type: 'agent_run',
        title: 'Agent linus',
        status: 'failed',
        summary: 'Agent analysis failed.',
        createdAt: '2026-06-19T02:01:00.000Z',
      },
      {
        id: 'runtime-job-2',
        type: 'runtime_job',
        title: 'obsidian_local / write_local_markdown_draft',
        status: 'blocked',
        summary: 'Runtime dispatch job blocked.',
        createdAt: '2026-06-19T02:02:00.000Z',
      },
      {
        id: 'audit-1',
        type: 'audit',
        title: 'agent.run_failed',
        status: 'failed',
        summary: 'AgentRun failed analysis only.',
        createdAt: '2026-06-19T02:03:00.000Z',
      },
    ],
  },
]

describe('operator overview read model', () => {
  it('derives active runtime, blocked summary, and recent receipts from task flows', () => {
    const overview = buildOperatorOverviewFromFlows(flows)

    expect(overview.totals).toMatchObject({
      taskFlows: 2,
      tasks: 2,
      agentRuns: 2,
      runtimeJobs: 2,
      runtimeReceipts: 1,
    })
    expect(overview.activeRuntime.items).toEqual([
      expect.objectContaining({
        id: 'runtime-job-1',
        taskId: 'task-1',
        status: 'running',
      }),
    ])
    expect(overview.blockedSummary.items.map((item) => item.source)).toEqual([
      'audit',
      'runtime_job',
      'agent_run',
      'task',
      'lifecycle',
    ])
    expect(overview.recentReceipts.items).toEqual([
      expect.objectContaining({
        id: 'receipt-1',
        status: 'dry_run',
      }),
    ])
    expect(overview.safetyNote).toContain('read-only derived view')
  })
})
