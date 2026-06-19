/**
 * Sprint 22 - Controlled Runtime Execution.
 *
 * These records define the minimal real execution layer introduced after the
 * Sprint 1-21 governance-only phase. Sprint 22 runtime permission exists only
 * through a scoped runtime token and a queued runtime job.
 */

export type RuntimeExecutionTargetSprint = 'sprint_22'
export type RuntimeExecutionBaseline = 'sprint_1_21_complete'

export type RuntimeExecutionConnectorId = 'obsidian_local'
export type RuntimeExecutionActionType = 'write_local_markdown_draft'
export type RuntimeExecutionRiskLevel = 'low'
export type RuntimeExecutionTargetDirectoryLabel = 'Inbox/AI Drafts'

export type RuntimeExecutionTokenStatus =
  | 'draft'
  | 'active'
  | 'consumed'
  | 'expired'
  | 'revoked'
  | 'archived'

export type RuntimeExecutionTokenEvent =
  | 'ACTIVATE'
  | 'CONSUME'
  | 'EXPIRE'
  | 'REVOKE'
  | 'ARCHIVE'

export type RuntimeDispatchJobStatus =
  | 'queued'
  | 'leased'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'blocked'
  | 'cancelled'

export type RuntimeDispatchJobEvent =
  | 'LEASE'
  | 'START'
  | 'SUCCEED'
  | 'FAIL'
  | 'BLOCK'
  | 'CANCEL'
  | 'REQUEUE'

export type RuntimeDispatchAttemptStatus =
  | 'leased'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'timed_out'
  | 'blocked'

export type RuntimeExecutionReceiptStatus = 'succeeded' | 'failed' | 'blocked' | 'dry_run'
export type RuntimeRecoveryKind = 'pre_execute' | 'post_execute' | 'failure_snapshot'
export type RuntimeIssuedBy = 'system_dispatcher' | 'operator' | 'kelvin'
export type RuntimeApprovedBy = 'kelvin' | 'operator'

export interface StructuredRuntimeExecutionPlanPayload {
  draftTitle: string
  filename: string
  content: string
  targetDirectoryLabel: RuntimeExecutionTargetDirectoryLabel
}

export interface StructuredRuntimeExecutionPlan {
  id: string
  taskId: string
  agentRunId: string
  summary: string
  connectorId: RuntimeExecutionConnectorId
  actionType: RuntimeExecutionActionType
  riskLevel: RuntimeExecutionRiskLevel
  requiresHumanApproval: boolean
  idempotencyKey: string
  timeoutMs: number
  maxAttempts: number
  payload: StructuredRuntimeExecutionPlanPayload
}

export interface RuntimeExecutionScope {
  connectorId: RuntimeExecutionConnectorId
  actionType: RuntimeExecutionActionType
  allowedVaultRoot: string
  allowedTargetDirectoryLabel: RuntimeExecutionTargetDirectoryLabel
  allowedFilename: string
  taskId: string
  agentRunId: string
  executionPlanRecordId: string
  idempotencyKey: string
  expiresAt: string
}

export interface ApprovedRuntimeExecutionPlanInput {
  taskId: string
  agentRunId: string
  executionPlanRecordId: string
  executionApprovalRecordId: string
  approvedBy: RuntimeApprovedBy
  issuedBy: RuntimeIssuedBy
  approvalStatus: 'approved'
  connectorId: RuntimeExecutionConnectorId
  actionType: RuntimeExecutionActionType
  riskLevel: RuntimeExecutionRiskLevel
  requiresHumanApproval: true
  idempotencyKey: string
  correlationId?: string
  timeoutMs?: number
  maxAttempts?: number
  summary: string
  payload: StructuredRuntimeExecutionPlanPayload
  scope: RuntimeExecutionScope
}

export interface RuntimeExecutionBaseRecord {
  id: string
  targetSprint: RuntimeExecutionTargetSprint
  baseline: RuntimeExecutionBaseline
  correlationId: string
  createdAt: string
}

export interface RuntimeExecutionTokenRecord extends RuntimeExecutionBaseRecord {
  idempotencyKey?: string
  status: RuntimeExecutionTokenStatus
  taskId: string
  agentRunId: string
  executionPlanRecordId: string
  executionApprovalRecordId: string
  connectorId: RuntimeExecutionConnectorId
  actionType: RuntimeExecutionActionType
  scope: RuntimeExecutionScope
  issuedBy: RuntimeIssuedBy
  approvedBy: RuntimeApprovedBy
  expiresAt: string
  consumedAt?: string
  revokedAt?: string
  updatedAt: string
}

export interface RuntimeDispatchJobRecord extends RuntimeExecutionBaseRecord {
  idempotencyKey?: string
  runtimeTokenId: string
  taskId: string
  status: RuntimeDispatchJobStatus
  connectorId: RuntimeExecutionConnectorId
  actionType: RuntimeExecutionActionType
  payload: StructuredRuntimeExecutionPlanPayload
  priority: number
  attemptCount: number
  maxAttempts: number
  leaseOwner?: string
  leaseExpiresAt?: string
  scheduledAt: string
  startedAt?: string
  completedAt?: string
  lastError?: Record<string, unknown>
  updatedAt: string
}

export interface RuntimeDispatchAttemptRecord {
  id: string
  jobId: string
  attempt: number
  status: RuntimeDispatchAttemptStatus
  workerId: string
  startedAt: string
  endedAt?: string
  error?: Record<string, unknown>
  receiptId?: string
  createdAt: string
}

export interface RuntimeExecutionReceiptRecord {
  id: string
  jobId: string
  runtimeTokenId: string
  taskId: string
  connectorId: RuntimeExecutionConnectorId
  actionType: RuntimeExecutionActionType
  status: RuntimeExecutionReceiptStatus
  targetRef: string
  summary: string
  result: Record<string, unknown>
  startedAt: string
  completedAt: string
  correlationId: string
  createdAt: string
}

export interface RuntimeRecoveryPointRecord {
  id: string
  jobId: string
  attemptId: string
  recoveryKind: RuntimeRecoveryKind
  snapshot: Record<string, unknown>
  createdAt: string
}

export interface CreateRuntimeExecutionTokenInput {
  taskId: string
  agentRunId: string
  executionPlanRecordId: string
  executionApprovalRecordId: string
  plan: StructuredRuntimeExecutionPlan
  scope: RuntimeExecutionScope
  issuedBy?: RuntimeIssuedBy
  approvedBy?: RuntimeApprovedBy
  correlationId?: string
  expiresAt?: string
  idempotencyKey?: string
}

export interface CreateRuntimeDispatchJobInput {
  runtimeTokenId: string
  taskId: string
  plan: StructuredRuntimeExecutionPlan
  correlationId?: string
  priority?: number
  scheduledAt?: string
  idempotencyKey?: string
}

export interface CreateRuntimeDispatchAttemptInput {
  jobId: string
  attempt: number
  status: RuntimeDispatchAttemptStatus
  workerId: string
  startedAt?: string
  endedAt?: string
  error?: Record<string, unknown>
  receiptId?: string
}

export interface CreateRuntimeExecutionReceiptInput {
  jobId: string
  runtimeTokenId: string
  taskId: string
  connectorId: RuntimeExecutionConnectorId
  actionType: RuntimeExecutionActionType
  status: RuntimeExecutionReceiptStatus
  targetRef: string
  summary: string
  result: Record<string, unknown>
  startedAt: string
  completedAt: string
  correlationId: string
}

export interface CreateRuntimeRecoveryPointInput {
  jobId: string
  attemptId: string
  recoveryKind: RuntimeRecoveryKind
  snapshot: Record<string, unknown>
}

export interface FindRuntimeExecutionQuery {
  status?: RuntimeExecutionTokenStatus | RuntimeDispatchJobStatus
  taskId?: string
  runtimeTokenId?: string
  connectorId?: RuntimeExecutionConnectorId
  actionType?: RuntimeExecutionActionType
  limit?: number
}

export const RUNTIME_EXECUTION_CONNECTOR_IDS: readonly RuntimeExecutionConnectorId[] = [
  'obsidian_local',
]

export const RUNTIME_EXECUTION_ACTION_TYPES: readonly RuntimeExecutionActionType[] = [
  'write_local_markdown_draft',
]

export const RUNTIME_EXECUTION_RISK_LEVELS: readonly RuntimeExecutionRiskLevel[] = [
  'low',
]

export const RUNTIME_EXECUTION_TARGET_DIRECTORY_LABELS: readonly RuntimeExecutionTargetDirectoryLabel[] = [
  'Inbox/AI Drafts',
]

export const RUNTIME_EXECUTION_TOKEN_STATUSES: readonly RuntimeExecutionTokenStatus[] = [
  'draft',
  'active',
  'consumed',
  'expired',
  'revoked',
  'archived',
]

export const RUNTIME_DISPATCH_JOB_STATUSES: readonly RuntimeDispatchJobStatus[] = [
  'queued',
  'leased',
  'running',
  'succeeded',
  'failed',
  'blocked',
  'cancelled',
]

export const RUNTIME_DISPATCH_ATTEMPT_STATUSES: readonly RuntimeDispatchAttemptStatus[] = [
  'leased',
  'running',
  'succeeded',
  'failed',
  'timed_out',
  'blocked',
]

export const RUNTIME_EXECUTION_RECEIPT_STATUSES: readonly RuntimeExecutionReceiptStatus[] = [
  'succeeded',
  'failed',
  'blocked',
  'dry_run',
]

export const RUNTIME_RECOVERY_KINDS: readonly RuntimeRecoveryKind[] = [
  'pre_execute',
  'post_execute',
  'failure_snapshot',
]

export const FORBIDDEN_RUNTIME_EXECUTION_ACTION_TERMS = [
  'run shell',
  'run git',
  'deploy',
  'create pr',
  'connect mcp',
  'call external api',
  'browser automation',
  'arbitrary file write',
  'bypass approval',
  'auto approve future runs',
] as const

export const SPRINT_22_SAFETY_NOTE =
  'Sprint 22 runtime execution is limited to a single scoped low-risk connector action. Runtime permission exists only through an approved runtime token and a queued runtime job. Shell, Git, PR, deploy, MCP, external API, and arbitrary file writes remain denied.'
