import { decodeJson } from '@/lib/harmony/serializers'
import { assignLayer } from './rules'
import type { EvalCheck, EvalFinding, EvalRun, EvalTarget } from './types'

function dateToString(value: Date | null | undefined): string | undefined {
  return value ? value.toISOString() : undefined
}

export function serializeEvalTarget(record: {
  id: string
  idempotencyKey: string | null
  correlationId: string | null
  targetType: string
  targetId: string
  routeDecisionId: string | null
  taskId: string | null
  agentRunId: string | null
  agentResultId: string | null
  toolCallId: string | null
  toolPermissionId: string | null
  memoryEntryId: string | null
  knowledgeItemId: string | null
  contextPacketId: string | null
  a2aMessageId: string | null
  source: string
  snapshotJson: string
  snapshotVersion: string
  snapshotHash: string | null
  status: string
  createdAt: Date
  updatedAt: Date
}): EvalTarget {
  return {
    id: record.id,
    idempotencyKey: record.idempotencyKey ?? undefined,
    correlationId: record.correlationId ?? undefined,
    targetType: record.targetType as EvalTarget['targetType'],
    targetId: record.targetId,
    routeDecisionId: record.routeDecisionId ?? undefined,
    taskId: record.taskId ?? undefined,
    agentRunId: record.agentRunId ?? undefined,
    agentResultId: record.agentResultId ?? undefined,
    toolCallId: record.toolCallId ?? undefined,
    toolPermissionId: record.toolPermissionId ?? undefined,
    memoryEntryId: record.memoryEntryId ?? undefined,
    knowledgeItemId: record.knowledgeItemId ?? undefined,
    contextPacketId: record.contextPacketId ?? undefined,
    a2aMessageId: record.a2aMessageId ?? undefined,
    source: record.source as EvalTarget['source'],
    snapshot: decodeJson(record.snapshotJson, null),
    snapshotVersion: record.snapshotVersion,
    snapshotHash: record.snapshotHash ?? undefined,
    status: record.status as EvalTarget['status'],
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export function serializeEvalRun(record: {
  id: string
  evalTargetId: string
  targetType: string
  targetId: string
  evaluatorId: string
  evaluatorMode: string
  status: string
  trigger: string
  checksSummaryJson: string
  qualityGateDecisionJson: string | null
  inputSnapshotJson: string
  outputSnapshotJson: string | null
  errorJson: string | null
  idempotencyKey: string | null
  correlationId: string | null
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}): EvalRun {
  return {
    id: record.id,
    evalTargetId: record.evalTargetId,
    targetType: record.targetType as EvalRun['targetType'],
    targetId: record.targetId,
    evaluatorId: record.evaluatorId as EvalRun['evaluatorId'],
    evaluatorMode: record.evaluatorMode as EvalRun['evaluatorMode'],
    status: record.status as EvalRun['status'],
    trigger: record.trigger as EvalRun['trigger'],
    checksSummary: decodeJson(record.checksSummaryJson, {
      total: 0,
      passed: 0,
      warned: 0,
      failed: 0,
      blocked: 0,
    }),
    qualityGateDecision: decodeJson(record.qualityGateDecisionJson, undefined),
    inputSnapshot: decodeJson(record.inputSnapshotJson, null),
    outputSnapshot: decodeJson(record.outputSnapshotJson, undefined),
    error: decodeJson(record.errorJson, undefined),
    idempotencyKey: record.idempotencyKey ?? undefined,
    correlationId: record.correlationId ?? undefined,
    startedAt: dateToString(record.startedAt),
    completedAt: dateToString(record.completedAt),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export function serializeEvalCheck(record: {
  id: string
  evalRunId: string
  evalTargetId: string
  checkKey: string
  title: string
  category: string
  status: string
  severity: string
  confidence: number
  targetPath: string | null
  targetField: string | null
  evidenceJson: string
  evidenceRefsJson: string | null
  recommendation: string | null
  createdAt: Date
}): EvalCheck {
  return {
    id: record.id,
    evalRunId: record.evalRunId,
    evalTargetId: record.evalTargetId,
    checkKey: record.checkKey,
    title: record.title,
    category: record.category as EvalCheck['category'],
    layer: assignLayer(record.checkKey, record.title),
    status: record.status as EvalCheck['status'],
    severity: record.severity as EvalCheck['severity'],
    confidence: record.confidence,
    targetPath: record.targetPath ?? undefined,
    targetField: record.targetField ?? undefined,
    evidence: decodeJson(record.evidenceJson, [] as string[]),
    evidenceRefs: decodeJson(record.evidenceRefsJson, undefined),
    recommendation: record.recommendation ?? undefined,
    createdAt: record.createdAt.toISOString(),
  }
}

export function serializeEvalFinding(record: {
  id: string
  evalRunId: string
  evalTargetId: string
  relatedCheckIdsJson: string
  severity: string
  category: string
  title: string
  description: string
  targetPath: string | null
  targetField: string | null
  evidenceJson: string
  evidenceRefsJson: string | null
  recommendation: string
  status: string
  needsHumanReview: boolean
  confirmationArtifactId: string | null
  reviewedBy: string | null
  reviewedAt: Date | null
  reviewDecision: string | null
  reviewReason: string | null
  createdAt: Date
  updatedAt: Date
}): EvalFinding {
  return {
    id: record.id,
    evalRunId: record.evalRunId,
    evalTargetId: record.evalTargetId,
    relatedCheckIds: decodeJson(record.relatedCheckIdsJson, [] as string[]),
    severity: record.severity as EvalFinding['severity'],
    category: record.category as EvalFinding['category'],
    title: record.title,
    description: record.description,
    targetPath: record.targetPath ?? undefined,
    targetField: record.targetField ?? undefined,
    evidence: decodeJson(record.evidenceJson, [] as string[]),
    evidenceRefs: decodeJson(record.evidenceRefsJson, undefined),
    recommendation: record.recommendation,
    status: record.status as EvalFinding['status'],
    needsHumanReview: record.needsHumanReview,
    confirmationArtifactId: record.confirmationArtifactId ?? undefined,
    reviewedBy: record.reviewedBy ?? undefined,
    reviewedAt: dateToString(record.reviewedAt),
    reviewDecision: record.reviewDecision as EvalFinding['reviewDecision'],
    reviewReason: record.reviewReason ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}
