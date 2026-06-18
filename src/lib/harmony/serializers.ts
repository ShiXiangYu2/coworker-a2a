import type {
  HarmonyAuditEvent,
  HarmonyConfirmationArtifact,
  HarmonyTask,
  HarmonyTaskRun,
  HarmonyTaskStep,
} from './types'

export function encodeJson(value: unknown): string {
  return JSON.stringify(value ?? null)
}

export function decodeJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function dateToString(value: Date | null | undefined): string | undefined {
  return value ? value.toISOString() : undefined
}

export function serializeTask(record: {
  id: string
  idempotencyKey: string | null
  conversationId: string | null
  sourceMessageId: string | null
  sourceMessageText: string
  title: string
  description: string
  type: string
  status: string
  routeDecisionType: string
  routeStatus: string
  targetAgentId: string | null
  confidence: number
  reason: string
  statusReason: string | null
  matchedSignalsJson: string
  routeDecisionSnapshotJson: string
  requiresHumanConfirmation: boolean
  sideEffectsJson: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}): HarmonyTask {
  return {
    id: record.id,
    idempotencyKey: record.idempotencyKey ?? undefined,
    conversationId: record.conversationId ?? undefined,
    sourceMessageId: record.sourceMessageId ?? undefined,
    sourceMessageText: record.sourceMessageText,
    title: record.title,
    description: record.description,
    type: record.type as HarmonyTask['type'],
    status: record.status as HarmonyTask['status'],
    routeDecisionType: record.routeDecisionType as HarmonyTask['routeDecisionType'],
    routeStatus: record.routeStatus as HarmonyTask['routeStatus'],
    targetAgentId: record.targetAgentId as HarmonyTask['targetAgentId'],
    confidence: record.confidence,
    reason: record.reason,
    statusReason: record.statusReason ?? undefined,
    matchedSignals: decodeJson(record.matchedSignalsJson, [] as string[]),
    routeDecisionSnapshot: decodeJson(
      record.routeDecisionSnapshotJson,
      undefined as never
    ),
    requiresHumanConfirmation: record.requiresHumanConfirmation,
    sideEffects: decodeJson(record.sideEffectsJson, {
      filesChanged: [],
      branchesCreated: [],
      prsCreated: [],
      issuesUpdated: [],
    }),
    createdBy: record.createdBy as HarmonyTask['createdBy'],
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export function serializeTaskRun(record: {
  id: string
  taskId: string
  status: string
  trigger: string
  attempt: number
  runtimeKind: string
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}): HarmonyTaskRun {
  return {
    id: record.id,
    taskId: record.taskId,
    status: record.status as HarmonyTaskRun['status'],
    trigger: record.trigger as HarmonyTaskRun['trigger'],
    attempt: record.attempt,
    runtimeKind: record.runtimeKind as HarmonyTaskRun['runtimeKind'],
    startedAt: dateToString(record.startedAt),
    completedAt: dateToString(record.completedAt),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export function serializeTaskStep(record: {
  id: string
  taskId: string
  taskRunId: string
  index: number
  kind: string
  status: string
  agentId: string | null
  summary: string
  inputJson: string
  outputJson: string | null
  confidence: number | null
  nextRecommendedAction: string | null
  sideEffectsJson: string
  createdAt: Date
  updatedAt: Date
}): HarmonyTaskStep {
  return {
    id: record.id,
    taskId: record.taskId,
    taskRunId: record.taskRunId,
    index: record.index,
    kind: record.kind as HarmonyTaskStep['kind'],
    status: record.status as HarmonyTaskStep['status'],
    agentId: record.agentId as HarmonyTaskStep['agentId'],
    summary: record.summary,
    input: decodeJson(record.inputJson, null),
    output: decodeJson(record.outputJson, undefined),
    confidence: record.confidence ?? undefined,
    nextRecommendedAction:
      record.nextRecommendedAction as HarmonyTaskStep['nextRecommendedAction'],
    sideEffects: decodeJson(record.sideEffectsJson, {
      filesChanged: [],
      branchesCreated: [],
      prsCreated: [],
      issuesUpdated: [],
    }),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export function serializeAuditEvent(record: {
  id: string
  correlationId: string | null
  taskId: string | null
  taskRunId: string | null
  taskStepId: string | null
  eventType: string
  actorType: string
  actorId: string | null
  beforeStatus: string | null
  afterStatus: string | null
  reason: string
  payloadJson: string | null
  createdAt: Date
}): HarmonyAuditEvent {
  return {
    id: record.id,
    correlationId: record.correlationId ?? undefined,
    taskId: record.taskId ?? undefined,
    taskRunId: record.taskRunId ?? undefined,
    taskStepId: record.taskStepId ?? undefined,
    eventType: record.eventType as HarmonyAuditEvent['eventType'],
    actorType: record.actorType as HarmonyAuditEvent['actorType'],
    actorId: record.actorId ?? undefined,
    beforeStatus: record.beforeStatus ?? undefined,
    afterStatus: record.afterStatus ?? undefined,
    reason: record.reason,
    payload: decodeJson(record.payloadJson, undefined),
    createdAt: record.createdAt.toISOString(),
  }
}

export function serializeConfirmation(record: {
  id: string
  taskId: string
  status: string
  action: string
  reason: string
  requiresHumanOwner: boolean
  mustReviewJson: string
  forbiddenRuntimeActionsJson: string
  approvedBy: string | null
  approvedAt: Date | null
  decisionReason: string | null
  expiresAt: Date | null
  payloadJson: string
  createdAt: Date
  updatedAt: Date
}): HarmonyConfirmationArtifact {
  return {
    id: record.id,
    taskId: record.taskId,
    status: record.status as HarmonyConfirmationArtifact['status'],
    action: record.action as HarmonyConfirmationArtifact['action'],
    reason: record.reason,
    requiresHumanOwner: true,
    mustReview: decodeJson(record.mustReviewJson, [] as string[]),
    forbiddenRuntimeActions: decodeJson(
      record.forbiddenRuntimeActionsJson,
      [] as string[]
    ),
    approvedBy: record.approvedBy ?? undefined,
    approvedAt: dateToString(record.approvedAt),
    decisionReason: record.decisionReason ?? undefined,
    expiresAt: dateToString(record.expiresAt),
    payload: decodeJson(record.payloadJson, null),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}
