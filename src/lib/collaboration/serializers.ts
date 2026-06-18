import { decodeJson } from '@/lib/harmony/serializers'
import type {
  A2AThread,
  A2ATurn,
  CollaborationDecision,
  CollaborationSession,
  HandoffRequest,
} from './types'

function dateToString(value: Date | null | undefined): string | undefined {
  return value ? value.toISOString() : undefined
}

export function serializeCollaborationSession(record: {
  id: string
  idempotencyKey: string | null
  correlationId: string
  taskId: string | null
  sourceA2AMessageId: string | null
  sourceAgentRunId: string | null
  sourceEvalRunId: string | null
  teamId: string | null
  status: string
  objective: string
  summary: string | null
  riskLevel: string
  requiresHumanConfirmation: boolean
  participantsJson: string
  planJson: string
  confirmationArtifactId: string | null
  supersedesCollaborationSessionId: string | null
  supersededByCollaborationSessionId: string | null
  createdBy: string
  createdAt: Date
  updatedAt: Date
}): CollaborationSession {
  return {
    id: record.id,
    idempotencyKey: record.idempotencyKey ?? undefined,
    correlationId: record.correlationId,
    taskId: record.taskId ?? undefined,
    sourceA2AMessageId: record.sourceA2AMessageId ?? undefined,
    sourceAgentRunId: record.sourceAgentRunId ?? undefined,
    sourceEvalRunId: record.sourceEvalRunId ?? undefined,
    teamId: record.teamId ?? undefined,
    status: record.status as CollaborationSession['status'],
    objective: record.objective,
    summary: record.summary ?? undefined,
    riskLevel: record.riskLevel as CollaborationSession['riskLevel'],
    requiresHumanConfirmation: record.requiresHumanConfirmation,
    participants: decodeJson(record.participantsJson, []),
    plan: decodeJson(record.planJson, undefined as never),
    confirmationArtifactId: record.confirmationArtifactId ?? undefined,
    supersedesCollaborationSessionId: record.supersedesCollaborationSessionId ?? undefined,
    supersededByCollaborationSessionId: record.supersededByCollaborationSessionId ?? undefined,
    createdBy: record.createdBy as CollaborationSession['createdBy'],
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export function serializeA2AThread(record: {
  id: string
  idempotencyKey: string | null
  correlationId: string
  collaborationSessionId: string
  taskId: string | null
  status: string
  topic: string
  purpose: string
  participantAgentIdsJson: string
  latestTurnSeq: number
  createdBy: string
  createdAt: Date
  updatedAt: Date
}): A2AThread {
  return {
    id: record.id,
    idempotencyKey: record.idempotencyKey ?? undefined,
    correlationId: record.correlationId,
    collaborationSessionId: record.collaborationSessionId,
    taskId: record.taskId ?? undefined,
    status: record.status as A2AThread['status'],
    topic: record.topic,
    purpose: record.purpose as A2AThread['purpose'],
    participantAgentIds: decodeJson(record.participantAgentIdsJson, []),
    latestTurnSeq: record.latestTurnSeq,
    createdBy: record.createdBy as A2AThread['createdBy'],
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export function serializeA2ATurn(record: {
  id: string
  idempotencyKey: string | null
  correlationId: string
  collaborationSessionId: string
  threadId: string
  taskId: string | null
  sourceA2AMessageId: string | null
  sourceAgentRunId: string | null
  seq: number
  speakerAgentId: string
  audienceAgentIdsJson: string
  turnType: string
  status: string
  title: string
  body: string
  inputSnapshotJson: string | null
  outputSnapshotJson: string | null
  riskLevel: string
  requiresHumanConfirmation: boolean
  confirmationArtifactId: string | null
  createdBy: string
  createdAt: Date
  updatedAt: Date
}): A2ATurn {
  return {
    id: record.id,
    idempotencyKey: record.idempotencyKey ?? undefined,
    correlationId: record.correlationId,
    collaborationSessionId: record.collaborationSessionId,
    threadId: record.threadId,
    taskId: record.taskId ?? undefined,
    sourceA2AMessageId: record.sourceA2AMessageId ?? undefined,
    sourceAgentRunId: record.sourceAgentRunId ?? undefined,
    seq: record.seq,
    speakerAgentId: record.speakerAgentId as A2ATurn['speakerAgentId'],
    audienceAgentIds: decodeJson(record.audienceAgentIdsJson, []),
    turnType: record.turnType as A2ATurn['turnType'],
    status: record.status as A2ATurn['status'],
    title: record.title,
    body: record.body,
    inputSnapshot: decodeJson(record.inputSnapshotJson, undefined),
    outputSnapshot: decodeJson(record.outputSnapshotJson, undefined),
    riskLevel: record.riskLevel as A2ATurn['riskLevel'],
    requiresHumanConfirmation: record.requiresHumanConfirmation,
    confirmationArtifactId: record.confirmationArtifactId ?? undefined,
    createdBy: record.createdBy as A2ATurn['createdBy'],
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export function serializeHandoffRequest(record: {
  id: string
  idempotencyKey: string | null
  correlationId: string
  collaborationSessionId: string
  threadId: string | null
  taskId: string | null
  sourceA2AMessageId: string | null
  sourceTurnId: string | null
  fromAgentId: string
  toAgentId: string
  status: string
  handoffType: string
  reason: string
  requestedScope: string
  expectedOutput: string
  contextRefsJson: string
  riskLevel: string
  requiresHumanConfirmation: boolean
  confirmationArtifactId: string | null
  createdBy: string
  reviewedBy: string | null
  reviewedAt: Date | null
  rejectionReason: string | null
  createdAt: Date
  updatedAt: Date
}): HandoffRequest {
  return {
    id: record.id,
    idempotencyKey: record.idempotencyKey ?? undefined,
    correlationId: record.correlationId,
    collaborationSessionId: record.collaborationSessionId,
    threadId: record.threadId ?? undefined,
    taskId: record.taskId ?? undefined,
    sourceA2AMessageId: record.sourceA2AMessageId ?? undefined,
    sourceTurnId: record.sourceTurnId ?? undefined,
    fromAgentId: record.fromAgentId as HandoffRequest['fromAgentId'],
    toAgentId: record.toAgentId as HandoffRequest['toAgentId'],
    status: record.status as HandoffRequest['status'],
    handoffType: record.handoffType as HandoffRequest['handoffType'],
    reason: record.reason,
    requestedScope: record.requestedScope,
    expectedOutput: record.expectedOutput,
    contextRefs: decodeJson(record.contextRefsJson, {}),
    riskLevel: record.riskLevel as HandoffRequest['riskLevel'],
    requiresHumanConfirmation: record.requiresHumanConfirmation,
    confirmationArtifactId: record.confirmationArtifactId ?? undefined,
    createdBy: record.createdBy as HandoffRequest['createdBy'],
    reviewedBy: record.reviewedBy ?? undefined,
    reviewedAt: dateToString(record.reviewedAt),
    rejectionReason: record.rejectionReason ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export function serializeCollaborationDecision(record: {
  id: string
  idempotencyKey: string | null
  correlationId: string
  collaborationSessionId: string
  threadId: string | null
  taskId: string | null
  status: string
  decisionType: string
  title: string
  rationale: string
  recommendation: string
  decisionInputsJson: string
  riskLevel: string
  requiresHumanConfirmation: boolean
  confirmationArtifactId: string | null
  createdBy: string
  reviewedBy: string | null
  reviewedAt: Date | null
  rejectionReason: string | null
  createdAt: Date
  updatedAt: Date
}): CollaborationDecision {
  return {
    id: record.id,
    idempotencyKey: record.idempotencyKey ?? undefined,
    correlationId: record.correlationId,
    collaborationSessionId: record.collaborationSessionId,
    threadId: record.threadId ?? undefined,
    taskId: record.taskId ?? undefined,
    status: record.status as CollaborationDecision['status'],
    decisionType: record.decisionType as CollaborationDecision['decisionType'],
    title: record.title,
    rationale: record.rationale,
    recommendation: record.recommendation,
    decisionInputs: decodeJson(record.decisionInputsJson, {}),
    riskLevel: record.riskLevel as CollaborationDecision['riskLevel'],
    requiresHumanConfirmation: record.requiresHumanConfirmation,
    confirmationArtifactId: record.confirmationArtifactId ?? undefined,
    createdBy: record.createdBy as CollaborationDecision['createdBy'],
    reviewedBy: record.reviewedBy ?? undefined,
    reviewedAt: dateToString(record.reviewedAt),
    rejectionReason: record.rejectionReason ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

