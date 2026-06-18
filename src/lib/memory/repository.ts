import { randomUUID } from 'node:crypto'
import type { AgentResult } from '@/lib/agent-runtime/types'
import { prisma } from '@/lib/prisma'
import { encodeJson } from '@/lib/harmony/serializers'
import { transitionA2AMessage, transitionKnowledgeItem, transitionMemoryEntry } from './state-machine'
import {
  mapAgentResultToMemoryCandidates,
  mergeSelectionPolicy,
  selectContextItems,
} from './rules'
import {
  serializeA2AMessage,
  serializeContextPacket,
  serializeKnowledgeItem,
  serializeMemoryEntry,
} from './serializers'
import type {
  A2AMessage,
  A2AMessageEvent,
  ContextPacket,
  CreateA2AMessageInput,
  CreateContextPacketInput,
  CreateKnowledgeItemInput,
  CreateMemoryCandidatesInput,
  KnowledgeItem,
  KnowledgeItemEvent,
  MemoryEntry,
  MemoryEntryEvent,
  ReviewInput,
} from './types'

type RawMemoryEntry = Parameters<typeof serializeMemoryEntry>[0]
type RawKnowledgeItem = Parameters<typeof serializeKnowledgeItem>[0]
type RawContextPacket = Parameters<typeof serializeContextPacket>[0]
type RawA2AMessage = Parameters<typeof serializeA2AMessage>[0]

export class MemoryRepositoryError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message)
    this.name = 'MemoryRepositoryError'
  }
}

export async function createContextPacketFromTask(
  input: CreateContextPacketInput
): Promise<{ contextPacket: ContextPacket; auditEvents: unknown[] }> {
  if (input.idempotencyKey) {
    const existing = await findContextPacketByIdempotencyKey(input.idempotencyKey)
    if (existing) return { contextPacket: existing, auditEvents: [] }
  }

  const task = await prisma.harmonyTask.findUnique({ where: { id: input.taskId } })
  if (!task) throw new MemoryRepositoryError('Task not found.', 404)

  const agentId = input.agentId ?? task.targetAgentId
  if (!agentId) throw new MemoryRepositoryError('agentId is required.')

  const policy = mergeSelectionPolicy(input.selectionPolicy)
  const memories = await listSelectableMemories()
  const knowledge = await listSelectableKnowledge()
  const selection = selectContextItems({
    task: {
      id: task.id,
      targetAgentId: task.targetAgentId,
      title: task.title,
      description: task.description,
      routeDecisionSnapshot: JSON.parse(task.routeDecisionSnapshotJson),
    },
    agentId: agentId as never,
    memories,
    knowledgeItems: knowledge,
    policy,
  })

  const contextPacketId = randomUUID()
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO context_packets (
        id, idempotencyKey, taskId, agentRunId, agentId, status, purpose,
        selectionPolicyJson, itemsJson, excludedItemsJson, approxTokens,
        attachedAt, attachedToAgentRunId, supersedesContextPacketId,
        supersededByContextPacketId, createdBy, createdAt, updatedAt
      ) VALUES (
        ${contextPacketId}, ${input.idempotencyKey ?? null}, ${task.id}, ${null},
        ${agentId}, ${'draft'}, ${'agent_analysis'}, ${encodeJson(selection.policy)},
        ${encodeJson(selection.items)}, ${encodeJson(selection.excludedItems)},
        ${selection.approxTokens}, ${null}, ${null}, ${null}, ${null},
        ${input.createdBy ?? 'system'}, ${new Date()}, ${new Date()}
      )
    `

    await tx.harmonyAuditEvent.create({
      data: {
        taskId: task.id,
        eventType: 'context_packet.created',
        actorType: 'system',
        actorId: agentId,
        afterStatus: 'draft',
        reason: 'ContextPacket created from Task with deterministic local selection.',
        payloadJson: encodeJson({ contextPacketId, selectedItems: selection.items.length }),
      },
    })
  })

  const created = await getContextPacket(contextPacketId)
  if (!created) throw new MemoryRepositoryError('ContextPacket not found after create.', 500)
  return { contextPacket: created, auditEvents: [] }
}

export async function createContextPacketFromAgentRun(
  input: CreateContextPacketInput & { agentRunId: string }
): Promise<{ contextPacket: ContextPacket; auditEvents: unknown[] }> {
  const run = await findRawAgentRun(input.agentRunId)
  if (!run) throw new MemoryRepositoryError('AgentRun not found.', 404)

  const result = await createContextPacketFromTask({
    ...input,
    taskId: run.taskId,
    agentId: run.agentId as never,
  })

  if (!['created', 'running', 'blocked', 'completed'].includes(run.status)) {
    throw new MemoryRepositoryError(
      'ContextPacket can only attach to created/running/blocked AgentRun or become audit-only for completed AgentRun.'
    )
  }

  const nextStatus = run.status === 'completed' ? 'audit_only' : 'attached'
  const now = new Date()
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE context_packets
      SET status = ${nextStatus}, agentRunId = ${run.id},
          attachedAt = ${nextStatus === 'attached' ? now : null},
          attachedToAgentRunId = ${nextStatus === 'attached' ? run.id : null},
          updatedAt = ${now}
      WHERE id = ${result.contextPacket.id}
    `

    if (nextStatus === 'attached') {
      const snapshot = safeJson(run.inputSnapshotJson, {})
      await tx.$executeRaw`
        UPDATE agent_runs
        SET contextPacketId = ${result.contextPacket.id},
            inputSnapshotJson = ${encodeJson({ ...snapshot, contextPacketId: result.contextPacket.id })},
            updatedAt = ${now}
        WHERE id = ${run.id}
      `
    }

    await tx.harmonyAuditEvent.create({
      data: {
        taskId: run.taskId,
        eventType: nextStatus === 'attached' ? 'context_packet.attached' : 'context_packet.created',
        actorType: 'system',
        actorId: run.agentId,
        afterStatus: nextStatus,
        reason:
          nextStatus === 'attached'
            ? 'ContextPacket attached to AgentRun without starting analysis.'
            : 'Audit-only ContextPacket created for completed AgentRun.',
        payloadJson: encodeJson({
          contextPacketId: result.contextPacket.id,
          agentRunId: run.id,
          auditOnly: nextStatus === 'audit_only',
        }),
      },
    })
  })

  const updated = await getContextPacket(result.contextPacket.id)
  if (!updated) throw new MemoryRepositoryError('ContextPacket not found after update.', 500)
  return { contextPacket: updated, auditEvents: [] }
}

export async function getContextPacket(id: string): Promise<ContextPacket | null> {
  const rows = await prisma.$queryRaw<RawContextPacket[]>`
    SELECT * FROM context_packets WHERE id = ${id} LIMIT 1
  `
  return rows[0] ? serializeContextPacket(rows[0]) : null
}

export async function listContextPacketsForAgentRun(agentRunId: string): Promise<ContextPacket[]> {
  const rows = await prisma.$queryRaw<RawContextPacket[]>`
    SELECT * FROM context_packets WHERE agentRunId = ${agentRunId}
       OR attachedToAgentRunId = ${agentRunId}
    ORDER BY createdAt DESC
  `
  return rows.map(serializeContextPacket)
}

export async function createMemoryCandidatesFromAgentResult(
  input: CreateMemoryCandidatesInput
): Promise<{ memoryEntries: MemoryEntry[]; auditEvents: unknown[] }> {
  if (input.idempotencyKey) {
    const existing = await listMemory({ sourceId: input.agentRunId })
    if (existing.length > 0) return { memoryEntries: existing, auditEvents: [] }
  }

  const run = await findRawAgentRun(input.agentRunId)
  if (!run) throw new MemoryRepositoryError('AgentRun not found.', 404)
  const result = input.agentResult ?? safeJson<AgentResult | undefined>(run.resultJson, undefined)
  if (!result) throw new MemoryRepositoryError('AgentRun has no AgentResult.')

  const candidates = mapAgentResultToMemoryCandidates({
    agentResult: result,
    taskId: input.taskId,
    agentRunId: input.agentRunId,
    agentId: input.agentId,
    selectedFindings: input.selectedFindings,
    selectedProposedChanges: input.selectedProposedChanges,
  })

  const ids = await prisma.$transaction(async (tx) => {
    const createdIds: string[] = []
    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index]
      const id = randomUUID()
      createdIds.push(id)
      await tx.$executeRaw`
        INSERT INTO memory_entries (
          id, idempotencyKey, status, title, content, kind, scope, projectId,
          taskId, agentRunId, agentId, sourceType, sourceId, sourceSnapshotJson,
          confidence, tagsJson, supersedesMemoryEntryId, supersededByMemoryEntryId,
          proposedBy, reviewedBy, reviewedAt, rejectionReason, createdAt, updatedAt
        ) VALUES (
          ${id}, ${input.idempotencyKey ? `${input.idempotencyKey}:${index}` : null},
          ${candidate.status}, ${candidate.title}, ${candidate.content}, ${candidate.kind},
          ${candidate.scope}, ${candidate.projectId ?? null}, ${candidate.taskId ?? null},
          ${candidate.agentRunId ?? null}, ${candidate.agentId ?? null}, ${candidate.sourceType},
          ${candidate.sourceId ?? null}, ${encodeJson(candidate.sourceSnapshot)},
          ${candidate.confidence}, ${encodeJson(candidate.tags)},
          ${candidate.supersedesMemoryEntryId ?? null},
          ${candidate.supersededByMemoryEntryId ?? null}, ${candidate.proposedBy},
          ${null}, ${null}, ${null}, ${new Date()}, ${new Date()}
        )
      `

      await tx.harmonyAuditEvent.create({
        data: {
          taskId: input.taskId,
          eventType: 'memory.candidate_created',
          actorType: 'agent_runtime',
          actorId: input.agentId,
          afterStatus: 'candidate',
          reason: 'MemoryEntry candidate created from AgentResult. It is not approved.',
          payloadJson: encodeJson({ memoryEntryId: id, agentRunId: input.agentRunId }),
        },
      })
    }
    return createdIds
  })

  return { memoryEntries: await listMemory({ ids }), auditEvents: [] }
}

export async function listMemory(filters: {
  status?: string
  taskId?: string
  agentRunId?: string
  agentId?: string
  sourceId?: string
  ids?: string[]
} = {}): Promise<MemoryEntry[]> {
  const rows = await prisma.$queryRaw<RawMemoryEntry[]>`
    SELECT * FROM memory_entries
    WHERE (${filters.status ?? null} IS NULL OR status = ${filters.status ?? null})
      AND (${filters.taskId ?? null} IS NULL OR taskId = ${filters.taskId ?? null})
      AND (${filters.agentRunId ?? null} IS NULL OR agentRunId = ${filters.agentRunId ?? null})
      AND (${filters.agentId ?? null} IS NULL OR agentId = ${filters.agentId ?? null})
      AND (${filters.sourceId ?? null} IS NULL OR sourceId = ${filters.sourceId ?? null})
    ORDER BY createdAt DESC
  `
  const serialized = rows.map(serializeMemoryEntry)
  return filters.ids ? serialized.filter((entry) => filters.ids!.includes(entry.id)) : serialized
}

export async function getMemoryEntry(id: string): Promise<MemoryEntry | null> {
  const rows = await prisma.$queryRaw<RawMemoryEntry[]>`
    SELECT * FROM memory_entries WHERE id = ${id} LIMIT 1
  `
  return rows[0] ? serializeMemoryEntry(rows[0]) : null
}

export async function reviewMemoryEntry(
  id: string,
  event: MemoryEntryEvent,
  input: ReviewInput
): Promise<MemoryEntry> {
  if (!input.decisionReason) throw new MemoryRepositoryError('decisionReason is required.')
  const entry = await getMemoryEntry(id)
  if (!entry) throw new MemoryRepositoryError('MemoryEntry not found.', 404)
  const nextStatus = transitionMemoryEntry(entry.status, event)

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE memory_entries
      SET status = ${nextStatus}, reviewedBy = ${input.reviewedBy ?? 'kelvin'},
          reviewedAt = ${new Date()},
          rejectionReason = ${nextStatus === 'rejected' ? input.decisionReason : null},
          updatedAt = ${new Date()}
      WHERE id = ${id}
    `
    await tx.harmonyAuditEvent.create({
      data: {
        taskId: entry.taskId,
        eventType: memoryEventType(nextStatus),
        actorType: 'kelvin',
        actorId: input.reviewedBy ?? 'kelvin',
        beforeStatus: entry.status,
        afterStatus: nextStatus,
        reason: input.decisionReason,
        payloadJson: encodeJson({ memoryEntryId: id }),
      },
    })
  })

  const updated = await getMemoryEntry(id)
  if (!updated) throw new MemoryRepositoryError('MemoryEntry not found after review.', 500)
  return updated
}

export async function createKnowledgeItem(input: CreateKnowledgeItemInput): Promise<KnowledgeItem> {
  if (!input.title || !input.content) {
    throw new MemoryRepositoryError('title and content are required.')
  }
  if (input.idempotencyKey) {
    const existing = await findKnowledgeByIdempotencyKey(input.idempotencyKey)
    if (existing) return existing
  }
  const id = randomUUID()
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO knowledge_items (
        id, idempotencyKey, status, title, content, kind, scope, projectId, sprint,
        agentId, sourceType, sourcePath, sourceId, sourceSnapshotJson, tagsJson,
        version, supersedesKnowledgeItemId, supersededByKnowledgeItemId,
        createdBy, reviewedBy, reviewedAt, rejectionReason, createdAt, updatedAt
      ) VALUES (
        ${id}, ${input.idempotencyKey ?? null}, ${'draft'}, ${input.title},
        ${input.content}, ${input.kind ?? 'other'}, ${input.scope ?? 'project'},
        ${input.projectId ?? null}, ${input.sprint ?? null}, ${input.agentId ?? null},
        ${input.sourceType ?? 'manual'}, ${input.sourcePath ?? null}, ${null}, ${null},
        ${encodeJson(input.tags ?? [])}, ${1}, ${null}, ${null}, ${'human'},
        ${null}, ${null}, ${null}, ${new Date()}, ${new Date()}
      )
    `
    await tx.harmonyAuditEvent.create({
      data: {
        eventType: 'knowledge.created',
        actorType: 'user',
        afterStatus: 'draft',
        reason: 'KnowledgeItem draft created locally.',
        payloadJson: encodeJson({ knowledgeItemId: id }),
      },
    })
  })
  const created = await getKnowledgeItem(id)
  if (!created) throw new MemoryRepositoryError('KnowledgeItem not found after create.', 500)
  return created
}

export async function listKnowledge(filters: {
  status?: string
  agentId?: string
  tag?: string
} = {}): Promise<KnowledgeItem[]> {
  const rows = await prisma.$queryRaw<RawKnowledgeItem[]>`
    SELECT * FROM knowledge_items
    WHERE (${filters.status ?? null} IS NULL OR status = ${filters.status ?? null})
      AND (${filters.agentId ?? null} IS NULL OR agentId = ${filters.agentId ?? null})
    ORDER BY createdAt DESC
  `
  const items = rows.map(serializeKnowledgeItem)
  return filters.tag ? items.filter((item) => item.tags.includes(filters.tag!)) : items
}

export async function getKnowledgeItem(id: string): Promise<KnowledgeItem | null> {
  const rows = await prisma.$queryRaw<RawKnowledgeItem[]>`
    SELECT * FROM knowledge_items WHERE id = ${id} LIMIT 1
  `
  return rows[0] ? serializeKnowledgeItem(rows[0]) : null
}

export async function reviewKnowledgeItem(
  id: string,
  event: KnowledgeItemEvent,
  input: ReviewInput
): Promise<KnowledgeItem> {
  if (!input.decisionReason) throw new MemoryRepositoryError('decisionReason is required.')
  const item = await getKnowledgeItem(id)
  if (!item) throw new MemoryRepositoryError('KnowledgeItem not found.', 404)
  const nextStatus = transitionKnowledgeItem(item.status, event)

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE knowledge_items
      SET status = ${nextStatus}, reviewedBy = ${input.reviewedBy ?? 'kelvin'},
          reviewedAt = ${new Date()},
          rejectionReason = ${nextStatus === 'rejected' ? input.decisionReason : null},
          updatedAt = ${new Date()}
      WHERE id = ${id}
    `
    await tx.harmonyAuditEvent.create({
      data: {
        eventType: knowledgeEventType(nextStatus),
        actorType: 'kelvin',
        actorId: input.reviewedBy ?? 'kelvin',
        beforeStatus: item.status,
        afterStatus: nextStatus,
        reason: input.decisionReason,
        payloadJson: encodeJson({ knowledgeItemId: id }),
      },
    })
  })

  const updated = await getKnowledgeItem(id)
  if (!updated) throw new MemoryRepositoryError('KnowledgeItem not found after review.', 500)
  return updated
}

export async function createA2AMessage(input: CreateA2AMessageInput): Promise<A2AMessage> {
  if (!input.subject || !input.body) {
    throw new MemoryRepositoryError('subject and body are required.')
  }
  if (input.idempotencyKey) {
    const existing = await findA2AByIdempotencyKey(input.idempotencyKey)
    if (existing) return existing
  }
  const id = randomUUID()
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO a2a_messages (
        id, idempotencyKey, status, taskId, agentRunId, fromAgentId, toAgentId,
        intent, subject, body, payloadJson, requiresHumanConfirmation,
        reviewedBy, reviewedAt, rejectionReason, createdBy, createdAt, updatedAt
      ) VALUES (
        ${id}, ${input.idempotencyKey ?? null}, ${'draft'}, ${input.taskId ?? null},
        ${input.agentRunId ?? null}, ${input.fromAgentId}, ${input.toAgentId},
        ${input.intent}, ${input.subject}, ${input.body}, ${encodeJson(input.payload)},
        ${input.requiresHumanConfirmation ?? true}, ${null}, ${null}, ${null},
        ${'human'}, ${new Date()}, ${new Date()}
      )
    `
    await tx.harmonyAuditEvent.create({
      data: {
        taskId: input.taskId,
        eventType: 'a2a.draft_created',
        actorType: 'user',
        actorId: input.fromAgentId,
        afterStatus: 'draft',
        reason: 'Local A2AMessage draft created. No message was sent.',
        payloadJson: encodeJson({ a2aMessageId: id }),
      },
    })
  })
  const created = await getA2AMessage(id)
  if (!created) throw new MemoryRepositoryError('A2AMessage not found after create.', 500)
  return created
}

export async function listA2AMessages(filters: {
  status?: string
  taskId?: string
  agentRunId?: string
  agentId?: string
} = {}): Promise<A2AMessage[]> {
  const rows = await prisma.$queryRaw<RawA2AMessage[]>`
    SELECT * FROM a2a_messages
    WHERE (${filters.status ?? null} IS NULL OR status = ${filters.status ?? null})
      AND (${filters.taskId ?? null} IS NULL OR taskId = ${filters.taskId ?? null})
      AND (${filters.agentRunId ?? null} IS NULL OR agentRunId = ${filters.agentRunId ?? null})
      AND (${filters.agentId ?? null} IS NULL OR fromAgentId = ${filters.agentId ?? null} OR toAgentId = ${filters.agentId ?? null})
    ORDER BY createdAt DESC
  `
  return rows.map(serializeA2AMessage)
}

export async function getA2AMessage(id: string): Promise<A2AMessage | null> {
  const rows = await prisma.$queryRaw<RawA2AMessage[]>`
    SELECT * FROM a2a_messages WHERE id = ${id} LIMIT 1
  `
  return rows[0] ? serializeA2AMessage(rows[0]) : null
}

export async function reviewA2AMessage(
  id: string,
  event: A2AMessageEvent,
  input: ReviewInput
): Promise<A2AMessage> {
  if (!input.decisionReason) throw new MemoryRepositoryError('decisionReason is required.')
  const message = await getA2AMessage(id)
  if (!message) throw new MemoryRepositoryError('A2AMessage not found.', 404)
  const nextStatus = transitionA2AMessage(message.status, event)

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE a2a_messages
      SET status = ${nextStatus}, reviewedBy = ${input.reviewedBy ?? 'kelvin'},
          reviewedAt = ${new Date()},
          rejectionReason = ${nextStatus === 'rejected' ? input.decisionReason : null},
          updatedAt = ${new Date()}
      WHERE id = ${id}
    `
    await tx.harmonyAuditEvent.create({
      data: {
        taskId: message.taskId,
        eventType: a2aEventType(nextStatus),
        actorType: 'kelvin',
        actorId: input.reviewedBy ?? 'kelvin',
        beforeStatus: message.status,
        afterStatus: nextStatus,
        reason: `${input.decisionReason} No A2A message was sent, queued, or dispatched.`,
        payloadJson: encodeJson({ a2aMessageId: id }),
      },
    })
  })

  const updated = await getA2AMessage(id)
  if (!updated) throw new MemoryRepositoryError('A2AMessage not found after review.', 500)
  return updated
}

async function listSelectableMemories(): Promise<MemoryEntry[]> {
  return listMemory({ status: 'approved' })
}

async function listSelectableKnowledge(): Promise<KnowledgeItem[]> {
  return listKnowledge({ status: 'approved' })
}

async function findContextPacketByIdempotencyKey(idempotencyKey: string) {
  const rows = await prisma.$queryRaw<RawContextPacket[]>`
    SELECT * FROM context_packets WHERE idempotencyKey = ${idempotencyKey} LIMIT 1
  `
  return rows[0] ? serializeContextPacket(rows[0]) : null
}

async function findKnowledgeByIdempotencyKey(idempotencyKey: string) {
  const rows = await prisma.$queryRaw<RawKnowledgeItem[]>`
    SELECT * FROM knowledge_items WHERE idempotencyKey = ${idempotencyKey} LIMIT 1
  `
  return rows[0] ? serializeKnowledgeItem(rows[0]) : null
}

async function findA2AByIdempotencyKey(idempotencyKey: string) {
  const rows = await prisma.$queryRaw<RawA2AMessage[]>`
    SELECT * FROM a2a_messages WHERE idempotencyKey = ${idempotencyKey} LIMIT 1
  `
  return rows[0] ? serializeA2AMessage(rows[0]) : null
}

async function findRawAgentRun(id: string) {
  const rows = await prisma.$queryRaw<{
    id: string
    taskId: string
    agentId: string
    status: string
    resultJson: string | null
    inputSnapshotJson: string
  }[]>`
    SELECT id, taskId, agentId, status, resultJson, inputSnapshotJson
    FROM agent_runs WHERE id = ${id} LIMIT 1
  `
  return rows[0] ?? null
}

function memoryEventType(status: string) {
  return `memory.${status === 'candidate' ? 'candidate_created' : status}` as never
}

function knowledgeEventType(status: string) {
  return `knowledge.${status}` as never
}

function a2aEventType(status: string) {
  if (status === 'approved_record') return 'a2a.approved_record' as never
  return `a2a.${status}` as never
}

function safeJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}
