import type {
  CreateExecutionApprovalInput,
  CreateExecutionGateInput,
  CreateExecutionIntentInput,
  CreateExecutionPlanInput,
  CreateExecutionReceiptInput,
  ExecutionEvidenceRef,
  ExecutionEvidenceSourceType,
  ExecutionGatewayRecordType,
} from './types'
import {
  EXECUTION_EVIDENCE_SOURCE_TYPES,
  EXECUTION_GATEWAY_RECORD_TYPES,
  FORBIDDEN_EXECUTION_GATEWAY_ACTION_TERMS,
  FORBIDDEN_EXECUTION_GATEWAY_STATES,
} from './types'

export class ExecutionGatewayValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ExecutionGatewayValidationError'
  }
}

export class ExecutionGatewaySafetyViolationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ExecutionGatewaySafetyViolationError'
  }
}

export function validateExecutionEvidenceRef(ref: ExecutionEvidenceRef): void {
  validateExecutionEvidenceSourceType(ref.sourceType)
  validateRequiredText(ref.summary, 'evidence summary', 1000)
  if (ref.redactionStatus !== 'sanitized' && ref.redactionStatus !== 'redacted') {
    throw new ExecutionGatewayValidationError('ExecutionEvidenceRef redactionStatus must be sanitized or redacted.')
  }
  if (ref.reviewUseOnly !== true) throw new ExecutionGatewaySafetyViolationError('ExecutionEvidenceRef reviewUseOnly must be true.')
  if (ref.localReferenceOnly !== true) throw new ExecutionGatewaySafetyViolationError('ExecutionEvidenceRef localReferenceOnly must be true.')
  validateExecutionTokenBlockers(ref)
}

export function validateExecutionEvidenceRefs(refs: ExecutionEvidenceRef[] = []): void {
  refs.forEach((ref, index) => {
    try {
      validateExecutionEvidenceRef(ref)
    } catch (error) {
      throw new ExecutionGatewayValidationError(`ExecutionEvidenceRef[${index}]: ${(error as Error).message}`)
    }
  })
}

export function validateExecutionTokenBlockers(record: {
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
      throw new ExecutionGatewaySafetyViolationError(`${key} must be false for Sprint 20 execution gateway records.`)
    }
  }
}

export function validateExecutionBlockers(record: {
  executesAgent?: boolean
  continuesAgent?: boolean
  routesTask?: boolean
  assignsAgent?: boolean
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
    'assignsAgent',
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
      throw new ExecutionGatewaySafetyViolationError(`${key} must be false for Sprint 20 execution gateway records.`)
    }
  }
}

export function validateExecutionApprovalSafety(record: {
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
  doesNotApproveFutureExecutions?: boolean
}): void {
  for (const [key, value] of Object.entries(record)) {
    if (key.startsWith('doesNot') && value !== true) {
      throw new ExecutionGatewaySafetyViolationError(`${key} must be true.`)
    }
  }
}

export function validateExecutionGateDecisionSafety(record: {
  gateDecision?: string
  doesNotGrantRuntimePermission?: boolean
  grantsRuntimePermission?: boolean
  isPermissionGrant?: boolean
}): void {
  if (!['pending_review', 'approved_record', 'rejected'].includes(record.gateDecision ?? 'pending_review')) {
    throw new ExecutionGatewayValidationError('Invalid ExecutionGateRecord gateDecision.')
  }
  if (record.doesNotGrantRuntimePermission !== true) {
    throw new ExecutionGatewaySafetyViolationError('ExecutionGateRecord must explicitly not grant runtime permission.')
  }
  if (record.grantsRuntimePermission !== false || record.isPermissionGrant !== false) {
    throw new ExecutionGatewaySafetyViolationError('ExecutionGateRecord gateDecision cannot grant runtime permission.')
  }
}

export function validateExecutionReceiptSafety(record: {
  actualExecutionPerformed?: boolean
  sourceSystemAccessed?: boolean
  receiptIsLocalRecordOnly?: boolean
  receiptIsNotRuntimeReceipt?: boolean
  receiptIsNotToolExecutionReceipt?: boolean
  receiptSummary?: string
  observedOutcomeSummary?: string
  operatorNotes?: string
}): void {
  if (record.actualExecutionPerformed !== false) {
    throw new ExecutionGatewaySafetyViolationError('ExecutionReceiptRecord cannot claim real execution.')
  }
  if (record.sourceSystemAccessed !== false) {
    throw new ExecutionGatewaySafetyViolationError('ExecutionReceiptRecord cannot claim source system access.')
  }
  if (record.receiptIsLocalRecordOnly !== true) {
    throw new ExecutionGatewaySafetyViolationError('ExecutionReceiptRecord must be local-record-only.')
  }
  if (record.receiptIsNotRuntimeReceipt !== true) {
    throw new ExecutionGatewaySafetyViolationError('ExecutionReceiptRecord is not a runtime receipt.')
  }
  if (record.receiptIsNotToolExecutionReceipt !== true) {
    throw new ExecutionGatewaySafetyViolationError('ExecutionReceiptRecord is not ToolExecutionReceipt.')
  }
  for (const [name, value] of Object.entries({
    receiptSummary: record.receiptSummary,
    observedOutcomeSummary: record.observedOutcomeSummary,
    operatorNotes: record.operatorNotes,
  })) {
    validateNoForbiddenExecutionGatewayActionTerms(String(value ?? ''), name)
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
    throw new ExecutionGatewaySafetyViolationError('superseded state requires supersede refs.')
  }
  if (!record.supersededAt) throw new ExecutionGatewaySafetyViolationError('superseded state requires supersededAt.')
  if (!record.supersedeReason) throw new ExecutionGatewaySafetyViolationError('superseded state requires supersedeReason.')
}

export function validateNoForbiddenExecutionGatewayStates(states: string[]): void {
  for (const state of states) {
    if ((FORBIDDEN_EXECUTION_GATEWAY_STATES as readonly string[]).includes(state)) {
      throw new ExecutionGatewaySafetyViolationError(`Forbidden Sprint 20 execution gateway state "${state}".`)
    }
  }
}

export function validateNoForbiddenExecutionGatewayActionTerms(value: string, context: string): void {
  const lower = value.toLowerCase()
  for (const term of FORBIDDEN_EXECUTION_GATEWAY_ACTION_TERMS) {
    if (lower.includes(term)) {
      throw new ExecutionGatewaySafetyViolationError(`Forbidden Sprint 20 action term "${term}" found in ${context}.`)
    }
  }
}

export function validateExecutionGatewayApiRouteName(routePath: string): void {
  validateNoForbiddenExecutionGatewayActionTerms(routePath, `API route ${routePath}`)
}

export function validateExecutionGatewayUiLabel(label: string): void {
  validateNoForbiddenExecutionGatewayActionTerms(label, `UI label ${label}`)
}

export function validateExecutionGatewayRecordType(value: string): asserts value is ExecutionGatewayRecordType {
  if (!(EXECUTION_GATEWAY_RECORD_TYPES as readonly string[]).includes(value)) {
    throw new ExecutionGatewayValidationError(`Invalid execution gateway record type "${value}".`)
  }
}

export function validateExecutionEvidenceSourceType(value: string): asserts value is ExecutionEvidenceSourceType {
  if (!(EXECUTION_EVIDENCE_SOURCE_TYPES as readonly string[]).includes(value)) {
    throw new ExecutionGatewayValidationError(`Invalid ExecutionEvidenceRef sourceType "${value}".`)
  }
}

export function validateCreateExecutionIntentInput(input: CreateExecutionIntentInput): void {
  validateRequiredText(input.intentTitle, 'intentTitle', 200)
  validateRequiredText(input.intentSummary, 'intentSummary', 2000)
  validateRequiredText(input.requestedActionType, 'requestedActionType', 120)
  validateRequiredText(input.requestedActionSummary, 'requestedActionSummary', 2000)
  validateRequiredText(input.expectedOutcome, 'expectedOutcome', 2000)
  validateRequiredText(input.riskSummary, 'riskSummary', 2000)
  validateExecutionEvidenceRefs(input.sanitizedEvidenceRefs)
}

export function validateCreateExecutionPlanInput(input: CreateExecutionPlanInput): void {
  validateRequiredText(input.intentRecordId, 'intentRecordId', 200)
  validateRequiredText(input.planTitle, 'planTitle', 200)
  validateRequiredText(input.planSummary, 'planSummary', 2000)
  validateRequiredText(input.rollbackNotes, 'rollbackNotes', 2000)
  validateExecutionEvidenceRefs(input.sanitizedEvidenceRefs)
}

export function validateCreateExecutionGateInput(input: CreateExecutionGateInput): void {
  if (!input.intentRecordId && !input.planRecordId) {
    throw new ExecutionGatewayValidationError('ExecutionGateRecord requires intentRecordId or planRecordId.')
  }
  validateRequiredText(input.gateName, 'gateName', 200)
  validateRequiredText(input.gateSummary, 'gateSummary', 2000)
  if (!['pending_review', 'approved_record', 'rejected'].includes(input.gateDecision ?? 'pending_review')) {
    throw new ExecutionGatewayValidationError('Invalid gateDecision.')
  }
  validateExecutionEvidenceRefs(input.requiredEvidenceRefs)
}

export function validateCreateExecutionApprovalInput(input: CreateExecutionApprovalInput): void {
  validateExecutionGatewayRecordType(input.targetType)
  if ((input.targetType as string) === 'execution_approval_record') {
    throw new ExecutionGatewayValidationError('ExecutionApprovalRecord cannot approve another ExecutionApprovalRecord.')
  }
  validateRequiredText(input.targetId, 'targetId', 200)
  if (!['needs_changes', 'approved_record', 'rejected'].includes(input.verdict)) {
    throw new ExecutionGatewayValidationError('Invalid execution review verdict.')
  }
  validateRequiredText(input.reviewNotes, 'reviewNotes', 4000)
  validateExecutionEvidenceRefs(input.evidenceRefs)
}

export function validateCreateExecutionReceiptInput(input: CreateExecutionReceiptInput): void {
  if (!input.intentRecordId && !input.planRecordId && !input.gateRecordId) {
    throw new ExecutionGatewayValidationError('ExecutionReceiptRecord requires intentRecordId, planRecordId, or gateRecordId.')
  }
  validateRequiredText(input.receiptTitle, 'receiptTitle', 200)
  validateRequiredText(input.receiptSummary, 'receiptSummary', 2000)
  validateRequiredText(input.observedOutcomeSummary, 'observedOutcomeSummary', 2000)
  validateRequiredText(input.operatorNotes, 'operatorNotes', 4000)
  validateExecutionEvidenceRefs(input.evidenceRefs)
  validateExecutionReceiptSafety({
    actualExecutionPerformed: false,
    sourceSystemAccessed: false,
    receiptIsLocalRecordOnly: true,
    receiptIsNotRuntimeReceipt: true,
    receiptIsNotToolExecutionReceipt: true,
    receiptSummary: input.receiptSummary,
    observedOutcomeSummary: input.observedOutcomeSummary,
    operatorNotes: input.operatorNotes,
  })
}

function validateRequiredText(value: unknown, name: string, max: number): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ExecutionGatewayValidationError(`${name} is required and must be a non-empty string.`)
  }
  if (value.length > max) throw new ExecutionGatewayValidationError(`${name} must be ${max} characters or less.`)
}
