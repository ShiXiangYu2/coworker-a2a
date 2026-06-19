import { describe, expect, it, vi } from 'vitest'
import { GET } from '../route'
import { listOperatorTaskFlows } from '@/lib/operator-console/task-flow-read-model'

vi.mock('@/lib/operator-console/task-flow-read-model', () => ({
  listOperatorTaskFlows: vi.fn(async () => [
    {
      taskId: 'task-1',
      title: 'Prepare launch checklist',
      status: 'assigned',
      lifecycle: {
        phase: 'execution',
        source: 'runtime',
        reason: 'Latest runtime job is queued.',
      },
      nodes: [],
    },
  ]),
}))

describe('/api/operator/task-flows', () => {
  it('returns structured task flows with requested limit', async () => {
    const response = await GET(new Request('http://localhost/api/operator/task-flows?limit=5'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.data[0]).toMatchObject({
      taskId: 'task-1',
      lifecycle: { phase: 'execution' },
    })
    expect(listOperatorTaskFlows).toHaveBeenCalledWith({ limit: 5 })
  })
})
