import { describe, expect, it } from 'vitest'
import {
  validateCreateRuntimeDispatchJobInput,
  validateCreateRuntimeExecutionTokenInput,
  validateStructuredRuntimeExecutionPlan,
} from '../validators'

const validPlan = {
  id: 'plan-1',
  taskId: 'task-1',
  agentRunId: 'agent-run-1',
  summary: 'Write an approved Obsidian draft only.',
  connectorId: 'obsidian_local' as const,
  actionType: 'write_local_markdown_draft' as const,
  riskLevel: 'low' as const,
  requiresHumanApproval: true,
  idempotencyKey: 'idem-1',
  timeoutMs: 15000,
  maxAttempts: 2,
  payload: {
    draftTitle: 'Weekly note',
    filename: 'weekly-note.md',
    content: '# Weekly note',
    targetDirectoryLabel: 'Inbox/AI Drafts' as const,
  },
}

describe('Sprint 22 runtime execution validators', () => {
  it('accepts the minimal scoped execution plan and token/job inputs', () => {
    expect(() => validateStructuredRuntimeExecutionPlan(validPlan)).not.toThrow()
    expect(() => validateCreateRuntimeExecutionTokenInput({
      taskId: 'task-1',
      agentRunId: 'agent-run-1',
      executionPlanRecordId: 'execution-plan-1',
      executionApprovalRecordId: 'execution-approval-1',
      plan: validPlan,
      scope: {
        connectorId: 'obsidian_local',
        actionType: 'write_local_markdown_draft',
        allowedVaultRoot: String.raw`D:\AI知识库`,
        allowedTargetDirectoryLabel: 'Inbox/AI Drafts',
        allowedFilename: 'weekly-note.md',
        taskId: 'task-1',
        agentRunId: 'agent-run-1',
        executionPlanRecordId: 'execution-plan-1',
        idempotencyKey: 'idem-1',
        expiresAt: '2026-06-20T00:00:00.000Z',
      },
    })).not.toThrow()
    expect(() => validateCreateRuntimeDispatchJobInput({
      runtimeTokenId: 'token-1',
      taskId: 'task-1',
      plan: validPlan,
    })).not.toThrow()
  })

  it('rejects unsupported connectors, actions, or unsafe planning defaults', () => {
    expect(() => validateStructuredRuntimeExecutionPlan({
      ...validPlan,
      connectorId: 'feishu_doc' as never,
    })).toThrow('Invalid runtime connectorId')

    expect(() => validateStructuredRuntimeExecutionPlan({
      ...validPlan,
      requiresHumanApproval: false,
    })).toThrow('must require human approval')

    expect(() => validateStructuredRuntimeExecutionPlan({
      ...validPlan,
      maxAttempts: 5,
    })).toThrow('maxAttempts')
  })

  it('rejects mismatched task binding between token/job inputs and the plan', () => {
    expect(() => validateCreateRuntimeExecutionTokenInput({
      taskId: 'task-2',
      agentRunId: 'agent-run-1',
      executionPlanRecordId: 'execution-plan-1',
      executionApprovalRecordId: 'execution-approval-1',
      plan: validPlan,
      scope: {
        connectorId: 'obsidian_local',
        actionType: 'write_local_markdown_draft',
        allowedVaultRoot: String.raw`D:\AI知识库`,
        allowedTargetDirectoryLabel: 'Inbox/AI Drafts',
        allowedFilename: 'weekly-note.md',
        taskId: 'task-1',
        agentRunId: 'agent-run-1',
        executionPlanRecordId: 'execution-plan-1',
        idempotencyKey: 'idem-1',
        expiresAt: '2026-06-20T00:00:00.000Z',
      },
    })).toThrow('taskId must match')

    expect(() => validateCreateRuntimeDispatchJobInput({
      runtimeTokenId: 'token-1',
      taskId: 'task-2',
      plan: validPlan,
    })).toThrow('taskId must match')
  })
})
