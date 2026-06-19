import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import {
  createRunRequestRecord,
  getRunRequestByCorrelationId,
  updateRunRequestRecordStatus,
} from '../repository'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    runRequestRecord: {
      create: vi.fn(async ({ data }) => ({
        id: 'run-request-1',
        ...data,
        createdAt: new Date('2026-06-19T00:00:00.000Z'),
        updatedAt: new Date('2026-06-19T00:00:01.000Z'),
      })),
      update: vi.fn(async ({ where, data }) => ({
        id: 'run-request-1',
        correlationId: where.correlationId,
        source: 'demo.competitor_weekly',
        userMessage: '帮我把今天的竞品资料整理成周报草稿',
        orchestrator: 'elon',
        metadataJson: '{}',
        startedAt: new Date('2026-06-19T00:00:00.000Z'),
        createdAt: new Date('2026-06-19T00:00:00.000Z'),
        updatedAt: new Date('2026-06-19T00:00:02.000Z'),
        ...data,
      })),
      findUnique: vi.fn(async ({ where }) => where.correlationId === 'corr-1'
        ? {
          id: 'run-request-1',
          correlationId: 'corr-1',
          source: 'demo.competitor_weekly',
          userMessage: '帮我把今天的竞品资料整理成周报草稿',
          orchestrator: 'elon',
          status: 'withheld',
          metadataJson: '{"approved":false}',
          startedAt: new Date('2026-06-19T00:00:00.000Z'),
          completedAt: new Date('2026-06-19T00:03:00.000Z'),
          createdAt: new Date('2026-06-19T00:00:00.000Z'),
          updatedAt: new Date('2026-06-19T00:03:00.000Z'),
        }
        : null),
    },
    harmonyAuditEvent: {
      create: vi.fn(async ({ data }) => ({ id: `audit-${data.eventType}`, ...data })),
    },
  },
}))

describe('run request repository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a run request record and writes a received audit event', async () => {
    const result = await createRunRequestRecord({
      correlationId: 'corr-1',
      source: 'demo.competitor_weekly',
      userMessage: '帮我把今天的竞品资料整理成周报草稿',
      orchestrator: 'elon',
      metadata: { approved: false },
    })

    expect(result.record).toMatchObject({
      id: 'run-request-1',
      correlationId: 'corr-1',
      source: 'demo.competitor_weekly',
      status: 'received',
    })
    expect(prisma.harmonyAuditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        correlationId: 'corr-1',
        eventType: 'run_request.received',
      }),
    }))
  })

  it('updates request status and writes status audit events', async () => {
    const result = await updateRunRequestRecordStatus({
      correlationId: 'corr-1',
      status: 'withheld',
      reason: 'Kelvin approval is still pending.',
    })

    expect(result.record.status).toBe('withheld')
    expect(prisma.harmonyAuditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        correlationId: 'corr-1',
        eventType: 'run_request.withheld',
        reason: 'Kelvin approval is still pending.',
      }),
    }))
  })

  it('loads one run request by correlation id', async () => {
    const record = await getRunRequestByCorrelationId({ correlationId: 'corr-1' })

    expect(record).toMatchObject({
      id: 'run-request-1',
      correlationId: 'corr-1',
      source: 'demo.competitor_weekly',
      status: 'withheld',
    })
  })
})
