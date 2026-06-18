/**
 * Sprint 15 - MVP Closure / System Readiness
 *
 * Local readiness, demo, governance summary, and review records.
 * Safety: no execution, release, deploy, publish, task completion, or resume semantics.
 */

export type MVPReadinessStatus =
  | 'draft'
  | 'review'
  | 'approved_record'
  | 'rejected'
  | 'archived'

export type MVPReadinessEvent =
  | 'SUBMIT_REVIEW'
  | 'APPROVE_RECORD'
  | 'REJECT'
  | 'ARCHIVE'

export type MVPTargetSprint = 'sprint_15'

export type MVPBaselineSprint =
  | 'sprint_1'
  | 'sprint_2'
  | 'sprint_3'
  | 'sprint_4'
  | 'sprint_5'
  | 'sprint_6'
  | 'sprint_7'
  | 'sprint_8'
  | 'sprint_9'
  | 'sprint_10'
  | 'sprint_11'
  | 'sprint_12'
  | 'sprint_13'
  | 'sprint_14'

export const REQUIRED_MVP_BASELINE_SPRINTS: readonly MVPBaselineSprint[] = [
  'sprint_1',
  'sprint_2',
  'sprint_3',
  'sprint_4',
  'sprint_5',
  'sprint_6',
  'sprint_7',
  'sprint_8',
  'sprint_9',
  'sprint_10',
  'sprint_11',
  'sprint_12',
  'sprint_13',
  'sprint_14',
]

export const FORBIDDEN_MVP_STATES = [
  'running',
  'executed',
  'deployed',
  'published',
  'released',
  'auto_fixed',
  'auto_remediated',
  'completed',
  'retried',
  'replayed',
  'rolled_back',
  'resumed',
] as const

export const FORBIDDEN_MVP_ACTION_TERMS = [
  'execute',
  'run',
  'deploy',
  'publish',
  'release',
  'auto fix',
  'auto remediate',
  'complete task',
  'continue agent',
  'run tool',
  'apply change',
  'write file',
  'run git',
  'call api',
  'connect mcp',
  'create pr',
  'retry',
  'replay',
  'rollback',
  'resume execution',
] as const

export type MVPCreatedBy = 'user' | 'operator' | 'agent_record' | 'system_seed'
export type MVPReviewer = 'kelvin' | 'owner' | 'operator'

export type MVPSourceEvidenceType =
  | 'task'
  | 'agent_run'
  | 'agent_result'
  | 'tool_call'
  | 'tool_run'
  | 'tool_result'
  | 'tool_execution_receipt'
  | 'file_change_proposal'
  | 'patch_draft'
  | 'git_change_plan'
  | 'pull_request_plan'
  | 'review_patch_record'
  | 'external_action_proposal'
  | 'integration_risk_assessment'
  | 'external_action_review_record'
  | 'workflow_proposal'
  | 'workflow_step_record'
  | 'workflow_dependency_graph'
  | 'workflow_readiness_assessment'
  | 'workflow_review_record'
  | 'audit_event'
  | 'observability_event'
  | 'recovery_point'
  | 'eval_run'
  | 'regression_gate'
  | 'release_readiness_checklist'
  | 'user_snippet'
  | 'sanitized_context_snapshot'

export interface MVPSourceEvidenceRef {
  sourceType: MVPSourceEvidenceType
  sourceId?: string
  summary: string
  redactionStatus: 'sanitized' | 'redacted'
  isExecutionToken: false
  isReleaseToken: false
  isDeployToken: false
}

export interface MVPAcceptanceCriterion {
  id: string
  title: string
  status: 'met' | 'needs_review' | 'blocked'
  evidenceRefs: string[]
  notes?: string
}

export type MVPReadinessScope =
  | 'mvp_demo'
  | 'system_review'
  | 'governance_handoff'
  | 'stage_closure'

export type MVPReadinessRecommendation =
  | 'needs_review'
  | 'approve_record'
  | 'reject_record'

export interface MVPReadinessRecord {
  id: string
  title: string
  summary: string
  targetVersion: string
  targetSprint: MVPTargetSprint
  baselineSprints: MVPBaselineSprint[]
  status: MVPReadinessStatus
  readinessScope: MVPReadinessScope
  evidenceRefs: MVPSourceEvidenceRef[]
  demoScenarioRefs: string[]
  governanceSummaryRefs: string[]
  regressionGateRefs: string[]
  releaseReadinessRefs: string[]
  riskFindings: string[]
  openIssues: string[]
  acceptanceMatrix: MVPAcceptanceCriterion[]
  recommendation: MVPReadinessRecommendation
  isExecutionToken: false
  isReleaseToken: false
  isDeployToken: false
  requiresKelvinConfirmation: true
  createdBy: MVPCreatedBy
  reviewedBy?: MVPReviewer
  reviewedAt?: string
  correlationId: string
  auditRefs: string[]
  createdAt: string
  updatedAt: string
  archivedAt?: string
}

export type DemoScenarioKind =
  | 'happy_path'
  | 'safety_boundary'
  | 'regression'
  | 'governance_review'
  | 'demo_script'

export type DemoEntryPoint =
  | 'chathub'
  | 'task_ui'
  | 'governance_console'
  | 'api_readonly'

export interface MVPDemoEvidenceRef {
  sourceType: MVPSourceEvidenceType | string
  sourceId?: string
  displayLabel: string
  summary: string
  redactionStatus: 'sanitized' | 'redacted'
  isExecutionToken: false
}

export interface DemoScenarioRecord {
  id: string
  title: string
  summary: string
  targetSprint: MVPTargetSprint
  baselineSprints: MVPBaselineSprint[]
  status: MVPReadinessStatus
  scenarioKind: DemoScenarioKind
  entryPoint: DemoEntryPoint
  orderedEvidenceRefs: MVPDemoEvidenceRef[]
  expectedScreens: string[]
  expectedLocalRecords: string[]
  forbiddenRuntimeActions: string[]
  demoScriptMarkdown: string
  seedDataRefs: string[]
  canExecute: false
  isExecutionToken: false
  isReleaseToken: false
  isDeployToken: false
  createdBy: MVPCreatedBy
  correlationId: string
  auditRefs: string[]
  createdAt: string
  updatedAt: string
  archivedAt?: string
}

export interface GovernanceSummaryRecord {
  id: string
  title: string
  summary: string
  targetSprint: MVPTargetSprint
  coveredSprints: MVPBaselineSprint[]
  status: MVPReadinessStatus
  recordCountsByType: Record<string, number>
  safetyBoundarySummary: string
  defaultDenySummary: string
  humanConfirmationSummary: string
  auditCoverageSummary: string
  observabilityCoverageSummary: string
  recoveryCoverageSummary: string
  evalCoverageSummary: string
  regressionEvidenceRefs: string[]
  releaseReadinessRefs: string[]
  knownLimitations: string[]
  riskFindings: string[]
  isExecutionToken: false
  isReleaseToken: false
  isDeployToken: false
  createdBy: MVPCreatedBy
  correlationId: string
  auditRefs: string[]
  createdAt: string
  updatedAt: string
  archivedAt?: string
}

export type MVPReviewTargetType =
  | 'mvp_readiness_record'
  | 'demo_scenario_record'
  | 'governance_summary_record'

export type MVPReviewVerdict =
  | 'needs_changes'
  | 'approved_record'
  | 'rejected'

export interface MVPReviewRecord {
  id: string
  targetType: MVPReviewTargetType
  targetId: string
  targetSprint: MVPTargetSprint
  status: MVPReadinessStatus
  reviewer: MVPReviewer
  verdict: MVPReviewVerdict
  reviewNotes: string
  confirmationArtifactId?: string
  doesNotExecute: boolean
  doesNotRelease: boolean
  doesNotDeploy: boolean
  doesNotCompleteTask: boolean
  createdBy: Exclude<MVPCreatedBy, 'agent_record'>
  correlationId: string
  auditRefs: string[]
  createdAt: string
  updatedAt: string
  archivedAt?: string
}

export const SPRINT_15_SAFETY_NOTE =
  'Sprint 15 readiness records are local MVP closure evidence only. Approval does not execute, release, deploy, publish, complete tasks, or authorize future actions.'

