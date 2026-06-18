# Contract: ContextPacket

Status: proposed for Sprint 5

## Purpose

ContextPacket is a persisted, explicit, reproducible bundle of context selected for an AgentRun.

It prevents hidden memory injection by recording exactly which MemoryEntry and KnowledgeItem records were offered to an Agent analysis run, why they were selected, and which selection policy was used.

## Schema

```ts
ContextPacket {
  id: string
  idempotencyKey?: string
  taskId: string
  agentRunId?: string
  agentId: 'elon' | 'jobs' | 'linus' | 'turing' | 'bezos' | 'kelvin'

  status: 'draft' | 'attached' | 'audit_only' | 'superseded'
  purpose: 'agent_analysis'

  selectionPolicy: {
    maxItems: number
    maxApproxTokens: number
    allowedScopes: ('global' | 'project' | 'task' | 'agent' | 'sprint')[]
    minConfidence: number
    includeMemoryKinds: string[]
    includeKnowledgeKinds: string[]
    includeTags?: string[]
    excludeTags?: string[]
  }

  items: {
    sourceType: 'memory_entry' | 'knowledge_item' | 'task' | 'route_decision' | 'agent_profile'
    sourceId: string
    title: string
    excerpt: string
    reason: string
    confidence?: number
    tags: string[]
  }[]

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
```

## Recommended Sprint 5 Sequence

Sprint 5 first implementation should prefer:

```text
Task -> ContextPacket -> AgentRun
```

This means context selection happens before Agent analysis and can be recorded in `AgentRun.inputSnapshot`.

If an AgentRun is already `completed`, Sprint 5 may create a ContextPacket with:

```text
ContextPacket.status = audit_only
```

An audit-only ContextPacket is for review and reproducibility analysis only. It must not claim to have influenced the completed AgentRun.

## Creation Rules

ContextPacket creation must be explicit:

- by user action such as `Build Context Packet`
- by a controlled API call
- by a future reviewed runtime step that still records the ContextPacket before Agent analysis

ContextPacket creation must not automatically start AgentRun unless a later sprint explicitly designs that flow.

## Selection Rules

Allowed sources:

- `MemoryEntry.status = approved`
- `KnowledgeItem.status = approved`
- current Task summary
- routeDecisionSnapshot summary
- AgentProfile summary

Sprint 5 first implementation must use deterministic selection rules only:

- exact `taskId`
- exact `agentId`
- matching `projectId`
- allowed `scope`
- matching tags
- `confidence >= minConfidence`
- newer approved records first
- hard cap by `maxItems`
- hard cap by `maxApproxTokens`

Disallowed sources:

- candidate MemoryEntry
- rejected MemoryEntry
- superseded MemoryEntry
- archived MemoryEntry
- draft KnowledgeItem
- rejected KnowledgeItem
- superseded KnowledgeItem
- archived KnowledgeItem
- external API results
- Obsidian / RAG / vector search results
- embeddings
- semantic search
- external knowledge lookup
- raw file contents
- secrets or credentials

## Attachment Rules

`draft` ContextPacket can be attached to an AgentRun.

Attachment changes:

```text
ContextPacket.status = attached
ContextPacket.attachedAt = now
ContextPacket.attachedToAgentRunId = AgentRun.id
AgentRun.inputSnapshot.contextPacketId = ContextPacket.id
AuditEvent(context_packet.attached)
```

Attaching a ContextPacket does not start AgentRun, execute Agent analysis, execute tools, write memory, start A2A, or complete the Task.

## Audit Events

Required events:

- `context_packet.created`
- `context_packet.attached`
- `context_packet.superseded`

## Safety Invariants

- ContextPacket must be persisted for audit and reproducibility.
- ContextPacket must not silently include all available memory.
- ContextPacket must not include unapproved memory or knowledge.
- ContextPacket must not call external APIs.
- ContextPacket must not use embeddings, RAG, semantic search, or external knowledge lookup in Sprint 5.
- ContextPacket attach must not start AgentRun.
- ContextPacket must not execute tools or side effects.
