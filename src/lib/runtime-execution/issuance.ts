import {
  assertRuntimeDispatchJobIdempotencyAvailable,
  createRuntimeDispatchJob,
  createRuntimeExecutionToken,
  RuntimeExecutionApiError,
  transitionRuntimeExecutionToken,
} from './repository'
import type {
  ApprovedRuntimeExecutionPlanInput,
  RuntimeApprovedBy,
  RuntimeIssuedBy,
  StructuredRuntimeExecutionPlan,
} from './types'
import { SPRINT_22_SAFETY_NOTE } from './types'
import {
  validateRuntimeExecutionScope,
  validateStructuredRuntimeExecutionPlan,
} from './validators'

export interface IssueRuntimeExecutionFromApprovedPlanResult {
  token: Awaited<ReturnType<typeof transitionRuntimeExecutionToken>>['record']
  job: Awaited<ReturnType<typeof createRuntimeDispatchJob>>['record']
  auditEvents: unknown[]
  safetyNote: string
}

export function approvedByValue(value: string): RuntimeApprovedBy {
  if (value === 'kelvin' || value === 'operator') return value
  throw new RuntimeExecutionApiError('approvedBy must be kelvin or operator.', 400)
}

export function issuedByValue(value: string | undefined): RuntimeIssuedBy {
  if (!value) return 'system_dispatcher'
  if (value === 'system_dispatcher' || value === 'operator' || value === 'kelvin') return value
  throw new RuntimeExecutionApiError('issuedBy must be system_dispatcher, operator, or kelvin.', 400)
}

function assertApprovedPlanInput(input: ApprovedRuntimeExecutionPlanInput): void {
  if (input.approvalStatus !== 'approved') {
    throw new RuntimeExecutionApiError('Runtime approved-plan issuance requires approvalStatus="approved".', 409)
  }
  if (input.connectorId !== 'obsidian_local') {
    throw new RuntimeExecutionApiError('Runtime approved-plan issuance only allows connectorId "obsidian_local".', 409)
  }
  if (input.actionType !== 'write_local_markdown_draft') {
    throw new RuntimeExecutionApiError('Runtime approved-plan issuance only allows actionType "write_local_markdown_draft".', 409)
  }
  if (input.riskLevel !== 'low') {
    throw new RuntimeExecutionApiError('Runtime approved-plan issuance only allows low risk plans.', 409)
  }
  if (input.requiresHumanApproval !== true) {
    throw new RuntimeExecutionApiError('Runtime approved-plan issuance requires a human-approved plan.', 409)
  }
  if (input.payload.targetDirectoryLabel !== 'Inbox/AI Drafts') {
    throw new RuntimeExecutionApiError('Runtime approved-plan payload must target Inbox/AI Drafts.', 409)
  }
  if (input.scope.allowedTargetDirectoryLabel !== 'Inbox/AI Drafts') {
    throw new RuntimeExecutionApiError('Runtime approved-plan scope must be limited to Inbox/AI Drafts.', 409)
  }
  if (input.scope.taskId !== input.taskId) {
    throw new RuntimeExecutionApiError('Runtime approved-plan scope taskId must match taskId.', 409)
  }
  if (input.scope.agentRunId !== input.agentRunId) {
    throw new RuntimeExecutionApiError('Runtime approved-plan scope agentRunId must match agentRunId.', 409)
  }
  if (input.scope.executionPlanRecordId !== input.executionPlanRecordId) {
    throw new RuntimeExecutionApiError('Runtime approved-plan scope executionPlanRecordId must match executionPlanRecordId.', 409)
  }
  if (input.scope.idempotencyKey !== input.idempotencyKey) {
    throw new RuntimeExecutionApiError('Runtime approved-plan scope idempotencyKey must match idempotencyKey.', 409)
  }
  if (input.scope.connectorId !== input.connectorId || input.scope.actionType !== input.actionType) {
    throw new RuntimeExecutionApiError('Runtime approved-plan scope connector/action must match the approved plan.', 409)
  }
  if (input.scope.allowedFilename !== input.payload.filename) {
    throw new RuntimeExecutionApiError('Runtime approved-plan scope allowedFilename must match payload filename.', 409)
  }
}

export async function issueRuntimeExecutionFromApprovedPlan(
  input: ApprovedRuntimeExecutionPlanInput
): Promise<IssueRuntimeExecutionFromApprovedPlanResult> {
  const approvedBy = approvedByValue(input.approvedBy)
  const issuedBy = issuedByValue(input.issuedBy)
  assertApprovedPlanInput(input)

  const plan: StructuredRuntimeExecutionPlan = {
    id: input.executionPlanRecordId,
    taskId: input.taskId,
    agentRunId: input.agentRunId,
    summary: input.summary,
    connectorId: input.connectorId,
    actionType: input.actionType,
    riskLevel: input.riskLevel,
    requiresHumanApproval: input.requiresHumanApproval,
    idempotencyKey: input.idempotencyKey,
    timeoutMs: input.timeoutMs ?? 15000,
    maxAttempts: input.maxAttempts ?? 2,
    payload: input.payload,
  }

  validateStructuredRuntimeExecutionPlan(plan)
  validateRuntimeExecutionScope(input.scope)
  await assertRuntimeDispatchJobIdempotencyAvailable(input.idempotencyKey)

  const token = await createRuntimeExecutionToken({
    taskId: input.taskId,
    agentRunId: input.agentRunId,
    executionPlanRecordId: input.executionPlanRecordId,
    executionApprovalRecordId: input.executionApprovalRecordId,
    plan,
    scope: input.scope,
    issuedBy,
    approvedBy,
    correlationId: input.correlationId,
    expiresAt: input.scope.expiresAt,
    idempotencyKey: input.idempotencyKey,
  })
  const job = await createRuntimeDispatchJob({
    runtimeTokenId: token.record.id,
    taskId: input.taskId,
    plan,
    correlationId: token.record.correlationId,
    idempotencyKey: input.idempotencyKey,
  })
  const activeToken = await transitionRuntimeExecutionToken({
    id: token.record.id,
    targetStatus: 'active',
    reason: 'Activated Sprint 22 runtime token from an approved low-risk execution plan.',
  })

  return {
    token: activeToken.record,
    job: job.record,
    auditEvents: [token.auditEvent, job.auditEvent, activeToken.auditEvent],
    safetyNote: SPRINT_22_SAFETY_NOTE,
  }
}
