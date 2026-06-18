import type {
  CreateDepartmentAgentRoleInput,
  CreateDepartmentEscalationPolicyInput,
  CreateDepartmentPermissionBoundaryInput,
  CreateDepartmentProfileInput,
  CreateDepartmentResponsibilityMatrixInput,
  CreateDepartmentReviewRecordInput,
  DepartmentEvidenceRef,
  DepartmentEvidenceSourceType,
  DepartmentLocalAction,
  DepartmentRecordType,
} from './types'
import {
  DEPARTMENT_LOCAL_ACTIONS,
  DEPARTMENT_RECORD_TYPES,
  FORBIDDEN_DEPARTMENT_ACTION_TERMS,
  FORBIDDEN_DEPARTMENT_STATES,
} from './types'

const VALID_EVIDENCE_TYPES: readonly DepartmentEvidenceSourceType[] = [
  'task',
  'agent_run',
  'agent_result',
  'tool_call',
  'tool_run',
  'tool_execution_receipt',
  'file_change_proposal',
  'pull_request_plan',
  'external_action_proposal',
  'mcp_connection_profile',
  'workflow_proposal',
  'workflow_step_record',
  'mvp_readiness_record',
  'governance_summary_record',
  'evidence_import_record',
  'sanitized_evidence_snapshot',
  'audit_event',
  'observability_event',
  'eval_run',
  'regression_gate',
  'release_readiness_checklist',
  'manual_note',
]

export class DepartmentValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DepartmentValidationError'
  }
}

export class DepartmentSafetyViolationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DepartmentSafetyViolationError'
  }
}

export function validateDepartmentEvidenceRef(ref: DepartmentEvidenceRef): void {
  if (!(VALID_EVIDENCE_TYPES as readonly string[]).includes(ref.sourceType)) {
    throw new DepartmentValidationError(`Invalid department evidence sourceType "${ref.sourceType}".`)
  }
  validateRequiredText(ref.summary, 'evidence summary', 1000)
  if (ref.redactionStatus !== 'sanitized' && ref.redactionStatus !== 'redacted') {
    throw new DepartmentValidationError('evidence redactionStatus must be sanitized or redacted.')
  }
  validateDepartmentTokenBlockers(ref)
}

export function validateDepartmentEvidenceRefs(refs: DepartmentEvidenceRef[] = []): void {
  refs.forEach((ref, index) => {
    try {
      validateDepartmentEvidenceRef(ref)
    } catch (error) {
      throw new DepartmentValidationError(`evidenceRefs[${index}]: ${(error as Error).message}`)
    }
  })
}

export function validateDepartmentTokenBlockers(record: {
  isExecutionToken?: boolean
  isRoutingToken?: boolean
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
    'isPermissionGrant',
    'isReleaseToken',
    'isDeployToken',
    'isTaskCompletionToken',
    'grantsRuntimePermission',
    'mutatesSourceRecords',
  ] as const) {
    if (record[key] !== false) {
      throw new DepartmentSafetyViolationError(`${key} must be false for Sprint 18 department records.`)
    }
  }
}

export function validateDepartmentReviewRecordSafety(record: {
  doesNotExecuteAgent?: boolean
  doesNotContinueAgent?: boolean
  doesNotExecuteToolRun?: boolean
  doesNotExecuteWorkflow?: boolean
  doesNotWriteFile?: boolean
  doesNotRunGit?: boolean
  doesNotCallExternalApi?: boolean
  doesNotConnectMcp?: boolean
  doesNotCreatePr?: boolean
  doesNotDeployReleasePublish?: boolean
  doesNotCompleteTask?: boolean
  doesNotApproveFutureRecords?: boolean
}): void {
  for (const [key, value] of Object.entries(record)) {
    if (key.startsWith('doesNot') && value !== true) {
      throw new DepartmentSafetyViolationError(`${key} must be true.`)
    }
  }
}

export function validateDepartmentPermissionBoundarySafety(record: {
  approvalMeaning?: string
  approvalDoesNotExecute?: boolean
  approvalDoesNotRoute?: boolean
  approvalDoesNotGrantFuturePermission?: boolean
  grantsRuntimePermission?: boolean
  isPermissionGrant?: boolean
}): void {
  if (record.approvalMeaning !== 'local_department_record_review_only') {
    throw new DepartmentSafetyViolationError('DepartmentPermissionBoundary approvalMeaning must be local record review only.')
  }
  if (record.approvalDoesNotExecute !== true) {
    throw new DepartmentSafetyViolationError('DepartmentPermissionBoundary approvalDoesNotExecute must be true.')
  }
  if (record.approvalDoesNotRoute !== true) {
    throw new DepartmentSafetyViolationError('DepartmentPermissionBoundary approvalDoesNotRoute must be true.')
  }
  if (record.approvalDoesNotGrantFuturePermission !== true) {
    throw new DepartmentSafetyViolationError('DepartmentPermissionBoundary approvalDoesNotGrantFuturePermission must be true.')
  }
  if (record.grantsRuntimePermission !== false || record.isPermissionGrant !== false) {
    throw new DepartmentSafetyViolationError('DepartmentPermissionBoundary cannot grant runtime permission.')
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
    throw new DepartmentSafetyViolationError('superseded state requires supersede refs.')
  }
  if (!record.supersededAt) {
    throw new DepartmentSafetyViolationError('superseded state requires supersededAt.')
  }
  if (!record.supersedeReason) {
    throw new DepartmentSafetyViolationError('superseded state requires supersedeReason.')
  }
}

export function validateNoForbiddenDepartmentStates(states: string[]): void {
  for (const state of states) {
    if ((FORBIDDEN_DEPARTMENT_STATES as readonly string[]).includes(state)) {
      throw new DepartmentSafetyViolationError(`Forbidden Sprint 18 department state "${state}".`)
    }
  }
}

export function validateNoForbiddenDepartmentActionTerms(value: string, context: string): void {
  const lower = value.toLowerCase()
  for (const term of FORBIDDEN_DEPARTMENT_ACTION_TERMS) {
    if (lower.includes(term)) {
      throw new DepartmentSafetyViolationError(`Forbidden Sprint 18 action term "${term}" found in ${context}.`)
    }
  }
}

export function validateDepartmentApiRouteName(routePath: string): void {
  validateNoForbiddenDepartmentActionTerms(routePath, `API route ${routePath}`)
}

export function validateDepartmentUiLabel(label: string): void {
  validateNoForbiddenDepartmentActionTerms(label, `UI label ${label}`)
}

export function validateDepartmentRecordType(value: string): asserts value is DepartmentRecordType {
  if (!(DEPARTMENT_RECORD_TYPES as readonly string[]).includes(value)) {
    throw new DepartmentValidationError(`Invalid department record type "${value}".`)
  }
}

export function validateDepartmentLocalActions(actions: DepartmentLocalAction[] = []): void {
  for (const action of actions) {
    if (!(DEPARTMENT_LOCAL_ACTIONS as readonly string[]).includes(action)) {
      throw new DepartmentValidationError(`Invalid local department action "${action}".`)
    }
  }
}

export function validateCreateDepartmentProfileInput(input: CreateDepartmentProfileInput): void {
  validateRequiredText(input.departmentKey, 'departmentKey', 120)
  validateRequiredText(input.displayName, 'displayName', 160)
  validateRequiredText(input.mission, 'mission', 2000)
  validateRequiredText(input.responsibilitySummary, 'responsibilitySummary', 2000)
  validateDepartmentEvidenceRefs(input.evidenceRefs)
}

export function validateCreateDepartmentAgentRoleInput(input: CreateDepartmentAgentRoleInput): void {
  validateRequiredText(input.departmentProfileId, 'departmentProfileId', 200)
  validateRequiredText(input.roleKey, 'roleKey', 120)
  validateRequiredText(input.displayName, 'displayName', 160)
  validateRequiredText(input.roleMission, 'roleMission', 2000)
  validateDepartmentLocalActions(input.allowedLocalActions)
  validateDepartmentEvidenceRefs(input.evidenceRefs)
}

export function validateCreateDepartmentResponsibilityMatrixInput(input: CreateDepartmentResponsibilityMatrixInput): void {
  validateRequiredText(input.departmentProfileId, 'departmentProfileId', 200)
  validateDepartmentEvidenceRefs(input.evidenceRefs)
}

export function validateCreateDepartmentEscalationPolicyInput(input: CreateDepartmentEscalationPolicyInput): void {
  validateRequiredText(input.departmentProfileId, 'departmentProfileId', 200)
  validateDepartmentEvidenceRefs(input.evidenceRefs)
}

export function validateCreateDepartmentPermissionBoundaryInput(input: CreateDepartmentPermissionBoundaryInput): void {
  validateRequiredText(input.departmentProfileId, 'departmentProfileId', 200)
  validateDepartmentLocalActions(input.allowedLocalRecordActions)
  validateDepartmentEvidenceRefs(input.evidenceRefs)
}

export function validateCreateDepartmentReviewRecordInput(input: CreateDepartmentReviewRecordInput): void {
  validateDepartmentRecordType(input.targetType)
  if ((input.targetType as string) === 'department_review_record') {
    throw new DepartmentValidationError('DepartmentReviewRecord cannot approve another DepartmentReviewRecord.')
  }
  validateRequiredText(input.targetId, 'targetId', 200)
  if (!['needs_changes', 'approved_record', 'rejected'].includes(input.verdict)) {
    throw new DepartmentValidationError('Invalid department review verdict.')
  }
  validateRequiredText(input.reviewNotes, 'reviewNotes', 4000)
  validateDepartmentEvidenceRefs(input.evidenceRefs)
}

function validateRequiredText(value: unknown, name: string, max: number): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new DepartmentValidationError(`${name} is required and must be a non-empty string.`)
  }
  if (value.length > max) throw new DepartmentValidationError(`${name} must be ${max} characters or less.`)
}
