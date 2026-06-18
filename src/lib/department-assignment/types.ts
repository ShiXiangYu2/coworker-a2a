/**
 * Sprint 21 - Department Task Intake / Assignment Review.
 *
 * Local governance records only. These records describe task intake,
 * department assignment proposals, role-fit reviews, assignment approvals,
 * and assignment audit timelines without routing tasks, assigning runtime
 * agents, starting agent runs, executing tools/workflows, granting runtime
 * permission, or completing tasks.
 */

export type DepartmentAssignmentRecordStatus =
  | 'draft'
  | 'review'
  | 'approved_record'
  | 'rejected'
  | 'superseded'
  | 'archived'

export type DepartmentAssignmentRecordEvent =
  | 'SUBMIT_REVIEW'
  | 'APPROVE_RECORD'
  | 'REJECT'
  | 'SUPERSEDE'
  | 'ARCHIVE'

export type DepartmentAssignmentTargetSprint = 'sprint_21'
export type DepartmentAssignmentBaseline = 'sprint_1_20_complete'

export type DepartmentAssignmentRecordType =
  | 'department_task_intake_record'
  | 'department_assignment_proposal'
  | 'department_role_fit_review'
  | 'department_assignment_approval_record'
  | 'department_assignment_audit_record'

export type DepartmentAssignmentEvidenceSourceType =
  | 'task'
  | 'agent_run'
  | 'agent_result'
  | 'tool_call'
  | 'tool_run'
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
  | 'execution_intent_record'
  | 'execution_plan_record'
  | 'execution_gate_record'
  | 'execution_approval_record'
  | 'execution_receipt_record'
  | 'audit_event'
  | 'observability_event'
  | 'eval_run'
  | 'regression_gate'
  | 'release_readiness_checklist'
  | 'manual_note'

export type DepartmentAssignmentCreatedBy = 'operator' | 'kelvin' | 'system_record' | 'manual_review'
export type DepartmentTaskIntakeSource = 'operator' | 'kelvin' | 'system_record' | 'manual_review'
export type DepartmentRoleFitRoleType = 'primary' | 'supporting' | 'reviewer' | 'escalation_owner'
export type DepartmentRoleFitLevel = 'weak' | 'partial' | 'good' | 'strong'
export type DepartmentAssignmentReviewer = 'kelvin' | 'operator' | 'owner'
export type DepartmentAssignmentVerdict = 'needs_changes' | 'approved_record' | 'rejected'
export type DepartmentAssignmentAuditEventType =
  | 'created'
  | 'submitted_for_review'
  | 'approved_record'
  | 'rejected'
  | 'superseded'
  | 'archived'
  | 'linked_query_viewed'
export type DepartmentAssignmentAuditActorType = 'operator' | 'kelvin' | 'system_record'

export interface DepartmentAssignmentTokenBlockers {
  isExecutionToken: false
  isRoutingToken: false
  isAssignmentToken: false
  isPermissionGrant: false
  isReleaseToken: false
  isDeployToken: false
  isTaskCompletionToken: false
  grantsRuntimePermission: false
  mutatesSourceRecords: false
}

export interface DepartmentAssignmentRuntimeBlockers {
  executesAgent: false
  continuesAgent: false
  routesTask: false
  autoRoutesTask: false
  assignsRuntimeAgent: false
  startsAgentRun: false
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

export interface DepartmentAssignmentEvidenceRef extends DepartmentAssignmentTokenBlockers {
  sourceType: DepartmentAssignmentEvidenceSourceType
  sourceId?: string
  summary: string
  redactionStatus: 'sanitized' | 'redacted'
  reviewUseOnly: true
  localReferenceOnly: true
}

export interface DepartmentAssignmentLifecycleFields {
  createdBy: DepartmentAssignmentCreatedBy
  reviewedBy?: string
  reviewedAt?: string
  archivedAt?: string
  supersedesRecordId?: string
  supersededByRecordId?: string
  supersededAt?: string
  supersedeReason?: string
  correlationId: string
  createdAt: string
  updatedAt: string
}

export interface DepartmentAssignmentBaseRecord
  extends DepartmentAssignmentLifecycleFields,
    DepartmentAssignmentTokenBlockers,
    DepartmentAssignmentRuntimeBlockers {
  id: string
  targetSprint: DepartmentAssignmentTargetSprint
  baseline: DepartmentAssignmentBaseline
  status: DepartmentAssignmentRecordStatus
}

export interface DepartmentTaskIntakeRecord extends DepartmentAssignmentBaseRecord {
  sourceTaskId: string
  taskTitle: string
  taskSummary: string
  taskType?: string
  intakeReason: string
  intakeSource: DepartmentTaskIntakeSource
  candidateDepartmentProfileIds: string[]
  candidateRoleIds: string[]
  sanitizedEvidenceRefs: DepartmentAssignmentEvidenceRef[]
  riskNotes: string[]
  assignmentProposalRefs: string[]
  roleFitReviewRefs: string[]
  approvalRecordRefs: string[]
  auditRecordRefs: string[]
}

export interface DepartmentAssignmentProposal extends DepartmentAssignmentBaseRecord {
  intakeRecordId: string
  sourceTaskId: string
  proposedDepartmentProfileId: string
  proposedPrimaryRoleId: string
  proposedSupportingRoleIds: string[]
  assignmentRationale: string
  responsibilitySummary: string
  evidenceCoverageSummary: string
  riskSummary: string
  escalationPolicyRef?: string
  permissionBoundaryRef?: string
  roleFitReviewRefs: string[]
  approvalRecordRefs: string[]
  auditRecordRefs: string[]
  sanitizedEvidenceRefs: DepartmentAssignmentEvidenceRef[]
  assignmentRecommendationOnly: true
  localReviewOnly: true
}

export interface DepartmentRoleFitReview extends DepartmentAssignmentBaseRecord {
  assignmentProposalId: string
  departmentProfileId: string
  roleId: string
  roleType: DepartmentRoleFitRoleType
  fitScore?: number
  fitLevel: DepartmentRoleFitLevel
  fitRationale: string
  missingCapabilityNotes: string[]
  evidenceRefs: DepartmentAssignmentEvidenceRef[]
  recommendationOnly: true
  doesNotAssignRuntimeAgent: true
  approvalRecordRefs: string[]
  auditRecordRefs: string[]
}

export interface DepartmentAssignmentApprovalRecord extends DepartmentAssignmentBaseRecord {
  targetType: Exclude<DepartmentAssignmentRecordType, 'department_assignment_approval_record'>
  targetId: string
  reviewer: DepartmentAssignmentReviewer
  verdict: DepartmentAssignmentVerdict
  reviewNotes: string
  confirmationArtifactId?: string
  approvalScope: 'single_local_assignment_record_only'
  doesNotExecuteAgent: true
  doesNotContinueAgent: true
  doesNotAutoRouteTask: true
  doesNotAssignRuntimeAgent: true
  doesNotExecuteToolRun: true
  doesNotRequestRuntimePermission: true
  doesNotApproveRuntimePermission: true
  doesNotExecuteWorkflow: true
  doesNotWriteFile: true
  doesNotRunGit: true
  doesNotCallExternalApi: true
  doesNotConnectMcp: true
  doesNotCreatePr: true
  doesNotDeployReleasePublish: true
  doesNotCompleteTask: true
  doesNotApproveFutureAssignments: true
  evidenceRefs: DepartmentAssignmentEvidenceRef[]
  auditRecordRefs: string[]
}

export interface DepartmentAssignmentAuditRecord extends DepartmentAssignmentBaseRecord {
  targetType: Exclude<DepartmentAssignmentRecordType, 'department_assignment_audit_record'>
  targetId: string
  eventType: DepartmentAssignmentAuditEventType
  actorType: DepartmentAssignmentAuditActorType
  actorId?: string
  beforeStatus?: DepartmentAssignmentRecordStatus
  afterStatus?: DepartmentAssignmentRecordStatus
  reason: string
  evidenceRefs: DepartmentAssignmentEvidenceRef[]
  localAuditOnly: true
  doesNotMutateTargetTask: true
  doesNotAssignRuntimeAgent: true
  doesNotTriggerExecution: true
}

export interface CreateDepartmentTaskIntakeInput {
  sourceTaskId: string
  taskTitle: string
  taskSummary: string
  taskType?: string
  intakeReason: string
  intakeSource?: DepartmentTaskIntakeSource
  candidateDepartmentProfileIds?: string[]
  candidateRoleIds?: string[]
  sanitizedEvidenceRefs?: DepartmentAssignmentEvidenceRef[]
  riskNotes?: string[]
  createdBy?: DepartmentAssignmentCreatedBy
  correlationId?: string
  idempotencyKey?: string
}

export interface CreateDepartmentAssignmentProposalInput {
  intakeRecordId: string
  sourceTaskId: string
  proposedDepartmentProfileId: string
  proposedPrimaryRoleId: string
  proposedSupportingRoleIds?: string[]
  assignmentRationale: string
  responsibilitySummary: string
  evidenceCoverageSummary: string
  riskSummary: string
  escalationPolicyRef?: string
  permissionBoundaryRef?: string
  sanitizedEvidenceRefs?: DepartmentAssignmentEvidenceRef[]
  createdBy?: DepartmentAssignmentCreatedBy
  correlationId?: string
  idempotencyKey?: string
}

export interface CreateDepartmentRoleFitReviewInput {
  assignmentProposalId: string
  departmentProfileId: string
  roleId: string
  roleType?: DepartmentRoleFitRoleType
  fitScore?: number
  fitLevel: DepartmentRoleFitLevel
  fitRationale: string
  missingCapabilityNotes?: string[]
  evidenceRefs?: DepartmentAssignmentEvidenceRef[]
  createdBy?: DepartmentAssignmentCreatedBy
  correlationId?: string
  idempotencyKey?: string
}

export interface CreateDepartmentAssignmentApprovalInput {
  targetType: Exclude<DepartmentAssignmentRecordType, 'department_assignment_approval_record'>
  targetId: string
  reviewer?: DepartmentAssignmentReviewer
  verdict: DepartmentAssignmentVerdict
  reviewNotes: string
  confirmationArtifactId?: string
  evidenceRefs?: DepartmentAssignmentEvidenceRef[]
  createdBy?: DepartmentAssignmentCreatedBy
  correlationId?: string
  idempotencyKey?: string
}

export interface CreateDepartmentAssignmentAuditInput {
  targetType: Exclude<DepartmentAssignmentRecordType, 'department_assignment_audit_record'>
  targetId: string
  eventType: DepartmentAssignmentAuditEventType
  actorType?: DepartmentAssignmentAuditActorType
  actorId?: string
  beforeStatus?: DepartmentAssignmentRecordStatus
  afterStatus?: DepartmentAssignmentRecordStatus
  reason: string
  evidenceRefs?: DepartmentAssignmentEvidenceRef[]
  createdBy?: DepartmentAssignmentCreatedBy
  correlationId?: string
  idempotencyKey?: string
}

export interface FindDepartmentAssignmentRecordsQuery {
  status?: DepartmentAssignmentRecordStatus
  sourceTaskId?: string
  intakeRecordId?: string
  assignmentProposalId?: string
  departmentProfileId?: string
  targetId?: string
  limit?: number
}

export const DEPARTMENT_ASSIGNMENT_RECORD_TYPES: readonly DepartmentAssignmentRecordType[] = [
  'department_task_intake_record',
  'department_assignment_proposal',
  'department_role_fit_review',
  'department_assignment_approval_record',
  'department_assignment_audit_record',
]

export const DEPARTMENT_ASSIGNMENT_EVIDENCE_SOURCE_TYPES: readonly DepartmentAssignmentEvidenceSourceType[] = [
  'task',
  'agent_run',
  'agent_result',
  'tool_call',
  'tool_run',
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
  'execution_intent_record',
  'execution_plan_record',
  'execution_gate_record',
  'execution_approval_record',
  'execution_receipt_record',
  'audit_event',
  'observability_event',
  'eval_run',
  'regression_gate',
  'release_readiness_checklist',
  'manual_note',
]

export const FORBIDDEN_DEPARTMENT_ASSIGNMENT_STATES = [
  'assigned_runtime',
  'active_runtime',
  'routed',
  'auto_routed',
  'executing',
  'running',
  'delegated',
  'invoked',
  'connected',
  'deployed',
  'released',
  'completed',
  'resumed',
] as const

export const FORBIDDEN_DEPARTMENT_ASSIGNMENT_ACTION_TERMS = [
  'route task',
  'auto route',
  'assign agent',
  'assign runtime agent',
  'start agent',
  'continue agent',
  'run agent',
  'run tool',
  'execute workflow',
  'grant permission',
  'request permission',
  'apply change',
  'write file',
  'run git',
  'call api',
  'connect mcp',
  'create pr',
  'deploy',
  'publish',
  'release',
  'complete task',
  'retry',
  'replay',
  'rollback',
  'restore',
  'resume execution',
] as const

export const SPRINT_21_SAFETY_NOTE =
  'Sprint 21 department assignment records are local governance records only. Approval reviews one local assignment record and does not route tasks, assign runtime agents, start agent runs, grant runtime permission, run tools, run workflows, write files, call external systems, create PRs, deploy, release, or complete tasks.'

export const DEPARTMENT_ASSIGNMENT_TOKEN_BLOCKERS: DepartmentAssignmentTokenBlockers = {
  isExecutionToken: false,
  isRoutingToken: false,
  isAssignmentToken: false,
  isPermissionGrant: false,
  isReleaseToken: false,
  isDeployToken: false,
  isTaskCompletionToken: false,
  grantsRuntimePermission: false,
  mutatesSourceRecords: false,
}

export const DEPARTMENT_ASSIGNMENT_RUNTIME_BLOCKERS: DepartmentAssignmentRuntimeBlockers = {
  executesAgent: false,
  continuesAgent: false,
  routesTask: false,
  autoRoutesTask: false,
  assignsRuntimeAgent: false,
  startsAgentRun: false,
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
