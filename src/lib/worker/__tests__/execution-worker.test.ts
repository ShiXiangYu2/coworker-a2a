import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/runtime-execution', () => ({
  RuntimeExecutionApiError: class RuntimeExecutionApiError extends Error {
    constructor(message: string, public readonly status = 400) {
      super(message)
    }
  },
  listRuntimeDispatchJobs: vi.fn(async () => [{
    id: 'runtime-job-1',
    taskId: 'task-1',
    status: 'queued',
    connectorId: 'obsidian_local',
    actionType: 'write_local_markdown_draft',
    correlationId: 'corr-1',
  }]),
  runRuntimeDispatchJobOnce: vi.fn(async () => ({
    completion: {
      receipt: {
        id: 'receipt-1',
        status: 'dry_run',
      },
    },
  })),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    harmonyTask: {
      findUnique: vi.fn(async () => ({ id: 'task-1', status: 'assigned' })),
      update: vi.fn(async (input) => ({ id: input.where.id, ...input.data })),
    },
    harmonyAuditEvent: {
      create: vi.fn(async (input) => ({ id: 'audit-1', ...input.data })),
    },
  },
}))

vi.mock('../repository', () => ({
  WorkerRepositoryError: class WorkerRepositoryError extends Error {
    constructor(message: string, public readonly status = 400) {
      super(message)
    }
  },
  blockJob: vi.fn(async () => ({ record: { id: 'queue-job-1', status: 'blocked' } })),
  completeJob: vi.fn(async () => ({ record: { id: 'queue-job-1', status: 'completed' } })),
  createWorkerAuditEvent: vi.fn(async (input) => ({ id: 'audit-worker-1', ...input })),
  deadLetterJob: vi.fn(async () => ({ record: { id: 'queue-job-1', status: 'dead_letter' } })),
  deregisterWorker: vi.fn(async () => undefined),
  findPendingJobs: vi.fn(async () => []),
  registerWorker: vi.fn(async () => undefined),
  requeueJob: vi.fn(async () => ({ record: { id: 'queue-job-1', status: 'pending' } })),
  reclaimExpiredLeases: vi.fn(async () => ({ reclaimed: 0, deadLettered: 0, jobIds: [] })),
  tryLeaseJob: vi.fn(async () => null),
  updateHeartbeat: vi.fn(async () => undefined),
  updateJobStatus: vi.fn(async () => undefined),
}))

import {
  ExecutionWorker,
  executeRuntimeDispatchQueueJob,
  WorkerJobBlockedError,
} from '../execution-worker'
import {
  listRuntimeDispatchJobs,
  runRuntimeDispatchJobOnce,
} from '@/lib/runtime-execution'
import { prisma } from '@/lib/prisma'
import type { QueueJobRecord } from '../types'
import {
  blockJob,
  completeJob,
  createWorkerAuditEvent,
} from '../repository'

const queueJob: QueueJobRecord = {
  id: 'queue-job-1',
  idempotencyKey: 'queue-idem-1',
  taskId: 'task-1',
  correlationId: 'corr-1',
  priority: 2,
  status: 'running',
  requiredCapabilities: ['obsidian'],
  requiredAgentRoles: [],
  maxRetries: 2,
  retryCount: 0,
  timeoutMs: 60000,
  scheduledAt: new Date('2026-06-21T00:00:00.000Z'),
  assignedWorkerId: 'worker-1',
  leaseExpiresAt: new Date('2026-06-21T00:01:00.000Z'),
  lastError: null,
  attemptCount: 1,
  startedAt: new Date('2026-06-21T00:00:00.000Z'),
  completedAt: null,
  createdAt: new Date('2026-06-21T00:00:00.000Z'),
  updatedAt: new Date('2026-06-21T00:00:00.000Z'),
}

describe('Production Execution Closure worker runtime executor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('runs one queued RuntimeDispatchJob in dry_run mode and records a non-completing Harmony observation', async () => {
    const result = await executeRuntimeDispatchQueueJob(queueJob, {
      workerId: 'worker-1',
      leaseDurationMs: 60000,
    })

    expect(listRuntimeDispatchJobs).toHaveBeenCalledWith({
      taskId: 'task-1',
      status: 'queued',
      limit: 1,
    })
    expect(runRuntimeDispatchJobOnce).toHaveBeenCalledWith(expect.objectContaining({
      jobId: 'runtime-job-1',
      workerId: 'worker-1',
      mode: 'dry_run',
      leaseDurationMs: 60000,
    }))
    expect(result.status).toBe('completed')
    expect(result.deliverables[0]).toMatchObject({
      runtimeJobId: 'runtime-job-1',
      receiptId: 'receipt-1',
      receiptStatus: 'dry_run',
      mode: 'dry_run',
    })
    expect(prisma.harmonyTask.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'task-1' },
      data: expect.objectContaining({
        statusReason: expect.stringContaining('dry_run'),
      }),
    }))
    expect(prisma.harmonyTask.update).not.toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'completed' }),
    }))
  })

  it('marks an assigned HarmonyTask completed when a real succeeded runtime receipt is produced', async () => {
    vi.mocked(runRuntimeDispatchJobOnce).mockResolvedValueOnce({
      completion: {
        receipt: {
          id: 'receipt-real-1',
          status: 'succeeded',
        },
      },
    } as never)

    await executeRuntimeDispatchQueueJob(queueJob, {
      workerId: 'worker-1',
      leaseDurationMs: 60000,
      mode: 'obsidian_write',
      executeRealConnectors: true,
      vaultPath: String.raw`D:\AI-Vault`,
    })

    expect(runRuntimeDispatchJobOnce).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'obsidian_write',
      execute: true,
      vaultPath: String.raw`D:\AI-Vault`,
    }))
    expect(prisma.harmonyTask.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'task-1' },
      data: expect.objectContaining({
        status: 'completed',
        statusReason: expect.stringContaining('succeeded'),
      }),
    }))
    expect(prisma.harmonyAuditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        eventType: 'task.status_changed',
        afterStatus: 'completed',
      }),
    }))
  })

  it('blocks when no queued RuntimeDispatchJob exists for the claimed queue job task', async () => {
    vi.mocked(listRuntimeDispatchJobs).mockResolvedValueOnce([])

    await expect(executeRuntimeDispatchQueueJob(queueJob, {
      workerId: 'worker-1',
      leaseDurationMs: 60000,
    })).rejects.toBeInstanceOf(WorkerJobBlockedError)

    expect(runRuntimeDispatchJobOnce).not.toHaveBeenCalled()
  })

  it('blocks hard-denied connector/action combinations before invoking the runner', async () => {
    vi.mocked(listRuntimeDispatchJobs).mockResolvedValueOnce([{
      id: 'runtime-job-unsafe',
      taskId: 'task-1',
      status: 'queued',
      connectorId: 'github',
      actionType: 'create_pr',
      correlationId: 'corr-1',
    } as never])

    await expect(executeRuntimeDispatchQueueJob(queueJob, {
      workerId: 'worker-1',
      leaseDurationMs: 60000,
    })).rejects.toBeInstanceOf(WorkerJobBlockedError)

    expect(runRuntimeDispatchJobOnce).not.toHaveBeenCalled()
  })

  it('marks the queue job blocked without retry when runtime token/scope gate fails', async () => {
    const tokenGateError = Object.assign(new Error('Runtime execution token scope connectorId does not match the approved job.'), {
      status: 409,
    })
    vi.mocked(runRuntimeDispatchJobOnce).mockRejectedValueOnce(tokenGateError)

    const worker = new ExecutionWorker({
      workerId: 'worker-1',
      capabilities: ['obsidian'],
      maxConcurrent: 1,
      pollIntervalMs: 1000,
      heartbeatIntervalMs: 1000,
      leaseDurationMs: 60000,
      jobTimeoutMs: 60000,
    })
    const executable = worker as unknown as {
      executeJobAsync(job: QueueJobRecord): Promise<void>
    }

    await executable.executeJobAsync(queueJob)
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(blockJob).toHaveBeenCalledWith('queue-job-1', expect.objectContaining({
      blockedBy: 'worker_runtime_gate',
    }))
    expect(completeJob).not.toHaveBeenCalled()
  })

  it('emits worker audit with actorId plus queue/runtime/receipt identifiers on completion', async () => {
    const worker = new ExecutionWorker({
      workerId: 'worker-1',
      capabilities: ['obsidian'],
      maxConcurrent: 1,
      pollIntervalMs: 1000,
      heartbeatIntervalMs: 1000,
      leaseDurationMs: 60000,
      jobTimeoutMs: 60000,
    })
    const executable = worker as unknown as {
      executeJobAsync(job: QueueJobRecord): Promise<void>
    }

    await executable.executeJobAsync(queueJob)
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(createWorkerAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      actorId: 'worker-1',
      eventType: 'worker.job_completed',
      payload: expect.objectContaining({
        jobId: 'queue-job-1',
        queueJobId: 'queue-job-1',
        runtimeJobId: 'runtime-job-1',
        receiptId: 'receipt-1',
        receiptStatus: 'dry_run',
      }),
    }))
  })
})
