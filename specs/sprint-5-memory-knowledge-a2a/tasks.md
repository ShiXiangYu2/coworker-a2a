# Tasks: Sprint 5 - Memory / Knowledge Base / A2A

Status: proposed

## TASK-001: MemoryEntry Contract

Priority: high

Create the MemoryEntry contract.

Acceptance criteria:

- Defines fields, statuses, source metadata, scope, confidence, and supersession links.
- Default Agent-derived MemoryEntry status is `candidate`.
- Approved memory can be selected into ContextPacket.
- Rejected, superseded, and archived memory cannot be selected.
- Memory lifecycle actions require AuditEvent records.

## TASK-002: KnowledgeItem Contract

Priority: high

Create the KnowledgeItem contract.

Acceptance criteria:

- Defines fields, statuses, versioning, source metadata, scope, and supersession links.
- KnowledgeItem is separate from MemoryEntry.
- Approved knowledge can be selected into ContextPacket.
- Rejected, superseded, and archived knowledge cannot be selected.
- Knowledge lifecycle actions require AuditEvent records.

## TASK-003: ContextPacket Contract

Priority: high

Create the ContextPacket contract.

Acceptance criteria:

- ContextPacket is persisted.
- Stores selected context snapshots, reasons, selection policy, and excluded item summaries.
- Can link to Task and AgentRun.
- Does not automatically inject all memory.
- Does not call external memory, RAG, Obsidian, or APIs.

## TASK-004: AgentRun to ContextPacket Rules

Priority: high

Define context selection for AgentRun.

Acceptance criteria:

- Only approved MemoryEntry and KnowledgeItem records can be selected.
- Scope, tag, confidence, max item, and token budget rules are documented.
- Candidate, rejected, superseded, and archived records are excluded.
- Selection is explicit and auditable.
- Context selection does not start AgentRun automatically.

## TASK-005: AgentResult to MemoryEntry Candidate Rules

Priority: high

Define how AgentResult can propose memory.

Acceptance criteria:

- AgentResult can create MemoryEntry candidates only.
- It cannot create approved MemoryEntry records.
- High-risk content requires Kelvin / human review.
- AgentResult with non-empty sideEffects cannot create approved memory.
- Memory candidates preserve source AgentRun and AgentResult snapshot metadata.

## TASK-006: A2AMessage Local Draft Contract

Priority: high

Create the A2AMessage contract.

Acceptance criteria:

- A2AMessage is local draft / record only in Sprint 5.
- Approval does not send the message.
- Approval does not start target Agent.
- Approval does not call external APIs or queues.
- A2A lifecycle actions require AuditEvent records.

## TASK-007: Human Confirmation Boundary

Priority: high

Extend confirmation rules for Memory, Knowledge, and A2A.

Acceptance criteria:

- Kelvin remains the high-risk review boundary.
- Approval changes local record status only.
- Approval does not authorize tools, external APIs, message sending, Agent execution, or memory sync.
- Rejection and supersession are auditable.

## TASK-008: API Design

Priority: medium

Design APIs for local records and review flows.

Acceptance criteria:

- APIs cover ContextPacket, MemoryEntry, KnowledgeItem, and A2AMessage local records.
- APIs return structured errors.
- APIs write AuditEvent records for state changes.
- APIs do not invoke tools, external APIs, Agent autonomous loops, or file/Git operations.

## TASK-009: ChatHub / Task UI

Priority: medium

Design UI entry points.

Acceptance criteria:

- AgentResult card supports `Build Context Packet`, `Create Memory Candidate`, and `Draft A2A Message`.
- UI never says `Send A2A Message`, `Execute with Memory`, or `Start A2A Loop`.
- UI shows the required Sprint 5 safety note.
- Kelvin review UI makes approval boundaries explicit.

## TASK-010: Tests and Regression

Priority: high

Plan tests after implementation.

Acceptance criteria:

- Context selection tests pass.
- Memory lifecycle tests pass.
- Knowledge lifecycle tests pass.
- A2A local draft lifecycle tests pass.
- AuditEvent tests pass.
- Safety tests verify no Tool Runtime, external API, file write, shell, Git, PR, deploy, delete, or autonomous A2A path.
- Sprint 1 `/api/chat` SSE regression passes.
- Sprint 2 `/api/agent-router/route` regression passes.
- Sprint 3 Harmony Task Engine regression passes.
- Sprint 4 Agent Runtime regression passes.

## Sprint 5 Non-goals

Do not implement:

- Tool Runtime.
- shell commands.
- Git operations.
- file modification, creation, deletion, or patching.
- PR creation, merge, push, deploy, publish, or release.
- external API calls.
- Obsidian integration.
- RAG, embeddings, vector database, crawler, importer, or external knowledge sync.
- real cross-process A2A communication.
- autonomous Agent-to-Agent loops.
- automatic target Agent start from A2AMessage.
- automatic task completion.
- automatic memory injection into Agent prompts.
