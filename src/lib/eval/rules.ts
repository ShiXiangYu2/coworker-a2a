import { createHash } from 'node:crypto'
import type {
  EvalCheck,
  EvalFinding,
  EvalTarget,
  EvalTargetType,
  QualityGateDecision,
} from './types'

type EvalCheckDraft = Omit<EvalCheck, 'id' | 'evalRunId' | 'evalTargetId' | 'createdAt'>

export function hashSnapshot(snapshot: unknown): string {
  return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex')
}

export function buildEvalTargetMetadata(
  targetType: EvalTargetType,
  targetId: string,
  snapshot: Record<string, unknown>
): Pick<
  EvalTarget,
  | 'routeDecisionId'
  | 'taskId'
  | 'agentRunId'
  | 'agentResultId'
  | 'toolCallId'
  | 'toolPermissionId'
  | 'memoryEntryId'
  | 'knowledgeItemId'
  | 'contextPacketId'
  | 'a2aMessageId'
> {
  const taskId = stringFrom(snapshot.taskId)
  const agentRunId = stringFrom(snapshot.agentRunId)
  return {
    routeDecisionId: targetType === 'route_decision' ? targetId : stringFrom(snapshot.routeDecisionId),
    taskId,
    agentRunId,
    agentResultId: targetType === 'agent_result' ? targetId : stringFrom(snapshot.agentResultId),
    toolCallId: targetType === 'tool_call' ? targetId : stringFrom(snapshot.toolCallId),
    toolPermissionId:
      targetType === 'tool_permission' ? targetId : stringFrom(snapshot.toolPermissionId),
    memoryEntryId: targetType === 'memory_entry' ? targetId : stringFrom(snapshot.memoryEntryId),
    knowledgeItemId:
      targetType === 'knowledge_item' ? targetId : stringFrom(snapshot.knowledgeItemId),
    contextPacketId:
      targetType === 'context_packet' ? targetId : stringFrom(snapshot.contextPacketId),
    a2aMessageId: targetType === 'a2a_message' ? targetId : stringFrom(snapshot.a2aMessageId),
  }
}

export function produceDeterministicEval(input: {
  evalRunId: string
  evalTarget: EvalTarget
  now: string
}): {
  checks: Omit<EvalCheck, 'id' | 'evalRunId' | 'evalTargetId' | 'createdAt'>[]
  findings: Omit<EvalFinding, 'id' | 'evalRunId' | 'evalTargetId' | 'createdAt' | 'updatedAt'>[]
  qualityGateDecision: QualityGateDecision
} {
  const snapshot = objectFrom(input.evalTarget.snapshot)
  const checks: EvalCheckDraft[] = [
    schemaCheck(input.evalTarget.targetType, snapshot),
    safetyCheck(snapshot),
    confirmationCheck(snapshot),
    targetSpecificCheck(input.evalTarget.targetType, snapshot),
  ]
  const findings = checks
    .filter((check) => ['warned', 'failed', 'blocked'].includes(check.status))
    .map((check) => ({
      relatedCheckIds: [check.checkKey],
      severity: check.severity,
      category: findingCategoryFor(check.category),
      title: check.title,
      description: check.evidence.join(' '),
      targetPath: check.targetPath,
      targetField: check.targetField,
      evidence: check.evidence,
      evidenceRefs: check.evidenceRefs,
      recommendation:
        check.recommendation ?? 'Review this finding before relying on the target record.',
      status: check.severity === 'high' || check.severity === 'critical'
        ? 'review_requested'
        : 'open',
      needsHumanReview: check.severity === 'high' || check.severity === 'critical',
    })) satisfies Omit<
      EvalFinding,
      'id' | 'evalRunId' | 'evalTargetId' | 'createdAt' | 'updatedAt'
    >[]

  const blocked = checks.some((check) => check.status === 'blocked')
  const failed = checks.some((check) => check.status === 'failed')
  const warned = checks.some((check) => check.status === 'warned')
  const needsHumanReview = findings.some((finding) => finding.needsHumanReview)
  const decision = blocked
    ? 'blocked'
    : needsHumanReview
      ? 'needs_human_review'
      : failed
        ? 'fail'
        : warned
          ? 'warn'
          : 'pass'

  return {
    checks,
    findings,
    qualityGateDecision: {
      gateVersion: 'sprint-7-deterministic-v1',
      sourceEvalRunId: input.evalRunId,
      checkIds: checks.map((check) => check.checkKey),
      findingIds: findings.map((finding) => finding.title),
      decision,
      confidence: decision === 'pass' ? 0.9 : 0.75,
      summary: `Deterministic verification completed for ${input.evalTarget.targetType}.`,
      reasons: checks.map((check) => `${check.checkKey}: ${check.status}`),
      requiredActions: findings.map((finding) => finding.recommendation),
      recommendedOwnerAgentId: needsHumanReview ? 'kelvin' : 'turing',
      blocksFutureExecutionRecommendation: decision === 'blocked',
      requiresKelvinReview: needsHumanReview || decision === 'blocked',
      evaluatedAt: input.now,
    },
  }
}

function schemaCheck(targetType: EvalTargetType, snapshot: Record<string, unknown>): EvalCheckDraft {
  const hasStatus = typeof snapshot.status === 'string' || targetType === 'route_decision'
  return {
    checkKey: 'schema.required_fields',
    title: 'Required local snapshot fields',
    category: 'schema' as const,
    status: hasStatus ? 'passed' as const : 'failed' as const,
    severity: hasStatus ? 'info' as const : 'medium' as const,
    confidence: 0.9,
    targetField: 'status',
    evidence: hasStatus
      ? ['Snapshot contains enough status information for local verification.']
      : ['Snapshot is missing a status-like field.'],
    recommendation: hasStatus ? undefined : 'Refresh the target snapshot before relying on this eval.',
  }
}

function safetyCheck(snapshot: Record<string, unknown>): EvalCheckDraft {
  const sideEffects = snapshot.sideEffects
  const hasSideEffects = Array.isArray(sideEffects)
    ? sideEffects.length > 0
    : sideEffects && typeof sideEffects === 'object'
      ? Object.values(sideEffects).some((value) => Array.isArray(value) && value.length > 0)
      : false
  return {
    checkKey: 'safety.no_side_effects',
    title: 'No executed or pending side effects',
    category: 'safety' as const,
    status: hasSideEffects ? 'blocked' as const : 'passed' as const,
    severity: hasSideEffects ? 'critical' as const : 'info' as const,
    confidence: 0.9,
    targetField: 'sideEffects',
    evidence: hasSideEffects
      ? ['Target snapshot contains non-empty sideEffects. Sprint 7 must not execute them.']
      : ['No non-empty sideEffects were found in the snapshot.'],
    recommendation: hasSideEffects
      ? 'Keep this as a local finding and request Kelvin review. Do not execute anything.'
      : undefined,
  }
}

function confirmationCheck(snapshot: Record<string, unknown>): EvalCheckDraft {
  const requiresHuman =
    snapshot.requiresHumanConfirmation === true ||
    snapshot.needsHumanConfirmation === true ||
    snapshot.status === 'pending_confirmation'
  return {
    checkKey: 'confirmation.boundary',
    title: 'Human confirmation boundary',
    category: 'confirmation' as const,
    status: requiresHuman ? 'warned' as const : 'passed' as const,
    severity: requiresHuman ? 'high' as const : 'info' as const,
    confidence: 0.85,
    targetField: 'requiresHumanConfirmation',
    evidence: requiresHuman
      ? ['Target indicates human confirmation is required. Eval remains recommendation-only.']
      : ['No human confirmation requirement was detected.'],
    recommendation: requiresHuman
      ? 'Request Kelvin review for this finding. Approval must not mutate target status.'
      : undefined,
  }
}

function targetSpecificCheck(
  targetType: EvalTargetType,
  snapshot: Record<string, unknown>
): EvalCheckDraft {
  if (targetType === 'context_packet') {
    return {
      checkKey: 'context_packet.audit_only',
      title: 'ContextPacket eval is audit-only',
      category: 'provenance' as const,
      status: 'passed' as const,
      severity: 'info' as const,
      confidence: 0.9,
      targetField: 'contextPacketId',
      evidence: [
        'ContextPacket was evaluated for audit, reproducibility, and selection quality only.',
      ],
      recommendation: undefined,
    }
  }

  if (targetType === 'tool_permission') {
    const decision = stringFrom(snapshot.decision)
    const safeDecision = ['allow_record_only', 'deny', 'requires_human', 'blocked'].includes(decision ?? '')
    return {
      checkKey: 'permission.default_deny',
      title: 'ToolPermission has no execute decision',
      category: 'permission' as const,
      status: safeDecision ? 'passed' as const : 'blocked' as const,
      severity: safeDecision ? 'info' as const : 'critical' as const,
      confidence: 0.9,
      targetField: 'decision',
      evidence: safeDecision
        ? [`Permission decision is ${decision}.`]
        : ['Permission decision is missing or unsafe.'],
      recommendation: safeDecision ? undefined : 'Block future execution and request Kelvin review.',
    }
  }

  return {
    checkKey: 'target.boundary',
    title: 'Sprint 7 recommendation-only boundary',
    category: 'regression' as const,
    status: 'passed' as const,
    severity: 'info' as const,
    confidence: 0.9,
    evidence: [`${targetType} eval does not mutate target records.`],
    recommendation: undefined,
  }
}

function findingCategoryFor(category: EvalCheck['category']): EvalFinding['category'] {
  if (category === 'state_machine') return 'state'
  if (category === 'consistency') return 'quality'
  return category as EvalFinding['category']
}

function objectFrom(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function stringFrom(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined
}
