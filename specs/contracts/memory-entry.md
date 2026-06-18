# Contract: MemoryEntry

Status: proposed for Sprint 5

## Purpose

MemoryEntry is a dynamic, reviewable record of useful context learned from human input, Harmony Tasks, AgentRun analysis, or system decisions.

Sprint 5 MemoryEntry is local and controlled. It must not sync to external stores, execute tools, or automatically enter Agent prompts.

## Schema

```ts
MemoryEntry {
  id: string
  status: 'candidate' | 'approved' | 'rejected' | 'superseded' | 'archived'

  title: string
  content: string
  kind:
    | 'project_decision'
    | 'agent_finding'
    | 'user_preference'
    | 'safety_rule'
    | 'workflow_note'
    | 'technical_context'
    | 'other'

  scope: 'global' | 'project' | 'task' | 'agent'
  projectId?: string
  taskId?: string
  agentRunId?: string
  agentId?: 'elon' | 'jobs' | 'linus' | 'turing' | 'bezos' | 'kelvin'

  sourceType:
    | 'agent_result'
    | 'human_input'
    | 'task'
    | 'knowledge_item'
    | 'system'
  sourceId?: string
  sourceSnapshot?: Json

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
```

## Status Rules

Allowed transitions:

```text
candidate -> approved
candidate -> rejected
candidate -> archived
approved -> superseded
approved -> archived
rejected -> archived
superseded -> archived
```

Disallowed:

- `rejected -> approved`
- `superseded -> approved`
- `archived -> approved`

Use a new MemoryEntry when a rejected, superseded, or archived record needs replacement.

## Selection Rules

Only `approved` MemoryEntry records can be selected into ContextPacket.

Exclude:

- `candidate`
- `rejected`
- `superseded`
- `archived`
- records below the requested confidence threshold
- records outside the allowed scope
- records with disallowed tags

## Human Review Boundary

Agent-derived MemoryEntry records must start as `candidate`.

Kelvin / Human Owner review is required for:

- safety rules
- user preferences intended to persist across tasks
- product or architecture decisions
- customer-sensitive or privacy-sensitive content
- production, permission, secret, migration, deploy, or external messaging topics

Approval only changes MemoryEntry status. It does not run Agent, Tool Runtime, external API, file writes, Git, PRs, deploys, deletes, or memory sync.

## Audit Events

Required events:

- `memory.candidate_created`
- `memory.approved`
- `memory.rejected`
- `memory.superseded`
- `memory.archived`

## Safety Invariants

- MemoryEntry is local in Sprint 5.
- MemoryEntry must not automatically enter Agent prompts.
- MemoryEntry approval does not trigger AgentRun.
- MemoryEntry approval does not execute tools or external side effects.
- MemoryEntry must not store secrets, API keys, tokens, full environment dumps, or full sensitive file contents.
