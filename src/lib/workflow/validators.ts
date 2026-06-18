/**
 * Workflow Validation Helpers
 *
 * Pure validation functions for:
 * - Source evidence refs (Sprint 1-13 records)
 * - Forbidden state names
 * - Forbidden action terms (API routes, UI labels)
 * - Step dependency graph integrity
 * - WorkflowProposal / WorkflowStepRecord field constraints
 *
 * Safety: All validators enforce local-record-only semantics.
 */

import type {
  WorkflowSourceEvidenceRef,
  WorkflowSourceEvidenceType,
  WorkflowStepRecord,
  WorkflowGraphNode,
} from './types'
import { FORBIDDEN_WORKFLOW_STATES, FORBIDDEN_ACTION_TERMS } from './types'

// ─── Source Evidence Ref Validation ────────────────────────────────────

const VALID_EVIDENCE_TYPES: readonly WorkflowSourceEvidenceType[] = [
  'task',
  'agent_run',
  'agent_result',
  'tool_call',
  'tool_run',
  'tool_result',
  'tool_execution_plan',
  'tool_execution_receipt',
  'file_change_proposal',
  'patch_draft',
  'git_change_plan',
  'pull_request_plan',
  'review_patch_record',
  'external_integration_profile',
  'mcp_connection_profile',
  'external_action_proposal',
  'external_action_review_record',
  'integration_risk_assessment',
  'collaboration_decision',
  'audit_event',
  'observability_event',
  'regression_gate',
  'release_readiness_checklist',
  'user_snippet',
  'sanitized_context_snapshot',
]

export class InvalidSourceEvidenceError extends Error {
  constructor(public readonly detail: string) {
    super(`Invalid source evidence: ${detail}`)
    this.name = 'InvalidSourceEvidenceError'
  }
}

export function validateSourceEvidenceRef(ref: WorkflowSourceEvidenceRef): void {
  if (!(VALID_EVIDENCE_TYPES as readonly string[]).includes(ref.sourceType)) {
    throw new InvalidSourceEvidenceError(`Unknown sourceType: "${ref.sourceType}"`)
  }
  if (ref.isExecutionToken !== false) {
    throw new InvalidSourceEvidenceError('isExecutionToken must be false')
  }
  if (ref.redactionStatus !== 'sanitized' && ref.redactionStatus !== 'redacted') {
    throw new InvalidSourceEvidenceError(`Invalid redactionStatus: "${ref.redactionStatus}"`)
  }
  if (!ref.summary || typeof ref.summary !== 'string') {
    throw new InvalidSourceEvidenceError('summary is required')
  }
}

export function validateSourceEvidenceRefs(refs: WorkflowSourceEvidenceRef[]): void {
  for (let i = 0; i < refs.length; i++) {
    try {
      validateSourceEvidenceRef(refs[i])
    } catch (e) {
      throw new InvalidSourceEvidenceError(`refs[${i}]: ${(e as Error).message}`)
    }
  }
}

// ─── Forbidden State Validation ────────────────────────────────────────

export class ForbiddenStateError extends Error {
  constructor(public readonly state: string) {
    super(
      `Forbidden workflow state: "${state}". ` +
      `Must not be one of: ${FORBIDDEN_WORKFLOW_STATES.join(', ')}`
    )
    this.name = 'ForbiddenStateError'
  }
}

export function validateNoForbiddenStates(states: string[]): void {
  for (const state of states) {
    if ((FORBIDDEN_WORKFLOW_STATES as readonly string[]).includes(state)) {
      throw new ForbiddenStateError(state)
    }
  }
}

export function assertStateNotForbidden(state: string): void {
  if ((FORBIDDEN_WORKFLOW_STATES as readonly string[]).includes(state)) {
    throw new ForbiddenStateError(state)
  }
}

// ─── Forbidden Action Term Validation ──────────────────────────────────

export class ForbiddenActionTermError extends Error {
  constructor(public readonly term: string, public readonly context: string) {
    super(`Forbidden action term "${term}" found in ${context}`)
    this.name = 'ForbiddenActionTermError'
  }
}

/**
 * Check if a string contains any forbidden action terms.
 * Used to validate API route names and UI labels.
 */
export function validateNoForbiddenActionTerms(
  value: string,
  context: string
): void {
  const lower = value.toLowerCase()
  for (const term of FORBIDDEN_ACTION_TERMS) {
    if (lower.includes(term)) {
      throw new ForbiddenActionTermError(term, context)
    }
  }
}

/**
 * Validate that an API route path does not contain forbidden action terms.
 */
export function validateApiRouteName(routePath: string): void {
  validateNoForbiddenActionTerms(routePath, `API route: ${routePath}`)
}

/**
 * Validate that a UI label does not contain forbidden action terms.
 */
export function validateUiLabel(label: string): void {
  validateNoForbiddenActionTerms(label, `UI label: ${label}`)
}

// ─── Step Dependency Validation ────────────────────────────────────────

export class InvalidStepDependencyError extends Error {
  constructor(public readonly detail: string) {
    super(`Invalid step dependency: ${detail}`)
    this.name = 'InvalidStepDependencyError'
  }
}

/**
 * Validate that step dependencies form a DAG (no cycles).
 * Returns topologically sorted step indices, or throws on cycle.
 */
export function validateStepDag(steps: WorkflowStepRecord[]): number[] {
  const byId = new Map(steps.map((s) => [s.id, s]))
  const visited = new Set<string>()
  const visiting = new Set<string>()
  const sorted: string[] = []

  function dfs(id: string): void {
    if (visited.has(id)) return
    if (visiting.has(id)) {
      throw new InvalidStepDependencyError(`Cycle detected involving step ${id}`)
    }
    visiting.add(id)
    const step = byId.get(id)
    if (step) {
      for (const depId of step.dependsOnStepIds) {
        if (byId.has(depId)) dfs(depId)
      }
    }
    visiting.delete(id)
    visited.add(id)
    sorted.push(id)
  }

  for (const step of steps) {
    dfs(step.id)
  }

  return sorted.map((id) => {
    const step = byId.get(id)
    return step ? step.stepIndex : -1
  })
}

/**
 * Validate that all dependsOnStepIds and blockedByStepIds reference existing steps.
 */
export function validateStepReferencesExist(steps: WorkflowStepRecord[]): void {
  const ids = new Set(steps.map((s) => s.id))
  for (const step of steps) {
    for (const depId of step.dependsOnStepIds) {
      if (!ids.has(depId)) {
        throw new InvalidStepDependencyError(
          `Step ${step.id} depends on non-existent step ${depId}`
        )
      }
    }
    for (const blockId of step.blockedByStepIds) {
      if (!ids.has(blockId)) {
        throw new InvalidStepDependencyError(
          `Step ${step.id} is blocked by non-existent step ${blockId}`
        )
      }
    }
  }
}

// ─── Graph Integrity Validation ────────────────────────────────────────

export class InvalidGraphError extends Error {
  constructor(public readonly detail: string) {
    super(`Invalid dependency graph: ${detail}`)
    this.name = 'InvalidGraphError'
  }
}

/**
 * Validate that the graph has no executable nodes.
 */
export function validateNoExecutableNodes(nodes: WorkflowGraphNode[]): void {
  for (const node of nodes) {
    if (node.canExecute !== false) {
      throw new InvalidGraphError(
        `Node ${node.id} has canExecute=${node.canExecute}, expected false`
      )
    }
  }
}

/**
 * Validate that all edge references point to existing nodes.
 */
export function validateGraphEdgeReferences(
  nodes: WorkflowGraphNode[],
  edges: { fromNodeId: string; toNodeId: string }[]
): void {
  const nodeIds = new Set(nodes.map((n) => n.id))
  for (const edge of edges) {
    if (!nodeIds.has(edge.fromNodeId)) {
      throw new InvalidGraphError(
        `Edge references non-existent fromNodeId: ${edge.fromNodeId}`
      )
    }
    if (!nodeIds.has(edge.toNodeId)) {
      throw new InvalidGraphError(
        `Edge references non-existent toNodeId: ${edge.toNodeId}`
      )
    }
  }
}

// ─── Safety Field Validation ───────────────────────────────────────────

export class SafetyViolationError extends Error {
  constructor(public readonly detail: string) {
    super(`Safety violation: ${detail}`)
    this.name = 'SafetyViolationError'
  }
}

/**
 * Validate that a WorkflowProposal has correct safety fields.
 */
export function validateProposalSafetyFields(proposal: {
  executionCapability: string
  canExecute: boolean
  requiresKelvinConfirmation: boolean
}): void {
  if (proposal.executionCapability !== 'none') {
    throw new SafetyViolationError(
      `executionCapability must be "none", got "${proposal.executionCapability}"`
    )
  }
  if (proposal.canExecute !== false) {
    throw new SafetyViolationError('canExecute must be false')
  }
  if (proposal.requiresKelvinConfirmation !== true) {
    throw new SafetyViolationError('requiresKelvinConfirmation must be true')
  }
}

/**
 * Validate that a WorkflowStepRecord has correct safety fields.
 */
export function validateStepSafetyFields(step: {
  executionCapability: string
  canExecute: boolean
}): void {
  if (step.executionCapability !== 'none') {
    throw new SafetyViolationError(
      `executionCapability must be "none", got "${step.executionCapability}"`
    )
  }
  if (step.canExecute !== false) {
    throw new SafetyViolationError('canExecute must be false')
  }
}

/**
 * Validate that a WorkflowReviewRecord has correct safety fields.
 */
export function validateReviewSafetyFields(review: {
  doesNotExecute: boolean
}): void {
  if (review.doesNotExecute !== true) {
    throw new SafetyViolationError('doesNotExecute must be true')
  }
}

/**
 * Validate that a WorkflowReadinessAssessment has correct safety fields.
 */
export function validateReadinessSafetyFields(assessment: {
  isExecutionToken: boolean
}): void {
  if (assessment.isExecutionToken !== false) {
    throw new SafetyViolationError('isExecutionToken must be false')
  }
}

/**
 * Validate that a WorkflowDependencyGraph has correct safety fields.
 */
export function validateGraphSafetyFields(graph: {
  containsExecutableNode: boolean
}): void {
  if (graph.containsExecutableNode !== false) {
    throw new SafetyViolationError('containsExecutableNode must be false')
  }
}
