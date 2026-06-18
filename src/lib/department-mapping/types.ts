/**
 * Sprint 19 - Department-Aware Operator Review.
 *
 * Local mapping, coverage, gap, and review records only. These records connect
 * sanitized evidence references to local department records for operator review.
 * They do not route tasks, assign agents, grant runtime permission, import live
 * evidence, sync evidence, execute tools, run workflows, deploy, release, or
 * complete tasks.
 */

export type DepartmentMappingRecordStatus =
  | 'draft'
  | 'review'
  | 'approved_record'
  | 'rejected'
  | 'superseded'
  | 'archived'

export type DepartmentMappingRecordEvent =
  | 'SUBMIT_REVIEW'
  | 'APPROVE_RECORD'
  | 'REJECT'
  | 'SUPERSEDE'
  | 'ARCHIVE'

export type DepartmentMappingTargetSprint = 'sprint_19'
export type DepartmentMappingBaseline = 'sprint_1_18_complete'

export type DepartmentMappingRecordType =
  | 'evidence_to_department_mapping_record'
  | 'department_evidence_coverage_record'
  | 'department_review_gap_record'
  | 'department_mapping_review_record'

export type DepartmentMappingEvidenceRecordType =
  | 'evidence_import_record'
  | 'sanitized_evidence_snapshot'
  | 'department_profile'
  | 'department_agent_role'
  | 'department_responsibility_matrix'
  | 'department_escalation_policy'
  | 'department_permission_boundary'
  | 'department_review_record'
  | 'audit_event'
  | 'observability_event'
  | 'eval_run'
  | 'regression_gate'
  | 'release_readiness_checklist'
  | 'manual_note'

export type DepartmentMappingDepartmentRecordType =
  | 'department_profile'
  | 'department_agent_role'
  | 'department_responsibility_matrix'
  | 'department_escalation_policy'
  | 'department_permission_boundary'

export type DepartmentMappingCreatedBy = 'user' | 'operator' | 'system_seed' | 'system_record'
export type DepartmentMappingReviewer = 'kelvin' | 'owner' | 'operator'
export type DepartmentMappingReviewVerdict = 'needs_changes' | 'approved_record' | 'rejected'
export type DepartmentMappingStrength = 'primary' | 'supporting' | 'contextual' | 'weak'
export type DepartmentEvidenceCoverageLevel = 'none' | 'partial' | 'sufficient' | 'strong'
export type DepartmentReviewGapRiskLevel = 'low' | 'medium' | 'high'

export interface DepartmentMappingEvidenceRef {
  sourceType: DepartmentMappingEvidenceRecordType
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

export interface DepartmentMappingLifecycleFields {
  reviewedBy?: string
  reviewedAt?: string
  archivedAt?: string
  supersedesRecordId?: string
  supersededByRecordId?: string
  supersededAt?: string
  supersedeReason?: string
}

export interface DepartmentMappingTokenBlockers {
  isExecutionToken: false
  isRoutingToken: false
  isPermissionGrant: false
  isReleaseToken: false
  isDeployToken: false
  isTaskCompletionToken: false
  grantsRuntimePermission: false
  mutatesSourceRecords: false
}

export interface DepartmentMappingRuntimeBlockers {
  importsLiveEvidence: false
  syncsEvidence: false
  triggersAgentRouting: false
  triggersTaskAssignment: false
}

export interface DepartmentMappingBaseRecord
  extends DepartmentMappingLifecycleFields,
    DepartmentMappingTokenBlockers,
    DepartmentMappingRuntimeBlockers {
  id: string
  targetSprint: DepartmentMappingTargetSprint
  baseline: DepartmentMappingBaseline
  status: DepartmentMappingRecordStatus
  createdBy: DepartmentMappingCreatedBy
  correlationId: string
  auditRefs: string[]
  createdAt: string
  updatedAt: string
}

export interface EvidenceToDepartmentMappingRecord extends DepartmentMappingBaseRecord {
  mappingKey: string
  title: string
  description: string
  evidenceRecordType: DepartmentMappingEvidenceRecordType
  evidenceRecordId: string
  evidenceSummary: string
  departmentRecordType: DepartmentMappingDepartmentRecordType
  departmentRecordId: string
  departmentProfileId?: string
  mappingStrength: DepartmentMappingStrength
  mappingRationale: string
  riskNotes: string[]
  coverageRecordRefs: string[]
  gapRecordRefs: string[]
  reviewRecordRefs: string[]
}

export interface DepartmentEvidenceCoverageRecord extends DepartmentMappingBaseRecord {
  mappingRecordId?: string
  departmentProfileId: string
  departmentRecordType: DepartmentMappingDepartmentRecordType
  departmentRecordId: string
  coverageScope: string
  coverageLevel: DepartmentEvidenceCoverageLevel
  coverageSummary: string
  supportingMappingRefs: string[]
  missingEvidenceNotes: string[]
  recommendationOnly: true
  reviewRecordRefs: string[]
}

export interface DepartmentReviewGapRecord extends DepartmentMappingBaseRecord {
  mappingRecordId?: string
  departmentProfileId: string
  departmentRecordType: DepartmentMappingDepartmentRecordType
  departmentRecordId: string
  gapType: string
  gapSummary: string
  riskLevel: DepartmentReviewGapRiskLevel
  recommendedEvidence: string[]
  recommendationOnly: true
  reviewRecordRefs: string[]
}

export interface DepartmentMappingReviewRecord extends DepartmentMappingBaseRecord {
  targetType: Exclude<DepartmentMappingRecordType, 'department_mapping_review_record'>
  targetId: string
  reviewer: DepartmentMappingReviewer
  verdict: DepartmentMappingReviewVerdict
  reviewNotes: string
  confirmationArtifactId?: string
  evidenceRefs: DepartmentMappingEvidenceRef[]
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
  doesNotApproveFutureMappings: true
  statusChangeOnly: true
}

export interface CreateEvidenceToDepartmentMappingInput {
  mappingKey: string
  title: string
  description: string
  evidenceRecordType: DepartmentMappingEvidenceRecordType
  evidenceRecordId: string
  evidenceSummary: string
  departmentRecordType: DepartmentMappingDepartmentRecordType
  departmentRecordId: string
  departmentProfileId?: string
  mappingStrength?: DepartmentMappingStrength
  mappingRationale: string
  riskNotes?: string[]
  createdBy?: DepartmentMappingCreatedBy
  correlationId?: string
  idempotencyKey?: string
}

export interface CreateDepartmentEvidenceCoverageInput {
  mappingRecordId?: string
  departmentProfileId: string
  departmentRecordType: DepartmentMappingDepartmentRecordType
  departmentRecordId: string
  coverageScope: string
  coverageLevel?: DepartmentEvidenceCoverageLevel
  coverageSummary: string
  supportingMappingRefs?: string[]
  missingEvidenceNotes?: string[]
  createdBy?: DepartmentMappingCreatedBy
  correlationId?: string
  idempotencyKey?: string
}

export interface CreateDepartmentReviewGapInput {
  mappingRecordId?: string
  departmentProfileId: string
  departmentRecordType: DepartmentMappingDepartmentRecordType
  departmentRecordId: string
  gapType: string
  gapSummary: string
  riskLevel?: DepartmentReviewGapRiskLevel
  recommendedEvidence?: string[]
  createdBy?: DepartmentMappingCreatedBy
  correlationId?: string
  idempotencyKey?: string
}

export interface CreateDepartmentMappingReviewRecordInput {
  targetType: Exclude<DepartmentMappingRecordType, 'department_mapping_review_record'>
  targetId: string
  reviewer?: DepartmentMappingReviewer
  verdict: DepartmentMappingReviewVerdict
  reviewNotes: string
  confirmationArtifactId?: string
  evidenceRefs?: DepartmentMappingEvidenceRef[]
  createdBy?: DepartmentMappingCreatedBy
  correlationId?: string
  idempotencyKey?: string
}

export interface FindDepartmentMappingRecordsQuery {
  status?: DepartmentMappingRecordStatus
  departmentProfileId?: string
  departmentRecordId?: string
  evidenceRecordId?: string
  mappingRecordId?: string
  targetId?: string
  limit?: number
}

export const DEPARTMENT_MAPPING_RECORD_TYPES: readonly DepartmentMappingRecordType[] = [
  'evidence_to_department_mapping_record',
  'department_evidence_coverage_record',
  'department_review_gap_record',
  'department_mapping_review_record',
]

export const DEPARTMENT_MAPPING_EVIDENCE_RECORD_TYPES: readonly DepartmentMappingEvidenceRecordType[] = [
  'evidence_import_record',
  'sanitized_evidence_snapshot',
  'department_profile',
  'department_agent_role',
  'department_responsibility_matrix',
  'department_escalation_policy',
  'department_permission_boundary',
  'department_review_record',
  'audit_event',
  'observability_event',
  'eval_run',
  'regression_gate',
  'release_readiness_checklist',
  'manual_note',
]

export const DEPARTMENT_MAPPING_DEPARTMENT_RECORD_TYPES: readonly DepartmentMappingDepartmentRecordType[] = [
  'department_profile',
  'department_agent_role',
  'department_responsibility_matrix',
  'department_escalation_policy',
  'department_permission_boundary',
]

export const FORBIDDEN_DEPARTMENT_MAPPING_STATES = [
  'active_runtime',
  'mapped_runtime',
  'routed',
  'assigned',
  'executing',
  'running',
  'completed',
  'delegated',
  'auto_routed',
  'invoked',
  'connected',
  'deployed',
  'released',
  'resumed',
] as const

export const FORBIDDEN_DEPARTMENT_MAPPING_ACTION_TERMS = [
  'run mapping',
  'execute mapping',
  'auto route',
  'assign agent',
  'grant permission',
  'import live',
  'sync evidence',
  'run agent',
  'run tool',
  'execute workflow',
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
  'restore',
  'resume execution',
] as const

export const SPRINT_19_SAFETY_NOTE =
  'Sprint 19 mapping records connect sanitized evidence references to local department records for operator review only. They do not route tasks, assign agents, grant runtime permission, import live evidence, sync evidence, execute tools, run workflows, deploy, release, or complete tasks.'
