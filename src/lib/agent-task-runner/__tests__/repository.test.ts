import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import {
  listAgentTaskRunRecordsByCorrelationId,
  listRecentAgentTaskRunRecords,
} from '../repository'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    agentTaskRunRecord: {
      findMany: vi.fn(),
    },
  },
}))

describe('agent task run repository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists recent agent task run records', async () => {
    vi.mocked(prisma.agentTaskRunRecord.findMany).mockResolvedValueOnce([
      {
        id: 'agent-run-1',
        correlationId: 'corr-1',
        orchestrator: 'elon',
        agentId: 'research.agent',
        taskId: 'task-1',
        taskType: 'research_competitor_evidence',
        status: 'completed',
        startedAt: new Date('2026-06-19T00:00:00.000Z'),
        completedAt: new Date('2026-06-19T00:01:00.000Z'),
        createdAt: new Date('2026-06-19T00:00:00.000Z'),
      },
    ] as never)

    const result = await listRecentAgentTaskRunRecords({ limit: 5 })

    expect(prisma.agentTaskRunRecord.findMany).toHaveBeenCalledWith({
      take: 5,
      orderBy: { createdAt: 'desc' },
    })
    expect(result).toEqual([
      expect.objectContaining({
        id: 'agent-run-1',
        correlationId: 'corr-1',
        status: 'completed',
      }),
    ])
  })

  it('lists agent task run records by correlation id', async () => {
    vi.mocked(prisma.agentTaskRunRecord.findMany).mockResolvedValueOnce([
      {
        id: 'agent-run-2',
        correlationId: 'corr-2',
        orchestrator: 'elon',
        agentId: 'content.agent',
        taskId: 'task-2',
        taskType: 'compose_weekly_markdown',
        status: 'completed',
        startedAt: new Date('2026-06-19T00:02:00.000Z'),
        completedAt: new Date('2026-06-19T00:03:00.000Z'),
        createdAt: new Date('2026-06-19T00:02:00.000Z'),
      },
    ] as never)

    const result = await listAgentTaskRunRecordsByCorrelationId({
      correlationId: 'corr-2',
      limit: 20,
    })

    expect(prisma.agentTaskRunRecord.findMany).toHaveBeenCalledWith({
      where: { correlationId: 'corr-2' },
      take: 20,
      orderBy: { createdAt: 'asc' },
    })
    expect(result[0]?.taskType).toBe('compose_weekly_markdown')
  })
})
