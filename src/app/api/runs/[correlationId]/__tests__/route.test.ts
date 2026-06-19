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
    agentTaskRuns: [],
    runtimeExecutions: [],
    timelineEvents: [],
    latestReceiptStatus: 'dry_run',
    latestRuntimeRecordId: 'runtime-1',
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
    expect(getRunByCorrelationId).toHaveBeenCalledWith({ correlationId: 'corr-1' })
  })
})
