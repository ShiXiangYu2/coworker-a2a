/**
 * Sprint 14 — Human-Gated Workflow Orchestration Records
 *
 * Types for WorkflowProposal, WorkflowStepRecord, WorkflowDependencyGraph,
 * WorkflowReviewRecord, and WorkflowReadinessAssessment.
 *
 * Safety: All types enforce local-record-only semantics.
 * No execution states, no runtime triggers, no auto-approval.
 */

// ─── Shared ────────────────────────────────────────────────────────────

export type WorkflowStatus =
  | 'proposal'
  | 'draft'
  | 'review'
  | 'approved_record'
  | 'rejected'
  | 'superseded'
  | 'archived'

export type WorkflowEvent =
  | 'CREATE'
  | 'DRAFT'
  | 'SUBMIT_REVIEW'
  | 'APPROVE_RECORD'
  | 'REJECT'
  | 'SUPERSEDE'
  | 'ARCHIVE'

export type WorkflowRiskLevel = 'low' | 'medium' | 'high' | 'critical'

export type WorkflowCreatedBy = 'user' | 'agent_record' | 'system_seed'

/**
 * Forbidden state names — must never appear in any WorkflowStatus field.
 * Enforced by validation and tests.
 */
export const FORBIDDEN_WORKFLOW_STATES = [
  'running',
  'executed',
  'step_executed',
  'continued',
  'completed',
  'retried',
  'replayed',
  'rolled_back',
  'resumed',
  'applied',
  'called',
  'connected',
  'deployed',
] as const

/**
 * Forbidden action terms — must never appear in API route names or UI labels.
 * Enforced by validation and tests.
 */
export const FORBIDDEN_ACTION_TERMS = [
  'run',
  'execute',
  'continue',
  'apply',
  'write',
  'call',
  'connect',
  'create-pr',
  'deploy',
  'complete',
  'retry',
  'replay',
  'rollback',
  'resume',
] as const

// ─── Source Evidence ───────────────────────────────────────────────────

export type WorkflowSourceEvidenceType =
  | 'task'
  | 'agent_run'
  | 'agent_result'
  | 'tool_call'
  | 'tool_run'
  | 'tool_result'
  | 'tool_execution_plan'
  | 'tool_execution_receipt'
  | 'file_change_proposal'
  | 'patch_draft'
  | 'git_change_plan'
  | 'pull_request_plan'
  | 'review_patch_record'
  | 'external_integration_profile'
  | 'mcp_connection_profile'
  | 'external_action_proposal'
  | 'external_action_review_record'
  | 'integration_risk_assessment'
  | 'collaboration_decision'
  | 'audit_event'
  | 'observability_event'
  | 'regression_gate'
  | 'release_readiness_checklist'
  | 'user_snippet'
  | 'sanitized_context_snapshot'

export interface WorkflowSourceEvidenceRef {
  sourceType: WorkflowSourceEvidenceType
  sourceId?: string
  summary: string
  redactionStatus: 'sanitized' | 'redacted'
  /** Type-level safety: evidence is never an execution token. */
  isExecutionToken: false
}

// ─── WorkflowProposal ──────────────────────────────────────────────────

export type WorkflowSourceKind =
  | 'task'
  | 'agent_run'
  | 'tool_run'
  | 'tool_execution_receipt'
  | 'file_change_proposal'
  | 'pull_request_plan'
  | 'external_action_proposal'
  | 'user_snippet'
  | 'sanitized_context_snapshot'

export type WorkflowIntent =
  | 'coordination'
  | 'release_review'
  | 'remediation_plan'
  | 'external_governance'
  | 'file_git_pr_review'
  | 'audit_package'

export interface WorkflowProposal {
  id: string
  title: string
  summary: string
  status: WorkflowStatus
  sourceKind: WorkflowSourceKind
  sourceRecordId?: string
  sourceEvidenceRefs: WorkflowSourceEvidenceRef[]
  workflowIntent: WorkflowIntent
  riskLevel: WorkflowRiskLevel
  /** Type-level safety: WorkflowProposal never executes. */
  executionCapability: 'none'
  /** Value-level safety: WorkflowProposal never executes. */
  canExecute: false
  requiresKelvinConfirmation: true
  createdBy: WorkflowCreatedBy
  correlationId: string
  auditRefs: string[]
  createdAt: string
  updatedAt: string
  archivedAt?: string
}

// ─── WorkflowStepRecord ────────────────────────────────────────────────

export type WorkflowStepKind =
  | 'inspect_record'
  | 'review_record'
  | 'approve_record'
  | 'reject_record'
  | 'compare_evidence'
  | 'assess_risk'
  | 'document_decision'

export interface WorkflowStepRecord {
  id: string
  correlationId: string
  workflowProposalId: string
  stepIndex: number
  title: string
  summary: string
  status: WorkflowStatus
  stepKind: WorkflowStepKind
  referencedRecordType: string
  referencedRecordId?: string
  sourceEvidenceRefs: WorkflowSourceEvidenceRef[]
  dependsOnStepIds: string[]
  blockedByStepIds: string[]
  /** Type-level safety: WorkflowStepRecord never executes. */
  executionCapability: 'none'
  /** Value-level safety: WorkflowStepRecord never executes. */
  canExecute: false
  forbiddenExecutionReason: string
  requiresKelvinConfirmation: boolean
  createdBy: WorkflowCreatedBy
  auditRefs: string[]
  createdAt: string
  updatedAt: string
}

// ─── WorkflowDependencyGraph ───────────────────────────────────────────

export type WorkflowGraphNodeKind =
  | 'workflow_step'
  | 'source_evidence'
  | 'review_record'
  | 'readiness_assessment'

export type WorkflowGraphEdgeRelation =
  | 'depends_on'
  | 'blocks'
  | 'references'
  | 'reviews'

export interface WorkflowGraphNode {
  id: string
  nodeType: WorkflowGraphNodeKind
  recordId?: string
  label: string
  /** Value-level safety: graph nodes never execute. */
  canExecute: false
}

export interface WorkflowGraphEdge {
  fromNodeId: string
  toNodeId: string
  relation: WorkflowGraphEdgeRelation
}

export type WorkflowGraphIntegrityStatus = 'valid' | 'invalid' | 'needs_review'

export interface WorkflowDependencyGraph {
  id: string
  workflowProposalId: string
  nodes: WorkflowGraphNode[]
  edges: WorkflowGraphEdge[]
  graphIntegrityStatus: WorkflowGraphIntegrityStatus
  cycleDetected: boolean
  missingReferenceCount: number
  /** Value-level safety: graph never contains executable nodes. */
  containsExecutableNode: false
  createdAt: string
  updatedAt: string
}

// ─── WorkflowReviewRecord ──────────────────────────────────────────────

export type WorkflowReviewStatus =
  | 'draft'
  | 'review'
  | 'approved_record'
  | 'rejected'
  | 'archived'

export type WorkflowReviewer = 'kelvin' | 'owner' | 'operator'

export type WorkflowVerdict = 'needs_changes' | 'approved_record' | 'rejected'

export interface WorkflowReviewRecord {
  id: string
  correlationId: string
  workflowProposalId: string
  workflowStepRecordId?: string
  status: WorkflowReviewStatus
  reviewer: WorkflowReviewer
  verdict: WorkflowVerdict
  reviewNotes: string
  confirmationArtifactId?: string
  /** Value-level safety: review record never executes. */
  doesNotExecute: true
  createdBy: WorkflowCreatedBy
  auditRefs: string[]
  createdAt: string
  updatedAt: string
}

// ─── WorkflowReadinessAssessment ───────────────────────────────────────

export type WorkflowReadinessRecommendation =
  | 'needs_review'
  | 'request_changes'
  | 'approve_record'
  | 'reject_record'

export interface WorkflowReadinessAssessment {
  id: string
  correlationId: string
  workflowProposalId: string
  status: WorkflowReviewStatus
  riskFindings: string[]
  missingEvidence: string[]
  blockedReasons: string[]
  recommendation: WorkflowReadinessRecommendation
  /** Value-level safety: readiness assessment is never an execution token. */
  isExecutionToken: false
  createdBy: WorkflowCreatedBy
  auditRefs: string[]
  createdAt: string
  updatedAt: string
}

// ─── Safety Note ───────────────────────────────────────────────────────

export const SPRINT_14_SAFETY_NOTE =
  'Sprint 14 records human-gated workflow orchestration proposals only. It does not execute workflows, execute steps, continue Agents, execute ToolRuns, write files, run Git, call external APIs, connect MCP, create PRs, deploy, complete Tasks, retry, replay, rollback, or resume execution.'

// ─── Bundle (for API responses) ────────────────────────────────────────

export interface WorkflowProposalBundle {
  proposal: WorkflowProposal
  steps: WorkflowStepRecord[]
  graph?: WorkflowDependencyGraph
  assessments: WorkflowReadinessAssessment[]
  reviews: WorkflowReviewRecord[]
}
