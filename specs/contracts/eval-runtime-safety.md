# Contract: Eval Runtime Safety

Status: proposed for Sprint 7

## Purpose

This contract defines the safety boundary for Sprint 7 Eval / Verification / Quality Gate.

Sprint 7 adds verification records and quality gate recommendations. It must not become an implicit Tool Runtime, auto-fix engine, or approval engine.

## Hard Prohibitions

Sprint 7 must not:

- execute shell commands
- execute Git operations
- modify, create, patch, format, or delete files
- create, merge, push, or edit pull requests
- deploy, publish, or release
- run database migrations
- mutate production data
- call external APIs
- invoke MCP tools
- automate browsers
- send emails, chat messages, webhooks, or network A2A messages
- enqueue external jobs
- run background workers
- create ToolCalls automatically
- approve ToolCalls automatically
- approve MemoryEntry or KnowledgeItem records automatically
- send or dispatch A2AMessage records
- start target Agents
- automatically block, complete, cancel, or progress Tasks

## Safe Local Actions

Sprint 7 may:

- create EvalTarget records
- create EvalRun records
- create EvalCheck records
- create EvalFinding records
- attach a recommendation-only QualityGateDecision to EvalRun
- create ConfirmationArtifact records for high-risk findings
- mark findings reviewed, dismissed, or cancelled
- write AuditEvent records
- render ChatHub / Task UI cards

## Approval Boundary

Human approval in Sprint 7 means local Eval / Finding review progression only.

Approval does not authorize:

- tool execution
- shell commands
- Git operations
- file writes
- PRs
- deploys
- deletes
- external APIs
- MCP calls
- browser automation
- Agent continuation
- Task completion
- Memory / Knowledge approval
- A2A sending

## Kelvin Boundary

Kelvin review is required for:

- critical or high severity EvalFinding records
- gate decisions of `blocked` or `needs_human_review`
- findings involving permissions, secrets, production, deploy, database, migration, deletion, external communication, or future side effects
- low-confidence gate decisions on high-risk targets

Kelvin approval still does not execute anything.

## Forbidden Imports / Paths

Sprint 7 implementation should not import or call:

- `child_process`
- filesystem write helpers for product behavior
- Git command wrappers
- Tool Runtime modules
- external API clients
- MCP clients
- browser automation clients
- deploy clients
- database migration runners
- queue workers
- background job runners
- A2A network transport

Tests should verify that Sprint 7 modules do not introduce forbidden side-effect paths.

## Required Safety Acceptance Tests

Sprint 7 acceptance must include tests or static checks proving:

- EvalRun completion does not mutate target record status.
- QualityGateDecision is recommendation-only.
- Kelvin approval does not mutate target records.
- Eval does not create ToolCalls.
- Eval does not approve Memory / Knowledge / A2A / ToolCall records.
- Eval does not send A2A messages.
- UI does not show `Execute Fix`, `Auto Fix`, `Run Tool`, `Apply Change`, `Approve Memory Automatically`, `Send A2A Message`, `Block Task Automatically`, `Complete Task`, or `Deploy`.
- Sprint 7 modules do not import forbidden side-effect paths.

## UI Safety Copy

Required copy:

```text
Sprint 7 records verification checks, findings, and quality gate recommendations only. It does not execute tools, call external APIs, modify files, create PRs, deploy, delete, send A2A messages, approve memory, or automatically change task state.
```

## Sprint 8 Observability Boundary

Sprint 8 may observe Eval records but must not change the Sprint 7 recommendation-only boundary.

Sprint 8 must not:

- start EvalRun from ResumeToken use.
- retry EvalRun from FailureClassification.
- mutate QualityGateDecision.
- mutate EvalFinding review status from audit or recovery views.
- mutate evaluated target status.
- convert `blocked` QualityGateDecision into automatic Task blocking.

Sprint 8 can display Eval timeline, audit, RunJournal entries, RecoveryPoint snapshots, and failures only.
