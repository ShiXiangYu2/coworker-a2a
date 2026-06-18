# PRD: Sprint 9 - Multi-Agent Collaboration / A2A Runtime

Created: 2026-06-16
Status: proposed

## Problem

Sprint 5 introduced local A2AMessage drafts and approved records. Sprint 8 added observability, audit, recovery snapshots, and view-only resume.

The system can now record local A2A intent, but it still lacks a controlled way to organize multiple Agents around one task, one handoff, or one review flow.

Sprint 9 introduces a local, human-gated collaboration layer.

## Product Goal

Implement this slice:

```text
A2AMessage approved_record / Harmony Task / AgentRun
  -> explicit user action
  -> CollaborationSession
  -> A2AThread
  -> A2ATurn
  -> HandoffRequest
  -> CollaborationDecision
  -> AuditEvent / ObservabilityEvent / RunJournal / RecoveryPoint / EvalTarget
  -> ChatHub / Task UI display
```

Do not implement this later slice:

```text
CollaborationSession / A2ATurn / HandoffRequest
  -> autonomous loop
  -> cross-process message dispatch
  -> start target Agent
  -> execute Tool
  -> write files / Git / PR / deploy / delete
  -> external API / MCP
  -> automatic Task completion
```

## Scope

Sprint 9 includes:

- AgentTeam contract.
- CollaborationSession contract.
- A2AThread contract.
- A2ATurn contract.
- HandoffRequest contract.
- CollaborationDecision contract.
- A2A Runtime state machine contract.
- A2A collaboration safety contract.
- API design for local collaboration records.
- ChatHub / Task UI entry design.
- Sprint 8 Observability / Audit / Recovery / Resume integration.
- Sprint 7 Eval / Quality Gate integration.

Sprint 9 does not include:

- true cross-process A2A communication.
- autonomous Agent loops.
- automatic next turns.
- AgentRun execution from collaboration approval.
- Tool execution.
- external API, MCP, webhooks, queues, or workers.
- shell, Git, file writes, PRs, deploys, deletes, or database migrations.
- automatic Memory / Knowledge approval.
- automatic Task completion.

## Product Boundaries

A2A Runtime in Sprint 9 means local controlled orchestration records only.

`active` CollaborationSession means the collaboration record is open for local turn recording. It does not mean Agents are running.

`approved_record` CollaborationDecision means Kelvin or the user approved the local record. It does not authorize execution, message dispatch, or Task completion.

## Required Safety Note

```text
Sprint 9 records local multi-Agent collaboration, handoff, review, and decision records only. It does not send A2A messages, start Agents, run tools, call external APIs, modify files, create PRs, deploy, delete, or continue autonomous loops.
```

## Allowed UI Labels

- `Create Collaboration Session`
- `Create Collaboration Record`
- `Add Local Turn`
- `Request Handoff Review`
- `Review Collaboration Decision`
- `Approve Local Record`
- `View Collaboration Timeline`
- `View Handoff`
- `View Decision`
- `View Audit`
- `View Resume Context`

## Disallowed UI Labels

- `Send A2A Message`
- `Dispatch`
- `Start Agent`
- `Auto Continue`
- `Execute`
- `Run Tool`
- `Start A2A Loop`
- `Resume Execution`
- `Complete Task`
- `Deploy`

## Acceptance Criteria

- A2AMessage `approved_record` can become a CollaborationSession only through explicit user/API action.
- CEO collaboration plans create local records only and do not start Agents.
- CollaborationSession, A2AThread, A2ATurn, HandoffRequest, and CollaborationDecision are persisted as auditable local records.
- A2ATurn ordering is deterministic within an A2AThread.
- No transition automatically creates the next A2ATurn.
- Kelvin approval only changes local collaboration record status.
- A2A Runtime does not execute Tool Runtime, Agent Runtime, shell, Git, file write, PR, deploy, delete, external API, MCP, worker, queue, or browser automation.
- Collaboration records are visible in ChatHub / Task UI with Sprint 9 safety copy.
- Sprint 8 Observability / Audit / Recovery / Resume can inspect collaboration records but remains view-only.
- Sprint 7 Eval can evaluate collaboration records but remains recommendation-only.
- Sprint 1 `/api/chat` SSE does not regress.
- Sprint 2 Router does not regress.
- Sprint 3 Harmony Task Engine does not regress.
- Sprint 4 Agent Runtime does not regress.
- Sprint 5 Memory / Knowledge / local A2A does not regress.
- Sprint 6 ToolCall proposal / Permission / CommandPolicy does not regress.
- Sprint 7 Eval / Verification / Quality Gate does not regress.
- Sprint 8 Observability / Audit / Recovery / Resume does not regress.

