# Contract: ToolRun Execution State Machine

Status: proposed for Sprint 11

## Purpose

This contract upgrades ToolRun from Sprint 6 placeholder / mock-only record into a controlled execution lifecycle for Sprint 11.

It only applies to `mode = controlled_execution` ToolRuns for approved deterministic local no-op / read_simulated tools.

## States

```ts
ToolRunExecutionStatus =
  | 'created'
  | 'awaiting_permission'
  | 'awaiting_confirmation'
  | 'approved_for_execution'
  | 'executing'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'denied'
  | 'rejected'
```

## Allowed Transitions

```text
created -> awaiting_permission

awaiting_permission -> awaiting_confirmation
awaiting_permission -> denied

awaiting_confirmation -> approved_for_execution
awaiting_confirmation -> rejected

approved_for_execution -> executing

executing -> succeeded
executing -> failed
executing -> cancelled
```

Terminal states:

```text
succeeded
failed
cancelled
denied
rejected
```

## Transition Requirements

`created -> awaiting_permission`:

- ToolRun exists.
- ToolCall exists.
- Tool category is recognized.
- ToolRun mode is `controlled_execution`.
- ToolRun is not a legacy Sprint 6 `proposal_only` or `mock_only` record.

`awaiting_permission -> awaiting_confirmation`:

- ToolPermission decision is exactly `allow_controlled_execution` or `requires_human` for a ToolRun that otherwise qualifies for controlled execution.
- ToolPermission decision `allow_record_only` must not enter the execution chain.
- ToolExecutionPlan exists or can be created.

`awaiting_permission -> denied`:

- policy denies or blocks execution.
- ToolPermission decision is `allow_record_only`, `deny`, or `blocked`.

`awaiting_confirmation -> approved_for_execution`:

- Kelvin approval exists when required.
- approval references this exact ToolRun.
- RecoveryPoint exists.
- ToolExecutionPlan is approved.

`approved_for_execution -> executing`:

- explicit user action through `execute-approved`.
- ToolExecutionPolicy allows category.
- ToolSandbox denies all forbidden capabilities.
- ToolExecutionPlan is not expired.
- RecoveryPoint reason is `before_tool_execution`.
- idempotencyKey exists.
- expectedSideEffects is empty.

`executing -> succeeded`:

- ToolExecutor returns deterministic ToolResult.
- ToolResult.sideEffects is empty.

`executing -> failed`:

- validation fails.
- executor fails.
- non-deterministic output detected.
- sideEffects non-empty.

`executing -> cancelled`:

- cancellation is requested before completion.

## Forbidden States

Sprint 11 must not introduce:

- `retrying`
- `replaying`
- `rolling_back`
- `restoring`
- `resuming`
- `agent_continuing`
- `side_effect_completed`
- `file_written`
- `command_completed`
- `deployed`

## Safety Invariants

- ToolRun cannot execute directly from `created`.
- ToolRun cannot execute directly from `awaiting_permission`.
- ToolRun cannot execute directly from `awaiting_confirmation`.
- `allow_record_only` cannot execute.
- Legacy `proposal_only` and `mock_only` ToolRuns cannot use this state machine.
- Terminal states cannot transition.
- Approval for one ToolRun cannot apply to another ToolRun.
- ToolRun status must not mutate Task completed.
- ToolRun status must not start AgentRun.
