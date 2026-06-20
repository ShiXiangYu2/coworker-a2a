import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { verifyRuntimeDispatchJobOnce } from '../verify-once'

vi.mock('../repository', () => ({
  RuntimeExecutionApiError: class RuntimeExecutionApiError extends Error {
    constructor(message: string, public readonly status = 400) {
      super(message)
    }
  },
  getRuntimeDispatchJobById: vi.fn(async (jobId) => ({
    id: jobId,
    status: 'running',
    attemptCount: 1,
    connectorId: 'obsidian_local',
    actionType: 'write_local_markdown_draft',
    createdAt: new Date('2026-06-19T00:00:00.000Z'),
    startedAt: new Date('2026-06-19T00:00:00.000Z'),
    completedAt: null,
  })),
  listRuntimeDispatchAttempts: vi.fn(async (jobId) => [
    { id: 'attempt-1', jobId, status: 'leased' },
    { id: 'attempt-2', jobId, status: 'running' },
  ]),
  getRuntimeExecutionReceiptByJobId: vi.fn(async (jobId) => ({
    id: 'receipt-1',
    jobId,
    status: 'dry_run',
  })),
  listRuntimeRecoveryPoints: vi.fn(async (jobId) => [
    { id: 'recovery-1', jobId, recoveryKind: 'post_execute' },
  ]),
  completeRuntimeDispatchJobObsidianWrite: vi.fn(),
}))

import {
  getRuntimeDispatchJobById,
  getRuntimeExecutionReceiptByJobId,
  listRuntimeDispatchAttempts,
  listRuntimeRecoveryPoints,
} from '../repository'

describe('Sprint 22 runtime verify-once helper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects missing jobId or workerId', async () => {
    await expect(verifyRuntimeDispatchJobOnce({
      jobId: '',
      workerId: 'worker-1',
    })).rejects.toThrow('jobId is required')

    await expect(verifyRuntimeDispatchJobOnce({
      jobId: 'job-1',
      workerId: '',
    })).rejects.toThrow('workerId is required')
  })

  it('queries job state and returns audit summary with attempts, receipt, and recovery', async () => {
    const result = await verifyRuntimeDispatchJobOnce({
      jobId: 'job-1',
      workerId: 'worker-1',
      leaseDurationMs: 60000,
    })

    expect(getRuntimeDispatchJobById).toHaveBeenCalledWith('job-1')
    expect(listRuntimeDispatchAttempts).toHaveBeenCalledWith('job-1')
    expect(getRuntimeExecutionReceiptByJobId).toHaveBeenCalledWith('job-1')
    expect(listRuntimeRecoveryPoints).toHaveBeenCalledWith('job-1')
    expect(result.ok).toBe(true)
    expect(result.job.id).toBe('job-1')
    expect(result.job.status).toBe('running')
    expect(result.audit.attempts).toHaveLength(2)
    expect(result.audit.receipt?.status).toBe('dry_run')
    expect(result.audit.recovery[0].recoveryKind).toBe('post_execute')
    expect(result.safetyNote).toBeTruthy()
  })

  it('documents hard-denied capabilities in the runbook', () => {
    const runbook = readFileSync(join(process.cwd(), 'docs/runtime-execution-runbook.md'), 'utf8')

    expect(runbook).toContain('shell')
    expect(runbook).toContain('Git / PR')
    expect(runbook).toContain('deploy')
    expect(runbook).toContain('MCP')
    expect(runbook).toContain('external API')
    expect(runbook).toContain('Tool Registry')
    expect(runbook).toContain('arbitrary file write')
    expect(runbook).toContain('multi connector / multi step')
  })
})
