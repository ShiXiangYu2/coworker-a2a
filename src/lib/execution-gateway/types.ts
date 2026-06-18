/**
 * Sprint 20 - Department Runtime Execution Gateway / Human-Gated Execution.
 *
 * These are local execution governance records only. They describe intent,
 * plans, gates, approvals, and review receipts without executing agents,
 * tools, workflows, files, Git, APIs, MCP, deploys, releases, or task
 * completion.
 */

export type ExecutionGatewayRecordStatus =
  | 'draft'
  | 'review'
  | 'approved_record'
  | 'rejected'
  | 'superseded'
  | 'archived'

export type ExecutionGatewayRecordEvent =
  | 'SUBMIT_REVIEW'
  | 'APPROVE_RECORD'
  | 'REJECT'
  | 'SUPERSEDE'
  | 'ARCHIVE'

export type ExecutionGatewayTargetSprint = 'sprint_20'
export type ExecutionGatewayBaseline = 'sprint_1_19_complete'

export type ExecutionGatewayRecordType =
  | 'execution_intent_record'
  | 'execution_plan_record'
  | 'execution_gate_record'
  | 'execution_approval_record'
  | 'execution_receipt_record'

export type ExecutionEvidenceSourceType =
  | 'task'
  | 'agent_run'
  | 'agent_result'
  | 'tool_call'
  | 'tool_run'
  | 'tool_execution_plan'
  | 'tool_execution_receipt'
  | 'workflow_proposal'
  | 'workflow_step_record'
  | 'evidence_import_record'
  | 'sanitized_evidence_snapshot'
  | 'department_profile'
  | 'department_agent_role'
  | 'department_responsibility_matrix'
  | 'department_escalation_policy'
  | 'department_permission_boundary'
  | 'department_review_record'
  | 'evidence_to_department_mapping_record'
  | 'department_evidence_coverage_record'
  | 'department_review_gap_record'
  | 'department_mapping_review_record'
  | 'audit_event'
  | 'observability_event'
  | 'eval_run'
  | 'regression_gate'
  | 'release_readiness_checklist'
  | 'manual_note'

export type ExecutionRequestedBy = 'user' | 'operator' | 'kelvin' | 'system_record'
export type ExecutionCreatedBy = 'user' | 'operator' | 'kelvin' | 'system_record'
export type ExecutionReviewer = 'kelvin' | 'owner' | 'operator'
export type ExecutionReviewVerdict = 'needs_changes' | 'approved_record' | 'rejected'
export type ExecutionGateDecision = 'pending_review' | 'approved_record' | 'rejected'
export type ExecutionGateRequiredReviewer = 'kelvin' | 'operator' | 'owner'
export type ExecutionReceiptKind =
  | 'dry_run_record'
  | 'manual_review_record'
  | 'external_summary_record'
  | 'audit_summary_record'

export interface ExecutionTokenBlockers {
  isExecutionToken: false
  isRoutingToken: false
  isPermissionGrant: false
  isReleaseToken: false
  isDeployToken: false
  isTaskCompletionToken: false
  grantsRuntimePermission: false
  mutatesSourceRecords: false
}

export interface ExecutionBlockers {
  executesAgent: false
  continuesAgent: false
  routesTask: false
  assignsAgent: false
  executesToolRun: false
  executesWorkflow: false
  writesFile: false
  runsGit: false
  callsExternalApi: false
  connectsMcp: false
  createsPr: false
  deploysOrReleases: false
  completesTask: false
}

export interface ExecutionEvidenceRef extends ExecutionTokenBlockers {
  sourceType: ExecutionEvidenceSourceType
  sourceId?: string
  summary: string
  redactionStatus: 'sanitized' | 'redacted'
  reviewUseOnly: true
  localReferenceOnly: true
}

export interface ExecutionLifecycleFields {
  reviewedBy?: string
  reviewedAt?: string
  archivedAt?: string
  supersedesRecordId?: string
  supersededByRecordId?: string
  supersededAt?: string
  supersedeReason?: string
}

export interface ExecutionBaseRecord extends ExecutionLifecycleFields, ExecutionTokenBlockers, ExecutionBlockers {
  id: string
  targetSprint: ExecutionGatewayTargetSprint
  baseline: ExecutionGatewayBaseline
  status: ExecutionGatewayRecordStatus
  createdBy: ExecutionCreatedBy
  correlationId: string
  auditRefs: string[]
  createdAt: string
  updatedAt: string
}

export interface ExecutionIntentRecord extends ExecutionBaseRecord {
  intentTitle: string
  intentSummary: string
  requestedBy: ExecutionRequestedBy
  departmentProfileId?: string
  departmentAgentRoleId?: string
  sourceTaskId?: string
  requestedActionType: string
  requestedActionSummary: string
  expectedOutcome: string
  riskSummary: string
  sanitizedEvidenceRefs: ExecutionEvidenceRef[]
  departmentMappingRefs: string[]
  planRecordRefs: string[]
  gateRecordRefs: string[]
  approvalRecordRefs: string[]
  receiptRecordRefs: string[]
}

export interface ExecutionPlanRecord extends ExecutionBaseRecord {
  intentRecordId: string
  planTitle: string
  planSummary: string
  plannedSteps: string[]
  preconditions: string[]
  postconditions: string[]
  humanCheckpoints: string[]
  riskControls: string[]
  rollbackNotes: string
  nonExecutablePlanOnly: true
  sanitizedEvidenceRefs: ExecutionEvidenceRef[]
  gateRecordRefs: string[]
  approvalRecordRefs: string[]
  receiptRecordRefs: string[]
}

export interface ExecutionGateRecord extends ExecutionBaseRecord {
  intentRecordId?: string
  planRecordId?: string
  gateName: string
  gateSummary: string
  gateDecision: ExecutionGateDecision
  requiredReviewer: ExecutionGateRequiredReviewer
  requiredEvidenceRefs: ExecutionEvidenceRef[]
  blockedReasons: string[]
  approvalMeaning: 'local_execution_record_review_only'
  doesNotGrantRuntimePermission: true
  approvalRecordRefs: string[]
  receiptRecordRefs: string[]
}

export interface ExecutionApprovalRecord extends ExecutionBaseRecord {
  targetType: Exclude<ExecutionGatewayRecordType, 'execution_approval_record'>
  targetId: string
  reviewer: ExecutionReviewer
  verdict: ExecutionReviewVerdict
  reviewNotes: string
  confirmationArtifactId?: string
  approvalScope: 'single_local_record_only'
  doesNotExecuteAgent: true
  doesNotContinueAgent: true
  doesNotAutoRouteTask: true
  doesNotAssignAgent: true
  doesNotExecuteToolRun: true
  doesNotExecuteWorkflow: true
  doesNotWriteFile: true
  doesNotRunGit: true
  doesNotCallExternalApi: true
  doesNotConnectMcp: true
  doesNotCreatePr: true
  doesNotDeployReleasePublish: true
  doesNotCompleteTask: true
  doesNotApproveFutureExecutions: true
  evidenceRefs: ExecutionEvidenceRef[]
}

export interface ExecutionReceiptRecord extends ExecutionBaseRecord {
  intentRecordId?: string
  planRecordId?: string
  gateRecordId?: string
  receiptTitle: string
  receiptSummary: string
  observedOutcomeSummary: string
  operatorNotes: string
  evidenceRefs: ExecutionEvidenceRef[]
  receiptKind: ExecutionReceiptKind
  actualExecutionPerformed: false
  sourceSystemAccessed: false
  receiptIsLocalRecordOnly: true
  receiptIsNotRuntimeReceipt: true
  receiptIsNotToolExecutionReceipt: true
  approvalRecordRefs: string[]
}

export interface CreateExecutionIntentInput {
  intentTitle: string
  intentSummary: string
  requestedBy?: ExecutionRequestedBy
  departmentProfileId?: string
  departmentAgentRoleId?: string
  sourceTaskId?: string
  requestedActionType: string
  requestedActionSummary: string
  expectedOutcome: string
  riskSummary: string
  sanitizedEvidenceRefs?: ExecutionEvidenceRef[]
  departmentMappingRefs?: string[]
  createdBy?: ExecutionCreatedBy
  correlationId?: string
  idempotencyKey?: string
}

export interface CreateExecutionPlanInput {
  intentRecordId: string
  planTitle: string
  planSummary: string
  plannedSteps?: string[]
  preconditions?: string[]
  postconditions?: string[]
  humanCheckpoints?: string[]
  riskControls?: string[]
  rollbackNotes: string
  sanitizedEvidenceRefs?: ExecutionEvidenceRef[]
  createdBy?: ExecutionCreatedBy
  correlationId?: string
  idempotencyKey?: string
}

export interface CreateExecutionGateInput {
  intentRecordId?: string
  planRecordId?: string
  gateName: string
  gateSummary: string
  gateDecision?: ExecutionGateDecision
  requiredReviewer?: ExecutionGateRequiredReviewer
  requiredEvidenceRefs?: ExecutionEvidenceRef[]
  blockedReasons?: string[]
  createdBy?: ExecutionCreatedBy
  correlationId?: string
  idempotencyKey?: string
}

export interface CreateExecutionApprovalInput {
  targetType: Exclude<ExecutionGatewayRecordType, 'execution_approval_record'>
  targetId: string
  reviewer?: ExecutionReviewer
  verdict: ExecutionReviewVerdict
  reviewNotes: string
  confirmationArtifactId?: string
  evidenceRefs?: ExecutionEvidenceRef[]
  createdBy?: ExecutionCreatedBy
  correlationId?: string
  idempotencyKey?: string
}

export interface CreateExecutionReceiptInput {
  intentRecordId?: string
  planRecordId?: string
  gateRecordId?: string
  receiptTitle: string
  receiptSummary: string
  observedOutcomeSummary: string
  operatorNotes: string
  evidenceRefs?: ExecutionEvidenceRef[]
  receiptKind?: ExecutionReceiptKind
  createdBy?: ExecutionCreatedBy
  correlationId?: string
  idempotencyKey?: string
}

export interface FindExecutionGatewayRecordsQuery {
  status?: ExecutionGatewayRecordStatus
  intentRecordId?: string
  planRecordId?: string
  gateRecordId?: string
  targetId?: string
  departmentProfileId?: string
  sourceTaskId?: string
  limit?: number
}

export const EXECUTION_GATEWAY_RECORD_TYPES: readonly ExecutionGatewayRecordType[] = [
  'execution_intent_record',
  'execution_plan_record',
  'execution_gate_record',
  'execution_approval_record',
  'execution_receipt_record',
]

export const EXECUTION_EVIDENCE_SOURCE_TYPES: readonly ExecutionEvidenceSourceType[] = [
  'task',
  'agent_run',
  'agent_result',
  'tool_call',
  'tool_run',
  'tool_execution_plan',
  'tool_execution_receipt',
  'workflow_proposal',
  'workflow_step_record',
  'evidence_import_record',
  'sanitized_evidence_snapshot',
  'department_profile',
  'department_agent_role',
  'department_responsibility_matrix',
  'department_escalation_policy',
  'department_permission_boundary',
  'department_review_record',
  'evidence_to_department_mapping_record',
  'department_evidence_coverage_record',
  'department_review_gap_record',
  'department_mapping_review_record',
  'audit_event',
  'observability_event',
  'eval_run',
  'regression_gate',
  'release_readiness_checklist',
  'manual_note',
]

export const FORBIDDEN_EXECUTION_GATEWAY_STATES = [
  'active_runtime',
  'executing',
  'running',
  'delegated',
  'routed',
  'auto_routed',
  'invoked',
  'connected',
  'deployed',
  'released',
  'resumed',
] as const

export const FORBIDDEN_EXECUTION_GATEWAY_ACTION_TERMS = [
  'run execution',
  'execute now',
  'continue agent',
  'auto route',
  'assign agent',
  'run tool',
  'execute workflow',
  'apply change',
  'write file',
  'run git',
  'call api',
  'connect mcp',
  'create pr',
  'deploy',
  'release',
  'complete task',
  'retry',
  'replay',
  'rollback',
  'resume execution',
] as const

export const SPRINT_20_SAFETY_NOTE =
  'Sprint 20 execution gateway records are local governance records only. Approval reviews a single local record and does not execute agents, route tasks, assign agents, grant runtime permission, run tools, run workflows, write files, call external systems, create PRs, deploy, release, or complete tasks.'

export const EXECUTION_TOKEN_BLOCKERS: ExecutionTokenBlockers = {
  isExecutionToken: false,
  isRoutingToken: false,
  isPermissionGrant: false,
  isReleaseToken: false,
  isDeployToken: false,
  isTaskCompletionToken: false,
  grantsRuntimePermission: false,
  mutatesSourceRecords: false,
}

export const EXECUTION_BLOCKERS: ExecutionBlockers = {
  executesAgent: false,
  continuesAgent: false,
  routesTask: false,
  assignsAgent: false,
  executesToolRun: false,
  executesWorkflow: false,
  writesFile: false,
  runsGit: false,
  callsExternalApi: false,
  connectsMcp: false,
  createsPr: false,
  deploysOrReleases: false,
  completesTask: false,
}
