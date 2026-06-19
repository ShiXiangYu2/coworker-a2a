import { beforeEach, describe, expect, it, vi } from 'vitest'
import { issueRuntimeExecutionFromApprovedPlan } from '../issuance'

vi.mock('../repository', () => ({
  RuntimeExecutionApiError: class RuntimeExecutionApiError extends Error {
    constructor(message: string, public readonly status = 400) {
      super(message)
    }
  },
  assertRuntimeDispatchJobIdempotencyAvailable: vi.fn(async (idempotencyKey: string) => {
    if (idempotencyKey === 'duplicate-idem') {
      throw new Error('Runtime dispatch job idempotencyKey already has a live or succeeded job.')
    }
  }),
  createRuntimeExecutionToken: vi.fn(async ({ taskId, agentRunId, executionPlanRecordId, executionApprovalRecordId, plan, scope, issuedBy, approvedBy, correlationId, idempotencyKey }) => ({
    record: {
      id: 'token-1',
      taskId,
      agentRunId,
      executionPlanRecordId,
      executionApprovalRecordId,
      status: 'draft',
      connectorId: plan.connectorId,
      actionType: plan.actionType,
      issuedBy,
      approvedBy,
      correlationId: correlationId ?? 'corr-1',
      idempotencyKey,
      scopeJson: JSON.stringify(scope),
    },
    auditEvent: { id: 'audit-token-1' },
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
    auditEvent: { id: 'audit-job-1' },
  })),
  transitionRuntimeExecutionToken: vi.fn(async ({ id, targetStatus }) => ({
    record: {
      id,
      status: targetStatus,
      connectorId: 'obsidian_local',
      actionType: 'write_local_markdown_draft',
      taskId: 'task-1',
      idempotencyKey: 'idem-1',
    },
    auditEvent: { id: 'audit-token-active-1' },
  })),
}))

vi.mock('../runner', () => ({
  runRuntimeDispatchJobOnce: vi.fn(),
}))

vi.mock('@/lib/tools/obsidian-draft', () => ({
  createObsidianDraftPlan: vi.fn(),
  executeObsidianDraftPlan: vi.fn(),
}))

import {
  assertRuntimeDispatchJobIdempotencyAvailable,
  createRuntimeDispatchJob,
  createRuntimeExecutionToken,
  transitionRuntimeExecutionToken,
} from '../repository'
import { runRuntimeDispatchJobOnce } from '../runner'
import {
  createObsidianDraftPlan,
  executeObsidianDraftPlan,
} from '@/lib/tools/obsidian-draft'

const approvedPlanInput = {
  taskId: 'task-1',
  agentRunId: 'agent-run-1',
  executionPlanRecordId: 'execution-plan-1',
  executionApprovalRecordId: 'execution-approval-1',
  approvedBy: 'kelvin' as const,
  issuedBy: 'operator' as const,
  approvalStatus: 'approved' as const,
  connectorId: 'obsidian_local' as const,
  actionType: 'write_local_markdown_draft' as const,
  riskLevel: 'low' as const,
  requiresHumanApproval: true as const,
  idempotencyKey: 'idem-1',
  correlationId: 'corr-1',
  summary: 'Issue one approved Obsidian draft write only.',
  payload: {
    draftTitle: 'Weekly note',
    filename: 'weekly-note.md',
    content: '# Weekly note',
    targetDirectoryLabel: 'Inbox/AI Drafts' as const,
  },
  scope: {
    connectorId: 'obsidian_local' as const,
    actionType: 'write_local_markdown_draft' as const,
    allowedVaultRoot: String.raw`D:\AI-Vault`,
    allowedTargetDirectoryLabel: 'Inbox/AI Drafts' as const,
    allowedFilename: 'weekly-note.md',
    taskId: 'task-1',
    agentRunId: 'agent-run-1',
    executionPlanRecordId: 'execution-plan-1',
    idempotencyKey: 'idem-1',
    expiresAt: '2026-06-20T00:00:00.000Z',
  },
}

describe('Sprint 22 runtime approval issuance helper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates an active token and queued job from an approved low-risk Obsidian plan', async () => {
    const result = await issueRuntimeExecutionFromApprovedPlan(approvedPlanInput)

    expect(assertRuntimeDispatchJobIdempotencyAvailable).toHaveBeenCalledWith('idem-1')
    expect(createRuntimeExecutionToken).toHaveBeenCalledWith(expect.objectContaining({
      taskId: 'task-1',
      executionPlanRecordId: 'execution-plan-1',
      executionApprovalRecordId: 'execution-approval-1',
      plan: expect.objectContaining({
        connectorId: 'obsidian_local',
        actionType: 'write_local_markdown_draft',
        taskId: 'task-1',
        idempotencyKey: 'idem-1',
      }),
      scope: expect.objectContaining({
        allowedTargetDirectoryLabel: 'Inbox/AI Drafts',
        allowedFilename: 'weekly-note.md',
        idempotencyKey: 'idem-1',
      }),
    }))
    expect(createRuntimeDispatchJob).toHaveBeenCalledWith(expect.objectContaining({
      runtimeTokenId: 'token-1',
      taskId: 'task-1',
      idempotencyKey: 'idem-1',
    }))
    expect(transitionRuntimeExecutionToken).toHaveBeenCalledWith(expect.objectContaining({
      id: 'token-1',
      targetStatus: 'active',
    }))
    expect(result.token.status).toBe('active')
    expect(result.job.status).toBe('queued')
    expect(result.safetyNote).toContain('Sprint 22')
  })

  it('keeps token/job connector, action, task, idempotency, and correlation aligned', async () => {
    await issueRuntimeExecutionFromApprovedPlan(approvedPlanInput)

    const tokenCall = vi.mocked(createRuntimeExecutionToken).mock.calls[0]?.[0]
    const jobCall = vi.mocked(createRuntimeDispatchJob).mock.calls[0]?.[0]

    expect(tokenCall?.plan.connectorId).toBe(jobCall?.plan.connectorId)
    expect(tokenCall?.plan.actionType).toBe(jobCall?.plan.actionType)
    expect(tokenCall?.taskId).toBe(jobCall?.taskId)
    expect(tokenCall?.idempotencyKey).toBe(jobCall?.idempotencyKey)
    expect(tokenCall?.correlationId).toBe(jobCall?.correlationId)
    expect(tokenCall?.scope.allowedTargetDirectoryLabel).toBe('Inbox/AI Drafts')
    expect(jobCall?.plan.payload.targetDirectoryLabel).toBe('Inbox/AI Drafts')
  })

  it('rejects duplicate idempotency keys before issuance', async () => {
    await expect(issueRuntimeExecutionFromApprovedPlan({
      ...approvedPlanInput,
      idempotencyKey: 'duplicate-idem',
      payload: { ...approvedPlanInput.payload, filename: 'weekly-note-2.md' },
      scope: { ...approvedPlanInput.scope, idempotencyKey: 'duplicate-idem', allowedFilename: 'weekly-note-2.md' },
    })).rejects.toThrow('idempotencyKey already has a live or succeeded job')

    expect(createRuntimeExecutionToken).not.toHaveBeenCalled()
    expect(createRuntimeDispatchJob).not.toHaveBeenCalled()
  })

  it('rejects connector, action, risk, approval, and scope mismatches', async () => {
    await expect(issueRuntimeExecutionFromApprovedPlan({
      ...approvedPlanInput,
      connectorId: 'obsidian_local',
      actionType: 'write_local_markdown_draft',
      riskLevel: 'low',
      approvalStatus: 'pending' as 'approved',
    })).rejects.toThrow('approvalStatus="approved"')

    await expect(issueRuntimeExecutionFromApprovedPlan({
      ...approvedPlanInput,
      connectorId: 'github' as never,
      scope: { ...approvedPlanInput.scope, connectorId: 'github' as never },
    })).rejects.toThrow('connectorId "obsidian_local"')

    await expect(issueRuntimeExecutionFromApprovedPlan({
      ...approvedPlanInput,
      actionType: 'create_pr' as never,
      scope: { ...approvedPlanInput.scope, actionType: 'create_pr' as never },
    })).rejects.toThrow('actionType "write_local_markdown_draft"')

    await expect(issueRuntimeExecutionFromApprovedPlan({
      ...approvedPlanInput,
      riskLevel: 'medium' as never,
    })).rejects.toThrow('only allows low risk plans')

    await expect(issueRuntimeExecutionFromApprovedPlan({
      ...approvedPlanInput,
      requiresHumanApproval: false as true,
    })).rejects.toThrow('requires a human-approved plan')

    await expect(issueRuntimeExecutionFromApprovedPlan({
      ...approvedPlanInput,
      scope: { ...approvedPlanInput.scope, allowedTargetDirectoryLabel: 'Elsewhere' as never },
    })).rejects.toThrow('must be limited to Inbox/AI Drafts')
  })

  it('does not call runner or the Obsidian connector', async () => {
    await issueRuntimeExecutionFromApprovedPlan(approvedPlanInput)

    expect(runRuntimeDispatchJobOnce).not.toHaveBeenCalled()
    expect(createObsidianDraftPlan).not.toHaveBeenCalled()
    expect(executeObsidianDraftPlan).not.toHaveBeenCalled()
  })
})
