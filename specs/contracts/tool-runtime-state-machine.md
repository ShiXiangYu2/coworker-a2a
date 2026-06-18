# Contract: Tool Runtime State Machine

Status: proposed for Sprint 6

## Purpose

This contract defines legal ToolCall and ToolRun state transitions.

Sprint 6 state machines must prevent execution semantics.

## ToolCall State Machine

```text
proposed
  -> permission_denied
  -> pending_confirmation
  -> approved_record
  -> rejected
  -> cancelled
  -> blocked

pending_confirmation
  -> approved_record
  -> rejected
  -> cancelled

approved_record
  -> cancelled

blocked
  -> cancelled
```

## ToolRun State Machine

```text
not_started
  -> skipped
  -> blocked
  -> cancelled
  -> mock_completed
  -> failed_validation
```

## Illegal Transitions

ToolCall must reject:

```text
approved_record -> running
approved_record -> executed
pending_confirmation -> running
proposed -> executed
permission_denied -> approved_record
rejected -> approved_record
```

ToolRun must reject:

```text
not_started -> running
running -> completed
mock_completed -> side_effect_completed
blocked -> running
cancelled -> running
```

## Event Names

Allowed ToolCall transition events:

- `EVALUATE_PERMISSION`
- `REQUIRE_CONFIRMATION`
- `DENY_PERMISSION`
- `BLOCK_TOOL_CALL`
- `APPROVE_RECORD`
- `REJECT_TOOL_CALL`
- `CANCEL_TOOL_CALL`

Allowed ToolRun transition events:

- `SKIP_TOOL_RUN`
- `BLOCK_TOOL_RUN`
- `CANCEL_TOOL_RUN`
- `COMPLETE_MOCK_RUN`
- `FAIL_VALIDATION`

## Safety Invariants

- No state transition may execute a tool.
- No state transition may start shell, Git, file writes, PRs, deploys, deletes, database mutations, external APIs, MCP calls, browser automation, queues, or workers.
- `approved_record` is an audit status only.
- `mock_completed` is a local deterministic mock status only.
