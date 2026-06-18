import type {
  DemoScenarioRecord,
  GovernanceSummaryRecord,
  MVPDemoEvidenceRef,
  MVPReadinessRecord,
  MVPSourceEvidenceRef,
  MVPSourceEvidenceType,
  MVPReviewRecord,
} from './types'
import {
  FORBIDDEN_MVP_ACTION_TERMS,
  FORBIDDEN_MVP_STATES,
  REQUIRED_MVP_BASELINE_SPRINTS,
} from './types'

const VALID_EVIDENCE_TYPES: readonly MVPSourceEvidenceType[] = [
  'task',
  'agent_run',
  'agent_result',
  'tool_call',
  'tool_run',
  'tool_result',
  'tool_execution_receipt',
  'file_change_proposal',
  'patch_draft',
  'git_change_plan',
  'pull_request_plan',
  'review_patch_record',
  'external_action_proposal',
  'integration_risk_assessment',
  'external_action_review_record',
  'workflow_proposal',
  'workflow_step_record',
  'workflow_dependency_graph',
  'workflow_readiness_assessment',
  'workflow_review_record',
  'audit_event',
  'observability_event',
  'recovery_point',
  'eval_run',
  'regression_gate',
  'release_readiness_checklist',
  'user_snippet',
  'sanitized_context_snapshot',
]

export class InvalidMVPEvidenceError extends Error {
  constructor(public readonly detail: string) {
    super(`Invalid MVP evidence: ${detail}`)
    this.name = 'InvalidMVPEvidenceError'
  }
}

export class MVPSafetyViolationError extends Error {
  constructor(public readonly detail: string) {
    super(`MVP closure safety violation: ${detail}`)
    this.name = 'MVPSafetyViolationError'
  }
}

export class ForbiddenMVPActionTermError extends Error {
  constructor(
    public readonly term: string,
    public readonly context: string
  ) {
    super(`Forbidden MVP action term "${term}" found in ${context}`)
    this.name = 'ForbiddenMVPActionTermError'
  }
}

export function validateMVPSourceEvidenceRef(ref: MVPSourceEvidenceRef): void {
  if (!(VALID_EVIDENCE_TYPES as readonly string[]).includes(ref.sourceType)) {
    throw new InvalidMVPEvidenceError(`Unknown sourceType: "${ref.sourceType}"`)
  }
  if (!ref.summary || typeof ref.summary !== 'string') {
    throw new InvalidMVPEvidenceError('summary is required')
  }
  if (ref.redactionStatus !== 'sanitized' && ref.redactionStatus !== 'redacted') {
    throw new InvalidMVPEvidenceError(`Invalid redactionStatus: "${ref.redactionStatus}"`)
  }
  if (ref.isExecutionToken !== false) {
    throw new InvalidMVPEvidenceError('isExecutionToken must be false')
  }
  if (ref.isReleaseToken !== false) {
    throw new InvalidMVPEvidenceError('isReleaseToken must be false')
  }
  if (ref.isDeployToken !== false) {
    throw new InvalidMVPEvidenceError('isDeployToken must be false')
  }
}

export function validateMVPSourceEvidenceRefs(refs: MVPSourceEvidenceRef[]): void {
  for (let i = 0; i < refs.length; i++) {
    try {
      validateMVPSourceEvidenceRef(refs[i])
    } catch (error) {
      throw new InvalidMVPEvidenceError(`refs[${i}]: ${(error as Error).message}`)
    }
  }
}

export function validateMVPDemoEvidenceRef(ref: MVPDemoEvidenceRef): void {
  if (!ref.displayLabel) throw new InvalidMVPEvidenceError('displayLabel is required')
  if (!ref.summary) throw new InvalidMVPEvidenceError('summary is required')
  if (ref.redactionStatus !== 'sanitized' && ref.redactionStatus !== 'redacted') {
    throw new InvalidMVPEvidenceError(`Invalid redactionStatus: "${ref.redactionStatus}"`)
  }
  if (ref.isExecutionToken !== false) {
    throw new InvalidMVPEvidenceError('demo evidence isExecutionToken must be false')
  }
}

export function validateNoForbiddenMVPStates(states: string[]): void {
  for (const state of states) {
    if ((FORBIDDEN_MVP_STATES as readonly string[]).includes(state)) {
      throw new MVPSafetyViolationError(`Forbidden state "${state}"`)
    }
  }
}

export function validateNoForbiddenMVPActionTerms(value: string, context: string): void {
  const lower = value.toLowerCase()
  for (const term of FORBIDDEN_MVP_ACTION_TERMS) {
    if (lower.includes(term)) {
      throw new ForbiddenMVPActionTermError(term, context)
    }
  }
}

export function validateMVPApiRouteName(routePath: string): void {
  validateNoForbiddenMVPActionTerms(routePath, `API route: ${routePath}`)
}

export function validateMVPAllowedUiLabel(label: string): void {
  validateNoForbiddenMVPActionTerms(label, `UI label: ${label}`)
}

export function validateBaselineSprints(sprints: readonly string[]): void {
  for (const sprint of REQUIRED_MVP_BASELINE_SPRINTS) {
    if (!sprints.includes(sprint)) {
      throw new MVPSafetyViolationError(`Missing baseline sprint: ${sprint}`)
    }
  }
}

export function validateTokenBlocker(record: {
  isExecutionToken: boolean
  isReleaseToken: boolean
  isDeployToken: boolean
}): void {
  if (record.isExecutionToken !== false) {
    throw new MVPSafetyViolationError('isExecutionToken must be false')
  }
  if (record.isReleaseToken !== false) {
    throw new MVPSafetyViolationError('isReleaseToken must be false')
  }
  if (record.isDeployToken !== false) {
    throw new MVPSafetyViolationError('isDeployToken must be false')
  }
}

export function validateMVPReadinessSafety(record: Pick<
  MVPReadinessRecord,
  | 'targetSprint'
  | 'baselineSprints'
  | 'evidenceRefs'
  | 'isExecutionToken'
  | 'isReleaseToken'
  | 'isDeployToken'
  | 'requiresKelvinConfirmation'
>): void {
  if (record.targetSprint !== 'sprint_15') {
    throw new MVPSafetyViolationError('targetSprint must be sprint_15')
  }
  validateBaselineSprints(record.baselineSprints)
  validateMVPSourceEvidenceRefs(record.evidenceRefs)
  validateTokenBlocker(record)
  if (record.requiresKelvinConfirmation !== true) {
    throw new MVPSafetyViolationError('requiresKelvinConfirmation must be true')
  }
}

export function validateDemoScenarioSafety(record: Pick<
  DemoScenarioRecord,
  | 'targetSprint'
  | 'baselineSprints'
  | 'orderedEvidenceRefs'
  | 'forbiddenRuntimeActions'
  | 'demoScriptMarkdown'
  | 'canExecute'
  | 'isExecutionToken'
  | 'isReleaseToken'
  | 'isDeployToken'
>): void {
  if (record.targetSprint !== 'sprint_15') {
    throw new MVPSafetyViolationError('targetSprint must be sprint_15')
  }
  validateBaselineSprints(record.baselineSprints)
  for (const ref of record.orderedEvidenceRefs) validateMVPDemoEvidenceRef(ref)
  if (record.canExecute !== false) throw new MVPSafetyViolationError('canExecute must be false')
  validateTokenBlocker(record)
  if (!Array.isArray(record.forbiddenRuntimeActions)) {
    throw new MVPSafetyViolationError('forbiddenRuntimeActions must be an array')
  }
  validateNoForbiddenMVPActionTerms(record.demoScriptMarkdown, 'demoScriptMarkdown')
}

export function validateGovernanceSummarySafety(record: Pick<
  GovernanceSummaryRecord,
  | 'targetSprint'
  | 'coveredSprints'
  | 'isExecutionToken'
  | 'isReleaseToken'
  | 'isDeployToken'
>): void {
  if (record.targetSprint !== 'sprint_15') {
    throw new MVPSafetyViolationError('targetSprint must be sprint_15')
  }
  validateBaselineSprints(record.coveredSprints)
  validateTokenBlocker(record)
}

export function validateMVPReviewSafety(record: Pick<
  MVPReviewRecord,
  | 'targetSprint'
  | 'doesNotExecute'
  | 'doesNotRelease'
  | 'doesNotDeploy'
  | 'doesNotCompleteTask'
>): void {
  if (record.targetSprint !== 'sprint_15') {
    throw new MVPSafetyViolationError('targetSprint must be sprint_15')
  }
  if (record.doesNotExecute !== true) throw new MVPSafetyViolationError('doesNotExecute must be true')
  if (record.doesNotRelease !== true) throw new MVPSafetyViolationError('doesNotRelease must be true')
  if (record.doesNotDeploy !== true) throw new MVPSafetyViolationError('doesNotDeploy must be true')
  if (record.doesNotCompleteTask !== true) throw new MVPSafetyViolationError('doesNotCompleteTask must be true')
}
