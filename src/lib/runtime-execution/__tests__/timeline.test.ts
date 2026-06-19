import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getRuntimeDispatchJobTimeline } from '../timeline'

vi.mock('../repository', () => ({
  RuntimeExecutionApiError: class RuntimeExecutionApiError extends Error {
    constructor(message: string, public readonly status = 400) {
      super(message)
    }
  },
  getRuntimeDispatchJobById: vi.fn(async (id) => id === 'missing'
    ? null
    : {
      id,
      runtimeTokenId: 'token-1',
<<<<<<< HEAD
      status: id === 'queued-job' ? 'queued' : id === 'running-job' ? 'running' : 'succeeded',
=======
      status: id === 'running-job' ? 'running' : 'succeeded',
>>>>>>> 5e55954a4c8294d13c20571cd34d44c3bfaf0906
      leaseOwner: id === 'running-job' ? 'worker-1' : null,
      leaseExpiresAt: id === 'running-job' ? new Date('2026-06-19T01:01:00.000Z') : null,
    }),
  getRuntimeExecutionTokenById: vi.fn(async (id) => ({ id, status: 'active' })),
  listRuntimeDispatchAttempts: vi.fn(async (jobId) => [
    { id: 'attempt-1', jobId, status: 'leased' },
    { id: 'attempt-2', jobId, status: 'running' },
  ]),
<<<<<<< HEAD
  getRuntimeExecutionReceiptByJobId: vi.fn(async (jobId) => jobId === 'running-job' || jobId === 'queued-job'
=======
  getRuntimeExecutionReceiptByJobId: vi.fn(async (jobId) => jobId === 'running-job'
>>>>>>> 5e55954a4c8294d13c20571cd34d44c3bfaf0906
    ? null
    : { id: 'receipt-1', jobId, status: 'dry_run' }),
  listRuntimeRecoveryPoints: vi.fn(async (jobId) => [
    { id: 'recovery-1', jobId, recoveryKind: 'post_execute' },
  ]),
}))

import {
  getRuntimeDispatchJobById,
  getRuntimeExecutionReceiptByJobId,
  getRuntimeExecutionTokenById,
  listRuntimeDispatchAttempts,
  listRuntimeRecoveryPoints,
} from '../repository'

describe('Sprint 22 runtime timeline summary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-19T01:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('aggregates job, token, attempts, receipt, recovery, and derived metadata', async () => {
    const result = await getRuntimeDispatchJobTimeline('job-1')

    expect(getRuntimeDispatchJobById).toHaveBeenCalledWith('job-1')
    expect(getRuntimeExecutionTokenById).toHaveBeenCalledWith('token-1')
    expect(listRuntimeDispatchAttempts).toHaveBeenCalledWith('job-1')
    expect(getRuntimeExecutionReceiptByJobId).toHaveBeenCalledWith('job-1')
    expect(listRuntimeRecoveryPoints).toHaveBeenCalledWith('job-1')
    expect(result.job?.id).toBe('job-1')
    expect(result.token?.id).toBe('token-1')
    expect(result.attempts).toHaveLength(2)
    expect(result.receipt?.status).toBe('dry_run')
    expect(result.recovery).toHaveLength(1)
    expect(result.derived).toEqual({
      hasReceipt: true,
      receiptStatus: 'dry_run',
      attemptCount: 2,
      recoveryCount: 1,
      isTerminal: true,
      leaseActive: false,
<<<<<<< HEAD
      issuedRuntimeTokenActive: true,
      awaitingRuntimeExecution: false,
=======
>>>>>>> 5e55954a4c8294d13c20571cd34d44c3bfaf0906
    })
  })

  it('derives active lease state for leased or running jobs', async () => {
    const result = await getRuntimeDispatchJobTimeline('running-job')

    expect(result.derived.hasReceipt).toBe(false)
    expect(result.derived.receiptStatus).toBeNull()
    expect(result.derived.isTerminal).toBe(false)
    expect(result.derived.leaseActive).toBe(true)
<<<<<<< HEAD
    expect(result.derived.awaitingRuntimeExecution).toBe(false)
  })

  it('derives awaiting runtime execution for active-token queued jobs without receipts', async () => {
    const result = await getRuntimeDispatchJobTimeline('queued-job')

    expect(result.job?.status).toBe('queued')
    expect(result.token?.status).toBe('active')
    expect(result.receipt).toBeNull()
    expect(result.derived.issuedRuntimeTokenActive).toBe(true)
    expect(result.derived.awaitingRuntimeExecution).toBe(true)
=======
>>>>>>> 5e55954a4c8294d13c20571cd34d44c3bfaf0906
  })

  it('returns 404-style errors for missing jobs', async () => {
    await expect(getRuntimeDispatchJobTimeline('missing')).rejects.toMatchObject({
      message: 'Runtime dispatch job not found.',
      status: 404,
    })
  })
})
