import type { AgentId } from '@/lib/agents/types'
import type { AgentResult } from '@/lib/agent-runtime/types'
import type {
  ContextPacketItem,
  ContextSelectionPolicy,
  KnowledgeItem,
  MemoryEntry,
  MemoryEntryKind,
} from './types'
import { defaultContextSelectionPolicy } from './types'

export class MemoryRuleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MemoryRuleError'
  }
}

export function mergeSelectionPolicy(
  policy?: Partial<ContextSelectionPolicy>
): ContextSelectionPolicy {
  return {
    ...defaultContextSelectionPolicy,
    ...policy,
    allowedScopes:
      policy?.allowedScopes ?? defaultContextSelectionPolicy.allowedScopes,
    includeMemoryKinds:
      policy?.includeMemoryKinds ?? defaultContextSelectionPolicy.includeMemoryKinds,
    includeKnowledgeKinds:
      policy?.includeKnowledgeKinds ??
      defaultContextSelectionPolicy.includeKnowledgeKinds,
  }
}

export function selectContextItems(input: {
  task: {
    id: string
    projectId?: string
    targetAgentId?: string | null
    title: string
    description: string
    routeDecisionSnapshot?: unknown
  }
  agentId: AgentId
  memories: MemoryEntry[]
  knowledgeItems: KnowledgeItem[]
  policy?: Partial<ContextSelectionPolicy>
}): {
  policy: ContextSelectionPolicy
  items: ContextPacketItem[]
  excludedItems: { sourceType: 'memory_entry' | 'knowledge_item'; sourceId: string; reason: string }[]
  approxTokens: number
} {
  const policy = mergeSelectionPolicy(input.policy)
  const excludedItems: {
    sourceType: 'memory_entry' | 'knowledge_item'
    sourceId: string
    reason: string
  }[] = []

  const baseItems: ContextPacketItem[] = [
    {
      sourceType: 'task',
      sourceId: input.task.id,
      title: input.task.title,
      excerpt: excerpt(input.task.description),
      reason: 'Current Harmony Task summary is always included.',
      tags: ['task'],
    },
  ]

  if (input.task.routeDecisionSnapshot) {
    baseItems.push({
      sourceType: 'route_decision',
      sourceId: input.task.id,
      title: 'RouteDecision snapshot',
      excerpt: excerpt(JSON.stringify(input.task.routeDecisionSnapshot)),
      reason: 'RouteDecision snapshot explains why the task was delegated.',
      tags: ['route_decision'],
    })
  }

  const memoryItems = input.memories
    .filter((memory) => {
      const reason = exclusionReasonForMemory(memory, input, policy)
      if (reason) {
        excludedItems.push({ sourceType: 'memory_entry', sourceId: memory.id, reason })
        return false
      }
      return true
    })
    .map<ContextPacketItem>((memory) => ({
      sourceType: 'memory_entry',
      sourceId: memory.id,
      title: memory.title,
      excerpt: excerpt(memory.content),
      reason: deterministicReason(memory.scope, memory.agentId, memory.taskId),
      confidence: memory.confidence,
      tags: memory.tags,
    }))

  const knowledge = input.knowledgeItems
    .filter((item) => {
      const reason = exclusionReasonForKnowledge(item, input, policy)
      if (reason) {
        excludedItems.push({ sourceType: 'knowledge_item', sourceId: item.id, reason })
        return false
      }
      return true
    })
    .map<ContextPacketItem>((item) => ({
      sourceType: 'knowledge_item',
      sourceId: item.id,
      title: item.title,
      excerpt: excerpt(item.content),
      reason: deterministicReason(item.scope, item.agentId),
      tags: item.tags,
    }))

  const selected = [...baseItems, ...memoryItems, ...knowledge]
    .slice(0, policy.maxItems)
    .reduce<ContextPacketItem[]>((items, item) => {
      const next = [...items, item]
      if (approxTokens(next) > policy.maxApproxTokens) return items
      return next
    }, [])

  return {
    policy,
    items: selected,
    excludedItems,
    approxTokens: approxTokens(selected),
  }
}

function exclusionReasonForMemory(
  memory: MemoryEntry,
  input: { task: { id: string; projectId?: string }; agentId: AgentId },
  policy: ContextSelectionPolicy
): string | null {
  if (memory.status !== 'approved') return `Memory status ${memory.status} is not approved.`
  if (!policy.allowedScopes.includes(memory.scope)) return `Memory scope ${memory.scope} is not allowed.`
  if (!policy.includeMemoryKinds.includes(memory.kind)) return `Memory kind ${memory.kind} is not included.`
  if (memory.confidence < policy.minConfidence) return 'Memory confidence is below threshold.'
  if (memory.taskId && memory.taskId !== input.task.id) return 'Memory taskId does not match current task.'
  if (memory.agentId && memory.agentId !== input.agentId) return 'Memory agentId does not match target agent.'
  if (memory.projectId && input.task.projectId && memory.projectId !== input.task.projectId) {
    return 'Memory projectId does not match current task project.'
  }
  return tagExclusionReason(memory.tags, policy)
}

function exclusionReasonForKnowledge(
  item: KnowledgeItem,
  input: { task: { projectId?: string }; agentId: AgentId },
  policy: ContextSelectionPolicy
): string | null {
  if (item.status !== 'approved') return `Knowledge status ${item.status} is not approved.`
  if (!policy.allowedScopes.includes(item.scope)) return `Knowledge scope ${item.scope} is not allowed.`
  if (!policy.includeKnowledgeKinds.includes(item.kind)) return `Knowledge kind ${item.kind} is not included.`
  if (item.agentId && item.agentId !== input.agentId) return 'Knowledge agentId does not match target agent.'
  if (item.projectId && input.task.projectId && item.projectId !== input.task.projectId) {
    return 'Knowledge projectId does not match current task project.'
  }
  return tagExclusionReason(item.tags, policy)
}

function tagExclusionReason(tags: string[], policy: ContextSelectionPolicy): string | null {
  if (policy.excludeTags?.some((tag) => tags.includes(tag))) {
    return 'Record has an excluded tag.'
  }
  if (policy.includeTags?.length && !policy.includeTags.some((tag) => tags.includes(tag))) {
    return 'Record does not have an included tag.'
  }
  return null
}

function deterministicReason(scope: string, agentId?: string, taskId?: string): string {
  if (taskId) return 'Included by exact taskId match.'
  if (agentId) return 'Included by exact agentId match.'
  return `Included by approved ${scope} scope and deterministic policy.`
}

export function mapAgentResultToMemoryCandidates(input: {
  agentResult: AgentResult
  taskId: string
  agentRunId: string
  agentId: AgentId
  selectedFindings?: number[]
  selectedProposedChanges?: number[]
}): Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'>[] {
  assertNoAgentResultSideEffects(input.agentResult)

  const candidates: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'>[] = []
  const findingIndexes =
    input.selectedFindings ??
    input.agentResult.findings.map((_, index) => index)

  for (const index of findingIndexes) {
    const finding = input.agentResult.findings[index]
    if (!finding) continue
    candidates.push(candidate({
      title: `Finding: ${finding.slice(0, 60)}`,
      content: finding,
      kind: 'agent_finding',
      confidence: input.agentResult.confidence,
      tags: ['agent_result', input.agentId],
      input,
    }))
  }

  for (const index of input.selectedProposedChanges ?? []) {
    const change = input.agentResult.proposedChanges[index]
    if (!change) continue
    candidates.push(candidate({
      title: change.title,
      content: change.description,
      kind: proposedChangeKind(change.type),
      confidence: input.agentResult.confidence,
      tags: ['agent_result', input.agentId, change.type],
      input,
    }))
  }

  return candidates
}

function candidate(args: {
  title: string
  content: string
  kind: MemoryEntryKind
  confidence: number
  tags: string[]
  input: {
    agentResult: AgentResult
    taskId: string
    agentRunId: string
    agentId: AgentId
  }
}): Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    status: 'candidate',
    title: args.title,
    content: args.content,
    kind: args.kind,
    scope: 'task',
    taskId: args.input.taskId,
    agentRunId: args.input.agentRunId,
    agentId: args.input.agentId,
    sourceType: 'agent_result',
    sourceId: args.input.agentRunId,
    sourceSnapshot: {
      status: args.input.agentResult.status,
      confidence: args.input.agentResult.confidence,
      summary: args.input.agentResult.summary,
    },
    confidence: args.confidence,
    tags: args.tags,
    proposedBy: 'agent',
  }
}

function proposedChangeKind(type: string): MemoryEntryKind {
  if (type === 'test') return 'workflow_note'
  if (type === 'design' || type === 'requirement') return 'technical_context'
  if (type === 'customer_insight') return 'agent_finding'
  return 'workflow_note'
}

function assertNoAgentResultSideEffects(result: AgentResult) {
  const hasSideEffects =
    result.sideEffects.filesChanged.length > 0 ||
    result.sideEffects.branchesCreated.length > 0 ||
    result.sideEffects.prsCreated.length > 0 ||
    result.sideEffects.issuesUpdated.length > 0
  if (hasSideEffects) {
    throw new MemoryRuleError('AgentResult sideEffects must be empty.')
  }
}

function excerpt(value: string): string {
  return value.length > 500 ? `${value.slice(0, 497)}...` : value
}

function approxTokens(items: ContextPacketItem[]): number {
  return Math.ceil(
    items.reduce(
      (total, item) => total + item.title.length + item.excerpt.length + item.reason.length,
      0
    ) / 4
  )
}
