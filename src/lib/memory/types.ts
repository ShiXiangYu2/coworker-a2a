import type { AgentId } from '@/lib/agents/types'
import type { AgentResult } from '@/lib/agent-runtime/types'

export type MemoryEntryStatus =
  | 'candidate'
  | 'approved'
  | 'rejected'
  | 'superseded'
  | 'archived'

export type MemoryEntryEvent = 'APPROVE' | 'REJECT' | 'SUPERSEDE' | 'ARCHIVE'

export type MemoryEntryKind =
  | 'project_decision'
  | 'agent_finding'
  | 'user_preference'
  | 'safety_rule'
  | 'workflow_note'
  | 'technical_context'
  | 'other'

export type MemoryScope = 'global' | 'project' | 'task' | 'agent'

export type KnowledgeItemStatus =
  | 'draft'
  | 'approved'
  | 'rejected'
  | 'superseded'
  | 'archived'

export type KnowledgeItemEvent = 'APPROVE' | 'REJECT' | 'SUPERSEDE' | 'ARCHIVE'

export type KnowledgeItemKind =
  | 'product_spec'
  | 'architecture'
  | 'agent_profile'
  | 'safety_policy'
  | 'workflow'
  | 'contract'
  | 'decision_record'
  | 'other'

export type KnowledgeScope = 'global' | 'project' | 'sprint' | 'agent'

export type ContextPacketStatus = 'draft' | 'attached' | 'audit_only' | 'superseded'
export type ContextPacketEvent = 'ATTACH' | 'MARK_AUDIT_ONLY' | 'SUPERSEDE'

export type A2AMessageStatus =
  | 'draft'
  | 'queued_for_review'
  | 'approved_record'
  | 'rejected'
  | 'superseded'
  | 'archived'

export type A2AMessageEvent =
  | 'SUBMIT_REVIEW'
  | 'APPROVE_RECORD'
  | 'REJECT'
  | 'SUPERSEDE'
  | 'ARCHIVE'

export type A2AMessageIntent =
  | 'handoff'
  | 'request_review'
  | 'request_clarification'
  | 'share_finding'
  | 'propose_next_step'
  | 'escalate_to_kelvin'

export interface MemoryEntry {
  id: string
  idempotencyKey?: string
  status: MemoryEntryStatus
  title: string
  content: string
  kind: MemoryEntryKind
  scope: MemoryScope
  projectId?: string
  taskId?: string
  agentRunId?: string
  agentId?: AgentId
  sourceType: 'agent_result' | 'human_input' | 'task' | 'knowledge_item' | 'system'
  sourceId?: string
  sourceSnapshot?: unknown
  confidence: number
  tags: string[]
  supersedesMemoryEntryId?: string
  supersededByMemoryEntryId?: string
  proposedBy: 'agent' | 'human' | 'system'
  reviewedBy?: string
  reviewedAt?: string
  rejectionReason?: string
  createdAt: string
  updatedAt: string
}

export interface KnowledgeItem {
  id: string
  idempotencyKey?: string
  status: KnowledgeItemStatus
  title: string
  content: string
  kind: KnowledgeItemKind
  scope: KnowledgeScope
  projectId?: string
  sprint?: string
  agentId?: AgentId
  sourceType: 'manual' | 'spec' | 'memory_promoted' | 'system'
  sourcePath?: string
  sourceId?: string
  sourceSnapshot?: unknown
  tags: string[]
  version: number
  supersedesKnowledgeItemId?: string
  supersededByKnowledgeItemId?: string
  createdBy: 'human' | 'system'
  reviewedBy?: string
  reviewedAt?: string
  rejectionReason?: string
  createdAt: string
  updatedAt: string
}

export interface ContextSelectionPolicy {
  maxItems: number
  maxApproxTokens: number
  allowedScopes: ('global' | 'project' | 'task' | 'agent' | 'sprint')[]
  minConfidence: number
  includeMemoryKinds: MemoryEntryKind[]
  includeKnowledgeKinds: KnowledgeItemKind[]
  includeTags?: string[]
  excludeTags?: string[]
}

export interface ContextPacketItem {
  sourceType: 'memory_entry' | 'knowledge_item' | 'task' | 'route_decision' | 'agent_profile'
  sourceId: string
  title: string
  excerpt: string
  reason: string
  confidence?: number
  tags: string[]
}

export interface ContextPacket {
  id: string
  idempotencyKey?: string
  taskId: string
  agentRunId?: string
  agentId: AgentId
  status: ContextPacketStatus
  purpose: 'agent_analysis'
  selectionPolicy: ContextSelectionPolicy
  items: ContextPacketItem[]
  excludedItems?: {
    sourceType: 'memory_entry' | 'knowledge_item'
    sourceId: string
    reason: string
  }[]
  approxTokens: number
  attachedAt?: string
  attachedToAgentRunId?: string
  supersedesContextPacketId?: string
  supersededByContextPacketId?: string
  createdBy: 'system' | 'human'
  createdAt: string
  updatedAt: string
}

export interface A2AMessage {
  id: string
  idempotencyKey?: string
  status: A2AMessageStatus
  taskId?: string
  agentRunId?: string
  fromAgentId: AgentId
  toAgentId: AgentId
  intent: A2AMessageIntent
  subject: string
  body: string
  payload?: {
    routeDecisionId?: string
    taskStepId?: string
    agentResultId?: string
    memoryEntryIds?: string[]
    knowledgeItemIds?: string[]
  }
  requiresHumanConfirmation: boolean
  reviewedBy?: string
  reviewedAt?: string
  rejectionReason?: string
  createdBy: 'agent' | 'human' | 'system'
  createdAt: string
  updatedAt: string
}

export interface CreateContextPacketInput {
  taskId: string
  agentId?: AgentId
  agentRunId?: string
  createdBy?: 'system' | 'human'
  selectionPolicy?: Partial<ContextSelectionPolicy>
  idempotencyKey?: string
}

export interface CreateMemoryCandidatesInput {
  agentRunId: string
  taskId: string
  agentId: AgentId
  agentResult?: AgentResult
  selectedFindings?: number[]
  selectedProposedChanges?: number[]
  idempotencyKey?: string
}

export interface CreateKnowledgeItemInput {
  title: string
  content: string
  kind?: KnowledgeItemKind
  scope?: KnowledgeScope
  projectId?: string
  sprint?: string
  agentId?: AgentId
  sourceType?: KnowledgeItem['sourceType']
  sourcePath?: string
  tags?: string[]
  idempotencyKey?: string
}

export interface CreateA2AMessageInput {
  taskId?: string
  agentRunId?: string
  fromAgentId: AgentId
  toAgentId: AgentId
  intent: A2AMessageIntent
  subject: string
  body: string
  requiresHumanConfirmation?: boolean
  payload?: A2AMessage['payload']
  idempotencyKey?: string
}

export interface ReviewInput {
  reviewedBy?: string
  decisionReason: string
  idempotencyKey?: string
}

export const sprint5SafetyNote =
  'Sprint 5 records controlled context, memory candidates, knowledge items, and local A2A drafts only. It does not execute tools, call external APIs, send messages, modify files, create PRs, deploy, delete, or start autonomous agent loops.'

export const defaultContextSelectionPolicy: ContextSelectionPolicy = {
  maxItems: 12,
  maxApproxTokens: 3000,
  allowedScopes: ['global', 'project', 'task', 'agent', 'sprint'],
  minConfidence: 0.6,
  includeMemoryKinds: [
    'project_decision',
    'agent_finding',
    'safety_rule',
    'workflow_note',
    'technical_context',
  ],
  includeKnowledgeKinds: [
    'product_spec',
    'architecture',
    'agent_profile',
    'safety_policy',
    'workflow',
    'contract',
    'decision_record',
  ],
}
