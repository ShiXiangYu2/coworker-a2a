import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runRuntimeDispatchJobOnce } from '../runner'

vi.mock('../repository', () => ({
  RuntimeExecutionApiError: class RuntimeExecutionApiError extends Error {
    constructor(message: string, public readonly status = 400) {
      super(message)
    }
  },
  claimRuntimeDispatchJobById: vi.fn(async ({ id, workerId }) => ({
    record: { id, status: 'leased', leaseOwner: workerId },
    attempt: { id: 'attempt-claim-1', status: 'leased', workerId },
    auditEvent: { id: 'audit-claim-1', eventType: 'runtime_dispatch_job.claimed_by_id' },
    safetyNote: 'Sprint 22 runtime execution is limited to a single scoped low-risk connector action.',
  })),
  startRuntimeDispatchJob: vi.fn(async ({ id, workerId }) => ({
    record: { id, status: 'running', leaseOwner: workerId },
    attempt: { id: 'attempt-start-1', status: 'running', workerId },
    auditEvent: { id: 'audit-start-1', eventType: 'runtime_dispatch_job.started' },
    safetyNote: 'Sprint 22 runtime execution is limited to a single scoped low-risk connector action.',
  })),
  completeRuntimeDispatchJobDryRun: vi.fn(async ({ id, workerId }) => ({
    record: { id, status: 'succeeded', leaseOwner: workerId },
    token: { id: 'token-1', status: 'consumed' },
    receipt: { id: 'receipt-dry-run-1', status: 'dry_run' },
    recovery: { id: 'recovery-dry-run-1', recoveryKind: 'post_execute' },
    auditEvent: { id: 'audit-dry-run-1', eventType: 'runtime_dispatch_job.completed_dry_run' },
    safetyNote: 'Sprint 22 runtime execution is limited to a single scoped low-risk connector action.',
  })),
  completeRuntimeDispatchJobObsidianWrite: vi.fn(async ({ id, workerId }) => ({
    record: { id, status: 'succeeded', leaseOwner: workerId },
    token: { id: 'token-1', status: 'consumed' },
    receipt: { id: 'receipt-obsidian-1', status: 'succeeded' },
    recovery: { id: 'recovery-obsidian-1', recoveryKind: 'post_execute' },
    connectorReceipt: {
      id: 'connector-receipt-1',
      status: 'succeeded',
      action: 'write_local_markdown_draft',
      path: 'D:\\AI-Vault\\Inbox\\AI Drafts\\weekly-note.md',
    },
    auditEvent: { id: 'audit-obsidian-1', eventType: 'runtime_dispatch_job.completed_obsidian_write' },
    safetyNote: 'Sprint 22 runtime execution is limited to a single scoped low-risk connector action.',
  })),
}))

import {
  claimRuntimeDispatchJobById,
  completeRuntimeDispatchJobDryRun,
  completeRuntimeDispatchJobObsidianWrite,
  startRuntimeDispatchJob,
} from '../repository'

describe('Sprint 22 runtime runner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('runs dry_run via claim -> start -> complete-dry-run', async () => {
    const result = await runRuntimeDispatchJobOnce({
      jobId: 'job-1',
      workerId: 'worker-1',
      mode: 'dry_run',
    })

    expect(claimRuntimeDispatchJobById).toHaveBeenCalledWith(expect.objectContaining({
      id: 'job-1',
      workerId: 'worker-1',
    }))
    expect(startRuntimeDispatchJob).toHaveBeenCalledWith(expect.objectContaining({
      id: 'job-1',
      workerId: 'worker-1',
    }))
    expect(completeRuntimeDispatchJobDryRun).toHaveBeenCalledWith(expect.objectContaining({
      id: 'job-1',
      workerId: 'worker-1',
    }))
    expect(result.completion.receipt.status).toBe('dry_run')
  })

  it('rejects obsidian_write without explicit execute=true', async () => {
    await expect(runRuntimeDispatchJobOnce({
      jobId: 'job-1',
      workerId: 'worker-1',
      mode: 'obsidian_write',
    })).rejects.toThrow('requires execute=true')

    expect(claimRuntimeDispatchJobById).not.toHaveBeenCalled()
    expect(startRuntimeDispatchJob).not.toHaveBeenCalled()
    expect(completeRuntimeDispatchJobObsidianWrite).not.toHaveBeenCalled()
  })

  it('runs obsidian_write with explicit execute=true', async () => {
    const result = await runRuntimeDispatchJobOnce({
      jobId: 'job-1',
      workerId: 'worker-1',
      mode: 'obsidian_write',
      execute: true,
      vaultPath: 'D:\\AI-Vault',
    })

    expect(claimRuntimeDispatchJobById).toHaveBeenCalledWith(expect.objectContaining({
      id: 'job-1',
      workerId: 'worker-1',
    }))
    expect(startRuntimeDispatchJob).toHaveBeenCalledWith(expect.objectContaining({
      id: 'job-1',
      workerId: 'worker-1',
    }))
    expect(completeRuntimeDispatchJobObsidianWrite).toHaveBeenCalledWith(expect.objectContaining({
      id: 'job-1',
      workerId: 'worker-1',
      execute: true,
      vaultPath: 'D:\\AI-Vault',
    }))
    expect(result.completion.receipt.status).toBe('succeeded')
  })
})
