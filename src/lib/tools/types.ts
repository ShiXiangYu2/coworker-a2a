import type { AgentId } from '@/lib/agents/types'

export type ToolCategory =
  | 'read_simulated'
  | 'read'
  | 'write'
  | 'write_sandbox'
  | 'command'
  | 'git'
  | 'pr'
  | 'deploy'
  | 'database'
  | 'external_api'
  | 'mcp'
  | 'browser'
  | 'internal_noop'

export type ToolRiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type Sprint6ToolMode = 'proposal_only' | 'mock_only' | 'disabled'
export type Sprint11ExecutionMode = 'not_executable' | 'controlled_deterministic_local'

export interface ToolDefinition {
  id: string
  name: string
  displayName: string
  description: string
  category: ToolCategory
  version: string
  inputSchema: JsonSchema
  outputSchema?: JsonSchema
  riskLevel: ToolRiskLevel
  isReadOnly: boolean
  isDestructive: boolean
  isOpenWorld: boolean
  /** 核心工具始终加载，非核心按需发现（对齐 claude-code CORE_TOOLS 模式） */
  isCore?: boolean
  requiresHumanConfirmation: boolean
  allowedAgentIds?: AgentId[]
  allowedTaskTypes?: string[]
  permissionProfileRef: string
  maxInputSizeChars?: number
  maxResultSizeChars?: number
  timeoutMs?: number
  enabled: boolean
  sprint6Mode: Sprint6ToolMode
  sprint11ExecutionMode?: Sprint11ExecutionMode
  executorId?: string
  sandboxId?: string
  executionPolicyRef?: string
  createdAt: string
  updatedAt: string
}

export interface ToolRegistry {
  id: string
  version: string
  defaultMode: 'default_deny'
  defaultPermissionProfileRef: string
  tools: ToolDefinition[]
  updatedAt: string
}

export type ToolCallStatus =
  | 'proposed'
  | 'permission_denied'
  | 'pending_confirmation'
  | 'approved_record'
  | 'rejected'
  | 'cancelled'
  | 'blocked'

export type ToolCallEvent =
  | 'EVALUATE_PERMISSION'
  | 'REQUIRE_CONFIRMATION'
  | 'DENY_PERMISSION'
  | 'BLOCK_TOOL_CALL'
  | 'APPROVE_RECORD'
  | 'REJECT_TOOL_CALL'
  | 'CANCEL_TOOL_CALL'

export interface ToolCall {
  id: string
  taskId?: string
  agentRunId?: string
  agentResultId?: string
  source: 'agent_result' | 'user_request' | 'system_test'
  toolId: string
  toolName: string
  proposedByAgentId?: AgentId
  intent: string
  rationale: string
  input: unknown
  inputSummary: string
  status: ToolCallStatus
  riskLevel: ToolRiskLevel
  sideEffects: string[]
  permissionDecisionId?: string
  confirmationArtifactId?: string
  sourceSnapshot?: unknown
  policyInputSnapshot?: unknown
  idempotencyKey?: string
  correlationId?: string
  createdAt: string
  updatedAt: string
}

export type ToolPermissionDecision =
  | 'allow_record_only'
  | 'allow_controlled_execution'
  | 'deny'
  | 'requires_human'
  | 'blocked'

export interface ToolPermission {
  id: string
  toolCallId: string
  toolId: string
  decision: ToolPermissionDecision
  reason: string
  evaluatedBy: 'policy'
  policyRef: string
  permissionProfileRef: string
  riskLevel: ToolRiskLevel
  inputValidationStatus: 'valid' | 'invalid' | 'skipped'
  schemaValidationErrors?: string[]
  matchedRules: string[]
  deniedRules: string[]
  createdAt: string
}

export type ToolRunStatus =
  | 'not_started'
  | 'blocked'
  | 'cancelled'
  | 'skipped'
  | 'mock_completed'
  | 'failed_validation'
  | 'created'
  | 'awaiting_permission'
  | 'awaiting_confirmation'
  | 'approved_for_execution'
  | 'executing'
  | 'succeeded'
  | 'failed'
  | 'denied'
  | 'rejected'

export type ToolRunMode = 'proposal_only' | 'mock_only' | 'controlled_execution'

export type ToolRunEvent =
  | 'SKIP_TOOL_RUN'
  | 'BLOCK_TOOL_RUN'
  | 'CANCEL_TOOL_RUN'
  | 'COMPLETE_MOCK_RUN'
  | 'FAIL_VALIDATION'
  | 'REQUEST_PERMISSION'
  | 'REQUIRE_EXECUTION_CONFIRMATION'
  | 'DENY_EXECUTION'
  | 'APPROVE_FOR_EXECUTION'
  | 'REJECT_EXECUTION'
  | 'START_APPROVED_EXECUTION'
  | 'SUCCEED_EXECUTION'
  | 'FAIL_EXECUTION'
  | 'CANCEL_EXECUTION'

export interface ToolRun {
  id: string
  toolCallId: string
  taskId?: string
  agentRunId?: string
  toolId: string
  status: ToolRunStatus
  mode: ToolRunMode
  inputSnapshot: unknown
  result?: ToolResult
  idempotencyKey?: string
  executionPlanId?: string
  executionReceiptId?: string
  executorId?: string
  sandboxId?: string
  executionPolicyId?: string
  recoveryPointId?: string
  sideEffectClass?: ToolSideEffectClass
  startedAt?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}

export type ToolExecutionStatus =
  | 'created'
  | 'awaiting_permission'
  | 'awaiting_confirmation'
  | 'approved_for_execution'
  | 'executing'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'denied'
  | 'rejected'

export type ToolSideEffectClass = 'none' | 'simulated_read' | 'sandbox_file_write'

export interface ToolExecutor {
  id: string
  executorVersion: string
  toolId: string
  toolCategory: Extract<ToolCategory, 'internal_noop' | 'read_simulated' | 'write_sandbox'>
  executionMode: 'deterministic_local'
  enabled: boolean
  sandboxId: string
  policyId: string
  maxInputSizeChars: number
  maxOutputSizeChars: number
  timeoutMs: number
  idempotencyRequired: true
  sideEffectClass: ToolSideEffectClass
  deterministicOutputRequired: boolean
  createdAt: string
  updatedAt: string
}

export interface ToolSandbox {
  id: string
  sandboxVersion: string
  mode: 'local_deterministic'
  allowShell: false
  allowGit: false
  allowFileRead: false
  allowFileWrite: boolean
  allowNetwork: false
  allowExternalApi: false
  allowMcp: false
  allowBrowser: false
  allowDatabaseMigration: false
  allowEnvironmentRead: false
  allowQueue: false
  allowWorker: false
  maxRuntimeMs: number
  maxInputSizeChars: number
  maxOutputSizeChars: number
  createdAt: string
  updatedAt: string
}

export interface ToolExecutionPolicy {
  id: string
  policyVersion: string
  status: 'draft' | 'active' | 'archived'
  defaultDecision: 'deny'
  allowedToolCategories: Extract<ToolCategory, 'internal_noop' | 'read_simulated' | 'write_sandbox'>[]
  deniedToolCategories: (ToolCategory | 'file_read' | 'file_write' | 'database_migration')[]
  requiresKelvinForRisk: Exclude<ToolRiskLevel, 'low'>[]
  maxRuntimeMs: number
  maxInputSizeChars: number
  maxOutputSizeChars: number
  requireRecoveryPointBeforeExecution: true
  requireAuditEvent: true
  requireObservabilityEvent: true
  requireIdempotencyKey: true
  requireDeterministicOutput: boolean
  allowAutomaticFutureApproval: false
  allowRetry: false
  allowReplay: false
  allowRollback: false
  allowResumeExecution: false
  createdAt: string
  updatedAt: string
}

export interface ToolExecutionPlan {
  id: string
  toolRunId: string
  toolCallId: string
  taskId?: string
  agentRunId?: string
  toolId: string
  executorId: string
  sandboxId: string
  policyId: string
  status: 'draft' | 'ready_for_confirmation' | 'approved_record' | 'rejected' | 'expired'
  executionMode: 'deterministic_local'
  sideEffectClass: ToolSideEffectClass
  expectedSideEffects: string[]
  reversibility: 'not_required' | 'inspect_only'
  idempotencyKey: string
  inputSnapshot: unknown
  normalizedInputHash: string
  policyVersion: string
  executorVersion: string
  requiresKelvinConfirmation: boolean
  confirmationArtifactId?: string
  recoveryPointId?: string
  evalRunIds?: string[]
  regressionGateId?: string
  releaseReadinessChecklistId?: string
  sandboxProfileId?: string
  allowedWriteRoot?: 'deliverables'
  allowedExtensions?: string[]
  expectedOutputPath?: string
  expiresAt?: string
  createdAt: string
  updatedAt: string
}

export interface ToolExecutionReceipt {
  id: string
  toolRunId: string
  toolCallId: string
  taskId?: string
  agentRunId?: string
  toolId: string
  executorId: string
  executionPlanId: string
  status: 'succeeded' | 'failed' | 'cancelled'
  startedAt: string
  completedAt: string
  durationMs: number
  idempotencyKey: string
  inputHash: string
  outputHash?: string
  policyVersion: string
  executorVersion: string
  resultSummary: string
  resultSnapshot?: unknown
  sideEffects: string[]
  sideEffectClass: ToolSideEffectClass
  reversibility: 'not_required' | 'inspect_only'
  simulatedReads?: {
    source: 'static_fixture' | 'local_in_memory'
    key: string
    hash: string
  }[]
  sandboxExecutionRecordId?: string
  outputPath?: string
  bytesWritten?: number
  auditEventIds: string[]
  observabilityEventIds: string[]
  recoveryPointId: string
  createdAt: string
}

export interface ToolResult {
  status: 'success' | 'skipped' | 'failed' | 'requires_human'
  confidence: number
  summary: string
  data?: unknown
  next: {
    recommendedAction: 'continue' | 'retry' | 'stop' | 'escalate'
    reason?: string
  }
  sideEffects: string[]
  warnings?: string[]
  auditRefs?: string[]
  sideEffectClass?: ToolSideEffectClass
  reversibility?: 'not_required' | 'inspect_only'
  idempotencyKey?: string
  inputHash?: string
  outputHash?: string
  recoveryPointId?: string
  observabilityRefs?: string[]
}

export interface PermissionProfile {
  id: string
  name: string
  description: string
  allowedToolCategories: ToolCategory[]
  optionalAllowedToolCategories?: ToolCategory[]
  deniedToolCategories: ToolCategory[]
  allowedCommands: string[]
  deniedCommands: string[]
  allowedPaths: string[]
  deniedPaths: string[]
  allowExternalApi: false
  allowShell: false
  allowGit: false
  allowFileWrite: false
  allowPr: false
  allowDeploy: false
  allowDelete: false
  allowDatabaseMigration: false
  allowMcp: false
  allowBrowserAutomation: false
  requiresHumanForRisk: Exclude<ToolRiskLevel, 'low'>[]
  maxInputSizeChars: number
  maxResultSizeChars: number
}

export interface CommandPolicy {
  id: string
  version: string
  defaultDecision: 'deny'
  profiles: PermissionProfile[]
  forbiddenCapabilities: string[]
  createdAt: string
  updatedAt: string
}

export interface ToolCallCandidate {
  toolName: string
  intent: string
  rationale: string
  input: unknown
  inputSummary: string
  riskLevel: ToolRiskLevel
  requiresHumanConfirmation: boolean
  sideEffects: string[]
}

export interface CreateToolCallsFromAgentResultInput {
  agentRunId: string
  agentResult?: {
    toolCallCandidates?: ToolCallCandidate[]
    [key: string]: unknown
  }
  idempotencyKey?: string
}

export interface ToolCallBundle {
  toolCall: ToolCall
  latestPermission?: ToolPermission
  toolRuns: ToolRun[]
  executionPlans?: ToolExecutionPlan[]
  executionReceipts?: ToolExecutionReceipt[]
}

export interface ReviewToolCallInput {
  reviewedBy?: string
  decisionReason: string
}

export type JsonSchema = {
  type?: string
  required?: string[]
  properties?: Record<string, { type?: string }>
}

export const sprint6SafetyNote =
  'Sprint 6 records tool proposals, permission decisions, and approvals only. It does not execute tools, shell commands, Git operations, file edits, PRs, deploys, deletes, database changes, external APIs, MCP calls, or browser automation.'

export const sprint11SafetyNote =
  'Sprint 11 executes only approved deterministic local no-op or simulated-read tools. It does not run shell, Git, file reads or writes, patches, formatting, PRs, deploys, deletes, external APIs, MCP, browser automation, database migrations, Agent continuation, automatic retry, replay, rollback, resume execution, or Task completion.'
