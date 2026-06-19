import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { seedRuntimeSampleJob } from '../seed-sample'

vi.mock('../repository', () => ({
  RuntimeExecutionApiError: class RuntimeExecutionApiError extends Error {
    constructor(message: string, public readonly status = 400) {
      super(message)
    }
  },
  createRuntimeExecutionToken: vi.fn(async ({ taskId, agentRunId, executionPlanRecordId, executionApprovalRecordId, plan, scope, correlationId, idempotencyKey }) => ({
    record: {
      id: 'token-1',
      taskId,
      agentRunId,
      executionPlanRecordId,
      executionApprovalRecordId,
      status: 'draft',
      connectorId: plan.connectorId,
      actionType: plan.actionType,
      correlationId,
      idempotencyKey,
      scopeJson: JSON.stringify(scope),
    },
  })),
  transitionRuntimeExecutionToken: vi.fn(async ({ id, targetStatus }) => ({
    record: {
      id,
      status: targetStatus,
    },
  })),
  createRuntimeDispatchJob: vi.fn(async ({ runtimeTokenId, taskId, plan, correlationId, idempotencyKey }) => ({
    record: {
      id: 'job-1',
      runtimeTokenId,
      taskId,
      status: 'queued',
      connectorId: plan.connectorId,
      actionType: plan.actionType,
      correlationId,
      idempotencyKey,
      payloadJson: JSON.stringify(plan.payload),
    },
  })),
  runRuntimeDispatchJobOnce: vi.fn(),
  completeRuntimeDispatchJobObsidianWrite: vi.fn(),
}))

import {
  completeRuntimeDispatchJobObsidianWrite,
  createRuntimeDispatchJob,
  createRuntimeExecutionToken,
  transitionRuntimeExecutionToken,
} from '../repository'

describe('Sprint 22 runtime seed sample helper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates an active token and queued job for the approved Obsidian connector only', async () => {
    const result = await seedRuntimeSampleJob({
      taskId: 'task-1',
      createdBy: 'seed-test',
      workerHint: 'worker-seed-1',
      vaultPath: String.raw`D:\AI-Vault`,
      now: new Date('2026-06-19T01:00:00.000Z'),
    })

    expect(createRuntimeExecutionToken).toHaveBeenCalledWith(expect.objectContaining({
      taskId: 'task-1',
      plan: expect.objectContaining({
        connectorId: 'obsidian_local',
        actionType: 'write_local_markdown_draft',
        taskId: 'task-1',
      }),
      scope: expect.objectContaining({
        connectorId: 'obsidian_local',
        actionType: 'write_local_markdown_draft',
        taskId: 'task-1',
        allowedTargetDirectoryLabel: 'Inbox/AI Drafts',
      }),
    }))
    expect(transitionRuntimeExecutionToken).toHaveBeenCalledWith(expect.objectContaining({
      id: 'token-1',
      targetStatus: 'active',
    }))
    expect(createRuntimeDispatchJob).toHaveBeenCalledWith(expect.objectContaining({
      runtimeTokenId: 'token-1',
      taskId: 'task-1',
      plan: expect.objectContaining({
        connectorId: 'obsidian_local',
        actionType: 'write_local_markdown_draft',
        idempotencyKey: expect.any(String),
      }),
    }))
    const tokenCall = vi.mocked(createRuntimeExecutionToken).mock.calls[0]?.[0]
    const jobCall = vi.mocked(createRuntimeDispatchJob).mock.calls[0]?.[0]
    expect(tokenCall?.scope.idempotencyKey).toBe(jobCall?.idempotencyKey)
    expect(jobCall?.plan.payload.targetDirectoryLabel).toBe('Inbox/AI Drafts')
    expect(result.tokenId).toBe('token-1')
    expect(result.jobId).toBe('job-1')
    expect(result.nextCommands.verifyDryRun).toContain('scripts/runtime-verify-once.ts')
    expect(result.nextCommands.runDryRun).toContain('--mode=dry_run')
    expect(result.nextCommands.runObsidianWrite).toContain('--mode=obsidian_write')
    expect(result.nextCommands.runObsidianWrite).toContain('--execute=true')
  })

  it('rejects missing taskId', async () => {
    await expect(seedRuntimeSampleJob({
      taskId: '   ',
    })).rejects.toThrow('taskId is required')
  })

  it('does not call runner or the Obsidian completion path', async () => {
    await seedRuntimeSampleJob({
      taskId: 'task-2',
      now: new Date('2026-06-19T01:00:00.000Z'),
    })

    expect(completeRuntimeDispatchJobObsidianWrite).not.toHaveBeenCalled()
  })

  it('documents sample seed usage in the runbook', () => {
    const runbook = readFileSync(join(process.cwd(), 'docs/runtime-execution-runbook.md'), 'utf8')

    expect(runbook).toContain('runtime-seed-sample-job.ts')
    expect(runbook).toContain('Seed a Sample Job')
    expect(runbook).toContain('runtime-verify-once.ts')
    expect(runbook).toContain('obsidian_write')
  })
})
