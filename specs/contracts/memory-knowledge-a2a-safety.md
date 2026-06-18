# Contract: Memory / Knowledge / A2A Safety

Status: proposed for Sprint 5

## Purpose

This contract defines the safety boundary for Sprint 5.

Sprint 5 adds controlled context, local memory candidates, curated knowledge records, and local A2A drafts. It must not become an implicit Tool Runtime or autonomous Agent communication layer.

## Hard Prohibitions

Sprint 5 must not:

- execute shell commands
- execute Git operations
- modify, create, patch, or delete files
- create, merge, push, or edit pull requests
- deploy, publish, or release
- call external APIs
- send emails, chat messages, webhooks, or A2A network messages
- enqueue external jobs
- dispatch A2A messages
- queue A2A messages
- start target Agents from A2AMessage approval
- run autonomous Agent-to-Agent loops
- sync Obsidian, RAG, vector stores, or external knowledge bases
- use embeddings, semantic search, RAG, or external knowledge lookup
- automatically inject all MemoryEntry records into Agent prompts

## Safe Local Actions

Sprint 5 may:

- create local MemoryEntry candidates
- approve / reject / supersede / archive local MemoryEntry records
- create local KnowledgeItem records
- approve / reject / supersede / archive local KnowledgeItem records
- build and persist ContextPacket records
- attach ContextPacket records to AgentRun input snapshots
- create local A2AMessage drafts
- approve / reject / supersede / archive local A2AMessage records
- write AuditEvent records

## Approval Boundary

Human approval in Sprint 5 means local status progression only.

Approval does not authorize:

- Tool Runtime
- external API calls
- message sending
- Agent execution
- file writes
- Git operations
- PRs
- deploys
- deletes
- memory sync
- autonomous loops
- Task status changes, unless the reviewed resource is a Task

## Kelvin Boundary

Kelvin remains the high-risk review owner.

Kelvin review is required for:

- safety policy changes
- permissions, secrets, production, deploy, database, migration, or deletion topics
- global user preference memory
- customer-sensitive knowledge
- external communication drafts
- future Tool Runtime or A2A execution requests

Kelvin approval still does not execute anything.

## Forbidden Imports / Paths

Sprint 5 implementation should not import or call:

- `child_process`
- filesystem write helpers for product behavior
- Git command wrappers
- Tool Runtime modules
- external API clients
- queue workers
- A2A network transport
- embedding clients
- semantic search clients
- Obsidian / RAG / vector database clients

Tests should verify that Sprint 5 modules do not introduce forbidden side-effect paths.

## Required Safety Acceptance Tests

Sprint 5 acceptance must include tests or static checks proving:

- Memory approval does not trigger AgentRun.
- Knowledge approval does not trigger AgentRun.
- A2AMessage approval does not send, dispatch, queue, or start target Agent.
- ContextPacket creation does not start AgentRun.
- ContextPacket attachment does not start AgentRun.
- completed AgentRun can only receive audit-only ContextPacket records.
- UI does not show `Send A2A Message`, `Dispatch`, `Start Agent`, `Execute with Memory`, or `Start A2A Loop`.
- Sprint 5 modules do not import forbidden side-effect paths.

## UI Safety Copy

Required copy:

```text
Sprint 5 records controlled context, memory candidates, knowledge items, and local A2A drafts only. It does not execute tools, call external APIs, send messages, modify files, create PRs, deploy, delete, or start autonomous agent loops.
```

## Sprint 6 Tool Boundary

Sprint 6 adds ToolCall proposal records and permission decisions, but Memory / Knowledge / A2A must still not become implicit Tool Runtime inputs.

MemoryEntry, KnowledgeItem, ContextPacket, and A2AMessage records must not:

- create ToolCall records automatically
- approve ToolCall records automatically
- start ToolRun execution
- run shell commands
- run Git operations
- modify files
- create PRs
- deploy
- delete
- call external APIs
- invoke MCP tools
- automate browsers

ContextPacket content may inform Agent analysis, and Agent analysis may later propose ToolCall candidates. That proposal must still pass Sprint 6 ToolRegistry, CommandPolicy, PermissionProfile, Human Confirmation, and AuditEvent boundaries.

## Sprint 7 Eval Boundary

Sprint 7 may evaluate MemoryEntry, KnowledgeItem, ContextPacket, and A2AMessage records.

Allowed:

- create EvalTarget records for local Memory / Knowledge / A2A / Context records
- create EvalRun, EvalCheck, EvalFinding, and QualityGateDecision records
- recommend Kelvin review for high-risk findings
- display verification results in UI

Disallowed:

- Eval must not approve MemoryEntry or KnowledgeItem records.
- Eval must not send, dispatch, queue, or start Agents from A2AMessage records.
- Eval must not mutate ContextPacket attachment or selection.
- Eval must not create ToolCalls automatically.
- Eval must not call external APIs, Obsidian, RAG, vector stores, semantic search, or external knowledge bases.
- Eval must not execute tools, shell, Git, file writes, PRs, deploys, deletes, or external side effects.

## Sprint 8 Observability Boundary

Sprint 8 may observe MemoryEntry, KnowledgeItem, ContextPacket, and A2AMessage records.

Allowed:

- show Memory / Knowledge / A2A timeline.
- show linked AuditEvent and ObservabilityEvent records.
- create sanitized RecoveryPoint snapshots.
- create view-only ResumeToken records for inspection.
- classify failures.

Disallowed:

- ResumeToken must not approve MemoryEntry or KnowledgeItem records.
- ResumeToken must not send, dispatch, queue, or start Agents from A2AMessage records.
- RecoveryPoint must not restore local record status.
- RunJournal must not replay Memory, Knowledge, ContextPacket, or A2A lifecycle actions.
- FailureClassification must not retry approval, archival, supersede, or A2A review actions.
- Sprint 8 must not call external APIs, Obsidian, RAG, vector stores, semantic search, or external knowledge bases.

## Sprint 9 Collaboration Boundary

Sprint 9 may reference MemoryEntry, KnowledgeItem, ContextPacket, and A2AMessage records inside local collaboration records.

Allowed:

- approved MemoryEntry and KnowledgeItem IDs may be referenced as contextRefs.
- ContextPacket IDs may be referenced for audit and reproducibility.
- A2AMessage `approved_record` may be explicitly selected to create a CollaborationSession.

Disallowed:

- CollaborationSession must not approve MemoryEntry or KnowledgeItem.
- CollaborationDecision must not auto-write MemoryEntry or KnowledgeItem.
- HandoffRequest must not inject unapproved Memory / Knowledge into Agent Runtime.
- A2ATurn must not send, dispatch, queue, or start Agents from A2AMessage records.
- Sprint 9 must not call external APIs, Obsidian, RAG, vector stores, semantic search, or external knowledge bases.

## Sprint 10 Production Hardening Boundary

Sprint 10 may define production security, redaction, auth, release readiness, and regression rules for Memory, Knowledge, ContextPacket, and local A2A records.

Allowed:

- verify approved Memory / Knowledge records are used only through explicit ContextPacket boundaries.
- verify candidate, rejected, superseded, and archived records are not silently injected into prompts.
- verify A2AMessage remains local record only.
- verify blocked payloads do not enter MemoryEntry, KnowledgeItem, ContextPacket, A2AMessage, Agent prompt, Eval evidence, RecoveryPoint, RunJournal, ResumeToken, or AuditEvent payload.
- include sanitized summaries in RegressionGate and ReleaseReadinessChecklist evidence.

Disallowed:

- Sprint 10 must not approve MemoryEntry or KnowledgeItem automatically.
- Sprint 10 must not write approved Memory / Knowledge records.
- Sprint 10 must not perform RAG retrieval, embeddings, vector search, external knowledge sync, Obsidian sync, MCP, or external API calls.
- Sprint 10 must not send, dispatch, queue, or start Agents from A2AMessage.
- Sprint 10 must not auto-inject Memory / Knowledge into Agent prompts.
