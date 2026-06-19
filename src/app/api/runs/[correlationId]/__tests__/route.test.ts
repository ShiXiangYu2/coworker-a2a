import { describe, expect, it, vi } from 'vitest'
import { GET } from '../route'
import { getRunByCorrelationId } from '@/lib/runs/repository'

vi.mock('@/lib/runs/repository', () => ({
  getRunByCorrelationId: vi.fn(async () => ({
    correlationId: 'corr-1',
    orchestrator: 'elon',
    status: 'withheld',
    startedAt: '2026-06-19T00:00:00.000Z',
    completedAt: '2026-06-19T00:03:00.000Z',
    latestReceiptStatus: 'dry_run',
    latestRuntimeRecordId: 'runtime-1',
    agentTaskRuns: [
      {
        id: 'agent-run-1',
        agentId: 'research.agent',
        taskId: 'task-1',
        taskType: 'research_competitor_evidence',
        status: 'completed',
      },
    ],
    runtimeExecutions: [
      {
        id: 'runtime-1',
        toolId: 'obsidian.write_draft',
        action: 'write_local_markdown_draft',
        policyDecision: 'allow_dry_run',
        status: 'dry_run',
        targetPath: 'D:\\AI知识库\\Inbox\\AI Drafts\\demo.md',
        approvalRecordId: null,
      },
    ],
    timelineEvents: [
      {
        id: 'audit-1',
        eventType: 'task.created',
        actorType: 'system',
        reason: 'Request received.',
        createdAt: '2026-06-19T00:00:00.000Z',
      },
    ],
  })),
}))

describe('/api/runs/[correlationId]', () => {
  it('returns one aggregated run by correlation id', async () => {
    const response = await GET(new Request('http://localhost/api/runs/corr-1'), {
      params: Promise.resolve({ correlationId: 'corr-1' }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.data).toMatchObject({
      correlationId: 'corr-1',
      status: 'withheld',
      latestReceiptStatus: 'dry_run',
    })
    expect(body.data.agentTaskRuns).toHaveLength(1)
    expect(body.data.runtimeExecutions).toHaveLength(1)
    expect(body.data.timelineEvents).toHaveLength(1)
    expect(getRunByCorrelationId).toHaveBeenCalledWith({ correlationId: 'corr-1' })
  })
})
