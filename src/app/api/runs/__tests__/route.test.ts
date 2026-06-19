import { describe, expect, it, vi } from 'vitest'
import { GET } from '../route'
import { listRecentRuns } from '@/lib/runs/repository'

vi.mock('@/lib/runs/repository', () => ({
  listRecentRuns: vi.fn(async () => [
    {
      correlationId: 'corr-1',
      runRequestRecordId: 'run-request-1',
      source: 'demo.competitor_weekly',
      userMessage: '帮我把今天的竞品资料整理成周报草稿',
      requestStatus: 'succeeded',
      orchestrator: 'elon',
      status: 'succeeded',
      startedAt: '2026-06-19T00:00:00.000Z',
      completedAt: '2026-06-19T00:03:00.000Z',
      agentTaskRuns: [],
      runtimeExecutions: [],
      timelineEvents: [],
      latestReceiptStatus: 'succeeded',
      latestRuntimeRecordId: 'runtime-1',
      failureSummary: {
        hasFailure: false,
        failedAgentTaskRunIds: [],
        failedRuntimeExecutionIds: [],
        withheldRuntimeExecutionIds: [],
        deniedRuntimeExecutionIds: [],
        latestFailureReason: null,
      },
    },
  ]),
}))

describe('/api/runs', () => {
  it('returns recent aggregated runs without execution payloads', async () => {
    const response = await GET(new Request('http://localhost/api/runs?limit=80'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.data[0]).toMatchObject({
      correlationId: 'corr-1',
      requestStatus: 'succeeded',
      status: 'succeeded',
      latestReceiptStatus: 'succeeded',
    })
    expect(body.data[0].failureSummary).toMatchObject({
      hasFailure: false,
      latestFailureReason: null,
    })
    expect(body.data[0]).not.toHaveProperty('inputJson')
    expect(body.data[0]).not.toHaveProperty('outputJson')
    expect(body.data[0]).not.toHaveProperty('receiptJson')
    expect(listRecentRuns).toHaveBeenCalledWith({ limit: 50 })
  })
})
