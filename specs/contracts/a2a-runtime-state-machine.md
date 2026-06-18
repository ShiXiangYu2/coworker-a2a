# Contract: A2A Runtime State Machine

Status: proposed for Sprint 9

## CollaborationSession Transitions

Allowed:

```text
draft -> queued_for_review
draft -> active
draft -> cancelled
queued_for_review -> active
queued_for_review -> rejected
queued_for_review -> cancelled
active -> paused
active -> waiting_human
active -> completed_record
active -> blocked
active -> cancelled
active -> superseded
paused -> active
paused -> cancelled
waiting_human -> active
waiting_human -> blocked
completed_record -> archived
completed_record -> superseded
superseded -> archived
blocked -> archived
rejected -> archived
cancelled -> archived
```

Terminal-ish local record states:

```text
completed_record, blocked, rejected, cancelled, archived
```

`completed_record` does not mean Harmony Task completed.

## A2AThread Transitions

Allowed:

```text
draft -> open
draft -> cancelled
open -> waiting_human
open -> closed_record
open -> blocked
open -> cancelled
waiting_human -> open
waiting_human -> blocked
closed_record -> archived
blocked -> archived
cancelled -> archived
```

## A2ATurn Transitions

Allowed:

```text
draft -> recorded
draft -> queued_for_review
draft -> archived
recorded -> queued_for_review
recorded -> approved_record
queued_for_review -> approved_record
queued_for_review -> rejected
approved_record -> superseded
approved_record -> archived
rejected -> archived
superseded -> archived
```

## HandoffRequest Transitions

Allowed:

```text
draft -> queued_for_review
draft -> approved_record
draft -> cancelled
queued_for_review -> approved_record
queued_for_review -> rejected
approved_record -> superseded
approved_record -> archived
rejected -> archived
cancelled -> archived
superseded -> archived
```

## CollaborationDecision Transitions

Allowed:

```text
draft -> queued_for_review
draft -> approved_record
draft -> archived
queued_for_review -> approved_record
queued_for_review -> rejected
approved_record -> superseded
approved_record -> archived
rejected -> archived
superseded -> archived
```

## Forbidden Automatic Transitions

No Sprint 9 transition may automatically:

- create next A2ATurn.
- start AgentRun.
- create or execute ToolCall / ToolRun.
- dispatch A2AMessage.
- write Memory / Knowledge approved records.
- mark Task completed.
- start EvalRun.
- restore RecoveryPoint.
- use ResumeToken to continue execution.

## Open Record Rule

The API operation formerly described as `activate` should be named `open-record`.

`open-record` means:

- local CollaborationSession status may move to `active`.
- local AuditEvent and ObservabilityEvent may be written.

`open-record` must not:

- create AgentRun.
- create A2ATurn.
- create ToolCall or ToolRun.
- mutate Task status.
- send, dispatch, enqueue, deliver, or call external systems.
