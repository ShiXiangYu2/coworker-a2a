# Plan: Sprint 5 - Memory / Knowledge Base / A2A

Status: proposed

## Architecture Decision

Sprint 5 adds a controlled knowledge and context layer:

```text
MemoryEntry / KnowledgeItem
  -> ContextPacket
  -> AgentRun
  -> AgentResult
  -> MemoryEntry candidate / A2AMessage draft
  -> Human review
  -> AuditEvent
```

It stops before:

```text
Tool Runtime
external API calls
cross-process A2A
autonomous loops
file/Git/PR/deploy/delete side effects
```

Sprint 5 first implementation should prefer this execution order:

```text
Task
  -> ContextPacket
  -> AgentRun
```

This keeps context selection explicit before analysis begins. A completed AgentRun may create an audit-only ContextPacket for review, but that packet must not claim to have influenced the already completed analysis.

## Database Recommendation

Add narrow tables:

- `MemoryEntry`
- `KnowledgeItem`
- `ContextPacket`
- `A2AMessage`

Do not add:

- `ToolCall`
- `ToolRun`
- `VectorIndex`
- `Embedding`
- `ExternalKnowledgeSource`
- `ObsidianSync`
- `A2ASession`
- `A2AWorker`
- `MessageQueue`

## Why MemoryEntry and KnowledgeItem Are Separate

`MemoryEntry` is dynamic and often derived from AgentResult or user interaction. It is reviewable, confidence-scored, and may be superseded frequently.

`KnowledgeItem` is curated and more stable. It represents specs, architecture decisions, safety policies, workflows, and approved organizational knowledge.

Keeping them separate prevents low-confidence Agent-derived memory from being treated as stable knowledge.

## Why ContextPacket Should Be Persisted

ContextPacket should be persisted because:

- AgentRun analysis must be reproducible.
- Auditors need to know exactly what context was provided.
- Future evals need to compare result quality against context selection.
- It prevents hidden memory injection and makes context explicit.

ContextPacket persistence does not mean external memory sync or vector storage.

## Module Design

| Module | Responsibility |
| --- | --- |
| Memory contracts | MemoryEntry fields, statuses, lifecycle, and review rules. |
| Knowledge contracts | KnowledgeItem fields, statuses, lifecycle, and review rules. |
| Context builder | Selects approved local context and creates ContextPacket. |
| Context policy | Enforces scope, status, confidence, max item, and token budget rules. |
| AgentResult memory candidate mapper | Converts safe AgentResult content into MemoryEntry candidates. |
| A2A draft recorder | Creates local A2AMessage drafts or approved records. |
| Review boundary | Kelvin / human approval, rejection, supersession, and audit. |
| API | Local persistence and review endpoints only. |
| UI | Context, memory candidate, knowledge, and local A2A draft cards. |
| Tests | Safety, filtering, lifecycle, API, and regression tests. |

## API Plan

All POST APIs should accept an optional `idempotencyKey` when they create or transition a local record. Duplicate requests with the same key and same semantic input should return the existing record bundle.

All mutation APIs should return a structured response:

```ts
{
  ok: true
  data: Json
  auditEvents: AuditEvent[]
}
```

All validation failures should return a structured error:

```ts
{
  ok: false
  error: {
    code: string
    message: string
    details?: Json
  }
}
```

ContextPacket:

```text
POST /api/context-packets/from-task
POST /api/context-packets/from-agent-run
GET  /api/context-packets/:id
GET  /api/agent-runtime/runs/:id/context-packets
```

`POST /api/context-packets/from-task` creates the preferred pre-run ContextPacket for `Task -> ContextPacket -> AgentRun`.

`POST /api/context-packets/from-agent-run` is allowed for:

- attaching context to an AgentRun that has not completed
- creating an audit-only ContextPacket for an already completed AgentRun

Audit-only ContextPacket records must not claim they affected completed analysis.

Memory:

```text
GET  /api/memory
GET  /api/memory/:id
POST /api/memory/candidates/from-agent-result
POST /api/memory/:id/approve
POST /api/memory/:id/reject
POST /api/memory/:id/supersede
POST /api/memory/:id/archive
```

Approve / reject / supersede requests must include `decisionReason`.

Knowledge:

```text
GET  /api/knowledge
GET  /api/knowledge/:id
POST /api/knowledge
POST /api/knowledge/:id/approve
POST /api/knowledge/:id/reject
POST /api/knowledge/:id/supersede
POST /api/knowledge/:id/archive
```

Approve / reject / supersede requests must include `decisionReason`.

A2A local records:

```text
GET  /api/a2a/messages
GET  /api/a2a/messages/:id
POST /api/a2a/messages/draft
POST /api/a2a/messages/:id/submit-review
POST /api/a2a/messages/:id/approve-record
POST /api/a2a/messages/:id/reject
POST /api/a2a/messages/:id/supersede
```

Approve / reject / supersede requests must include `decisionReason`.

No A2A API may dispatch, send, queue, call a transport, or start a target Agent.

List APIs should support filters where applicable:

- `status`
- `taskId`
- `agentRunId`
- `agentId`
- `tag`

## ChatHub / Task UI Plan

AgentResult card adds:

- `Build Context Packet`
- `Create Memory Candidate`
- `Draft A2A Message`

Task card adds:

- linked ContextPacket list
- Memory candidates list
- local A2A drafts list
- required Sprint 5 safety note

Kelvin confirmation card supports:

- MemoryEntry approval / rejection / supersession
- KnowledgeItem approval / rejection / supersession
- A2AMessage local record approval / rejection

UI must not display:

- `Send A2A Message`
- `Dispatch`
- `Start Agent`
- `Execute with Memory`
- `Start A2A Loop`

## Delivery Order

1. Add Sprint 5 specs and contracts.
2. Review specs before implementation.
3. Add data models and validation schemas.
4. Add pure context selection rules.
5. Add AgentResult -> MemoryEntry candidate mapper.
6. Add local A2AMessage draft rules.
7. Add repository and API.
8. Add ChatHub / Task UI.
9. Add tests and acceptance report.

## Acceptance Gate

Sprint 5 can be marked complete only when:

- ContextPacket is explicit, persisted, and auditable.
- ContextPacket includes only approved local MemoryEntry and KnowledgeItem records.
- ContextPacket attach does not start AgentRun.
- AgentResult creates MemoryEntry candidates only.
- A2AMessage is local draft / record only and never sends.
- A2AMessage approval does not dispatch, send, queue, or start target Agent.
- Memory / Knowledge / A2A approval does not trigger AgentRun.
- Kelvin remains the high-risk review boundary.
- no Tool Runtime, external API, Obsidian, RAG, file writes, shell, Git, PR, deploy, delete, or autonomous A2A loop is introduced.
- forbidden imports and forbidden side-effect paths are covered by tests.
- Sprint 1, Sprint 2, Sprint 3, and Sprint 4 regression tests pass.
