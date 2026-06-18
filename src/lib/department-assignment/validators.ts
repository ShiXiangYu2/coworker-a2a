import type {
  CreateDepartmentAssignmentApprovalInput,
  CreateDepartmentAssignmentAuditInput,
  CreateDepartmentAssignmentProposalInput,
  CreateDepartmentRoleFitReviewInput,
  CreateDepartmentTaskIntakeInput,
  DepartmentAssignmentEvidenceRef,
  DepartmentAssignmentEvidenceSourceType,
  DepartmentAssignmentRecordType,
} from './types'
import {
  DEPARTMENT_ASSIGNMENT_EVIDENCE_SOURCE_TYPES,
  DEPARTMENT_ASSIGNMENT_RECORD_TYPES,
  FORBIDDEN_DEPARTMENT_ASSIGNMENT_ACTION_TERMS,
  FORBIDDEN_DEPARTMENT_ASSIGNMENT_STATES,
} from './types'

export class DepartmentAssignmentValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DepartmentAssignmentValidationError'
  }
}

export class DepartmentAssignmentSafetyViolationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DepartmentAssignmentSafetyViolationError'
  }
}

export function validateDepartmentAssignmentEvidenceRef(ref: DepartmentAssignmentEvidenceRef): void {
  validateDepartmentAssignmentEvidenceSourceType(ref.sourceType)
  validateRequiredText(ref.summary, 'evidence summary', 1000)
  if (ref.redactionStatus !== 'sanitized' && ref.redactionStatus !== 'redacted') {
    throw new DepartmentAssignmentValidationError('DepartmentAssignmentEvidenceRef redactionStatus must be sanitized or redacted.')
  }
  if (ref.reviewUseOnly !== true) {
    throw new DepartmentAssignmentSafetyViolationError('DepartmentAssignmentEvidenceRef reviewUseOnly must be true.')
  }
  if (ref.localReferenceOnly !== true) {
    throw new DepartmentAssignmentSafetyViolationError('DepartmentAssignmentEvidenceRef localReferenceOnly must be true.')
  }
  validateDepartmentAssignmentTokenBlockers(ref)
}

export function validateDepartmentAssignmentEvidenceRefs(refs: DepartmentAssignmentEvidenceRef[] = []): void {
  refs.forEach((ref, index) => {
    try {
      validateDepartmentAssignmentEvidenceRef(ref)
    } catch (error) {
      throw new DepartmentAssignmentValidationError(`DepartmentAssignmentEvidenceRef[${index}]: ${(error as Error).message}`)
    }
  })
}

export function validateDepartmentAssignmentTokenBlockers(record: {
  isExecutionToken?: boolean
  isRoutingToken?: boolean
  isAssignmentToken?: boolean
  isPermissionGrant?: boolean
  isReleaseToken?: boolean
  isDeployToken?: boolean
  isTaskCompletionToken?: boolean
  grantsRuntimePermission?: boolean
  mutatesSourceRecords?: boolean
}): void {
  for (const key of [
    'isExecutionToken',
    'isRoutingToken',
    'isAssignmentToken',
    'isPermissionGrant',
    'isReleaseToken',
    'isDeployToken',
    'isTaskCompletionToken',
    'grantsRuntimePermission',
    'mutatesSourceRecords',
  ] as const) {
    if (record[key] !== false) {
      throw new DepartmentAssignmentSafetyViolationError(`${key} must be false for Sprint 21 department assignment records.`)
    }
  }
}

export function validateDepartmentAssignmentRuntimeBlockers(record: {
  executesAgent?: boolean
  continuesAgent?: boolean
  routesTask?: boolean
  autoRoutesTask?: boolean
  assignsRuntimeAgent?: boolean
  startsAgentRun?: boolean
  executesToolRun?: boolean
  executesWorkflow?: boolean
  writesFile?: boolean
  runsGit?: boolean
  callsExternalApi?: boolean
  connectsMcp?: boolean
  createsPr?: boolean
  deploysOrReleases?: boolean
  completesTask?: boolean
}): void {
  for (const key of [
    'executesAgent',
    'continuesAgent',
    'routesTask',
    'autoRoutesTask',
    'assignsRuntimeAgent',
    'startsAgentRun',
    'executesToolRun',
    'executesWorkflow',
    'writesFile',
    'runsGit',
    'callsExternalApi',
    'connectsMcp',
    'createsPr',
    'deploysOrReleases',
    'completesTask',
  ] as const) {
    if (record[key] !== false) {
      throw new DepartmentAssignmentSafetyViolationError(`${key} must be false for Sprint 21 department assignment records.`)
    }
  }
}

export function validateDepartmentAssignmentApprovalSafety(record: {
  doesNotExecuteAgent?: boolean
  doesNotContinueAgent?: boolean
  doesNotAutoRouteTask?: boolean
  doesNotAssignRuntimeAgent?: boolean
  doesNotExecuteToolRun?: boolean
  doesNotRequestRuntimePermission?: boolean
  doesNotApproveRuntimePermission?: boolean
  doesNotExecuteWorkflow?: boolean
  doesNotWriteFile?: boolean
  doesNotRunGit?: boolean
  doesNotCallExternalApi?: boolean
  doesNotConnectMcp?: boolean
  doesNotCreatePr?: boolean
  doesNotDeployReleasePublish?: boolean
  doesNotCompleteTask?: boolean
  doesNotApproveFutureAssignments?: boolean
}): void {
  for (const [key, value] of Object.entries(record)) {
    if (key.startsWith('doesNot') && value !== true) {
      throw new DepartmentAssignmentSafetyViolationError(`${key} must be true.`)
    }
  }
}

export function validateDepartmentAssignmentProposalSafety(record: {
  assignmentRecommendationOnly?: boolean
  localReviewOnly?: boolean
  routesTask?: boolean
  autoRoutesTask?: boolean
  assignsRuntimeAgent?: boolean
}): void {
  if (record.assignmentRecommendationOnly !== true) {
    throw new DepartmentAssignmentSafetyViolationError('DepartmentAssignmentProposal must be recommendation-only.')
  }
  if (record.localReviewOnly !== true) {
    throw new DepartmentAssignmentSafetyViolationError('DepartmentAssignmentProposal must be local-review-only.')
  }
  if (record.routesTask !== false || record.autoRoutesTask !== false || record.assignsRuntimeAgent !== false) {
    throw new DepartmentAssignmentSafetyViolationError('DepartmentAssignmentProposal cannot route tasks or assign runtime agents.')
  }
}

export function validateDepartmentRoleFitReviewSafety(record: {
  recommendationOnly?: boolean
  doesNotAssignRuntimeAgent?: boolean
  assignsRuntimeAgent?: boolean
}): void {
  if (record.recommendationOnly !== true) {
    throw new DepartmentAssignmentSafetyViolationError('DepartmentRoleFitReview must be recommendation-only.')
  }
  if (record.doesNotAssignRuntimeAgent !== true || record.assignsRuntimeAgent !== false) {
    throw new DepartmentAssignmentSafetyViolationError('DepartmentRoleFitReview cannot assign a runtime agent.')
  }
}

export function validateDepartmentAssignmentAuditSafety(record: {
  localAuditOnly?: boolean
  doesNotMutateTargetTask?: boolean
  doesNotAssignRuntimeAgent?: boolean
  doesNotTriggerExecution?: boolean
  mutatesSourceRecords?: boolean
  assignsRuntimeAgent?: boolean
  executesAgent?: boolean
}): void {
  if (record.localAuditOnly !== true) {
    throw new DepartmentAssignmentSafetyViolationError('DepartmentAssignmentAuditRecord must be local-audit-only.')
  }
  if (record.doesNotMutateTargetTask !== true || record.mutatesSourceRecords !== false) {
    throw new DepartmentAssignmentSafetyViolationError('DepartmentAssignmentAuditRecord cannot mutate source Task or assignment target.')
  }
  if (record.doesNotAssignRuntimeAgent !== true || record.assignsRuntimeAgent !== false) {
    throw new DepartmentAssignmentSafetyViolationError('DepartmentAssignmentAuditRecord cannot assign runtime agents.')
  }
  if (record.doesNotTriggerExecution !== true || record.executesAgent !== false) {
    throw new DepartmentAssignmentSafetyViolationError('DepartmentAssignmentAuditRecord cannot trigger execution.')
  }
}

export function validateSupersedeRefs(record: {
  status: string
  supersedesRecordId?: string | null
  supersededByRecordId?: string | null
  supersededAt?: string | Date | null
  supersedeReason?: string | null
}): void {
  if (record.status !== 'superseded') return
  if (!record.supersededByRecordId && !record.supersedesRecordId) {
    throw new DepartmentAssignmentSafetyViolationError('superseded state requires supersede refs.')
  }
  if (!record.supersededAt) throw new DepartmentAssignmentSafetyViolationError('superseded state requires supersededAt.')
  if (!record.supersedeReason) throw new DepartmentAssignmentSafetyViolationError('superseded state requires supersedeReason.')
}

export function validateNoForbiddenDepartmentAssignmentStates(states: string[]): void {
  for (const state of states) {
    if ((FORBIDDEN_DEPARTMENT_ASSIGNMENT_STATES as readonly string[]).includes(state)) {
      throw new DepartmentAssignmentSafetyViolationError(`Forbidden Sprint 21 department assignment state "${state}".`)
    }
  }
}

export function validateNoForbiddenDepartmentAssignmentActionTerms(value: string, context: string): void {
  const lower = value.toLowerCase()
  for (const term of FORBIDDEN_DEPARTMENT_ASSIGNMENT_ACTION_TERMS) {
    if (lower.includes(term)) {
      throw new DepartmentAssignmentSafetyViolationError(`Forbidden Sprint 21 action term "${term}" found in ${context}.`)
    }
  }
}

export function validateDepartmentAssignmentApiRouteName(routePath: string): void {
  validateNoForbiddenDepartmentAssignmentActionTerms(routePath, `API route ${routePath}`)
}

export function validateDepartmentAssignmentUiLabel(label: string): void {
  validateNoForbiddenDepartmentAssignmentActionTerms(label, `UI label ${label}`)
}

export function validateDepartmentAssignmentRecordType(value: string): asserts value is DepartmentAssignmentRecordType {
  if (!(DEPARTMENT_ASSIGNMENT_RECORD_TYPES as readonly string[]).includes(value)) {
    throw new DepartmentAssignmentValidationError(`Invalid department assignment record type "${value}".`)
  }
}

export function validateDepartmentAssignmentEvidenceSourceType(value: string): asserts value is DepartmentAssignmentEvidenceSourceType {
  if (!(DEPARTMENT_ASSIGNMENT_EVIDENCE_SOURCE_TYPES as readonly string[]).includes(value)) {
    throw new DepartmentAssignmentValidationError(`Invalid DepartmentAssignmentEvidenceRef sourceType "${value}".`)
  }
}

export function validateCreateDepartmentTaskIntakeInput(input: CreateDepartmentTaskIntakeInput): void {
  validateRequiredText(input.sourceTaskId, 'sourceTaskId', 200)
  validateRequiredText(input.taskTitle, 'taskTitle', 200)
  validateRequiredText(input.taskSummary, 'taskSummary', 2000)
  validateRequiredText(input.intakeReason, 'intakeReason', 2000)
  validateDepartmentAssignmentEvidenceRefs(input.sanitizedEvidenceRefs)
}

export function validateCreateDepartmentAssignmentProposalInput(input: CreateDepartmentAssignmentProposalInput): void {
  validateRequiredText(input.intakeRecordId, 'intakeRecordId', 200)
  validateRequiredText(input.sourceTaskId, 'sourceTaskId', 200)
  validateRequiredText(input.proposedDepartmentProfileId, 'proposedDepartmentProfileId', 200)
  validateRequiredText(input.proposedPrimaryRoleId, 'proposedPrimaryRoleId', 200)
  validateRequiredText(input.assignmentRationale, 'assignmentRationale', 3000)
  validateRequiredText(input.responsibilitySummary, 'responsibilitySummary', 2000)
  validateRequiredText(input.evidenceCoverageSummary, 'evidenceCoverageSummary', 2000)
  validateRequiredText(input.riskSummary, 'riskSummary', 2000)
  validateDepartmentAssignmentEvidenceRefs(input.sanitizedEvidenceRefs)
}

export function validateCreateDepartmentRoleFitReviewInput(input: CreateDepartmentRoleFitReviewInput): void {
  validateRequiredText(input.assignmentProposalId, 'assignmentProposalId', 200)
  validateRequiredText(input.departmentProfileId, 'departmentProfileId', 200)
  validateRequiredText(input.roleId, 'roleId', 200)
  if (!['primary', 'supporting', 'reviewer', 'escalation_owner'].includes(input.roleType ?? 'primary')) {
    throw new DepartmentAssignmentValidationError('Invalid roleType.')
  }
  if (!['weak', 'partial', 'good', 'strong'].includes(input.fitLevel)) {
    throw new DepartmentAssignmentValidationError('Invalid fitLevel.')
  }
  if (input.fitScore !== undefined && (input.fitScore < 0 || input.fitScore > 100)) {
    throw new DepartmentAssignmentValidationError('fitScore must be between 0 and 100.')
  }
  validateRequiredText(input.fitRationale, 'fitRationale', 3000)
  validateDepartmentAssignmentEvidenceRefs(input.evidenceRefs)
}

export function validateCreateDepartmentAssignmentApprovalInput(input: CreateDepartmentAssignmentApprovalInput): void {
  validateDepartmentAssignmentRecordType(input.targetType)
  if ((input.targetType as string) === 'department_assignment_approval_record') {
    throw new DepartmentAssignmentValidationError('DepartmentAssignmentApprovalRecord cannot approve another approval record.')
  }
  validateRequiredText(input.targetId, 'targetId', 200)
  if (!['needs_changes', 'approved_record', 'rejected'].includes(input.verdict)) {
    throw new DepartmentAssignmentValidationError('Invalid assignment review verdict.')
  }
  validateRequiredText(input.reviewNotes, 'reviewNotes', 4000)
  validateDepartmentAssignmentEvidenceRefs(input.evidenceRefs)
}

export function validateCreateDepartmentAssignmentAuditInput(input: CreateDepartmentAssignmentAuditInput): void {
  validateDepartmentAssignmentRecordType(input.targetType)
  if ((input.targetType as string) === 'department_assignment_audit_record') {
    throw new DepartmentAssignmentValidationError('DepartmentAssignmentAuditRecord cannot audit another audit record as a target.')
  }
  validateRequiredText(input.targetId, 'targetId', 200)
  if (!['created', 'submitted_for_review', 'approved_record', 'rejected', 'superseded', 'archived', 'linked_query_viewed'].includes(input.eventType)) {
    throw new DepartmentAssignmentValidationError('Invalid assignment audit eventType.')
  }
  validateRequiredText(input.reason, 'reason', 2000)
  validateDepartmentAssignmentEvidenceRefs(input.evidenceRefs)
}

function validateRequiredText(value: unknown, name: string, max: number): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new DepartmentAssignmentValidationError(`${name} is required and must be a non-empty string.`)
  }
  if (value.length > max) throw new DepartmentAssignmentValidationError(`${name} must be ${max} characters or less.`)
}
