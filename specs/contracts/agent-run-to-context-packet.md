# Contract: AgentRun to ContextPacket

Status: proposed for Sprint 5

## Purpose

This contract defines how a Sprint 4 AgentRun can receive controlled context in Sprint 5.

The flow creates or attaches a ContextPacket only. It does not execute tools, call external APIs, write files, start A2A loops, or auto-complete tasks.

Sprint 5 first implementation should prefer:

```text
Task -> ContextPacket -> AgentRun
```

This avoids retroactively changing the meaning of an AgentRun result.

## Input

```ts
{
  taskId: string
  agentRunId?: string
  agentId: 'elon' | 'jobs' | 'linus' | 'turing' | 'bezos' | 'kelvin'
  selectionPolicy?: {
    maxItems?: number
    maxApproxTokens?: number
    allowedScopes?: string[]
    minConfidence?: number
    includeMemoryKinds?: string[]
    includeKnowledgeKinds?: string[]
    includeTags?: string[]
    excludeTags?: string[]
  }
  idempotencyKey?: string
}
```

## Default Selection Policy

```json
{
  "maxItems": 12,
  "maxApproxTokens": 3000,
  "allowedScopes": ["global", "project", "task", "agent", "sprint"],
  "minConfidence": 0.6,
  "includeMemoryKinds": [
    "project_decision",
    "agent_finding",
    "safety_rule",
    "workflow_note",
    "technical_context"
  ],
  "includeKnowledgeKinds": [
    "product_spec",
    "architecture",
    "agent_profile",
    "safety_policy",
    "workflow",
    "contract",
    "decision_record"
  ]
}
```

## Read Rules

Allowed:

- approved MemoryEntry records matching scope, tags, confidence, and task / agent relevance
- approved KnowledgeItem records matching scope, tags, and task / agent relevance
- current Task summary
- routeDecisionSnapshot summary
- AgentProfile summary

Sprint 5 first implementation must resolve relevance with deterministic rules only:

- exact `taskId`
- exact `agentId`
- matching `projectId`
- allowed `scope`
- matching tags
- `confidence >= minConfidence`
- newer approved records first
- hard cap by `maxItems`
- hard cap by `maxApproxTokens`

Blocked:

- unapproved records
- rejected records
- superseded records
- archived records
- secrets, credentials, environment dumps, and sensitive full file contents
- external API results
- external knowledge source reads
- Obsidian reads
- RAG or vector search
- embeddings
- semantic search
- external knowledge lookup

## AgentRun Timing Rules

Preferred pre-run flow:

```text
Task -> ContextPacket(status = draft) -> AgentRun(inputSnapshot.contextPacketId)
```

Allowed attach flow:

```text
AgentRun(status = created | running | blocked) -> ContextPacket(status = attached)
```

Completed run flow:

```text
AgentRun(status = completed) -> ContextPacket(status = audit_only)
```

Audit-only ContextPacket records must not claim to affect already completed analysis.

Creating or attaching a ContextPacket must not start AgentRun. AgentRun start remains controlled by the Sprint 4 Agent Runtime API.

## Output

```ts
{
  contextPacket: ContextPacket
  auditEvents: AuditEvent[]
}
```

## Idempotency

If `idempotencyKey` is supplied, duplicate requests should return the existing ContextPacket instead of creating another one.

## Safety Invariants

- Creating ContextPacket does not start AgentRun.
- Attaching ContextPacket does not start AgentRun and does not execute Agent analysis.
- ContextPacket content must be explicit and persisted.
- ContextPacket must not silently include all available memory.
- ContextPacket must not call tools, external APIs, shell, Git, file writes, PRs, deploys, deletes, memory sync, embedding, RAG, semantic search, external knowledge lookup, or A2A send paths.
