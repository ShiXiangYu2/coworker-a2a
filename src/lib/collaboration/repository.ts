import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { encodeJson } from '@/lib/harmony/serializers'
import { getA2AMessage } from '@/lib/memory/repository'
import { createObservabilityEvent } from '@/lib/observability/repository'
import { appendRunJournal } from '@/lib/observability/repository'
import { inheritCorrelationId } from '@/lib/observability/rules'
import { agentTeams, getAgentTeam } from './registry'
import {
  assertLocalRecordOnly,
  buildCeoCollaborationPlan,
  buildDefaultParticipants,
  mapA2AMessageToSessionDraft,
  nextTurnSeq,
  requiresKelvinReview,
  sanitizeCollaborationSnapshot,
} from './rules'
import {
  serializeA2AThread,
  serializeA2ATurn,
  serializeCollaborationDecision,
  serializeCollaborationSession,
  serializeHandoffRequest,
} from './serializers'
import {
  transitionA2AThread,
  transitionA2ATurn,
  transitionCollaborationDecision,
  transitionCollaborationSession,
  transitionHandoffRequest,
} from './state-machine'
import type {
  A2AThread,
  A2AThreadEvent,
  A2ATurn,
  A2ATurnEvent,
  CollaborationDecision,
  CollaborationDecisionEvent,
  CollaborationSession,
  CollaborationSessionEvent,
  HandoffRequest,
  HandoffRequestEvent,
  RiskLevel,
} from './types'

type RawSession = Parameters<typeof serializeCollaborationSession>[0]
type RawThread = Parameters<typeof serializeA2AThread>[0]
type RawTurn = Parameters<typeof serializeA2ATurn>[0]
type RawHandoff = Parameters<typeof serializeHandoffRequest>[0]
type RawDecision = Parameters<typeof serializeCollaborationDecision>[0]

export class CollaborationRepositoryError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message)
    this.name = 'CollaborationRepositoryError'
  }
}

export function listAgentTeams() {
  return agentTeams
}

export function getStaticAgentTeam(id: string) {
  return getAgentTeam(id)
}

export async function createCollaborationSessionFromTask(input: {
  taskId: string
  objective?: string
  summary?: string
  teamId?: string
  idempotencyKey?: string
  sourceAgentRunId?: string
  sourceEvalRunId?: string
  createdBy?: 'human' | 'system' | 'agent_record'
  sourceSnapshot?: unknown
}): Promise<{ collaborationSession: CollaborationSession; auditEvents: unknown[]; observabilityEvents: unknown[] }> {
  if (input.idempotencyKey) {
    const existing = await findSessionByIdempotencyKey(input.idempotencyKey)
    if (existing) return { collaborationSession: existing, auditEvents: [], observabilityEvents: [] }
  }

  const task = await findTask(input.taskId)
  if (!task) throw new CollaborationRepositoryError('Task not found.', 404)
  const teamId = input.teamId ?? 'default_company_team'
  if (!getAgentTeam(teamId)) throw new CollaborationRepositoryError('AgentTeam not found.', 404)
  const objective = input.objective ?? task.title
  const correlationId = inheritCorrelationId(task.correlationId, task.id)
  const plan = buildCeoCollaborationPlan({
    objective,
    sourceSnapshot: input.sourceSnapshot ?? {
      taskId: task.id,
      title: task.title,
      status: task.status,
      targetAgentId: task.targetAgentId,
    },
  })

  return createSession({
    idempotencyKey: input.idempotencyKey,
    correlationId,
    taskId: task.id,
    sourceAgentRunId: input.sourceAgentRunId,
    sourceEvalRunId: input.sourceEvalRunId,
    teamId,
    objective,
    summary: input.summary ?? task.description,
    riskLevel: 'medium',
    requiresHumanConfirmation: true,
    participants: buildDefaultParticipants(),
    plan,
    createdBy: input.createdBy ?? 'human',
    eventReason: 'CollaborationSession draft created from Task as a local record. No Agent was started.',
  })
}

export async function createCollaborationSessionFromA2AMessage(input: {
  a2aMessageId: string
  teamId?: string
  idempotencyKey?: string
  createdBy?: 'human' | 'system' | 'agent_record'
}): Promise<{ collaborationSession: CollaborationSession; auditEvents: unknown[]; observabilityEvents: unknown[] }> {
  if (input.idempotencyKey) {
    const existing = await findSessionByIdempotencyKey(input.idempotencyKey)
    if (existing) return { collaborationSession: existing, auditEvents: [], observabilityEvents: [] }
  }
  const message = await getA2AMessage(input.a2aMessageId)
  if (!message) throw new CollaborationRepositoryError('A2AMessage not found.', 404)
  const mapped = mapA2AMessageToSessionDraft(message)
  const teamId = input.teamId ?? 'default_company_team'
  if (!getAgentTeam(teamId)) throw new CollaborationRepositoryError('AgentTeam not found.', 404)
  const correlationId = inheritCorrelationId(message.taskId, message.id)

  return createSession({
    idempotencyKey: input.idempotencyKey,
    correlationId,
    taskId: message.taskId,
    sourceA2AMessageId: message.id,
    sourceAgentRunId: message.agentRunId,
    teamId,
    objective: mapped.objective,
    summary: mapped.summary,
    riskLevel: mapped.riskLevel,
    requiresHumanConfirmation: true,
    participants: mapped.participants,
    plan: mapped.plan,
    createdBy: input.createdBy ?? 'human',
    eventReason: 'CollaborationSession draft created from A2AMessage approved_record by explicit user action. No message was sent.',
  })
}

export async function listCollaborationSessions(filters: {
  taskId?: string
  sourceAgentRunId?: string
  sourceA2AMessageId?: string
  sourceEvalRunId?: string
  status?: string
} = {}): Promise<CollaborationSession[]> {
  const rows = await prisma.$queryRaw<RawSession[]>`
    SELECT * FROM collaboration_sessions
    WHERE (${filters.taskId ?? null} IS NULL OR taskId = ${filters.taskId ?? null})
      AND (${filters.sourceAgentRunId ?? null} IS NULL OR sourceAgentRunId = ${filters.sourceAgentRunId ?? null})
      AND (${filters.sourceA2AMessageId ?? null} IS NULL OR sourceA2AMessageId = ${filters.sourceA2AMessageId ?? null})
      AND (${filters.sourceEvalRunId ?? null} IS NULL OR sourceEvalRunId = ${filters.sourceEvalRunId ?? null})
      AND (${filters.status ?? null} IS NULL OR status = ${filters.status ?? null})
    ORDER BY createdAt DESC
  `
  return rows.map(serializeCollaborationSession)
}

export async function getCollaborationSession(id: string): Promise<CollaborationSession | null> {
  const rows = await prisma.$queryRaw<RawSession[]>`
    SELECT * FROM collaboration_sessions WHERE id = ${id} LIMIT 1
  `
  return rows[0] ? serializeCollaborationSession(rows[0]) : null
}

export async function updateCollaborationSessionStatus(
  id: string,
  event: CollaborationSessionEvent,
  reason: string
): Promise<{ collaborationSession: CollaborationSession; auditEvents: unknown[]; observabilityEvents: unknown[] }> {
  assertLocalRecordOnly(event === 'OPEN_RECORD' ? 'open local collaboration record' : event)
  const session = await mustGetSession(id)
  const nextStatus = transitionCollaborationSession(session.status, event)
  const auditEvents = await updateStatus({
    table: 'collaboration_sessions',
    id,
    taskId: session.taskId,
    correlationId: session.correlationId,
    eventType: sessionEventType(nextStatus),
    actorType: event === 'OPEN_RECORD' ? 'kelvin' : 'user',
    beforeStatus: session.status,
    afterStatus: nextStatus,
    reason: `${reason} Local collaboration record only; no AgentRun, A2ATurn, ToolCall, ToolRun, or Task status mutation.`,
    payload: { collaborationSessionId: id },
  })
  const observabilityEvents = [await observe(session.correlationId, 'collaboration_session', id, sessionEventType(nextStatus), reason)]
  await journal(session.correlationId, id, sessionEventType(nextStatus), session.status, nextStatus, auditEvents[0])
  const updated = await mustGetSession(id)
  return { collaborationSession: updated, auditEvents, observabilityEvents }
}

export async function createA2AThread(input: {
  collaborationSessionId: string
  topic: string
  purpose?: A2AThread['purpose']
  participantAgentIds?: A2AThread['participantAgentIds']
  idempotencyKey?: string
  createdBy?: A2AThread['createdBy']
}): Promise<{ a2aThread: A2AThread; auditEvents: unknown[]; observabilityEvents: unknown[] }> {
  if (input.idempotencyKey) {
    const existing = await findThreadByIdempotencyKey(input.idempotencyKey)
    if (existing) return { a2aThread: existing, auditEvents: [], observabilityEvents: [] }
  }
  const session = await mustGetSession(input.collaborationSessionId)
  const id = randomUUID()
  await prisma.$executeRaw`
    INSERT INTO a2a_threads (
      id, idempotencyKey, correlationId, collaborationSessionId, taskId, status,
      topic, purpose, participantAgentIdsJson, latestTurnSeq, createdBy, createdAt, updatedAt
    ) VALUES (
      ${id}, ${input.idempotencyKey ?? null}, ${session.correlationId}, ${session.id},
      ${session.taskId ?? null}, ${'draft'}, ${input.topic}, ${input.purpose ?? 'planning'},
      ${encodeJson(input.participantAgentIds ?? session.participants.map((p) => p.agentId))},
      ${0}, ${input.createdBy ?? 'human'}, ${new Date()}, ${new Date()}
    )
  `
  const auditEvents = await audit({
    correlationId: session.correlationId,
    taskId: session.taskId,
    eventType: 'a2a_thread.created',
    actorType: 'user',
    afterStatus: 'draft',
    reason: 'A2AThread local record created. No A2A message was sent or dispatched.',
    payload: { a2aThreadId: id, collaborationSessionId: session.id },
  })
  const observabilityEvents = [await observe(session.correlationId, 'a2a_thread', id, 'a2a_thread.created', 'A2AThread local record created.')]
  await journal(session.correlationId, id, 'a2a_thread.created', undefined, 'draft', auditEvents[0])
  const thread = await mustGetThread(id)
  return { a2aThread: thread, auditEvents, observabilityEvents }
}

export async function getA2AThread(id: string): Promise<A2AThread | null> {
  const rows = await prisma.$queryRaw<RawThread[]>`
    SELECT * FROM a2a_threads WHERE id = ${id} LIMIT 1
  `
  return rows[0] ? serializeA2AThread(rows[0]) : null
}

export async function listA2AThreads(filters: { collaborationSessionId?: string; taskId?: string } = {}): Promise<A2AThread[]> {
  const rows = await prisma.$queryRaw<RawThread[]>`
    SELECT * FROM a2a_threads
    WHERE (${filters.collaborationSessionId ?? null} IS NULL OR collaborationSessionId = ${filters.collaborationSessionId ?? null})
      AND (${filters.taskId ?? null} IS NULL OR taskId = ${filters.taskId ?? null})
    ORDER BY createdAt DESC
  `
  return rows.map(serializeA2AThread)
}

export async function updateA2AThreadStatus(id: string, event: A2AThreadEvent, reason: string) {
  const thread = await mustGetThread(id)
  const nextStatus = transitionA2AThread(thread.status, event)
  const auditEvents = await updateStatus({
    table: 'a2a_threads',
    id,
    taskId: thread.taskId,
    correlationId: thread.correlationId,
    eventType: threadEventType(nextStatus),
    actorType: 'user',
    beforeStatus: thread.status,
    afterStatus: nextStatus,
    reason: `${reason} Local thread record only; no dispatch or autonomous next turn.`,
    payload: { a2aThreadId: id, collaborationSessionId: thread.collaborationSessionId },
  })
  const observabilityEvents = [await observe(thread.correlationId, 'a2a_thread', id, threadEventType(nextStatus), reason)]
  await journal(thread.correlationId, id, threadEventType(nextStatus), thread.status, nextStatus, auditEvents[0])
  return { a2aThread: await mustGetThread(id), auditEvents, observabilityEvents }
}

export async function createA2ATurn(input: {
  collaborationSessionId: string
  threadId: string
  speakerAgentId: A2ATurn['speakerAgentId']
  audienceAgentIds: A2ATurn['audienceAgentIds']
  turnType?: A2ATurn['turnType']
  title: string
  body: string
  sourceA2AMessageId?: string
  sourceAgentRunId?: string
  inputSnapshot?: unknown
  outputSnapshot?: unknown
  riskLevel?: RiskLevel
  idempotencyKey?: string
  createdBy?: A2ATurn['createdBy']
}) {
  if (input.idempotencyKey) {
    const existing = await findTurnByIdempotencyKey(input.idempotencyKey)
    if (existing) return { a2aTurn: existing, auditEvents: [], observabilityEvents: [] }
  }
  const session = await mustGetSession(input.collaborationSessionId)
  const thread = await mustGetThread(input.threadId)
  if (thread.collaborationSessionId !== session.id) throw new CollaborationRepositoryError('A2AThread does not belong to CollaborationSession.')
  const existingTurns = await listA2ATurns({ threadId: thread.id })
  const seq = nextTurnSeq(existingTurns)
  const riskLevel = input.riskLevel ?? (requiresKelvinReview('medium', `${input.title} ${input.body}`) ? 'high' : 'medium')
  const id = randomUUID()
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO a2a_turns (
        id, idempotencyKey, correlationId, collaborationSessionId, threadId, taskId,
        sourceA2AMessageId, sourceAgentRunId, seq, speakerAgentId, audienceAgentIdsJson,
        turnType, status, title, body, inputSnapshotJson, outputSnapshotJson, riskLevel,
        requiresHumanConfirmation, confirmationArtifactId, createdBy, createdAt, updatedAt
      ) VALUES (
        ${id}, ${input.idempotencyKey ?? null}, ${session.correlationId}, ${session.id},
        ${thread.id}, ${session.taskId ?? null}, ${input.sourceA2AMessageId ?? null},
        ${input.sourceAgentRunId ?? null}, ${seq}, ${input.speakerAgentId},
        ${encodeJson(input.audienceAgentIds)}, ${input.turnType ?? 'human_note'}, ${'draft'},
        ${input.title}, ${input.body},
        ${input.inputSnapshot === undefined ? null : encodeJson(sanitizeCollaborationSnapshot(input.inputSnapshot))},
        ${input.outputSnapshot === undefined ? null : encodeJson(sanitizeCollaborationSnapshot(input.outputSnapshot))},
        ${riskLevel}, ${requiresKelvinReview(riskLevel, `${input.title} ${input.body}`)},
        ${null}, ${input.createdBy ?? 'human'}, ${new Date()}, ${new Date()}
      )
    `
    await tx.$executeRaw`
      UPDATE a2a_threads SET latestTurnSeq = ${seq}, updatedAt = ${new Date()} WHERE id = ${thread.id}
    `
  })
  const auditEvents = await audit({
    correlationId: session.correlationId,
    taskId: session.taskId,
    eventType: 'a2a_turn.created',
    actorType: 'user',
    afterStatus: 'draft',
    reason: 'A2ATurn local record created. It was not sent, dispatched, or used to continue an autonomous loop.',
    payload: { a2aTurnId: id, a2aThreadId: thread.id, collaborationSessionId: session.id },
  })
  const observabilityEvents = [await observe(session.correlationId, 'a2a_turn', id, 'a2a_turn.created', 'A2ATurn local record created.')]
  await journal(session.correlationId, id, 'a2a_turn.created', undefined, 'draft', auditEvents[0])
  return { a2aTurn: await mustGetTurn(id), auditEvents, observabilityEvents }
}

export async function listA2ATurns(filters: { threadId?: string; collaborationSessionId?: string } = {}): Promise<A2ATurn[]> {
  const rows = await prisma.$queryRaw<RawTurn[]>`
    SELECT * FROM a2a_turns
    WHERE (${filters.threadId ?? null} IS NULL OR threadId = ${filters.threadId ?? null})
      AND (${filters.collaborationSessionId ?? null} IS NULL OR collaborationSessionId = ${filters.collaborationSessionId ?? null})
    ORDER BY seq ASC
  `
  return rows.map(serializeA2ATurn)
}

export async function getA2ATurn(id: string): Promise<A2ATurn | null> {
  const rows = await prisma.$queryRaw<RawTurn[]>`SELECT * FROM a2a_turns WHERE id = ${id} LIMIT 1`
  return rows[0] ? serializeA2ATurn(rows[0]) : null
}

export async function updateA2ATurnStatus(id: string, event: A2ATurnEvent, reason: string) {
  const turn = await mustGetTurn(id)
  const nextStatus = transitionA2ATurn(turn.status, event)
  const auditEvents = await updateStatus({
    table: 'a2a_turns',
    id,
    taskId: turn.taskId,
    correlationId: turn.correlationId,
    eventType: turnEventType(nextStatus),
    actorType: nextStatus === 'approved_record' || nextStatus === 'rejected' ? 'kelvin' : 'user',
    beforeStatus: turn.status,
    afterStatus: nextStatus,
    reason: `${reason} Approval changes the local A2ATurn record only; no message is sent and no next turn is created.`,
    payload: { a2aTurnId: id, a2aThreadId: turn.threadId, collaborationSessionId: turn.collaborationSessionId },
  })
  const observabilityEvents = [await observe(turn.correlationId, 'a2a_turn', id, turnEventType(nextStatus), reason)]
  await journal(turn.correlationId, id, turnEventType(nextStatus), turn.status, nextStatus, auditEvents[0])
  return { a2aTurn: await mustGetTurn(id), auditEvents, observabilityEvents }
}

export async function createHandoffRequest(input: {
  collaborationSessionId: string
  threadId?: string
  sourceA2AMessageId?: string
  sourceTurnId?: string
  fromAgentId: HandoffRequest['fromAgentId']
  toAgentId: HandoffRequest['toAgentId']
  handoffType: HandoffRequest['handoffType']
  reason: string
  requestedScope: string
  expectedOutput: string
  contextRefs?: HandoffRequest['contextRefs']
  riskLevel?: RiskLevel
  idempotencyKey?: string
  createdBy?: HandoffRequest['createdBy']
}) {
  if (input.idempotencyKey) {
    const existing = await findHandoffByIdempotencyKey(input.idempotencyKey)
    if (existing) return { handoffRequest: existing, auditEvents: [], observabilityEvents: [] }
  }
  const session = await mustGetSession(input.collaborationSessionId)
  const riskLevel = input.riskLevel ?? (requiresKelvinReview('medium', input.reason) ? 'high' : 'medium')
  const id = randomUUID()
  await prisma.$executeRaw`
    INSERT INTO handoff_requests (
      id, idempotencyKey, correlationId, collaborationSessionId, threadId, taskId,
      sourceA2AMessageId, sourceTurnId, fromAgentId, toAgentId, status, handoffType,
      reason, requestedScope, expectedOutput, contextRefsJson, riskLevel,
      requiresHumanConfirmation, confirmationArtifactId, createdBy, reviewedBy,
      reviewedAt, rejectionReason, createdAt, updatedAt
    ) VALUES (
      ${id}, ${input.idempotencyKey ?? null}, ${session.correlationId}, ${session.id},
      ${input.threadId ?? null}, ${session.taskId ?? null}, ${input.sourceA2AMessageId ?? null},
      ${input.sourceTurnId ?? null}, ${input.fromAgentId}, ${input.toAgentId}, ${'draft'},
      ${input.handoffType}, ${input.reason}, ${input.requestedScope}, ${input.expectedOutput},
      ${encodeJson(input.contextRefs ?? {})}, ${riskLevel},
      ${requiresKelvinReview(riskLevel, `${input.reason} ${input.requestedScope}`)},
      ${null}, ${input.createdBy ?? 'human'}, ${null}, ${null}, ${null}, ${new Date()}, ${new Date()}
    )
  `
  const auditEvents = await audit({
    correlationId: session.correlationId,
    taskId: session.taskId,
    eventType: 'handoff.created',
    actorType: 'user',
    afterStatus: 'draft',
    reason: 'HandoffRequest local record created. It does not start the target Agent.',
    payload: { handoffRequestId: id, collaborationSessionId: session.id },
  })
  const observabilityEvents = [await observe(session.correlationId, 'handoff_request', id, 'handoff.created', 'HandoffRequest local record created.')]
  await journal(session.correlationId, id, 'handoff.created', undefined, 'draft', auditEvents[0])
  return { handoffRequest: await mustGetHandoff(id), auditEvents, observabilityEvents }
}

export async function listHandoffRequests(filters: { collaborationSessionId?: string; threadId?: string } = {}): Promise<HandoffRequest[]> {
  const rows = await prisma.$queryRaw<RawHandoff[]>`
    SELECT * FROM handoff_requests
    WHERE (${filters.collaborationSessionId ?? null} IS NULL OR collaborationSessionId = ${filters.collaborationSessionId ?? null})
      AND (${filters.threadId ?? null} IS NULL OR threadId = ${filters.threadId ?? null})
    ORDER BY createdAt DESC
  `
  return rows.map(serializeHandoffRequest)
}

export async function getHandoffRequest(id: string): Promise<HandoffRequest | null> {
  const rows = await prisma.$queryRaw<RawHandoff[]>`SELECT * FROM handoff_requests WHERE id = ${id} LIMIT 1`
  return rows[0] ? serializeHandoffRequest(rows[0]) : null
}

export async function updateHandoffRequestStatus(id: string, event: HandoffRequestEvent, reason: string) {
  const handoff = await mustGetHandoff(id)
  const nextStatus = transitionHandoffRequest(handoff.status, event)
  await prisma.$executeRaw`
    UPDATE handoff_requests
    SET status = ${nextStatus},
        reviewedBy = ${nextStatus === 'approved_record' || nextStatus === 'rejected' ? 'kelvin' : handoff.reviewedBy ?? null},
        reviewedAt = ${nextStatus === 'approved_record' || nextStatus === 'rejected' ? new Date() : handoff.reviewedAt ? new Date(handoff.reviewedAt) : null},
        rejectionReason = ${nextStatus === 'rejected' ? reason : null},
        updatedAt = ${new Date()}
    WHERE id = ${id}
  `
  const auditEvents = await audit({
    correlationId: handoff.correlationId,
    taskId: handoff.taskId,
    eventType: handoffEventType(nextStatus),
    actorType: nextStatus === 'approved_record' || nextStatus === 'rejected' ? 'kelvin' : 'user',
    beforeStatus: handoff.status,
    afterStatus: nextStatus,
    reason: `${reason} Approval changes the local handoff record only and does not start the target Agent.`,
    payload: { handoffRequestId: id, collaborationSessionId: handoff.collaborationSessionId },
  })
  const observabilityEvents = [await observe(handoff.correlationId, 'handoff_request', id, handoffEventType(nextStatus), reason)]
  await journal(handoff.correlationId, id, handoffEventType(nextStatus), handoff.status, nextStatus, auditEvents[0])
  return { handoffRequest: await mustGetHandoff(id), auditEvents, observabilityEvents }
}

export async function createCollaborationDecision(input: {
  collaborationSessionId: string
  threadId?: string
  decisionType: CollaborationDecision['decisionType']
  title: string
  rationale: string
  recommendation: string
  decisionInputs?: CollaborationDecision['decisionInputs']
  riskLevel?: RiskLevel
  idempotencyKey?: string
  createdBy?: CollaborationDecision['createdBy']
}) {
  if (input.idempotencyKey) {
    const existing = await findDecisionByIdempotencyKey(input.idempotencyKey)
    if (existing) return { collaborationDecision: existing, auditEvents: [], observabilityEvents: [] }
  }
  const session = await mustGetSession(input.collaborationSessionId)
  const riskLevel = input.riskLevel ?? (requiresKelvinReview('medium', `${input.title} ${input.recommendation}`) ? 'high' : 'medium')
  const id = randomUUID()
  await prisma.$executeRaw`
    INSERT INTO collaboration_decisions (
      id, idempotencyKey, correlationId, collaborationSessionId, threadId, taskId,
      status, decisionType, title, rationale, recommendation, decisionInputsJson,
      riskLevel, requiresHumanConfirmation, confirmationArtifactId, createdBy,
      reviewedBy, reviewedAt, rejectionReason, createdAt, updatedAt
    ) VALUES (
      ${id}, ${input.idempotencyKey ?? null}, ${session.correlationId}, ${session.id},
      ${input.threadId ?? null}, ${session.taskId ?? null}, ${'draft'}, ${input.decisionType},
      ${input.title}, ${input.rationale}, ${input.recommendation},
      ${encodeJson(input.decisionInputs ?? {})}, ${riskLevel},
      ${requiresKelvinReview(riskLevel, `${input.title} ${input.recommendation}`)},
      ${null}, ${input.createdBy ?? 'human'}, ${null}, ${null}, ${null}, ${new Date()}, ${new Date()}
    )
  `
  const auditEvents = await audit({
    correlationId: session.correlationId,
    taskId: session.taskId,
    eventType: 'collaboration_decision.created',
    actorType: 'user',
    afterStatus: 'draft',
    reason: 'CollaborationDecision local recommendation record created. It does not execute tools or complete tasks.',
    payload: { collaborationDecisionId: id, collaborationSessionId: session.id },
  })
  const observabilityEvents = [await observe(session.correlationId, 'collaboration_decision', id, 'collaboration_decision.created', 'CollaborationDecision local record created.')]
  await journal(session.correlationId, id, 'collaboration_decision.created', undefined, 'draft', auditEvents[0])
  return { collaborationDecision: await mustGetDecision(id), auditEvents, observabilityEvents }
}

export async function listCollaborationDecisions(filters: { collaborationSessionId?: string; threadId?: string } = {}): Promise<CollaborationDecision[]> {
  const rows = await prisma.$queryRaw<RawDecision[]>`
    SELECT * FROM collaboration_decisions
    WHERE (${filters.collaborationSessionId ?? null} IS NULL OR collaborationSessionId = ${filters.collaborationSessionId ?? null})
      AND (${filters.threadId ?? null} IS NULL OR threadId = ${filters.threadId ?? null})
    ORDER BY createdAt DESC
  `
  return rows.map(serializeCollaborationDecision)
}

export async function getCollaborationDecision(id: string): Promise<CollaborationDecision | null> {
  const rows = await prisma.$queryRaw<RawDecision[]>`SELECT * FROM collaboration_decisions WHERE id = ${id} LIMIT 1`
  return rows[0] ? serializeCollaborationDecision(rows[0]) : null
}

export async function updateCollaborationDecisionStatus(id: string, event: CollaborationDecisionEvent, reason: string) {
  const decision = await mustGetDecision(id)
  const nextStatus = transitionCollaborationDecision(decision.status, event)
  await prisma.$executeRaw`
    UPDATE collaboration_decisions
    SET status = ${nextStatus},
        reviewedBy = ${nextStatus === 'approved_record' || nextStatus === 'rejected' ? 'kelvin' : decision.reviewedBy ?? null},
        reviewedAt = ${nextStatus === 'approved_record' || nextStatus === 'rejected' ? new Date() : decision.reviewedAt ? new Date(decision.reviewedAt) : null},
        rejectionReason = ${nextStatus === 'rejected' ? reason : null},
        updatedAt = ${new Date()}
    WHERE id = ${id}
  `
  const auditEvents = await audit({
    correlationId: decision.correlationId,
    taskId: decision.taskId,
    eventType: decisionEventType(nextStatus),
    actorType: nextStatus === 'approved_record' || nextStatus === 'rejected' ? 'kelvin' : 'user',
    beforeStatus: decision.status,
    afterStatus: nextStatus,
    reason: `${reason} Approval changes the local decision record only; it does not execute ToolCall or mark Task completed.`,
    payload: { collaborationDecisionId: id, collaborationSessionId: decision.collaborationSessionId },
  })
  const observabilityEvents = [await observe(decision.correlationId, 'collaboration_decision', id, decisionEventType(nextStatus), reason)]
  await journal(decision.correlationId, id, decisionEventType(nextStatus), decision.status, nextStatus, auditEvents[0])
  return { collaborationDecision: await mustGetDecision(id), auditEvents, observabilityEvents }
}

async function createSession(input: Omit<CollaborationSession, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { eventReason: string }) {
  const id = randomUUID()
  await prisma.$executeRaw`
    INSERT INTO collaboration_sessions (
      id, idempotencyKey, correlationId, taskId, sourceA2AMessageId, sourceAgentRunId,
      sourceEvalRunId, teamId, status, objective, summary, riskLevel,
      requiresHumanConfirmation, participantsJson, planJson, confirmationArtifactId,
      supersedesCollaborationSessionId, supersededByCollaborationSessionId,
      createdBy, createdAt, updatedAt
    ) VALUES (
      ${id}, ${input.idempotencyKey ?? null}, ${input.correlationId}, ${input.taskId ?? null},
      ${input.sourceA2AMessageId ?? null}, ${input.sourceAgentRunId ?? null},
      ${input.sourceEvalRunId ?? null}, ${input.teamId ?? null}, ${'draft'}, ${input.objective},
      ${input.summary ?? null}, ${input.riskLevel}, ${input.requiresHumanConfirmation},
      ${encodeJson(input.participants)}, ${encodeJson(input.plan)}, ${input.confirmationArtifactId ?? null},
      ${input.supersedesCollaborationSessionId ?? null}, ${input.supersededByCollaborationSessionId ?? null},
      ${input.createdBy}, ${new Date()}, ${new Date()}
    )
  `
  const auditEvents = await audit({
    correlationId: input.correlationId,
    taskId: input.taskId,
    eventType: 'collaboration_session.created',
    actorType: input.createdBy === 'agent_record' ? 'agent_runtime' : input.createdBy === 'human' ? 'user' : 'system',
    afterStatus: 'draft',
    reason: input.eventReason,
    payload: { collaborationSessionId: id, localRecordOnly: true },
  })
  const observabilityEvents = [await observe(input.correlationId, 'collaboration_session', id, 'collaboration_session.created', input.eventReason)]
  await journal(input.correlationId, id, 'collaboration_session.created', undefined, 'draft', auditEvents[0])
  const collaborationSession = await mustGetSession(id)
  return { collaborationSession, auditEvents, observabilityEvents }
}

async function updateStatus(input: {
  table: 'collaboration_sessions' | 'a2a_threads' | 'a2a_turns'
  id: string
  taskId?: string
  correlationId: string
  eventType: string
  actorType: string
  beforeStatus?: string
  afterStatus: string
  reason: string
  payload: Record<string, unknown>
}) {
  await prisma.$executeRawUnsafe(
    `UPDATE ${input.table} SET status = ?, updatedAt = ? WHERE id = ?`,
    input.afterStatus,
    new Date(),
    input.id
  )
  return audit(input)
}

async function audit(input: {
  correlationId: string
  taskId?: string
  eventType: string
  actorType: string
  actorId?: string
  beforeStatus?: string
  afterStatus?: string
  reason: string
  payload: Record<string, unknown>
}) {
  const event = await prisma.harmonyAuditEvent.create({
    data: {
      correlationId: input.correlationId,
      taskId: input.taskId,
      eventType: input.eventType,
      actorType: input.actorType,
      actorId: input.actorId,
      beforeStatus: input.beforeStatus,
      afterStatus: input.afterStatus,
      reason: input.reason,
      payloadJson: encodeJson(input.payload),
    },
  })
  return [event]
}

async function observe(correlationId: string, resourceType: string, resourceId: string, eventType: string, message: string) {
  return createObservabilityEvent({
    correlationId,
    resourceType: resourceType as never,
    resourceId,
    eventType,
    message,
    source: 'repository',
    attributes: { localRecordOnly: true, sprint: 9 },
  })
}

async function journal(
  correlationId: string,
  resourceId: string,
  phase: string,
  stateBefore: string | undefined,
  stateAfter: string | undefined,
  auditEvent: unknown
) {
  const eventRefId = auditEvent && typeof auditEvent === 'object' && 'id' in auditEvent
    ? String((auditEvent as { id: unknown }).id)
    : resourceId
  await appendRunJournal({
    runType: 'collaboration_flow',
    runId: resourceId,
    correlationId,
    eventRefType: 'audit_event',
    eventRefId,
    phase,
    stateBefore,
    stateAfter,
    inputSnapshot: { localRecordOnly: true, replayable: false },
    result: 'recorded',
  })
}

async function mustGetSession(id: string) {
  const session = await getCollaborationSession(id)
  if (!session) throw new CollaborationRepositoryError('CollaborationSession not found.', 404)
  return session
}

async function mustGetThread(id: string) {
  const thread = await getA2AThread(id)
  if (!thread) throw new CollaborationRepositoryError('A2AThread not found.', 404)
  return thread
}

async function mustGetTurn(id: string) {
  const turn = await getA2ATurn(id)
  if (!turn) throw new CollaborationRepositoryError('A2ATurn not found.', 404)
  return turn
}

async function mustGetHandoff(id: string) {
  const handoff = await getHandoffRequest(id)
  if (!handoff) throw new CollaborationRepositoryError('HandoffRequest not found.', 404)
  return handoff
}

async function mustGetDecision(id: string) {
  const decision = await getCollaborationDecision(id)
  if (!decision) throw new CollaborationRepositoryError('CollaborationDecision not found.', 404)
  return decision
}

async function findSessionByIdempotencyKey(idempotencyKey: string) {
  const rows = await prisma.$queryRaw<RawSession[]>`SELECT * FROM collaboration_sessions WHERE idempotencyKey = ${idempotencyKey} LIMIT 1`
  return rows[0] ? serializeCollaborationSession(rows[0]) : null
}

async function findThreadByIdempotencyKey(idempotencyKey: string) {
  const rows = await prisma.$queryRaw<RawThread[]>`SELECT * FROM a2a_threads WHERE idempotencyKey = ${idempotencyKey} LIMIT 1`
  return rows[0] ? serializeA2AThread(rows[0]) : null
}

async function findTurnByIdempotencyKey(idempotencyKey: string) {
  const rows = await prisma.$queryRaw<RawTurn[]>`SELECT * FROM a2a_turns WHERE idempotencyKey = ${idempotencyKey} LIMIT 1`
  return rows[0] ? serializeA2ATurn(rows[0]) : null
}

async function findHandoffByIdempotencyKey(idempotencyKey: string) {
  const rows = await prisma.$queryRaw<RawHandoff[]>`SELECT * FROM handoff_requests WHERE idempotencyKey = ${idempotencyKey} LIMIT 1`
  return rows[0] ? serializeHandoffRequest(rows[0]) : null
}

async function findDecisionByIdempotencyKey(idempotencyKey: string) {
  const rows = await prisma.$queryRaw<RawDecision[]>`SELECT * FROM collaboration_decisions WHERE idempotencyKey = ${idempotencyKey} LIMIT 1`
  return rows[0] ? serializeCollaborationDecision(rows[0]) : null
}

async function findTask(id: string) {
  const rows = await prisma.$queryRaw<Array<{
    id: string
    correlationId: string | null
    title: string
    description: string
    status: string
    targetAgentId: string | null
  }>>`
    SELECT id, id as correlationId, title, description, status, targetAgentId
    FROM harmony_tasks WHERE id = ${id} LIMIT 1
  `
  return rows[0] ?? null
}

function sessionEventType(status: string) {
  return status === 'active' ? 'collaboration_session.opened_record' : `collaboration_session.${status}`
}

function threadEventType(status: string) {
  return `a2a_thread.${status}`
}

function turnEventType(status: string) {
  return status === 'approved_record' ? 'a2a_turn.approved_record' : `a2a_turn.${status}`
}

function handoffEventType(status: string) {
  return status === 'approved_record' ? 'handoff.approved_record' : `handoff.${status}`
}

function decisionEventType(status: string) {
  return status === 'approved_record' ? 'collaboration_decision.approved_record' : `collaboration_decision.${status}`
}
