import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import {
  listRecentRuntimeExecutionRecords,
  listRuntimeExecutionRecordsByCorrelationId,
} from '../repository'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    runtimeExecutionRecord: {
      findMany: vi.fn(),
    },
  },
}))

describe('runtime execution repository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists recent runtime execution records', async () => {
    vi.mocked(prisma.runtimeExecutionRecord.findMany).mockResolvedValueOnce([
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
        createdAt: new Date('2026-06-19T00:00:00.000Z'),
        updatedAt: new Date('2026-06-19T00:01:00.000Z'),
      },
    ] as never)

    const result = await listRecentRuntimeExecutionRecords({ limit: 3 })

    expect(prisma.runtimeExecutionRecord.findMany).toHaveBeenCalledWith({
      take: 3,
      orderBy: { createdAt: 'desc' },
    })
    expect(result[0]?.toolId).toBe('obsidian.write_draft')
  })

  it('lists runtime execution records by correlation id', async () => {
    vi.mocked(prisma.runtimeExecutionRecord.findMany).mockResolvedValueOnce([
      {
        id: 'runtime-2',
        correlationId: 'corr-2',
        toolId: 'obsidian.write_draft',
        action: 'write_local_markdown_draft',
        status: 'dry_run',
        policyDecision: 'allow_dry_run',
        targetPath: 'D:\\AI知识库\\Inbox\\AI Drafts\\demo.md',
        approvalRecordId: null,
        executionPlanId: 'plan-2',
        createdAt: new Date('2026-06-19T00:00:00.000Z'),
        updatedAt: new Date('2026-06-19T00:01:00.000Z'),
      },
    ] as never)

    const result = await listRuntimeExecutionRecordsByCorrelationId({
      correlationId: 'corr-2',
      limit: 12,
    })

    expect(prisma.runtimeExecutionRecord.findMany).toHaveBeenCalledWith({
      where: { correlationId: 'corr-2' },
      take: 12,
      orderBy: { createdAt: 'asc' },
    })
    expect(result[0]?.policyDecision).toBe('allow_dry_run')
  })
})
