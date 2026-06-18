# Contract: ToolRegistry

Status: proposed for Sprint 6

## Purpose

ToolRegistry is the local catalog of ToolDefinition records available for proposal and policy evaluation.

Sprint 6 ToolRegistry does not execute tools.

## Schema

```ts
ToolRegistry {
  id: string
  version: string
  defaultMode: 'default_deny'
  defaultPermissionProfileRef: string
  tools: ToolDefinition[]
  updatedAt: string
}
```

## Lookup Rules

- Lookup by `id` first.
- Lookup by `name` may be supported for UI and mapper convenience.
- Unknown tools must be rejected or blocked.
- Disabled tools must be rejected or blocked.
- A registered tool with `sprint6Mode = proposal_only` can create a ToolCall proposal but cannot execute.
- A registered tool with `sprint6Mode = mock_only` can create a mock-only ToolRun record but cannot execute side effects.

## Required Initial Categories

Sprint 6 may define these categories even if most are blocked:

- `internal_noop`
- `read`
- `write`
- `command`
- `git`
- `pr`
- `deploy`
- `database`
- `external_api`
- `mcp`
- `browser`

## Safety Invariants

- Registry absence must never be treated as allow.
- Registry match must still pass CommandPolicy evaluation.
- Registry entries must not perform dynamic imports or runtime execution.
- ToolRegistry update is out of scope for Sprint 6 unless performed through code review.

## Sprint 11 Controlled Execution Boundary

Sprint 11 ToolRegistry may expose executable metadata only for:

- `internal_noop`
- deterministic `read_simulated`

Registry lookup is necessary but not sufficient for execution.

Before execution, the system must also validate:

- ToolExecutionPolicy.
- ToolExecutor.
- ToolSandbox.
- ToolPermission.
- ToolExecutionPlan.
- RecoveryPoint.
- Kelvin confirmation when required.
- ToolRun state machine.

ToolRegistry must not dynamically import executors. Executors must be resolved through a separate controlled ToolExecutor registry.

Unknown, disabled, open-world, destructive, command, Git, file, PR, deploy, database, external API, MCP, browser, queue, worker, retry, replay, rollback, or Agent continuation tools must not execute in Sprint 11.
