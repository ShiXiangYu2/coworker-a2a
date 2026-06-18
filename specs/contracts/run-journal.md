# Contract: RunJournal

Status: proposed for Sprint 8

## Purpose

RunJournal records stable, ordered lifecycle entries for local runs and record flows.

It is inspired by deterministic journal concepts, but Sprint 8 does not replay journal entries. It only records and displays them.

## Schema

```ts
RunJournal {
  id: string
  schemaVersion: string

  runType:
    | 'chat'
    | 'route_decision'
    | 'task'
    | 'agent_run'
    | 'tool_call'
    | 'eval_run'
    | 'memory_flow'
    | 'knowledge_flow'
    | 'a2a_flow'
    | 'recovery_flow'
    | 'resume_flow'

  runId: string
  correlationId: string
  seq: number

  eventRefType: 'audit_event' | 'observability_event'
  eventRefId: string
  eventId?: string // deprecated compatibility alias for eventRefId
  phase?: string
  stateBefore?: string
  stateAfter?: string

  inputHash?: string
  outputHash?: string
  inputSnapshot?: Json
  outputSnapshot?: Json

  result:
    | 'created'
    | 'started'
    | 'completed'
    | 'blocked'
    | 'failed'
    | 'cancelled'
    | 'skipped'
    | 'recorded'

  failureClassificationId?: string
  createdAt: string
}
```

## Ordering Rule

`seq` must be monotonically increasing per `(runType, runId)`.

Queries must sort by `seq` by default so timeline reconstruction does not depend on database insertion order.

## Event Reference Rule

`eventRefType` and `eventRefId` identify the source event that produced this journal entry.

- `eventRefType = 'audit_event'` means `eventRefId` points to an AuditEvent.
- `eventRefType = 'observability_event'` means `eventRefId` points to an ObservabilityEvent.
- `eventId` may be accepted only as a backward-compatible alias for `eventRefId`; new Sprint 8 code should write `eventRefType` and `eventRefId`.

## Snapshot Rule

Snapshots must be compact and sanitized.

`inputHash` and `outputHash` should be computed from normalized snapshots so implementations can compare drift without storing full sensitive payloads.

## Safety Invariants

- RunJournal is not replayable in Sprint 8.
- RunJournal must not create retry or replay behavior.
- RunJournal must not be accepted as input to retry, replay, restore, or resume execution APIs.
- RunJournal must not automatically continue AgentRun, ToolCall, EvalRun, Memory, Knowledge, A2A, or Task state machines.
