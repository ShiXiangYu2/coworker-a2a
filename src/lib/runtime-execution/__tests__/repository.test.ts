import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createObsidianDraftPlan,
  executeObsidianDraftPlan,
} from '@/lib/tools/obsidian-draft'
import { prisma } from '@/lib/prisma'
import {
  claimRuntimeDispatchJobById,
  completeRuntimeDispatchJobObsidianWrite,
  completeRuntimeDispatchJobDryRun,
  createRuntimeDispatchJob,
  createRuntimeExecutionToken,
  transitionRuntimeDispatchJob,
  transitionRuntimeExecutionToken,
} from '../repository'

vi.mock('@/lib/tools/obsidian-draft', () => ({
  createObsidianDraftPlan: vi.fn((input, options) => ({
    id: 'obsidian-plan-1',
    action: 'write_local_markdown_draft',
    riskLevel: 'low',
    draftTitle: input.draftTitle,
    filename: input.filename,
    content: input.content,
    targetDirectory: `${options?.vaultPath ?? 'D:\\vault'}\\Inbox\\AI Drafts`,
    targetPath: `${options?.vaultPath ?? 'D:\\vault'}\\Inbox\\AI Drafts\\${input.filename}`,
    dryRun: input.dryRun,
    createdAt: (options?.now ?? new Date('2026-06-19T00:00:00.000Z')).toISOString(),
  })),
  executeObsidianDraftPlan: vi.fn(async (plan) => ({
    id: 'obsidian-receipt-1',
    action: plan.action,
    status: 'succeeded',
    path: plan.targetPath,
    timestamp: '2026-06-19T01:00:00.000Z',
    executionPlanId: plan.id,
    approvalRecordId: 'execution-approval-1',
    approvedBy: 'kelvin',
    reason: 'Kelvin-approved demo produced an Obsidian vault Markdown draft.',
  })),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    harmonyAuditEvent: {
      create: vi.fn(async ({ data }) => ({ id: 'audit-1', ...data })),
    },
    runtimeExecutionToken: {
      create: vi.fn(async ({ data }) => ({
        id: 'token-1',
        ...data,
        createdAt: new Date('2026-06-19T00:00:00.000Z'),
        updatedAt: new Date('2026-06-19T00:00:00.000Z'),
      })),
      update: vi.fn(async ({ where, data }) => ({
        id: where.id,
        correlationId: 'corr-1',
        ...data,
        createdAt: new Date('2026-06-19T00:00:00.000Z'),
        updatedAt: new Date('2026-06-19T00:00:00.000Z'),
      })),
      findMany: vi.fn(async () => []),
      findFirst: vi.fn(async () => null),
      findUnique: vi.fn(async ({ where }) => {
        if (!where.id) return null
        const status = where.id === 'consumed-token' ? 'consumed' : 'active'
        const expiresAt = where.id === 'expired-token'
          ? new Date('2026-06-18T00:00:00.000Z')
          : new Date('2026-06-20T00:00:00.000Z')
        const connectorId = where.id === 'token-connector-mismatch' ? 'not_obsidian' : 'obsidian_local'
        const actionType = where.id === 'token-action-mismatch' ? 'not_write' : 'write_local_markdown_draft'
        const idempotencyKey = where.id === 'token-idempotency-mismatch'
          ? 'other-idem'
          : where.id === 'succeeded-idem-token'
            ? 'idem-succeeded'
            : 'idem-1'
        const scopeConnectorId = where.id === 'scope-connector-mismatch' ? 'not_obsidian' : connectorId
        const scopeActionType = where.id === 'scope-action-mismatch' ? 'not_write' : actionType
        const scopeTargetDirectoryLabel = where.id === 'scope-target-mismatch' ? 'Other' : 'Inbox/AI Drafts'
        return {
          id: where.id,
          status,
          connectorId,
          actionType,
          taskId: 'task-1',
          idempotencyKey,
          expiresAt,
          executionApprovalRecordId: 'execution-approval-1',
          approvedBy: 'kelvin',
          scopeJson: JSON.stringify({
            connectorId: scopeConnectorId,
            actionType: scopeActionType,
            taskId: 'task-1',
            idempotencyKey,
            allowedVaultRoot: String.raw`D:\AI-Vault`,
            allowedFilename: 'weekly-note.md',
            allowedTargetDirectoryLabel: scopeTargetDirectoryLabel,
          }),
        }
      }),
    },
    runtimeDispatchJob: {
      create: vi.fn(async ({ data }) => ({
        id: 'job-1',
        ...data,
        createdAt: new Date('2026-06-19T00:00:00.000Z'),
        updatedAt: new Date('2026-06-19T00:00:00.000Z'),
      })),
      update: vi.fn(async ({ where, data }) => ({
        id: where.id,
        correlationId: 'corr-2',
        ...data,
        createdAt: new Date('2026-06-19T00:00:00.000Z'),
        updatedAt: new Date('2026-06-19T00:00:00.000Z'),
      })),
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async ({ where }) => {
        if (!where.id) return null
        if (where.id === 'queued-job') return {
          id: where.id,
          status: 'queued',
          leaseOwner: null,
          runtimeTokenId: 'token-1',
          taskId: 'task-1',
          connectorId: 'obsidian_local',
          actionType: 'write_local_markdown_draft',
          idempotencyKey: 'idem-1',
          correlationId: 'corr-queued',
          startedAt: null,
          attemptCount: 0,
          payloadJson: JSON.stringify({
            draftTitle: 'Weekly note',
            filename: 'weekly-note.md',
            content: '# Weekly note',
            targetDirectoryLabel: 'Inbox/AI Drafts',
          }),
        }
        if (where.id === 'not-running') return { id: where.id, status: 'leased', leaseOwner: 'worker-1', runtimeTokenId: 'token-1' }
        if (where.id === 'wrong-worker') return { id: where.id, status: 'running', leaseOwner: 'worker-2', runtimeTokenId: 'token-1' }
        if (where.id === 'wrong-connector') return {
          id: where.id,
          status: 'running',
          leaseOwner: 'worker-1',
          runtimeTokenId: 'token-1',
          taskId: 'task-1',
          connectorId: 'not_obsidian',
          actionType: 'write_local_markdown_draft',
          idempotencyKey: 'idem-1',
          correlationId: 'corr-2',
          startedAt: new Date('2026-06-19T00:00:00.000Z'),
          attemptCount: 1,
          payloadJson: JSON.stringify({
            draftTitle: 'Weekly note',
            filename: 'weekly-note.md',
            content: '# Weekly note',
            targetDirectoryLabel: 'Inbox/AI Drafts',
          }),
        }
        const tokenIdByJobId: Record<string, string> = {
          'consumed-token-job': 'consumed-token',
          'expired-token-job': 'expired-token',
          'token-connector-mismatch-job': 'token-connector-mismatch',
          'token-action-mismatch-job': 'token-action-mismatch',
          'token-idempotency-mismatch-job': 'token-idempotency-mismatch',
          'scope-connector-mismatch-job': 'scope-connector-mismatch',
          'scope-action-mismatch-job': 'scope-action-mismatch',
          'scope-target-mismatch-job': 'scope-target-mismatch',
          'succeeded-idem-job': 'succeeded-idem-token',
        }
        const idempotencyKeyByJobId: Record<string, string> = {
          'succeeded-idem-job': 'idem-succeeded',
        }
        return {
          id: where.id,
          status: 'running',
          leaseOwner: 'worker-1',
          runtimeTokenId: tokenIdByJobId[where.id] ?? 'token-1',
          taskId: 'task-1',
          connectorId: 'obsidian_local',
          actionType: 'write_local_markdown_draft',
          idempotencyKey: idempotencyKeyByJobId[where.id] ?? 'idem-1',
          correlationId: 'corr-2',
          startedAt: new Date('2026-06-19T00:00:00.000Z'),
          attemptCount: 1,
          payloadJson: JSON.stringify({
            draftTitle: 'Weekly note',
            filename: 'weekly-note.md',
            content: '# Weekly note',
            targetDirectoryLabel: 'Inbox/AI Drafts',
          }),
        }
      }),
      findFirst: vi.fn(async ({ where }) => {
        if (where.idempotencyKey === 'duplicate-live') {
          return { id: 'existing-live-job', idempotencyKey: where.idempotencyKey, status: 'queued' }
        }
        if (where.idempotencyKey === 'duplicate-succeeded' || where.idempotencyKey === 'idem-succeeded') {
          return { id: 'existing-succeeded-job', idempotencyKey: where.idempotencyKey, status: 'succeeded' }
        }
        return null
      }),
    },
    runtimeDispatchAttempt: {
      create: vi.fn(async ({ data }) => ({
        id: 'attempt-1',
        ...data,
        createdAt: new Date('2026-06-19T00:00:00.000Z'),
      })),
      findMany: vi.fn(async () => []),
    },
    runtimeExecutionReceipt: {
      create: vi.fn(async ({ data }) => ({
        id: 'receipt-1',
        ...data,
        createdAt: new Date('2026-06-19T00:00:00.000Z'),
      })),
      findUnique: vi.fn(async ({ where }) => where.jobId === 'existing-receipt-job'
        ? { id: 'existing-receipt-1', jobId: where.jobId, status: 'dry_run' }
        : null),
    },
    runtimeRecoveryPoint: {
      create: vi.fn(async ({ data }) => ({
        id: 'recovery-1',
        ...data,
        createdAt: new Date('2026-06-19T00:00:00.000Z'),
      })),
      findMany: vi.fn(async () => []),
    },
  },
}))

describe('Sprint 22 runtime execution repository skeleton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a scoped runtime token and queued dispatch job', async () => {
    const token = await createRuntimeExecutionToken({
      taskId: 'task-1',
      agentRunId: 'agent-run-1',
      executionPlanRecordId: 'execution-plan-1',
      executionApprovalRecordId: 'execution-approval-1',
      plan: {
        id: 'plan-1',
        taskId: 'task-1',
        agentRunId: 'agent-run-1',
        summary: 'Write approved Obsidian draft only.',
        connectorId: 'obsidian_local',
        actionType: 'write_local_markdown_draft',
        riskLevel: 'low',
        requiresHumanApproval: true,
        idempotencyKey: 'idem-1',
        timeoutMs: 15000,
        maxAttempts: 2,
        payload: {
          draftTitle: 'Weekly note',
          filename: 'weekly-note.md',
          content: '# Weekly note',
          targetDirectoryLabel: 'Inbox/AI Drafts',
        },
      },
      scope: {
        connectorId: 'obsidian_local',
        actionType: 'write_local_markdown_draft',
        allowedVaultRoot: String.raw`D:\AI-Vault`,
        allowedTargetDirectoryLabel: 'Inbox/AI Drafts',
        allowedFilename: 'weekly-note.md',
        taskId: 'task-1',
        agentRunId: 'agent-run-1',
        executionPlanRecordId: 'execution-plan-1',
        idempotencyKey: 'idem-1',
        expiresAt: '2026-06-20T00:00:00.000Z',
      },
    })

    expect(token.record.status).toBe('draft')
    expect(token.record.connectorId).toBe('obsidian_local')

    const job = await createRuntimeDispatchJob({
      runtimeTokenId: token.record.id,
      taskId: 'task-1',
      plan: {
        id: 'plan-1',
        taskId: 'task-1',
        agentRunId: 'agent-run-1',
        summary: 'Write approved Obsidian draft only.',
        connectorId: 'obsidian_local',
        actionType: 'write_local_markdown_draft',
        riskLevel: 'low',
        requiresHumanApproval: true,
        idempotencyKey: 'idem-1',
        timeoutMs: 15000,
        maxAttempts: 2,
        payload: {
          draftTitle: 'Weekly note',
          filename: 'weekly-note.md',
          content: '# Weekly note',
          targetDirectoryLabel: 'Inbox/AI Drafts',
        },
      },
    })

    expect(job.record.status).toBe('queued')
    expect(job.record.runtimeTokenId).toBe('token-1')
    expect(job.record.maxAttempts).toBe(2)
  })

  it('blocks live or succeeded duplicate idempotency keys when creating runtime jobs', async () => {
    const plan = {
      id: 'plan-duplicate',
      taskId: 'task-1',
      agentRunId: 'agent-run-1',
      summary: 'Write approved Obsidian draft only.',
      connectorId: 'obsidian_local' as const,
      actionType: 'write_local_markdown_draft' as const,
      riskLevel: 'low' as const,
      requiresHumanApproval: true,
      idempotencyKey: 'duplicate-live',
      timeoutMs: 15000,
      maxAttempts: 2,
      payload: {
        draftTitle: 'Weekly note',
        filename: 'weekly-note.md',
        content: '# Weekly note',
        targetDirectoryLabel: 'Inbox/AI Drafts' as const,
      },
    }

    await expect(createRuntimeDispatchJob({
      runtimeTokenId: 'token-1',
      taskId: 'task-1',
      plan,
    })).rejects.toThrow('idempotencyKey already has a live or succeeded job')

    await expect(createRuntimeDispatchJob({
      runtimeTokenId: 'token-1',
      taskId: 'task-1',
      plan: { ...plan, idempotencyKey: 'duplicate-succeeded' },
    })).rejects.toThrow('idempotencyKey already has a live or succeeded job')

    const allowed = await createRuntimeDispatchJob({
      runtimeTokenId: 'token-1',
      taskId: 'task-1',
      plan: { ...plan, idempotencyKey: 'duplicate-failed' },
    })
    expect(allowed.record.status).toBe('queued')
  })

  it('updates token and job lifecycle state without touching execution wiring', async () => {
    const token = await transitionRuntimeExecutionToken({
      id: 'token-1',
      targetStatus: 'active',
      reason: 'Activate token for future worker skeleton.',
    })
    expect(token.record.status).toBe('active')

    const job = await transitionRuntimeDispatchJob({
      id: 'job-1',
      targetStatus: 'leased',
      reason: 'Lease queued job for future worker skeleton.',
      leaseOwner: 'worker-1',
      leaseExpiresAt: '2026-06-20T00:00:00.000Z',
    })
    expect(job.record.status).toBe('leased')
    expect(job.record.leaseOwner).toBe('worker-1')
  })

  it('completes dry-run only with a synthetic receipt and consumed token', async () => {
    const result = await completeRuntimeDispatchJobDryRun({
      id: 'job-1',
      workerId: 'worker-1',
      targetRef: 'dry-run:job-1',
      summary: 'Dry-run completion only.',
      result: { dryRun: true },
      snapshot: { stage: 'post-execute' },
      now: new Date('2026-06-19T01:00:00.000Z'),
    })

    expect(result.record.status).toBe('succeeded')
    expect(result.token.status).toBe('consumed')
    expect(result.receipt.status).toBe('dry_run')
    expect(result.recovery?.recoveryKind).toBe('post_execute')
  })

  it('rejects dry-run completion when job is not running or lease owner mismatches', async () => {
    await expect(completeRuntimeDispatchJobDryRun({
      id: 'not-running',
      workerId: 'worker-1',
    })).rejects.toThrow('requires running status')

    await expect(completeRuntimeDispatchJobDryRun({
      id: 'wrong-worker',
      workerId: 'worker-1',
    })).rejects.toThrow('leaseOwner mismatch')
  })

  it('blocks dry-run completion when token is not executable', async () => {
    await expect(completeRuntimeDispatchJobDryRun({
      id: 'consumed-token-job',
      workerId: 'worker-1',
      now: new Date('2026-06-19T01:00:00.000Z'),
    })).rejects.toThrow('must be active')

    expect(prisma.runtimeDispatchJob.update).not.toHaveBeenCalled()
    expect(prisma.runtimeExecutionToken.update).not.toHaveBeenCalled()
    expect(prisma.runtimeExecutionReceipt.create).not.toHaveBeenCalled()
  })

  it('blocks dry-run completion when a runtime receipt already exists', async () => {
    await expect(completeRuntimeDispatchJobDryRun({
      id: 'existing-receipt-job',
      workerId: 'worker-1',
      now: new Date('2026-06-19T01:00:00.000Z'),
    })).rejects.toThrow('receipt already exists')

    expect(prisma.runtimeDispatchJob.update).not.toHaveBeenCalled()
    expect(prisma.runtimeExecutionToken.update).not.toHaveBeenCalled()
    expect(prisma.runtimeExecutionReceipt.create).not.toHaveBeenCalled()
  })

  it('claims a specific queued job by id and rejects non-queued jobs', async () => {
    const result = await claimRuntimeDispatchJobById({
      id: 'queued-job',
      workerId: 'worker-1',
      now: new Date('2026-06-19T01:00:00.000Z'),
    })

    expect(result.record.status).toBe('leased')
    expect(result.record.leaseOwner).toBe('worker-1')
    expect(result.attempt.status).toBe('leased')
    expect(result.auditEvent.eventType).toBe('runtime_dispatch_job.claimed_by_id')

    await expect(claimRuntimeDispatchJobById({
      id: 'not-running',
      workerId: 'worker-1',
    })).rejects.toThrow('requires queued status')
  })

  it('refuses complete-obsidian-write unless execute=true', async () => {
    await expect(completeRuntimeDispatchJobObsidianWrite({
      id: 'job-1',
      workerId: 'worker-1',
    })).rejects.toThrow('requires execute=true')
  })

  it('rejects complete-obsidian-write on connector mismatch or lease mismatch', async () => {
    await expect(completeRuntimeDispatchJobObsidianWrite({
      id: 'wrong-connector',
      workerId: 'worker-1',
      execute: true,
    })).rejects.toThrow('connectorId "obsidian_local"')

    await expect(completeRuntimeDispatchJobObsidianWrite({
      id: 'wrong-worker',
      workerId: 'worker-1',
      execute: true,
    })).rejects.toThrow('leaseOwner mismatch')
  })

  it('blocks obsidian write when token is expired before connector execution', async () => {
    await expect(completeRuntimeDispatchJobObsidianWrite({
      id: 'expired-token-job',
      workerId: 'worker-1',
      execute: true,
      now: new Date('2026-06-19T01:00:00.000Z'),
    })).rejects.toThrow('has expired')

    expect(createObsidianDraftPlan).not.toHaveBeenCalled()
    expect(executeObsidianDraftPlan).not.toHaveBeenCalled()
    expect(prisma.runtimeExecutionReceipt.create).not.toHaveBeenCalled()
  })

  it('blocks obsidian write when a runtime receipt already exists before connector execution', async () => {
    await expect(completeRuntimeDispatchJobObsidianWrite({
      id: 'existing-receipt-job',
      workerId: 'worker-1',
      execute: true,
      now: new Date('2026-06-19T01:00:00.000Z'),
    })).rejects.toThrow('receipt already exists')

    expect(createObsidianDraftPlan).not.toHaveBeenCalled()
    expect(executeObsidianDraftPlan).not.toHaveBeenCalled()
    expect(prisma.runtimeExecutionReceipt.create).not.toHaveBeenCalled()
  })

  it('blocks completion when the same idempotency key already has a succeeded job', async () => {
    await expect(completeRuntimeDispatchJobDryRun({
      id: 'succeeded-idem-job',
      workerId: 'worker-1',
      now: new Date('2026-06-19T01:00:00.000Z'),
    })).rejects.toThrow('idempotencyKey already has a succeeded job')

    expect(prisma.runtimeExecutionReceipt.create).not.toHaveBeenCalled()
  })

  it('blocks completion when token connector/action/idempotency does not match the job', async () => {
    await expect(completeRuntimeDispatchJobDryRun({
      id: 'token-connector-mismatch-job',
      workerId: 'worker-1',
      now: new Date('2026-06-19T01:00:00.000Z'),
    })).rejects.toThrow('connectorId does not match')

    await expect(completeRuntimeDispatchJobDryRun({
      id: 'token-action-mismatch-job',
      workerId: 'worker-1',
      now: new Date('2026-06-19T01:00:00.000Z'),
    })).rejects.toThrow('actionType does not match')

    await expect(completeRuntimeDispatchJobDryRun({
      id: 'token-idempotency-mismatch-job',
      workerId: 'worker-1',
      now: new Date('2026-06-19T01:00:00.000Z'),
    })).rejects.toThrow('idempotencyKey does not match')

    expect(prisma.runtimeExecutionReceipt.create).not.toHaveBeenCalled()
  })

  it('blocks completion when token scope does not match the approved job', async () => {
    await expect(completeRuntimeDispatchJobDryRun({
      id: 'scope-connector-mismatch-job',
      workerId: 'worker-1',
      now: new Date('2026-06-19T01:00:00.000Z'),
    })).rejects.toThrow('scope connectorId')

    await expect(completeRuntimeDispatchJobDryRun({
      id: 'scope-action-mismatch-job',
      workerId: 'worker-1',
      now: new Date('2026-06-19T01:00:00.000Z'),
    })).rejects.toThrow('scope actionType')

    await expect(completeRuntimeDispatchJobObsidianWrite({
      id: 'scope-target-mismatch-job',
      workerId: 'worker-1',
      execute: true,
      now: new Date('2026-06-19T01:00:00.000Z'),
    })).rejects.toThrow('scope must be limited to Inbox/AI Drafts')

    expect(createObsidianDraftPlan).not.toHaveBeenCalled()
    expect(executeObsidianDraftPlan).not.toHaveBeenCalled()
    expect(prisma.runtimeExecutionReceipt.create).not.toHaveBeenCalled()
  })

  it('completes complete-obsidian-write with a real succeeded runtime receipt and consumed token', async () => {
    const result = await completeRuntimeDispatchJobObsidianWrite({
      id: 'job-1',
      workerId: 'worker-1',
      execute: true,
      vaultPath: String.raw`D:\AI-Vault`,
      snapshot: { stage: 'post-execute' },
      now: new Date('2026-06-19T01:00:00.000Z'),
    })

    expect(result.record.status).toBe('succeeded')
    expect(result.token.status).toBe('consumed')
    expect(result.receipt.status).toBe('succeeded')
    expect(result.receipt.targetRef).toContain('weekly-note.md')
    expect(result.recovery.recoveryKind).toBe('post_execute')
    expect(result.connectorReceipt.status).toBe('succeeded')
    expect(result.connectorReceipt.action).toBe('write_local_markdown_draft')
  })
})
