import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildRuntimeOperatorTaskViewModel } from '../operator-view-model'

vi.mock('../task-summary', () => ({
  getTaskRuntimeExecutionSummary: vi.fn(async (taskId) => taskId === 'empty-task'
    ? {
      taskId,
      taskStatus: 'created',
      hasWorkflowProposal: false,
      hasEvalOrReview: false,
      jobs: [],
      counts: {
        total: 0,
        queued: 0,
        leased: 0,
        running: 0,
        succeeded: 0,
        failed: 0,
        blocked: 0,
        cancelled: 0,
      },
      receipts: {
        dryRunCount: 0,
        succeededCount: 0,
      },
      derived: {
        hasAnyLiveJob: false,
        hasAnySucceededJob: false,
        latestJobId: null,
      },
      safetyNote: 'Sprint 22 runtime execution is limited to queued records only.',
    }
    : {
      taskId,
      taskStatus: 'review',
      hasWorkflowProposal: true,
      hasEvalOrReview: true,
      jobs: [
        {
          job: { id: 'job-queued', status: 'queued' },
          token: { id: 'token-queued', status: 'active' },
          attempts: [],
          receipt: null,
          recovery: [],
          derived: {
            hasReceipt: false,
            receiptStatus: null,
            attemptCount: 0,
            recoveryCount: 0,
            isTerminal: false,
            leaseActive: false,
          },
          safetyNote: 'Sprint 22 runtime execution is limited to queued records only.',
        },
        {
          job: { id: 'job-succeeded', status: 'succeeded' },
          token: { id: 'token-succeeded', status: 'consumed' },
          attempts: [],
          receipt: { id: 'receipt-1', status: 'dry_run' },
          recovery: [],
          derived: {
            hasReceipt: true,
            receiptStatus: 'dry_run',
            attemptCount: 1,
            recoveryCount: 1,
            isTerminal: true,
            leaseActive: false,
          },
          safetyNote: 'Sprint 22 runtime execution is limited to queued records only.',
        },
        {
          job: { id: 'job-failed', status: 'failed' },
          token: { id: 'token-failed', status: 'active' },
          attempts: [],
          receipt: null,
          recovery: [],
          derived: {
            hasReceipt: false,
            receiptStatus: null,
            attemptCount: 1,
            recoveryCount: 1,
            isTerminal: true,
            leaseActive: false,
          },
          safetyNote: 'Sprint 22 runtime execution is limited to queued records only.',
        },
      ],
      counts: {
        total: 3,
        queued: 1,
        leased: 0,
        running: 0,
        succeeded: 1,
        failed: 1,
        blocked: 0,
        cancelled: 0,
      },
      receipts: {
        dryRunCount: 1,
        succeededCount: 0,
      },
      derived: {
        hasAnyLiveJob: true,
        hasAnySucceededJob: true,
        latestJobId: 'job-succeeded',
      },
      safetyNote: 'Sprint 22 runtime execution is limited to queued records only.',
    }),
}))

vi.mock('../runner', () => ({
  runRuntimeDispatchJobOnce: vi.fn(),
}))

vi.mock('../repository', () => ({
  completeRuntimeDispatchJobDryRun: vi.fn(),
  completeRuntimeDispatchJobObsidianWrite: vi.fn(),
}))

import { completeRuntimeDispatchJobDryRun, completeRuntimeDispatchJobObsidianWrite } from '../repository'
import { runRuntimeDispatchJobOnce } from '../runner'
import { getTaskRuntimeExecutionSummary } from '../task-summary'

describe('Sprint 22 runtime operator view-model adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds an operator-facing view model from task runtime summary', async () => {
    const result = await buildRuntimeOperatorTaskViewModel('task-1')

    expect(getTaskRuntimeExecutionSummary).toHaveBeenCalledWith('task-1')
    expect(result.taskId).toBe('task-1')
    expect(result.lifecycle).toEqual({
      phase: 'repair',
      source: 'runtime',
      reason: 'A blocked or failed runtime record requires repair before further progress.',
    })
    expect(result.summary.counts.total).toBe(3)
    expect(result.latestJob?.job?.id).toBe('job-succeeded')
    expect(result.latestReceipt?.status).toBe('dry_run')
    expect(result.statusBands.live).toHaveLength(1)
    expect(result.statusBands.succeeded).toHaveLength(1)
    expect(result.statusBands.failed).toHaveLength(1)
    expect(result.highlight).toEqual({
      primaryStatus: 'failed',
      latestJobId: 'job-succeeded',
      latestReceiptStatus: 'dry_run',
      hasActionableLiveJob: true,
    })
    expect(runRuntimeDispatchJobOnce).not.toHaveBeenCalled()
    expect(completeRuntimeDispatchJobDryRun).not.toHaveBeenCalled()
    expect(completeRuntimeDispatchJobObsidianWrite).not.toHaveBeenCalled()
  })

  it('returns a stable empty operator view model when no runtime jobs exist', async () => {
    const result = await buildRuntimeOperatorTaskViewModel('empty-task')

    expect(result.taskId).toBe('empty-task')
    expect(result.lifecycle).toEqual({
      phase: 'intake',
      source: 'task',
      reason: 'Task status created is still in the intake lane.',
    })
    expect(result.latestJob).toBeNull()
    expect(result.latestReceipt).toBeNull()
    expect(result.jobs).toEqual([])
    expect(result.statusBands).toEqual({
      live: [],
      succeeded: [],
      blocked: [],
      failed: [],
    })
    expect(result.highlight).toEqual({
      primaryStatus: 'empty',
      latestJobId: null,
      latestReceiptStatus: null,
      hasActionableLiveJob: false,
    })
  })
})
