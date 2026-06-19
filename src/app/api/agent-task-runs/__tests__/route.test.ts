import { describe, expect, it, vi } from 'vitest'
import { GET } from '../route'
import {
  listAgentTaskRunRecordsByCorrelationId,
  listRecentAgentTaskRunRecords,
} from '@/lib/agent-task-runner/repository'

vi.mock('@/lib/agent-task-runner/repository', () => ({
  listAgentTaskRunRecordsByCorrelationId: vi.fn(async () => [
    {
      id: 'agent-run-1',
      correlationId: 'corr-1',
      orchestrator: 'elon',
      agentId: 'research.agent',
      taskId: 'task-1',
      taskType: 'research_competitor_evidence',
      status: 'completed',
      startedAt: '2026-06-19T00:00:00.000Z',
      completedAt: '2026-06-19T00:01:00.000Z',
      createdAt: '2026-06-19T00:00:00.000Z',
    },
  ]),
  listRecentAgentTaskRunRecords: vi.fn(async () => []),
}))

describe('/api/agent-task-runs', () => {
  it('returns agent task runs by correlation id', async () => {
    const response = await GET(new Request('http://localhost/api/agent-task-runs?correlationId=corr-1&limit=5'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.data[0]).toMatchObject({
      id: 'agent-run-1',
      agentId: 'research.agent',
      status: 'completed',
    })
    expect(body.data[0]).not.toHaveProperty('inputJson')
    expect(body.data[0]).not.toHaveProperty('outputJson')
    expect(listAgentTaskRunRecordsByCorrelationId).toHaveBeenCalledWith({
      correlationId: 'corr-1',
      limit: 5,
    })
  })

  it('returns recent agent task runs when correlation id is absent', async () => {
    await GET(new Request('http://localhost/api/agent-task-runs?limit=2'))

    expect(listRecentAgentTaskRunRecords).toHaveBeenCalledWith({ limit: 2 })
  })
})
