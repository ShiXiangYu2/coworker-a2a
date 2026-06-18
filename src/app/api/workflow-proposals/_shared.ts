/**
 * Shared helpers for Sprint 14 Workflow Orchestration API routes.
 *
 * Safety: from-* routes only read and snapshot source records.
 * They never trigger Agent runtime, Tool runtime, or mutate source records.
 */

import { prisma } from '@/lib/prisma'
import type {
  WorkflowSourceEvidenceRef,
  WorkflowSourceKind,
  WorkflowIntent,
  WorkflowRiskLevel,
  WorkflowCreatedBy,
  WorkflowStepKind,
  WorkflowVerdict,
  WorkflowReviewer,
  WorkflowReadinessRecommendation,
} from '@/lib/workflow/types'
import { SPRINT_14_SAFETY_NOTE } from '@/lib/workflow/types'

// ─── Error handling ────────────────────────────────────────────────────

export class WorkflowRepositoryError extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message)
    this.name = 'WorkflowRepositoryError'
  }
}

export function workflowErrorResponse(error: unknown) {
  if (error instanceof WorkflowRepositoryError) {
    return Response.json(
      { ok: false, error: { code: 'workflow_error', message: error.message } },
      { status: error.status }
    )
  }
  if (error instanceof Error) {
    return Response.json(
      { ok: false, error: { code: 'validation_error', message: error.message } },
      { status: 400 }
    )
  }
  return Response.json(
    { ok: false, error: { code: 'unexpected_error', message: 'Unexpected Sprint 14 API error.' } },
    { status: 500 }
  )
}

// ─── JSON parsing ──────────────────────────────────────────────────────

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json()
  if (!isObject(body)) throw new Error('JSON body must be an object.')
  return body
}

export function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

export function requiredString(value: unknown, name: string): string {
  const s = stringValue(value)
  if (!s) throw new Error(`${name} is required.`)
  return s
}

export function stringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return value as string[]
  return undefined
}

export function booleanValue(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value
  return undefined
}

// ─── Source evidence snapshot (read-only) ──────────────────────────────

/**
 * Read an existing source record and snapshot its sanitized fields
 * into WorkflowSourceEvidenceRef format.
 *
 * Safety: This function ONLY reads. It never mutates the source record.
 * It never triggers Agent runtime, Tool runtime, or state transitions.
 */
export async function snapshotSourceEvidence(args: {
  sourceType: string
  sourceId: string
}): Promise<WorkflowSourceEvidenceRef[]> {
  const { sourceType, sourceId } = args

  const snapshotMap: Record<string, () => Promise<{ summary: string } | null>> = {
    task: async () => {
      const r = await prisma.harmonyTask.findUnique({ where: { id: sourceId }, select: { title: true, description: true, status: true } })
      return r ? { summary: `Task "${r.title}" (${r.status}): ${r.description.slice(0, 200)}` } : null
    },
    agent_run: async () => {
      const r = await prisma.agentRun.findUnique({ where: { id: sourceId }, select: { agentId: true, status: true, resultJson: true } })
      return r ? { summary: `AgentRun ${r.agentId} (${r.status})` } : null
    },
    tool_run: async () => {
      const r = await prisma.toolRun.findUnique({ where: { id: sourceId }, select: { toolId: true, status: true } })
      return r ? { summary: `ToolRun ${r.toolId} (${r.status})` } : null
    },
    tool_execution_receipt: async () => {
      const r = await prisma.toolExecutionReceipt.findUnique({ where: { id: sourceId }, select: { toolId: true, status: true, resultSummary: true } })
      return r ? { summary: `ToolExecutionReceipt ${r.toolId} (${r.status}): ${r.resultSummary.slice(0, 200)}` } : null
    },
    file_change_proposal: async () => {
      const r = await prisma.fileChangeProposal.findUnique({ where: { id: sourceId }, select: { title: true, status: true, summary: true } })
      return r ? { summary: `FileChangeProposal "${r.title}" (${r.status}): ${r.summary.slice(0, 200)}` } : null
    },
    pull_request_plan: async () => {
      const r = await prisma.pullRequestPlan.findUnique({ where: { id: sourceId }, select: { title: true, status: true, summary: true } })
      return r ? { summary: `PullRequestPlan "${r.title}" (${r.status}): ${r.summary.slice(0, 200)}` } : null
    },
    external_action_proposal: async () => {
      const r = await prisma.externalActionProposal.findUnique({ where: { id: sourceId }, select: { title: true, status: true, summary: true } })
      return r ? { summary: `ExternalActionProposal "${r.title}" (${r.status}): ${r.summary.slice(0, 200)}` } : null
    },
  }

  const snapshotter = snapshotMap[sourceType]
  if (!snapshotter) {
    return [{
      sourceType: sourceType as WorkflowSourceEvidenceRef['sourceType'],
      sourceId,
      summary: `Source record ${sourceType}:${sourceId} (snapshot not available for this type)`,
      redactionStatus: 'sanitized',
      isExecutionToken: false as const,
    }]
  }

  const data = await snapshotter()
  if (!data) {
    return [{
      sourceType: sourceType as WorkflowSourceEvidenceRef['sourceType'],
      sourceId,
      summary: `Source record ${sourceType}:${sourceId} not found`,
      redactionStatus: 'sanitized',
      isExecutionToken: false as const,
    }]
  }

  return [{
    sourceType: sourceType as WorkflowSourceEvidenceRef['sourceType'],
    sourceId,
    summary: data.summary,
    redactionStatus: 'sanitized',
    isExecutionToken: false as const,
  }]
}

// ─── Audit event helper ────────────────────────────────────────────────

async function createAuditEvent(args: {
  correlationId: string
  entityType: string
  entityId: string
  eventType: string
  actorType: string
  reason: string
}) {
  return prisma.harmonyAuditEvent.create({
    data: {
      correlationId: args.correlationId,
      eventType: args.eventType,
      actorType: args.actorType,
      reason: args.reason,
      payloadJson: JSON.stringify({ entityType: args.entityType, entityId: args.entityId }),
    },
  })
}

// ─── Proposal creation ─────────────────────────────────────────────────

export interface CreateProposalInput {
  title: string
  summary: string
  sourceKind: WorkflowSourceKind
  sourceRecordId?: string
  sourceEvidenceRefs: WorkflowSourceEvidenceRef[]
  workflowIntent: WorkflowIntent
  riskLevel: WorkflowRiskLevel
  createdBy: WorkflowCreatedBy
  correlationId?: string
  idempotencyKey?: string
}

export async function createWorkflowProposal(input: CreateProposalInput) {
  const correlationId = input.correlationId ?? `wf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const proposal = await prisma.workflowProposal.create({
    data: {
      title: input.title,
      summary: input.summary,
      status: 'proposal',
      sourceKind: input.sourceKind,
      sourceRecordId: input.sourceRecordId,
      sourceEvidenceRefsJson: JSON.stringify(input.sourceEvidenceRefs),
      workflowIntent: input.workflowIntent,
      riskLevel: input.riskLevel,
      executionCapability: 'none',
      canExecute: false,
      requiresKelvinConfirmation: true,
      createdBy: input.createdBy,
      correlationId,
      auditRefsJson: '[]',
      idempotencyKey: input.idempotencyKey,
    },
  })

  const auditEvent = await createAuditEvent({
    correlationId,
    entityType: 'WorkflowProposal',
    entityId: proposal.id,
    eventType: 'task.created',
    actorType: input.createdBy === 'user' ? 'user' : 'system',
    reason: `WorkflowProposal created from ${input.sourceKind}`,
  })

  return { proposal, auditEvent, safetyNote: SPRINT_14_SAFETY_NOTE }
}

// ─── Proposal status transition ────────────────────────────────────────

export async function transitionProposalStatus(
  proposalId: string,
  targetStatus: string,
  auditEventType: string,
  reason: string
) {
  const proposal = await prisma.workflowProposal.findUnique({ where: { id: proposalId } })
  if (!proposal) throw new WorkflowRepositoryError('WorkflowProposal not found.', 404)

  const allowed: Record<string, string[]> = {
    proposal: ['draft', 'archived'],
    draft: ['review', 'superseded', 'archived'],
    review: ['approved_record', 'rejected', 'superseded', 'archived'],
    approved_record: ['archived'],
    rejected: ['archived'],
    superseded: ['archived'],
  }

  if (!allowed[proposal.status]?.includes(targetStatus)) {
    throw new WorkflowRepositoryError(
      `Cannot transition from "${proposal.status}" to "${targetStatus}".`
    )
  }

  const updated = await prisma.workflowProposal.update({
    where: { id: proposalId },
    data: {
      status: targetStatus,
      ...(targetStatus === 'archived' ? { archivedAt: new Date() } : {}),
    },
  })

  const auditEvent = await createAuditEvent({
    correlationId: proposal.correlationId,
    entityType: 'WorkflowProposal',
    entityId: proposalId,
    eventType: auditEventType,
    actorType: 'user',
    reason,
  })

  return { proposal: updated, auditEvent }
}

// ─── Step creation ─────────────────────────────────────────────────────

export interface CreateStepInput {
  workflowProposalId: string
  stepIndex: number
  title: string
  summary: string
  stepKind: WorkflowStepKind
  referencedRecordType: string
  referencedRecordId?: string
  sourceEvidenceRefs: WorkflowSourceEvidenceRef[]
  dependsOnStepIds?: string[]
  blockedByStepIds?: string[]
  forbiddenExecutionReason: string
  requiresKelvinConfirmation: boolean
  createdBy: WorkflowCreatedBy
}

export async function createWorkflowStep(input: CreateStepInput) {
  const proposal = await prisma.workflowProposal.findUnique({ where: { id: input.workflowProposalId } })
  if (!proposal) throw new WorkflowRepositoryError('WorkflowProposal not found.', 404)

  const step = await prisma.workflowStepRecord.create({
    data: {
      correlationId: proposal.correlationId,
      workflowProposalId: input.workflowProposalId,
      stepIndex: input.stepIndex,
      title: input.title,
      summary: input.summary,
      status: 'proposal',
      stepKind: input.stepKind,
      referencedRecordType: input.referencedRecordType,
      referencedRecordId: input.referencedRecordId,
      sourceEvidenceRefsJson: JSON.stringify(input.sourceEvidenceRefs),
      dependsOnStepIdsJson: JSON.stringify(input.dependsOnStepIds ?? []),
      blockedByStepIdsJson: JSON.stringify(input.blockedByStepIds ?? []),
      executionCapability: 'none',
      canExecute: false,
      forbiddenExecutionReason: input.forbiddenExecutionReason,
      requiresKelvinConfirmation: input.requiresKelvinConfirmation,
      createdBy: input.createdBy,
      auditRefsJson: '[]',
    },
  })

  const auditEvent = await createAuditEvent({
    correlationId: proposal.correlationId,
    entityType: 'WorkflowStepRecord',
    entityId: step.id,
    eventType: 'task.created',
    actorType: 'user',
    reason: `Step created: ${input.stepKind}`,
  })

  return { step, auditEvent }
}

// ─── Review creation ───────────────────────────────────────────────────

export interface CreateReviewInput {
  workflowProposalId: string
  workflowStepRecordId?: string
  reviewer: WorkflowReviewer
  verdict: WorkflowVerdict
  reviewNotes: string
  createdBy: WorkflowCreatedBy
}

export async function createWorkflowReview(input: CreateReviewInput) {
  const proposal = await prisma.workflowProposal.findUnique({ where: { id: input.workflowProposalId } })
  if (!proposal) throw new WorkflowRepositoryError('WorkflowProposal not found.', 404)

  const review = await prisma.workflowReviewRecord.create({
    data: {
      correlationId: proposal.correlationId,
      workflowProposalId: input.workflowProposalId,
      workflowStepRecordId: input.workflowStepRecordId,
      status: 'draft',
      reviewer: input.reviewer,
      verdict: input.verdict,
      reviewNotes: input.reviewNotes,
      doesNotExecute: true,
      createdBy: input.createdBy,
      auditRefsJson: '[]',
    },
  })

  const auditEvent = await createAuditEvent({
    correlationId: proposal.correlationId,
    entityType: 'WorkflowReviewRecord',
    entityId: review.id,
    eventType: 'task.created',
    actorType: 'user',
    reason: `Review created: ${input.verdict}`,
  })

  return { review, auditEvent }
}

// ─── Readiness creation ────────────────────────────────────────────────

export interface CreateReadinessInput {
  workflowProposalId: string
  riskFindings: string[]
  missingEvidence: string[]
  blockedReasons: string[]
  recommendation: WorkflowReadinessRecommendation
  createdBy: WorkflowCreatedBy
}

export async function createWorkflowReadiness(input: CreateReadinessInput) {
  const proposal = await prisma.workflowProposal.findUnique({ where: { id: input.workflowProposalId } })
  if (!proposal) throw new WorkflowRepositoryError('WorkflowProposal not found.', 404)

  const assessment = await prisma.workflowReadinessAssessment.create({
    data: {
      correlationId: proposal.correlationId,
      workflowProposalId: input.workflowProposalId,
      status: 'draft',
      riskFindingsJson: JSON.stringify(input.riskFindings),
      missingEvidenceJson: JSON.stringify(input.missingEvidence),
      blockedReasonsJson: JSON.stringify(input.blockedReasons),
      recommendation: input.recommendation,
      isExecutionToken: false,
      createdBy: input.createdBy,
      auditRefsJson: '[]',
    },
  })

  const auditEvent = await createAuditEvent({
    correlationId: proposal.correlationId,
    entityType: 'WorkflowReadinessAssessment',
    entityId: assessment.id,
    eventType: 'task.created',
    actorType: 'user',
    reason: `Readiness assessed: ${input.recommendation}`,
  })

  return { assessment, auditEvent }
}

// ─── Graph creation ────────────────────────────────────────────────────

export interface CreateGraphInput {
  workflowProposalId: string
  nodes: { id: string; nodeType: string; recordId?: string; label: string }[]
  edges: { fromNodeId: string; toNodeId: string; relation: string }[]
  graphIntegrityStatus: string
  cycleDetected: boolean
  missingReferenceCount: number
}

export async function createWorkflowGraph(input: CreateGraphInput) {
  const proposal = await prisma.workflowProposal.findUnique({ where: { id: input.workflowProposalId } })
  if (!proposal) throw new WorkflowRepositoryError('WorkflowProposal not found.', 404)

  const graph = await prisma.workflowDependencyGraph.create({
    data: {
      workflowProposalId: input.workflowProposalId,
      nodesJson: JSON.stringify(input.nodes.map((n) => ({ ...n, canExecute: false }))),
      edgesJson: JSON.stringify(input.edges),
      graphIntegrityStatus: input.graphIntegrityStatus,
      cycleDetected: input.cycleDetected,
      missingReferenceCount: input.missingReferenceCount,
      containsExecutableNode: false,
    },
  })

  return { graph }
}
