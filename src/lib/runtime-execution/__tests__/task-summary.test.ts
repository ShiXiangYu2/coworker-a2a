import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTaskRuntimeExecutionSummary } from '../task-summary'

vi.mock('../repository', () => ({
  RuntimeExecutionApiError: class RuntimeExecutionApiError extends Error {
    constructor(message: string, public readonly status = 400) {
      super(message)
    }
  },
  listRuntimeDispatchJobs: vi.fn(async ({ taskId }) => taskId === 'empty-task'
    ? []
    : [
      { id: 'job-queued', taskId, status: 'queued' },
      { id: 'job-succeeded-dry-run', taskId, status: 'succeeded' },
      { id: 'job-succeeded-real', taskId, status: 'succeeded' },
      { id: 'job-blocked', taskId, status: 'blocked' },
    ]),
}))

vi.mock('@/lib/harmony/repository', () => ({
  getTaskBundle: vi.fn(async (id: string) => id === 'empty-task'
    ? null
    : {
      task: {
        id,
        status: 'queued',
      },
    }),
}))

vi.mock('../timeline', () => ({
  getRuntimeDispatchJobTimeline: vi.fn(async (jobId) => {
    const statusByJobId: Record<string, string> = {
      'job-queued': 'queued',
      'job-succeeded-dry-run': 'succeeded',
      'job-succeeded-real': 'succeeded',
      'job-blocked': 'blocked',
    }
    const receiptByJobId: Record<string, { id: string; status: string } | null> = {
      'job-queued': null,
      'job-succeeded-dry-run': { id: 'receipt-dry-run', status: 'dry_run' },
      'job-succeeded-real': { id: 'receipt-succeeded', status: 'succeeded' },
      'job-blocked': null,
    }
    const createdAtByJobId: Record<string, string> = {
      'job-queued': '2026-06-19T01:00:00.000Z',
      'job-succeeded-dry-run': '2026-06-19T01:01:00.000Z',
      'job-succeeded-real': '2026-06-19T01:02:00.000Z',
      'job-blocked': '2026-06-19T01:03:00.000Z',
    }
    return {
      job: {
        id: jobId,
        status: statusByJobId[jobId],
        createdAt: createdAtByJobId[jobId],
      },
      token: { id: `token-${jobId}`, status: 'active' },
      attempts: [],
      receipt: receiptByJobId[jobId],
      recovery: [],
      derived: {
        hasReceipt: Boolean(receiptByJobId[jobId]),
        receiptStatus: receiptByJobId[jobId]?.status ?? null,
        attemptCount: 0,
        recoveryCount: 0,
        isTerminal: statusByJobId[jobId] !== 'queued',
        leaseActive: false,
      },
      safetyNote: 'Sprint 22 runtime execution is limited to queued records only.',
    }
  }),
}))

import { listRuntimeDispatchJobs } from '../repository'
import { getRuntimeDispatchJobTimeline } from '../timeline'
import { getTaskBundle } from '@/lib/harmony/repository'

describe('Sprint 22 task runtime execution summary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('aggregates task jobs into counts, receipt counts, and derived metadata', async () => {
    const result = await getTaskRuntimeExecutionSummary('task-1')

    expect(getTaskBundle).toHaveBeenCalledWith('task-1')
    expect(listRuntimeDispatchJobs).toHaveBeenCalledWith({ taskId: 'task-1', limit: 100 })
    expect(getRuntimeDispatchJobTimeline).toHaveBeenCalledTimes(4)
    expect(getRuntimeDispatchJobTimeline).toHaveBeenCalledWith('job-queued')
    expect(result.jobs).toHaveLength(4)
    expect(result.taskStatus).toBe('queued')
    expect(result.hasWorkflowProposal).toBe(false)
    expect(result.hasEvalOrReview).toBe(false)
    expect(result.counts).toEqual({
      total: 4,
      queued: 1,
      leased: 0,
      running: 0,
      succeeded: 2,
      failed: 0,
      blocked: 1,
      cancelled: 0,
    })
    expect(result.receipts).toEqual({
      dryRunCount: 1,
      succeededCount: 1,
    })
    expect(result.derived).toEqual({
      hasAnyLiveJob: true,
      hasAnySucceededJob: true,
      latestJobId: 'job-blocked',
    })
  })

  it('returns an empty summary for tasks without runtime jobs', async () => {
    const result = await getTaskRuntimeExecutionSummary('empty-task')

    expect(result.jobs).toEqual([])
    expect(result.taskStatus).toBeNull()
    expect(result.counts.total).toBe(0)
    expect(result.receipts).toEqual({
      dryRunCount: 0,
      succeededCount: 0,
    })
    expect(result.derived).toEqual({
      hasAnyLiveJob: false,
      hasAnySucceededJob: false,
      latestJobId: null,
    })
  })

  it('rejects missing taskId', async () => {
    await expect(getTaskRuntimeExecutionSummary('  ')).rejects.toThrow('taskId is required')
  })
})
