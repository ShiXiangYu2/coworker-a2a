import type {
  A2AMessageEvent,
  A2AMessageStatus,
  ContextPacketEvent,
  ContextPacketStatus,
  KnowledgeItemEvent,
  KnowledgeItemStatus,
  MemoryEntryEvent,
  MemoryEntryStatus,
} from './types'

function transition<TStatus extends string, TEvent extends string>(
  label: string,
  transitions: Map<string, TStatus>,
  currentStatus: TStatus,
  event: TEvent
): TStatus {
  const next = transitions.get(`${currentStatus}:${event}`)
  if (!next) {
    throw new InvalidMemoryTransitionError(label, currentStatus, event)
  }
  return next
}

export class InvalidMemoryTransitionError extends Error {
  constructor(
    public readonly resource: string,
    public readonly currentStatus: string,
    public readonly event: string
  ) {
    super(`Invalid ${resource} transition: ${currentStatus} -> ${event}`)
    this.name = 'InvalidMemoryTransitionError'
  }
}

const memoryTransitions = new Map<string, MemoryEntryStatus>([
  ['candidate:APPROVE', 'approved'],
  ['candidate:REJECT', 'rejected'],
  ['candidate:ARCHIVE', 'archived'],
  ['approved:SUPERSEDE', 'superseded'],
  ['approved:ARCHIVE', 'archived'],
  ['rejected:ARCHIVE', 'archived'],
  ['superseded:ARCHIVE', 'archived'],
])

export function transitionMemoryEntry(
  currentStatus: MemoryEntryStatus,
  event: MemoryEntryEvent
): MemoryEntryStatus {
  return transition('MemoryEntry', memoryTransitions, currentStatus, event)
}

const knowledgeTransitions = new Map<string, KnowledgeItemStatus>([
  ['draft:APPROVE', 'approved'],
  ['draft:REJECT', 'rejected'],
  ['draft:ARCHIVE', 'archived'],
  ['approved:SUPERSEDE', 'superseded'],
  ['approved:ARCHIVE', 'archived'],
  ['rejected:ARCHIVE', 'archived'],
  ['superseded:ARCHIVE', 'archived'],
])

export function transitionKnowledgeItem(
  currentStatus: KnowledgeItemStatus,
  event: KnowledgeItemEvent
): KnowledgeItemStatus {
  return transition('KnowledgeItem', knowledgeTransitions, currentStatus, event)
}

const a2aTransitions = new Map<string, A2AMessageStatus>([
  ['draft:SUBMIT_REVIEW', 'queued_for_review'],
  ['draft:ARCHIVE', 'archived'],
  ['queued_for_review:APPROVE_RECORD', 'approved_record'],
  ['queued_for_review:REJECT', 'rejected'],
  ['approved_record:SUPERSEDE', 'superseded'],
  ['approved_record:ARCHIVE', 'archived'],
  ['rejected:ARCHIVE', 'archived'],
  ['superseded:ARCHIVE', 'archived'],
])

export function transitionA2AMessage(
  currentStatus: A2AMessageStatus,
  event: A2AMessageEvent
): A2AMessageStatus {
  return transition('A2AMessage', a2aTransitions, currentStatus, event)
}

const contextTransitions = new Map<string, ContextPacketStatus>([
  ['draft:ATTACH', 'attached'],
  ['draft:MARK_AUDIT_ONLY', 'audit_only'],
  ['draft:SUPERSEDE', 'superseded'],
  ['attached:SUPERSEDE', 'superseded'],
  ['audit_only:SUPERSEDE', 'superseded'],
])

export function transitionContextPacket(
  currentStatus: ContextPacketStatus,
  event: ContextPacketEvent
): ContextPacketStatus {
  return transition('ContextPacket', contextTransitions, currentStatus, event)
}
