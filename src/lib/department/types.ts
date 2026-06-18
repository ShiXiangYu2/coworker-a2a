/**
 * Sprint 18 - Department Agent Profiles.
 *
 * Local organization records only. Department records describe roles,
 * responsibility boundaries, escalation paths, and review decisions. They do
 * not route tasks, continue agents, execute tools, grant runtime permissions,
 * mutate source records, deploy, release, or complete tasks.
 */

export type DepartmentRecordStatus =
  | 'draft'
  | 'review'
  | 'approved_record'
  | 'rejected'
  | 'superseded'
  | 'archived'

export type DepartmentRecordEvent =
  | 'SUBMIT_REVIEW'
  | 'APPROVE_RECORD'
  | 'REJECT'
  | 'SUPERSEDE'
  | 'ARCHIVE'

export type DepartmentTargetSprint = 'sprint_18'
export type DepartmentBaseline = 'sprint_1_17_complete'

export type DepartmentRecordType =
  | 'department_profile'
  | 'department_agent_role'
  | 'department_responsibility_matrix'
  | 'department_escalation_policy'
  | 'department_permission_boundary'
  | 'department_review_record'

export type DepartmentCreatedBy = 'user' | 'operator' | 'system_seed' | 'system_record'
export type DepartmentReviewer = 'kelvin' | 'owner' | 'operator'
export type DepartmentReviewVerdict = 'needs_changes' | 'approved_record' | 'rejected'

export type DepartmentEvidenceSourceType =
  | 'task'
  | 'agent_run'
  | 'agent_result'
  | 'tool_call'
  | 'tool_run'
  | 'tool_execution_receipt'
  | 'file_change_proposal'
  | 'pull_request_plan'
  | 'external_action_proposal'
  | 'mcp_connection_profile'
  | 'workflow_proposal'
  | 'workflow_step_record'
  | 'mvp_readiness_record'
  | 'governance_summary_record'
  | 'evidence_import_record'
  | 'sanitized_evidence_snapshot'
  | 'audit_event'
  | 'observability_event'
  | 'eval_run'
  | 'regression_gate'
  | 'release_readiness_checklist'
  | 'manual_note'

export type DepartmentLocalAction =
  | 'create_department_record'
  | 'view_department_record'
  | 'submit_department_review'
  | 'approve_department_record'
  | 'reject_department_record'
  | 'supersede_department_record'
  | 'archive_department_record'
  | 'view_department_audit'
  | 'view_department_timeline'

export type DepartmentProfileKind =
  | 'engineering'
  | 'product'
  | 'design'
  | 'quality'
  | 'security'
  | 'operations'
  | 'governance'
  | 'custom'

export type DepartmentRoleSeniority = 'lead' | 'senior' | 'member' | 'reviewer' | 'observer'

export interface DepartmentEvidenceRef {
  sourceType: DepartmentEvidenceSourceType
  sourceId?: string
  summary: string
  redactionStatus: 'sanitized' | 'redacted'
  isExecutionToken: false
  isRoutingToken: false
  isPermissionGrant: false
  isReleaseToken: false
  isDeployToken: false
  isTaskCompletionToken: false
  grantsRuntimePermission: false
  mutatesSourceRecords: false
}

export interface DepartmentLifecycleFields {
  reviewedBy?: string
  reviewedAt?: string
  archivedAt?: string
  supersedesRecordId?: string
  supersededByRecordId?: string
  supersededAt?: string
  supersedeReason?: string
}

export interface DepartmentTokenBlockers {
  isExecutionToken: false
  isRoutingToken: false
  isPermissionGrant: false
  isReleaseToken: false
  isDeployToken: false
  isTaskCompletionToken: false
  grantsRuntimePermission: false
  mutatesSourceRecords: false
}

export interface DepartmentBaseRecord extends DepartmentLifecycleFields, DepartmentTokenBlockers {
  id: string
  targetSprint: DepartmentTargetSprint
  baseline: DepartmentBaseline
  status: DepartmentRecordStatus
  createdBy: DepartmentCreatedBy
  correlationId: string
  auditRefs: string[]
  createdAt: string
  updatedAt: string
}

export interface DepartmentProfile extends DepartmentBaseRecord {
  departmentKey: string
  displayName: string
  profileKind: DepartmentProfileKind
  mission: string
  responsibilitySummary: string
  excludedResponsibilities: string[]
  evidenceRefs: DepartmentEvidenceRef[]
  roleRefs: string[]
  responsibilityMatrixRefs: string[]
  escalationPolicyRefs: string[]
  permissionBoundaryRefs: string[]
  reviewRecordRefs: string[]
  safetyNote: string
}

export interface DepartmentAgentRole extends DepartmentBaseRecord {
  departmentProfileId: string
  roleKey: string
  displayName: string
  roleMission: string
  seniority: DepartmentRoleSeniority
  allowedLocalActions: DepartmentLocalAction[]
  deniedRuntimeActions: string[]
  evidenceRefs: DepartmentEvidenceRef[]
}

export interface DepartmentResponsibilityMatrix extends DepartmentBaseRecord {
  departmentProfileId: string
  matrixVersion: string
  ownsJson: string[]
  supportsJson: string[]
  consultedJson: string[]
  forbiddenResponsibilities: string[]
  evidenceRefs: DepartmentEvidenceRef[]
}

export interface DepartmentEscalationPolicy extends DepartmentBaseRecord {
  departmentProfileId: string
  policyVersion: string
  escalationTriggers: string[]
  escalationTargets: string[]
  humanReviewRequired: boolean
  automaticEscalationAllowed: false
  evidenceRefs: DepartmentEvidenceRef[]
}

export interface DepartmentPermissionBoundary extends DepartmentBaseRecord {
  departmentProfileId: string
  boundaryVersion: string
  allowedLocalRecordActions: DepartmentLocalAction[]
  deniedRuntimeActions: string[]
  deniedExternalActions: string[]
  deniedFileGitPrActions: string[]
  deniedWorkflowActions: string[]
  deniedTaskActions: string[]
  approvalMeaning: 'local_department_record_review_only'
  approvalDoesNotExecute: true
  approvalDoesNotRoute: true
  approvalDoesNotGrantFuturePermission: true
  evidenceRefs: DepartmentEvidenceRef[]
}

export interface DepartmentReviewRecord extends DepartmentBaseRecord {
  targetType: Exclude<DepartmentRecordType, 'department_review_record'>
  targetId: string
  reviewer: DepartmentReviewer
  verdict: DepartmentReviewVerdict
  reviewNotes: string
  confirmationArtifactId?: string
  evidenceRefs: DepartmentEvidenceRef[]
  doesNotExecuteAgent: true
  doesNotContinueAgent: true
  doesNotExecuteToolRun: true
  doesNotExecuteWorkflow: true
  doesNotWriteFile: true
  doesNotRunGit: true
  doesNotCallExternalApi: true
  doesNotConnectMcp: true
  doesNotCreatePr: true
  doesNotDeployReleasePublish: true
  doesNotCompleteTask: true
  doesNotApproveFutureRecords: true
}

export interface CreateDepartmentProfileInput {
  departmentKey: string
  displayName: string
  profileKind?: DepartmentProfileKind
  mission: string
  responsibilitySummary: string
  excludedResponsibilities?: string[]
  evidenceRefs?: DepartmentEvidenceRef[]
  createdBy?: DepartmentCreatedBy
  correlationId?: string
  idempotencyKey?: string
}

export interface CreateDepartmentAgentRoleInput {
  departmentProfileId: string
  roleKey: string
  displayName: string
  roleMission: string
  seniority?: DepartmentRoleSeniority
  allowedLocalActions?: DepartmentLocalAction[]
  deniedRuntimeActions?: string[]
  evidenceRefs?: DepartmentEvidenceRef[]
  createdBy?: DepartmentCreatedBy
  correlationId?: string
  idempotencyKey?: string
}

export interface CreateDepartmentResponsibilityMatrixInput {
  departmentProfileId: string
  matrixVersion?: string
  owns?: string[]
  supports?: string[]
  consulted?: string[]
  forbiddenResponsibilities?: string[]
  evidenceRefs?: DepartmentEvidenceRef[]
  createdBy?: DepartmentCreatedBy
  correlationId?: string
  idempotencyKey?: string
}

export interface CreateDepartmentEscalationPolicyInput {
  departmentProfileId: string
  policyVersion?: string
  escalationTriggers?: string[]
  escalationTargets?: string[]
  humanReviewRequired?: boolean
  evidenceRefs?: DepartmentEvidenceRef[]
  createdBy?: DepartmentCreatedBy
  correlationId?: string
  idempotencyKey?: string
}

export interface CreateDepartmentPermissionBoundaryInput {
  departmentProfileId: string
  boundaryVersion?: string
  allowedLocalRecordActions?: DepartmentLocalAction[]
  deniedRuntimeActions?: string[]
  deniedExternalActions?: string[]
  deniedFileGitPrActions?: string[]
  deniedWorkflowActions?: string[]
  deniedTaskActions?: string[]
  evidenceRefs?: DepartmentEvidenceRef[]
  createdBy?: DepartmentCreatedBy
  correlationId?: string
  idempotencyKey?: string
}

export interface CreateDepartmentReviewRecordInput {
  targetType: Exclude<DepartmentRecordType, 'department_review_record'>
  targetId: string
  reviewer?: DepartmentReviewer
  verdict: DepartmentReviewVerdict
  reviewNotes: string
  confirmationArtifactId?: string
  evidenceRefs?: DepartmentEvidenceRef[]
  createdBy?: DepartmentCreatedBy
  correlationId?: string
  idempotencyKey?: string
}

export interface FindDepartmentRecordsQuery {
  status?: DepartmentRecordStatus
  departmentProfileId?: string
  limit?: number
}

export const DEPARTMENT_RECORD_TYPES: readonly DepartmentRecordType[] = [
  'department_profile',
  'department_agent_role',
  'department_responsibility_matrix',
  'department_escalation_policy',
  'department_permission_boundary',
  'department_review_record',
]

export const DEPARTMENT_LOCAL_ACTIONS: readonly DepartmentLocalAction[] = [
  'create_department_record',
  'view_department_record',
  'submit_department_review',
  'approve_department_record',
  'reject_department_record',
  'supersede_department_record',
  'archive_department_record',
  'view_department_audit',
  'view_department_timeline',
]

export const FORBIDDEN_DEPARTMENT_STATES = [
  'active_runtime',
  'assigned',
  'executing',
  'running',
  'completed',
  'delegated',
  'escalated_runtime',
  'auto_routed',
  'invoked',
  'connected',
  'deployed',
  'released',
  'resumed',
] as const

export const FORBIDDEN_DEPARTMENT_ACTION_TERMS = [
  'run department',
  'execute department',
  'assign automatically',
  'auto route',
  'delegate now',
  'continue agent',
  'run agent',
  'run tool',
  'execute tool',
  'execute workflow',
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

export const SPRINT_18_SAFETY_NOTE =
  'Sprint 18 department records describe local organization responsibilities and review boundaries only. They do not route tasks, continue agents, execute tools, run workflows, write files, run Git, call external systems, connect MCP, deploy, release, or complete tasks.'
