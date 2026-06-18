# PRD: Sprint 5 - Memory / Knowledge Base / A2A

Created: 2026-06-15
Status: proposed

## Problem

Sprint 1 delivered ChatHub streaming chat. Sprint 2 delivered CEO Agent Router. Sprint 3 delivered Harmony Task Engine. Sprint 4 delivered an analysis-only Agent Runtime that can produce structured AgentResult records without tools or side effects.

The system can now route work, create auditable tasks, and run controlled Agent analysis. It still lacks a safe way to provide reusable context to AgentRun, capture useful learnings as reviewable memory, and represent Agent-to-Agent collaboration intent without starting autonomous execution.

Sprint 5 introduces a controlled knowledge and context layer.

## Product Goal

Implement this slice:

```text
approved MemoryEntry / KnowledgeItem
  -> ContextPacket
  -> AgentRun input context
  -> AgentResult
  -> MemoryEntry candidate / local A2AMessage draft
  -> Human review / AuditEvent
  -> UI
```

Do not implement this later slice:

```text
Memory / A2A
  -> Tool Runtime
  -> external API
  -> cross-process Agent messaging
  -> autonomous loop
  -> file/Git/PR/deploy/delete side effects
```

## Users

- ChatHub user: wants Agent analysis to use relevant approved context without hidden memory pollution.
- Human Chairman / Kelvin: reviews high-risk memory and A2A records.
- Agent Runtime: reads explicit ContextPacket records and produces structured analysis.
- Future Tool Runtime / A2A Runtime: needs clean boundaries before any side effects are introduced.

## Scope

Sprint 5 includes:

- MemoryEntry contract and lifecycle.
- KnowledgeItem contract and lifecycle.
- ContextPacket contract and AgentRun context attachment rules.
- A2AMessage local draft / record contract.
- AgentRun -> ContextPacket read rules.
- AgentResult -> MemoryEntry candidate rules.
- Human confirmation rules for Memory, Knowledge, and A2A.
- API design for local persistence and review.
- ChatHub / Task UI entry design.
- Eval and acceptance criteria.

Sprint 5 does not include:

- Tool Runtime.
- Shell commands.
- Git operations.
- File modification, creation, deletion, or patching.
- Pull request creation, merge, push, deploy, publish, or release.
- External API calls.
- Obsidian integration.
- RAG, embeddings, vector search, crawler, importer, or external knowledge sync.
- Real cross-process A2A communication.
- Autonomous Agent-to-Agent loops.
- Automatic task completion.
- Automatic AgentRun start from A2AMessage approval.

## Core User Stories

1. As a user, I can build a ContextPacket for an AgentRun from approved MemoryEntry and KnowledgeItem records.
2. As a user, I can see exactly which context items were included and why.
3. As Kelvin, I can approve, reject, supersede, or archive MemoryEntry and KnowledgeItem records.
4. As an Agent Runtime user, I can create MemoryEntry candidates from AgentResult without directly approving them.
5. As a user, I can draft a local A2AMessage to represent an Agent handoff or review request without sending it.
6. As a developer, I can audit every Memory, Knowledge, ContextPacket, and local A2A status change.
7. As a developer, I can verify that Sprint 5 does not introduce tools, external APIs, file writes, Git, PRs, deploys, deletes, or autonomous loops.

## Product Boundaries

Memory:

- Dynamic, task-derived, agent-derived, or human-proposed context.
- Starts as `candidate` unless explicitly created by a trusted human flow.
- Must be reviewable and auditable.
- Must support rejection and supersession.

Knowledge Base:

- Curated, stable knowledge such as product decisions, architecture notes, safety rules, or Agent role contracts.
- Separated from MemoryEntry because its lifecycle and trust level are different.
- Sprint 5 stores local KnowledgeItem records only. It does not connect to external knowledge stores.

ContextPacket:

- A persisted, reproducible packet of selected context for a specific AgentRun or planned AgentRun.
- Built explicitly by user action or controlled API.
- Must not silently inject all approved memory into prompts.

A2A:

- Sprint 5 A2A means local message draft / record only.
- Approval marks a record as locally approved.
- Approval does not send a message, start another Agent, call an API, or enter an autonomous loop.

## UI Copy

Required safety note:

```text
Sprint 5 records controlled context, memory candidates, knowledge items, and local A2A drafts only. It does not execute tools, call external APIs, send messages, modify files, create PRs, deploy, delete, or start autonomous agent loops.
```

Allowed labels:

- `Build Context Packet`
- `Create Memory Candidate`
- `Draft A2A Message`
- `Approve Memory Record`
- `Approve Local A2A Record`

Disallowed labels:

- `Send A2A Message`
- `Execute with Memory`
- `Run Tools`
- `Sync Knowledge Base`
- `Start A2A Loop`

## Acceptance Criteria

- ContextPacket can be built from approved MemoryEntry and KnowledgeItem records.
- ContextPacket persists selected item snapshots, reasons, and selection policy.
- Candidate, rejected, superseded, and archived records are excluded from ContextPacket.
- AgentResult can create MemoryEntry candidates only; it cannot directly approve memory.
- MemoryEntry approve, reject, supersede, and archive actions write AuditEvent records.
- KnowledgeItem approve, reject, supersede, and archive actions write AuditEvent records.
- A2AMessage remains a local draft / local record only.
- A2AMessage approval does not send messages, start Agents, or call external APIs.
- Kelvin remains the high-risk review boundary.
- `/api/chat` SSE does not regress.
- `/api/agent-router/route` does not regress.
- Sprint 3 Harmony Task Engine does not regress.
- Sprint 4 Agent Runtime does not regress.
- `npm run lint`, `npm run test`, and `npm run build` pass when implemented.
