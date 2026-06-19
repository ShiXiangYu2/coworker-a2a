import type {
  CreateRuntimeDispatchAttemptInput,
  CreateRuntimeDispatchJobInput,
  CreateRuntimeExecutionReceiptInput,
  CreateRuntimeExecutionTokenInput,
  CreateRuntimeRecoveryPointInput,
  RuntimeExecutionActionType,
  RuntimeExecutionConnectorId,
  RuntimeExecutionScope,
  StructuredRuntimeExecutionPlan,
} from './types'
import {
  FORBIDDEN_RUNTIME_EXECUTION_ACTION_TERMS,
  RUNTIME_DISPATCH_ATTEMPT_STATUSES,
  RUNTIME_EXECUTION_ACTION_TYPES,
  RUNTIME_EXECUTION_CONNECTOR_IDS,
  RUNTIME_EXECUTION_RECEIPT_STATUSES,
  RUNTIME_EXECUTION_RISK_LEVELS,
  RUNTIME_EXECUTION_TARGET_DIRECTORY_LABELS,
  RUNTIME_RECOVERY_KINDS,
} from './types'

export class RuntimeExecutionValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RuntimeExecutionValidationError'
  }
}

export class RuntimeExecutionSafetyViolationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RuntimeExecutionSafetyViolationError'
  }
}

export function validateStructuredRuntimeExecutionPlan(plan: StructuredRuntimeExecutionPlan): void {
  validateRequiredText(plan.id, 'plan.id', 200)
  validateRequiredText(plan.taskId, 'plan.taskId', 200)
  validateRequiredText(plan.agentRunId, 'plan.agentRunId', 200)
  validateRequiredText(plan.summary, 'plan.summary', 4000)
  validateRuntimeExecutionConnectorId(plan.connectorId)
  validateRuntimeExecutionActionType(plan.actionType)
  if (!(RUNTIME_EXECUTION_RISK_LEVELS as readonly string[]).includes(plan.riskLevel)) {
    throw new RuntimeExecutionValidationError('Sprint 22 plan riskLevel must be low.')
  }
  if (plan.requiresHumanApproval !== true) {
    throw new RuntimeExecutionSafetyViolationError('Sprint 22 structured runtime execution plans must require human approval.')
  }
  validateRequiredText(plan.idempotencyKey, 'plan.idempotencyKey', 200)
  if (!Number.isInteger(plan.timeoutMs) || plan.timeoutMs <= 0 || plan.timeoutMs > 60_000) {
    throw new RuntimeExecutionValidationError('Sprint 22 plan timeoutMs must be an integer between 1 and 60000.')
  }
  if (!Number.isInteger(plan.maxAttempts) || plan.maxAttempts < 1 || plan.maxAttempts > 3) {
    throw new RuntimeExecutionValidationError('Sprint 22 plan maxAttempts must be an integer between 1 and 3.')
  }
  validateRequiredText(plan.payload.draftTitle, 'plan.payload.draftTitle', 200)
  validateRequiredText(plan.payload.filename, 'plan.payload.filename', 255)
  validateRequiredText(plan.payload.content, 'plan.payload.content', 100_000)
  if (!(RUNTIME_EXECUTION_TARGET_DIRECTORY_LABELS as readonly string[]).includes(plan.payload.targetDirectoryLabel)) {
    throw new RuntimeExecutionValidationError('Sprint 22 targetDirectoryLabel must be Inbox/AI Drafts.')
  }
  validateNoForbiddenRuntimeExecutionActionTerms(plan.summary, 'plan.summary')
}

export function validateRuntimeExecutionScope(scope: RuntimeExecutionScope): void {
  validateRuntimeExecutionConnectorId(scope.connectorId)
  validateRuntimeExecutionActionType(scope.actionType)
  validateRequiredText(scope.allowedVaultRoot, 'scope.allowedVaultRoot', 1000)
  if (!(RUNTIME_EXECUTION_TARGET_DIRECTORY_LABELS as readonly string[]).includes(scope.allowedTargetDirectoryLabel)) {
    throw new RuntimeExecutionValidationError('scope.allowedTargetDirectoryLabel must be Inbox/AI Drafts.')
  }
  validateRequiredText(scope.allowedFilename, 'scope.allowedFilename', 255)
  validateRequiredText(scope.taskId, 'scope.taskId', 200)
  validateRequiredText(scope.agentRunId, 'scope.agentRunId', 200)
  validateRequiredText(scope.executionPlanRecordId, 'scope.executionPlanRecordId', 200)
  validateRequiredText(scope.idempotencyKey, 'scope.idempotencyKey', 200)
  validateIsoDateTime(scope.expiresAt, 'scope.expiresAt')
}

export function validateCreateRuntimeExecutionTokenInput(input: CreateRuntimeExecutionTokenInput): void {
  validateRequiredText(input.taskId, 'taskId', 200)
  validateRequiredText(input.agentRunId, 'agentRunId', 200)
  validateRequiredText(input.executionPlanRecordId, 'executionPlanRecordId', 200)
  validateRequiredText(input.executionApprovalRecordId, 'executionApprovalRecordId', 200)
  validateStructuredRuntimeExecutionPlan(input.plan)
  validateRuntimeExecutionScope(input.scope)
  if (input.plan.taskId !== input.taskId) {
    throw new RuntimeExecutionSafetyViolationError('RuntimeExecutionToken taskId must match the structured plan taskId.')
  }
  if (input.plan.agentRunId !== input.agentRunId) {
    throw new RuntimeExecutionSafetyViolationError('RuntimeExecutionToken agentRunId must match the structured plan agentRunId.')
  }
  if (input.plan.idempotencyKey !== input.scope.idempotencyKey) {
    throw new RuntimeExecutionSafetyViolationError('RuntimeExecutionToken scope idempotencyKey must match the structured plan.')
  }
  if (input.plan.connectorId !== input.scope.connectorId || input.plan.actionType !== input.scope.actionType) {
    throw new RuntimeExecutionSafetyViolationError('RuntimeExecutionToken scope must match the structured plan connector and action.')
  }
}

export function validateCreateRuntimeDispatchJobInput(input: CreateRuntimeDispatchJobInput): void {
  validateRequiredText(input.runtimeTokenId, 'runtimeTokenId', 200)
  validateRequiredText(input.taskId, 'taskId', 200)
  validateStructuredRuntimeExecutionPlan(input.plan)
  if (input.plan.taskId !== input.taskId) {
    throw new RuntimeExecutionSafetyViolationError('RuntimeDispatchJob taskId must match the structured plan taskId.')
  }
  if (input.priority !== undefined && (!Number.isInteger(input.priority) || input.priority < 0 || input.priority > 1000)) {
    throw new RuntimeExecutionValidationError('RuntimeDispatchJob priority must be an integer between 0 and 1000.')
  }
  if (input.scheduledAt) validateIsoDateTime(input.scheduledAt, 'scheduledAt')
}

export function validateCreateRuntimeDispatchAttemptInput(input: CreateRuntimeDispatchAttemptInput): void {
  validateRequiredText(input.jobId, 'jobId', 200)
  if (!Number.isInteger(input.attempt) || input.attempt < 1) {
    throw new RuntimeExecutionValidationError('RuntimeDispatchAttempt attempt must be an integer greater than 0.')
  }
  if (!(RUNTIME_DISPATCH_ATTEMPT_STATUSES as readonly string[]).includes(input.status)) {
    throw new RuntimeExecutionValidationError(`Invalid RuntimeDispatchAttempt status "${input.status}".`)
  }
  validateRequiredText(input.workerId, 'workerId', 200)
  if (input.startedAt) validateIsoDateTime(input.startedAt, 'startedAt')
  if (input.endedAt) validateIsoDateTime(input.endedAt, 'endedAt')
}

export function validateCreateRuntimeExecutionReceiptInput(input: CreateRuntimeExecutionReceiptInput): void {
  validateRequiredText(input.jobId, 'jobId', 200)
  validateRequiredText(input.runtimeTokenId, 'runtimeTokenId', 200)
  validateRequiredText(input.taskId, 'taskId', 200)
  validateRuntimeExecutionConnectorId(input.connectorId)
  validateRuntimeExecutionActionType(input.actionType)
  if (!(RUNTIME_EXECUTION_RECEIPT_STATUSES as readonly string[]).includes(input.status)) {
    throw new RuntimeExecutionValidationError(`Invalid RuntimeExecutionReceipt status "${input.status}".`)
  }
  validateRequiredText(input.targetRef, 'targetRef', 1000)
  validateRequiredText(input.summary, 'summary', 4000)
  validateIsoDateTime(input.startedAt, 'startedAt')
  validateIsoDateTime(input.completedAt, 'completedAt')
  validateRequiredText(input.correlationId, 'correlationId', 200)
}

export function validateCreateRuntimeRecoveryPointInput(input: CreateRuntimeRecoveryPointInput): void {
  validateRequiredText(input.jobId, 'jobId', 200)
  validateRequiredText(input.attemptId, 'attemptId', 200)
  if (!(RUNTIME_RECOVERY_KINDS as readonly string[]).includes(input.recoveryKind)) {
    throw new RuntimeExecutionValidationError(`Invalid RuntimeRecoveryPoint recoveryKind "${input.recoveryKind}".`)
  }
  if (!input.snapshot || typeof input.snapshot !== 'object' || Array.isArray(input.snapshot)) {
    throw new RuntimeExecutionValidationError('RuntimeRecoveryPoint snapshot must be an object.')
  }
}

export function validateRuntimeExecutionConnectorId(
  value: string
): asserts value is RuntimeExecutionConnectorId {
  if (!(RUNTIME_EXECUTION_CONNECTOR_IDS as readonly string[]).includes(value)) {
    throw new RuntimeExecutionValidationError(`Invalid runtime connectorId "${value}".`)
  }
}

export function validateRuntimeExecutionActionType(
  value: string
): asserts value is RuntimeExecutionActionType {
  if (!(RUNTIME_EXECUTION_ACTION_TYPES as readonly string[]).includes(value)) {
    throw new RuntimeExecutionValidationError(`Invalid runtime actionType "${value}".`)
  }
}

export function validateNoForbiddenRuntimeExecutionActionTerms(value: string, context: string): void {
  const lower = value.toLowerCase()
  for (const term of FORBIDDEN_RUNTIME_EXECUTION_ACTION_TERMS) {
    if (lower.includes(term)) {
      throw new RuntimeExecutionSafetyViolationError(`Forbidden Sprint 22 runtime action term "${term}" found in ${context}.`)
    }
  }
}

function validateRequiredText(value: unknown, name: string, max: number): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new RuntimeExecutionValidationError(`${name} is required and must be a non-empty string.`)
  }
  if (value.length > max) {
    throw new RuntimeExecutionValidationError(`${name} must be ${max} characters or less.`)
  }
}

function validateIsoDateTime(value: string, name: string): void {
  if (Number.isNaN(Date.parse(value))) {
    throw new RuntimeExecutionValidationError(`${name} must be a valid ISO datetime string.`)
  }
}
