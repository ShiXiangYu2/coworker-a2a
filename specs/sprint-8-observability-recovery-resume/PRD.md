# PRD: Sprint 8 - Observability / Audit Log / Recovery / Resume

Created: 2026-06-16
Status: proposed

## Problem

Sprint 1 delivered ChatHub streaming chat. Sprint 2 delivered CEO Agent Router. Sprint 3 delivered Harmony Task Engine. Sprint 4 delivered analysis-only Agent Runtime. Sprint 5 delivered controlled Memory / Knowledge / local A2A drafts. Sprint 6 delivered ToolCall proposals, Permission evaluation, CommandPolicy, Human Confirmation, and Audit. Sprint 7 delivered Eval / Verification / Quality Gate.

The system now has multiple local lifecycle records, but users still need one trustworthy way to understand what happened across ChatHub, routing, tasks, analysis, memory, tool proposals, and evals.

Sprint 8 introduces a controlled observability, audit, recovery snapshot, and view-only resume layer.

## Product Goal

Implement this slice:

```text
ChatHub / RouteDecision / Harmony Task / AgentRun / Memory / Knowledge / A2A / ToolCall / EvalRun
  -> correlationId
  -> ObservabilityEvent
  -> append-only Audit Log query
  -> RunJournal
  -> RecoveryPoint
  -> ResumeToken
  -> FailureClassification
  -> UI display
```

Do not implement this later slice:

```text
ResumeToken / RecoveryPoint / RunJournal
  -> replay
  -> retry
  -> automatic Task progression
  -> Agent execution
  -> Tool execution
  -> Memory write
  -> A2A dispatch
  -> Eval auto-run
  -> file mutation / PR / deploy / delete
```

## Scope

Sprint 8 includes:

- ObservabilityEvent contract.
- AuditLogQuery contract.
- RunJournal contract.
- RecoveryPoint contract.
- ResumeToken contract.
- FailureClassification contract.
- correlationId propagation contract.
- redaction policy for audit and snapshots.
- view-only resume policy.
- API design for timeline, audit, journal, recovery, resume, and failure queries.
- ChatHub / Task UI entry design.
- Eval and acceptance criteria.

Sprint 8 does not include:

- Agent execution.
- Tool execution.
- MCP or external API calls.
- Shell, Git, file write, PR, deploy, delete, database migration, or destructive mutation.
- Automatic retry, replay, rollback, or restoration.
- Automatic Task, AgentRun, ToolCall, Memory, Knowledge, A2A, or Eval status progression.
- Multi-Agent Collaboration / A2A Runtime.
- Production monitoring SaaS integration.
- Background workers, queues, or schedulers.

## Product Boundaries

Observability means recording and querying local facts about system behavior. It does not mean taking action on those facts.

Audit Log is append-only. Corrections must append new events instead of rewriting prior history.

RecoveryPoint is a sanitized snapshot for inspection and reproducibility. It must not restore database state or trigger execution in Sprint 8.

ResumeToken is view-only. It restores UI context, timeline, audit, and snapshots only. It must not start or continue Agent, Tool, Memory, A2A, or Eval behavior.

## Required Safety Note

```text
Sprint 8 provides observability, audit, recovery snapshots, and view-only resume. It does not execute agents, tools, commands, file edits, PRs, deploys, deletes, external APIs, memory writes, A2A dispatch, eval runs, or automatic state transitions.
```

## Allowed UI Labels

- `View Timeline`
- `View Audit`
- `View Run Journal`
- `View Snapshot`
- `Create View-Only Resume Token`
- `Open Resume View`
- `Inspect Failure`
- `Create Recovery Point`

## Disallowed UI Labels

- `Replay`
- `Retry Automatically`
- `Restore and Run`
- `Resume Execution`
- `Execute from Recovery`
- `Run Tool`
- `Start Agent`
- `Dispatch A2A`
- `Auto Fix`
- `Apply Change`
- `Complete Task`

## Acceptance Criteria

- ChatHub messages create or inherit a correlationId.
- RouteDecision, Harmony Task, AgentRun, MemoryEntry, KnowledgeItem, A2AMessage, ToolCall, ToolPermission, EvalRun, and ConfirmationArtifact records can be queried by correlationId where available.
- ObservabilityEvent records use sanitized payloads.
- Audit queries are read-only and append-only.
- RunJournal entries preserve stable sequence ordering.
- RecoveryPoint stores sanitized snapshots and cannot trigger state restoration or execution.
- ResumeToken is view-only and cannot trigger Agent, Tool, Memory, A2A, or Eval behavior.
- FailureClassification records validation, policy, state transition, confirmation, persistence, timeout, cancelled, and unknown failures.
- UI displays timeline, audit, run journal, recovery points, resume tokens, and failures without execution wording.
- Sprint 1 `/api/chat` SSE does not regress.
- Sprint 2 `/api/agent-router/route` does not regress.
- Sprint 3 Harmony Task Engine does not regress.
- Sprint 4 Agent Runtime does not regress.
- Sprint 5 Memory / Knowledge / local A2A does not regress.
- Sprint 6 Tool Integration / Permission / CommandPolicy does not regress.
- Sprint 7 Eval / Verification / Quality Gate does not regress.
- `npm run lint`, `npm run test`, and `npm run build` pass when implemented.
