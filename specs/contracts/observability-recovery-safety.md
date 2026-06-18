# Contract: Observability / Recovery / Resume Safety

Status: proposed for Sprint 8

## Purpose

This contract defines the hard safety boundary for Sprint 8.

Sprint 8 records and displays observability, audit, recovery snapshots, resume views, and failures only.

## Allowed

- create ObservabilityEvent records.
- query AuditEvent and ObservabilityEvent records.
- create RunJournal entries.
- create RecoveryPoint snapshots.
- create and use view-only ResumeToken records.
- create FailureClassification records.
- display timeline, audit, journal, recovery, resume, and failure UI.

## Forbidden

Sprint 8 must not:

- execute Agent Runtime.
- execute Tool Runtime.
- call MCP.
- call external APIs.
- execute shell commands.
- run Git operations.
- modify, create, patch, format, or delete files.
- create, merge, push, or edit PRs.
- deploy, publish, or release.
- run database migrations.
- delete data.
- start workers or queues.
- send A2A messages.
- dispatch A2A messages.
- start target Agents.
- approve MemoryEntry or KnowledgeItem records.
- approve ToolCall records.
- create ToolCall records from Eval or Resume flows.
- start EvalRun from ResumeToken or RecoveryPoint use.
- change Task, AgentRun, ToolCall, Memory, Knowledge, A2A, or Eval status automatically.

## Forbidden Imports / Paths

Implementation tests should prevent Sprint 8 runtime modules from importing execution paths such as:

- child process modules
- shell / Git execution modules
- file write modules for business effects
- Tool Runtime execution modules
- Agent Runtime start modules
- Memory approval modules
- A2A dispatch modules
- Eval run creation modules from resume paths
- MCP client execution modules
- browser automation modules
- worker / queue modules

## UI Safety

UI must not show:

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

## Acceptance Gates

- RecoveryPoint creation does not mutate target status.
- ResumeToken use does not mutate target status.
- ResumeToken use does not start AgentRun.
- ResumeToken use does not create or execute ToolCall / ToolRun.
- ResumeToken use does not write Memory / Knowledge.
- ResumeToken use does not send A2A.
- ResumeToken use does not start EvalRun.
- Audit query APIs are read-only.
- Timeline query APIs are read-only.

## Sprint 9 Collaboration Observation Boundary

Sprint 8 observability primitives may observe Sprint 9 collaboration records.

Allowed:

- create ObservabilityEvent for CollaborationSession, A2AThread, A2ATurn, HandoffRequest, and CollaborationDecision records.
- create RunJournal entries for local record sequence and lifecycle.
- create sanitized RecoveryPoint snapshots for collaboration records.
- create view-only ResumeToken records for collaboration inspection.
- classify collaboration failures.

Disallowed:

- RecoveryPoint must not restore CollaborationSession, A2AThread, A2ATurn, HandoffRequest, or CollaborationDecision status.
- ResumeToken must not activate CollaborationSession.
- ResumeToken must not create A2ATurn.
- ResumeToken must not approve HandoffRequest or CollaborationDecision.
- RunJournal must not replay collaboration turns.
- FailureClassification must not retry collaboration turns or handoffs.
- ObservabilityEvent must not dispatch A2A, start Agents, execute tools, or complete Task.
