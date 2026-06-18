import { decodeJson } from '@/lib/harmony/serializers'
import type {
  A2AMessage,
  ContextPacket,
  KnowledgeItem,
  MemoryEntry,
} from './types'

function dateToString(value: Date | null | undefined): string | undefined {
  return value ? value.toISOString() : undefined
}

export function serializeMemoryEntry(record: {
  id: string
  idempotencyKey: string | null
  status: string
  title: string
  content: string
  kind: string
  scope: string
  projectId: string | null
  taskId: string | null
  agentRunId: string | null
  agentId: string | null
  sourceType: string
  sourceId: string | null
  sourceSnapshotJson: string | null
  confidence: number
  tagsJson: string
  supersedesMemoryEntryId: string | null
  supersededByMemoryEntryId: string | null
  proposedBy: string
  reviewedBy: string | null
  reviewedAt: Date | null
  rejectionReason: string | null
  createdAt: Date
  updatedAt: Date
}): MemoryEntry {
  return {
    id: record.id,
    idempotencyKey: record.idempotencyKey ?? undefined,
    status: record.status as MemoryEntry['status'],
    title: record.title,
    content: record.content,
    kind: record.kind as MemoryEntry['kind'],
    scope: record.scope as MemoryEntry['scope'],
    projectId: record.projectId ?? undefined,
    taskId: record.taskId ?? undefined,
    agentRunId: record.agentRunId ?? undefined,
    agentId: record.agentId as MemoryEntry['agentId'],
    sourceType: record.sourceType as MemoryEntry['sourceType'],
    sourceId: record.sourceId ?? undefined,
    sourceSnapshot: decodeJson(record.sourceSnapshotJson, undefined),
    confidence: record.confidence,
    tags: decodeJson(record.tagsJson, [] as string[]),
    supersedesMemoryEntryId: record.supersedesMemoryEntryId ?? undefined,
    supersededByMemoryEntryId: record.supersededByMemoryEntryId ?? undefined,
    proposedBy: record.proposedBy as MemoryEntry['proposedBy'],
    reviewedBy: record.reviewedBy ?? undefined,
    reviewedAt: dateToString(record.reviewedAt),
    rejectionReason: record.rejectionReason ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export function serializeKnowledgeItem(record: {
  id: string
  idempotencyKey: string | null
  status: string
  title: string
  content: string
  kind: string
  scope: string
  projectId: string | null
  sprint: string | null
  agentId: string | null
  sourceType: string
  sourcePath: string | null
  sourceId: string | null
  sourceSnapshotJson: string | null
  tagsJson: string
  version: number
  supersedesKnowledgeItemId: string | null
  supersededByKnowledgeItemId: string | null
  createdBy: string
  reviewedBy: string | null
  reviewedAt: Date | null
  rejectionReason: string | null
  createdAt: Date
  updatedAt: Date
}): KnowledgeItem {
  return {
    id: record.id,
    idempotencyKey: record.idempotencyKey ?? undefined,
    status: record.status as KnowledgeItem['status'],
    title: record.title,
    content: record.content,
    kind: record.kind as KnowledgeItem['kind'],
    scope: record.scope as KnowledgeItem['scope'],
    projectId: record.projectId ?? undefined,
    sprint: record.sprint ?? undefined,
    agentId: record.agentId as KnowledgeItem['agentId'],
    sourceType: record.sourceType as KnowledgeItem['sourceType'],
    sourcePath: record.sourcePath ?? undefined,
    sourceId: record.sourceId ?? undefined,
    sourceSnapshot: decodeJson(record.sourceSnapshotJson, undefined),
    tags: decodeJson(record.tagsJson, [] as string[]),
    version: record.version,
    supersedesKnowledgeItemId: record.supersedesKnowledgeItemId ?? undefined,
    supersededByKnowledgeItemId: record.supersededByKnowledgeItemId ?? undefined,
    createdBy: record.createdBy as KnowledgeItem['createdBy'],
    reviewedBy: record.reviewedBy ?? undefined,
    reviewedAt: dateToString(record.reviewedAt),
    rejectionReason: record.rejectionReason ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export function serializeContextPacket(record: {
  id: string
  idempotencyKey: string | null
  taskId: string
  agentRunId: string | null
  agentId: string
  status: string
  purpose: string
  selectionPolicyJson: string
  itemsJson: string
  excludedItemsJson: string | null
  approxTokens: number
  attachedAt: Date | null
  attachedToAgentRunId: string | null
  supersedesContextPacketId: string | null
  supersededByContextPacketId: string | null
  createdBy: string
  createdAt: Date
  updatedAt: Date
}): ContextPacket {
  return {
    id: record.id,
    idempotencyKey: record.idempotencyKey ?? undefined,
    taskId: record.taskId,
    agentRunId: record.agentRunId ?? undefined,
    agentId: record.agentId as ContextPacket['agentId'],
    status: record.status as ContextPacket['status'],
    purpose: record.purpose as ContextPacket['purpose'],
    selectionPolicy: decodeJson(record.selectionPolicyJson, undefined as never),
    items: decodeJson(record.itemsJson, []),
    excludedItems: decodeJson(record.excludedItemsJson, undefined),
    approxTokens: record.approxTokens,
    attachedAt: dateToString(record.attachedAt),
    attachedToAgentRunId: record.attachedToAgentRunId ?? undefined,
    supersedesContextPacketId: record.supersedesContextPacketId ?? undefined,
    supersededByContextPacketId: record.supersededByContextPacketId ?? undefined,
    createdBy: record.createdBy as ContextPacket['createdBy'],
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export function serializeA2AMessage(record: {
  id: string
  idempotencyKey: string | null
  status: string
  taskId: string | null
  agentRunId: string | null
  fromAgentId: string
  toAgentId: string
  intent: string
  subject: string
  body: string
  payloadJson: string | null
  requiresHumanConfirmation: boolean
  reviewedBy: string | null
  reviewedAt: Date | null
  rejectionReason: string | null
  createdBy: string
  createdAt: Date
  updatedAt: Date
}): A2AMessage {
  return {
    id: record.id,
    idempotencyKey: record.idempotencyKey ?? undefined,
    status: record.status as A2AMessage['status'],
    taskId: record.taskId ?? undefined,
    agentRunId: record.agentRunId ?? undefined,
    fromAgentId: record.fromAgentId as A2AMessage['fromAgentId'],
    toAgentId: record.toAgentId as A2AMessage['toAgentId'],
    intent: record.intent as A2AMessage['intent'],
    subject: record.subject,
    body: record.body,
    payload: decodeJson(record.payloadJson, undefined),
    requiresHumanConfirmation: record.requiresHumanConfirmation,
    reviewedBy: record.reviewedBy ?? undefined,
    reviewedAt: dateToString(record.reviewedAt),
    rejectionReason: record.rejectionReason ?? undefined,
    createdBy: record.createdBy as A2AMessage['createdBy'],
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}
