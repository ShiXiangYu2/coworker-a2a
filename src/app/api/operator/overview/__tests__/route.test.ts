import { describe, expect, it, vi } from 'vitest'
import { GET } from '../route'
import { buildOperatorOverviewReadModel } from '@/lib/operator-console/overview-read-model'

vi.mock('@/lib/operator-console/overview-read-model', () => ({
  buildOperatorOverviewReadModel: vi.fn(async () => ({
    generatedAt: '2026-06-19T00:00:00.000Z',
    totals: {
      taskFlows: 1,
      tasks: 1,
      agentRuns: 1,
      runtimeJobs: 1,
      runtimeReceipts: 1,
      blockedSignals: 0,
    },
    activeRuntime: { count: 1, items: [] },
    blockedSummary: { count: 0, items: [] },
    recentReceipts: { count: 1, items: [] },
    recentFlows: [],
    safetyNote: 'Read-only overview.',
  })),
}))

describe('/api/operator/overview', () => {
  it('returns structured operator overview with requested limit', async () => {
    const response = await GET(new Request('http://localhost/api/operator/overview?limit=5'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.data.totals.taskFlows).toBe(1)
    expect(buildOperatorOverviewReadModel).toHaveBeenCalledWith({ limit: 5 })
  })
})
