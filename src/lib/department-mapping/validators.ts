import type {
  CreateDepartmentEvidenceCoverageInput,
  CreateDepartmentMappingReviewRecordInput,
  CreateDepartmentReviewGapInput,
  CreateEvidenceToDepartmentMappingInput,
  DepartmentMappingDepartmentRecordType,
  DepartmentMappingEvidenceRecordType,
  DepartmentMappingEvidenceRef,
  DepartmentMappingRecordType,
} from './types'
import {
  DEPARTMENT_MAPPING_DEPARTMENT_RECORD_TYPES,
  DEPARTMENT_MAPPING_EVIDENCE_RECORD_TYPES,
  DEPARTMENT_MAPPING_RECORD_TYPES,
  FORBIDDEN_DEPARTMENT_MAPPING_ACTION_TERMS,
  FORBIDDEN_DEPARTMENT_MAPPING_STATES,
} from './types'

export class DepartmentMappingValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DepartmentMappingValidationError'
  }
}

export class DepartmentMappingSafetyViolationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DepartmentMappingSafetyViolationError'
  }
}

export function validateDepartmentMappingEvidenceRef(ref: DepartmentMappingEvidenceRef): void {
  validateEvidenceRecordType(ref.sourceType)
  validateRequiredText(ref.summary, 'evidence summary', 1000)
  if (ref.redactionStatus !== 'sanitized' && ref.redactionStatus !== 'redacted') {
    throw new DepartmentMappingValidationError('evidence redactionStatus must be sanitized or redacted.')
  }
  validateDepartmentMappingTokenBlockers(ref)
}

export function validateDepartmentMappingEvidenceRefs(refs: DepartmentMappingEvidenceRef[] = []): void {
  refs.forEach((ref, index) => {
    try {
      validateDepartmentMappingEvidenceRef(ref)
    } catch (error) {
      throw new DepartmentMappingValidationError(`evidenceRefs[${index}]: ${(error as Error).message}`)
    }
  })
}

export function validateDepartmentMappingTokenBlockers(record: {
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
      throw new DepartmentMappingSafetyViolationError(`${key} must be false for Sprint 19 department mapping records.`)
    }
  }
}

export function validateDepartmentMappingRuntimeBlockers(record: {
  importsLiveEvidence?: boolean
  syncsEvidence?: boolean
  triggersAgentRouting?: boolean
  triggersTaskAssignment?: boolean
}): void {
  for (const key of [
    'importsLiveEvidence',
    'syncsEvidence',
    'triggersAgentRouting',
    'triggersTaskAssignment',
  ] as const) {
    if (record[key] !== false) {
      throw new DepartmentMappingSafetyViolationError(`${key} must be false for Sprint 19 department mapping records.`)
    }
  }
}

export function validateDepartmentMappingReviewRecordSafety(record: {
  doesNotExecuteAgent?: boolean
  doesNotContinueAgent?: boolean
  doesNotAutoRouteTask?: boolean
  doesNotAssignAgent?: boolean
  doesNotExecuteToolRun?: boolean
  doesNotExecuteWorkflow?: boolean
  doesNotWriteFile?: boolean
  doesNotRunGit?: boolean
  doesNotCallExternalApi?: boolean
  doesNotConnectMcp?: boolean
  doesNotCreatePr?: boolean
  doesNotDeployReleasePublish?: boolean
  doesNotCompleteTask?: boolean
  doesNotApproveFutureMappings?: boolean
  statusChangeOnly?: boolean
}): void {
  for (const [key, value] of Object.entries(record)) {
    if ((key.startsWith('doesNot') || key === 'statusChangeOnly') && value !== true) {
      throw new DepartmentMappingSafetyViolationError(`${key} must be true.`)
    }
  }
}

export function validateCoverageRecommendationOnly(record: { recommendationOnly?: boolean; status?: string }): void {
  if (record.recommendationOnly !== true) {
    throw new DepartmentMappingSafetyViolationError('DepartmentEvidenceCoverageRecord must stay recommendationOnly.')
  }
  if (record.status === 'approved_record' && record.recommendationOnly !== true) {
    throw new DepartmentMappingSafetyViolationError('Coverage approval cannot become automatic approval.')
  }
}

export function validateGapRecommendationOnly(record: { recommendationOnly?: boolean }): void {
  if (record.recommendationOnly !== true) {
    throw new DepartmentMappingSafetyViolationError('DepartmentReviewGapRecord must stay recommendationOnly.')
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
    throw new DepartmentMappingSafetyViolationError('superseded state requires supersede refs.')
  }
  if (!record.supersededAt) {
    throw new DepartmentMappingSafetyViolationError('superseded state requires supersededAt.')
  }
  if (!record.supersedeReason) {
    throw new DepartmentMappingSafetyViolationError('superseded state requires supersedeReason.')
  }
}

export function validateNoForbiddenDepartmentMappingStates(states: string[]): void {
  for (const state of states) {
    if ((FORBIDDEN_DEPARTMENT_MAPPING_STATES as readonly string[]).includes(state)) {
      throw new DepartmentMappingSafetyViolationError(`Forbidden Sprint 19 mapping state "${state}".`)
    }
  }
}

export function validateNoForbiddenDepartmentMappingActionTerms(value: string, context: string): void {
  const lower = value.toLowerCase()
  for (const term of FORBIDDEN_DEPARTMENT_MAPPING_ACTION_TERMS) {
    if (lower.includes(term)) {
      throw new DepartmentMappingSafetyViolationError(`Forbidden Sprint 19 action term "${term}" found in ${context}.`)
    }
  }
}

export function validateDepartmentMappingApiRouteName(routePath: string): void {
  validateNoForbiddenDepartmentMappingActionTerms(routePath, `API route ${routePath}`)
}

export function validateDepartmentMappingUiLabel(label: string): void {
  validateNoForbiddenDepartmentMappingActionTerms(label, `UI label ${label}`)
}

export function validateDepartmentMappingRecordType(value: string): asserts value is DepartmentMappingRecordType {
  if (!(DEPARTMENT_MAPPING_RECORD_TYPES as readonly string[]).includes(value)) {
    throw new DepartmentMappingValidationError(`Invalid department mapping record type "${value}".`)
  }
}

export function validateEvidenceRecordType(value: string): asserts value is DepartmentMappingEvidenceRecordType {
  if (!(DEPARTMENT_MAPPING_EVIDENCE_RECORD_TYPES as readonly string[]).includes(value)) {
    throw new DepartmentMappingValidationError(`Invalid evidence record type "${value}".`)
  }
}

export function validateDepartmentRecordType(value: string): asserts value is DepartmentMappingDepartmentRecordType {
  if (!(DEPARTMENT_MAPPING_DEPARTMENT_RECORD_TYPES as readonly string[]).includes(value)) {
    throw new DepartmentMappingValidationError(`Invalid department record type "${value}".`)
  }
}

export function validateCreateEvidenceToDepartmentMappingInput(input: CreateEvidenceToDepartmentMappingInput): void {
  validateRequiredText(input.mappingKey, 'mappingKey', 160)
  validateRequiredText(input.title, 'title', 200)
  validateRequiredText(input.description, 'description', 2000)
  validateEvidenceRecordType(input.evidenceRecordType)
  validateRequiredText(input.evidenceRecordId, 'evidenceRecordId', 200)
  validateRequiredText(input.evidenceSummary, 'evidenceSummary', 2000)
  validateDepartmentRecordType(input.departmentRecordType)
  validateRequiredText(input.departmentRecordId, 'departmentRecordId', 200)
  validateRequiredText(input.mappingRationale, 'mappingRationale', 2000)
}

export function validateCreateDepartmentEvidenceCoverageInput(input: CreateDepartmentEvidenceCoverageInput): void {
  validateRequiredText(input.departmentProfileId, 'departmentProfileId', 200)
  validateDepartmentRecordType(input.departmentRecordType)
  validateRequiredText(input.departmentRecordId, 'departmentRecordId', 200)
  validateRequiredText(input.coverageScope, 'coverageScope', 200)
  validateRequiredText(input.coverageSummary, 'coverageSummary', 2000)
}

export function validateCreateDepartmentReviewGapInput(input: CreateDepartmentReviewGapInput): void {
  validateRequiredText(input.departmentProfileId, 'departmentProfileId', 200)
  validateDepartmentRecordType(input.departmentRecordType)
  validateRequiredText(input.departmentRecordId, 'departmentRecordId', 200)
  validateRequiredText(input.gapType, 'gapType', 120)
  validateRequiredText(input.gapSummary, 'gapSummary', 2000)
}

export function validateCreateDepartmentMappingReviewRecordInput(input: CreateDepartmentMappingReviewRecordInput): void {
  validateDepartmentMappingRecordType(input.targetType)
  if ((input.targetType as string) === 'department_mapping_review_record') {
    throw new DepartmentMappingValidationError('DepartmentMappingReviewRecord cannot approve another DepartmentMappingReviewRecord.')
  }
  validateRequiredText(input.targetId, 'targetId', 200)
  if (!['needs_changes', 'approved_record', 'rejected'].includes(input.verdict)) {
    throw new DepartmentMappingValidationError('Invalid department mapping review verdict.')
  }
  validateRequiredText(input.reviewNotes, 'reviewNotes', 4000)
  validateDepartmentMappingEvidenceRefs(input.evidenceRefs)
}

function validateRequiredText(value: unknown, name: string, max: number): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new DepartmentMappingValidationError(`${name} is required and must be a non-empty string.`)
  }
  if (value.length > max) throw new DepartmentMappingValidationError(`${name} must be ${max} characters or less.`)
}
