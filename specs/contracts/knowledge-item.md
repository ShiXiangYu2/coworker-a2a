# Contract: KnowledgeItem

Status: proposed for Sprint 5

## Purpose

KnowledgeItem is a curated, stable local knowledge record such as product specs, architecture notes, Agent role contracts, safety policies, workflow definitions, or decision records.

KnowledgeItem is separate from MemoryEntry because curated knowledge has a different trust level, lifecycle, and review expectation than dynamic Agent-derived memory.

## Schema

```ts
KnowledgeItem {
  id: string
  status: 'draft' | 'approved' | 'rejected' | 'superseded' | 'archived'

  title: string
  content: string
  kind:
    | 'product_spec'
    | 'architecture'
    | 'agent_profile'
    | 'safety_policy'
    | 'workflow'
    | 'contract'
    | 'decision_record'
    | 'other'

  scope: 'global' | 'project' | 'sprint' | 'agent'
  projectId?: string
  sprint?: string
  agentId?: 'elon' | 'jobs' | 'linus' | 'turing' | 'bezos' | 'kelvin'

  sourceType: 'manual' | 'spec' | 'memory_promoted' | 'system'
  sourcePath?: string
  sourceId?: string
  sourceSnapshot?: Json

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
```

## Status Rules

Allowed transitions:

```text
draft -> approved
draft -> rejected
draft -> archived
approved -> superseded
approved -> archived
rejected -> archived
superseded -> archived
```

Use a new KnowledgeItem version when replacing approved or superseded knowledge.

## Selection Rules

Only `approved` KnowledgeItem records can be selected into ContextPacket.

Exclude:

- `draft`
- `rejected`
- `superseded`
- `archived`
- records outside the allowed scope
- records with disallowed tags

## Source Boundary

Sprint 5 KnowledgeItem records are local. They may reference local specs through `sourcePath`, but Sprint 5 does not implement:

- Obsidian sync
- RAG
- embeddings
- vector database
- web crawler
- external importer
- external API calls

## Audit Events

Required events:

- `knowledge.created`
- `knowledge.approved`
- `knowledge.rejected`
- `knowledge.superseded`
- `knowledge.archived`

## Safety Invariants

- KnowledgeItem approval does not trigger AgentRun.
- KnowledgeItem approval does not execute tools or side effects.
- KnowledgeItem must not store secrets, API keys, tokens, full environment dumps, or full sensitive file contents.
