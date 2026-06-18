# Contract: ToolRun

Status: proposed for Sprint 6

## Purpose

ToolRun is a future-facing record for tool runtime lifecycle.

Sprint 6 uses ToolRun only as a non-execution placeholder or mock-only local record. It must not represent real tool execution.

## Schema

```ts
ToolRun {
  id: string
  toolCallId: string
  taskId?: string
  agentRunId?: string
  toolId: string

  status:
    | 'not_started'
    | 'blocked'
    | 'cancelled'
    | 'skipped'
    | 'mock_completed'
    | 'failed_validation'

  mode: 'proposal_only' | 'mock_only'
  inputSnapshot: Json
  result?: ToolResult

  startedAt?: string // future-only; Sprint 6 implementations must not write this field
  completedAt?: string
  createdAt: string
  updatedAt: string
}
```

## Timestamp Rules

`startedAt` is reserved for a future real Tool Runtime. Sprint 6 implementations must not write `startedAt`, because no tool can start.

`completedAt` may be written only for `mock_completed`, `skipped`, `blocked`, `cancelled`, or `failed_validation` local records. It must not imply real execution.

## Prohibited Statuses

Sprint 6 must not use:

- `running`
- `executed`
- `completed` for real execution
- `side_effect_completed`
- `command_completed`
- `file_written`
- `deployed`

## Safety Invariants

- ToolRun must not call tools.
- ToolRun must not execute shell, Git, file writes, PRs, deploys, deletes, database mutations, external APIs, MCP calls, or browser automation.
- `mock_completed` means local deterministic mock only.
- `mock_completed` must not access filesystem, network, shell, Git, MCP, browser, external API, or database mutation paths.
- Sprint 6 implementations must not write `startedAt`.
- `completedAt` does not imply any external or filesystem side effect.

## Sprint 11 Controlled Execution Upgrade

Sprint 11 upgrades ToolRun for a narrow controlled execution lifecycle.

Additional Sprint 11 fields:

```ts
ToolRun {
  mode: 'proposal_only' | 'mock_only' | 'controlled_execution'
  executionPlanId?: string
  executionReceiptId?: string
  executorId?: string
  sandboxId?: string
  executionPolicyId?: string
  recoveryPointId?: string
  idempotencyKey: string
  sideEffectClass: 'none' | 'simulated_read'
}
```

## Sprint 11 Compatibility Rules

Sprint 6 legacy records remain valid as local records:

- `mode = proposal_only`
- `mode = mock_only`

Only `mode = controlled_execution` may use the Sprint 11 execution state machine.

Legacy `proposal_only` and `mock_only` ToolRuns must not transition directly into:

- `awaiting_permission`
- `awaiting_confirmation`
- `approved_for_execution`
- `executing`
- `succeeded`
- `failed`
- `denied`
- `rejected`

To enter Sprint 11 execution lifecycle, the system must create a new controlled ToolRun record with `mode = controlled_execution`, a fresh idempotencyKey, and links to the source ToolCall. It must not mutate a legacy mock-only record into an execution record.

Sprint 11 statuses:

```ts
status:
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

Sprint 11 `startedAt` may be written only when status changes to `executing` through `execute-approved`.

Sprint 11 `completedAt` may be written only for terminal states:

- `succeeded`
- `failed`
- `cancelled`
- `denied`
- `rejected`

Sprint 11 ToolRun execution is allowed only for approved deterministic local `internal_noop` or `read_simulated` tools.

Sprint 11 ToolRun must not execute shell, Git, file read/write, patch, format, PR, deploy, delete, database migration, external API, MCP, browser automation, Agent continuation, retry, replay, rollback, or resume execution.
