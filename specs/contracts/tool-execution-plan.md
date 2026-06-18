# Contract: ToolExecutionPlan

Status: proposed for Sprint 11

## Purpose

ToolExecutionPlan is the explicit pre-execution record that explains what one ToolRun is allowed to do, under which executor, sandbox, policy, permission, confirmation, recovery, and idempotency constraints.

It is required before controlled execution.

## Schema

```ts
ToolExecutionPlan {
  id: string
  toolRunId: string
  toolCallId: string
  taskId?: string
  agentRunId?: string
  toolId: string
  executorId: string
  sandboxId: string
  policyId: string

  status:
    | 'draft'
    | 'ready_for_confirmation'
    | 'approved_record'
    | 'rejected'
    | 'expired'

  executionMode: 'deterministic_local'
  sideEffectClass: 'none' | 'simulated_read'
  expectedSideEffects: []
  reversibility: 'not_required' | 'inspect_only'

  idempotencyKey: string
  inputSnapshot: Json
  normalizedInputHash: string
  policyVersion: string
  executorVersion: string

  requiresKelvinConfirmation: boolean
  confirmationArtifactId?: string
  recoveryPointId?: string
  evalRunIds?: string[]
  regressionGateId?: string
  releaseReadinessChecklistId?: string

  expiresAt?: string
  createdAt: string
  updatedAt: string
}
```

## Plan Creation Rules

Allowed:

- create plan from a ToolRun in `awaiting_permission` or `awaiting_confirmation`.
- create plan for `internal_noop`.
- create plan for deterministic `read_simulated` if enabled by policy.

Disallowed:

- create plan for command, Git, file read, file write, PR, deploy, database, external API, MCP, browser, queue, worker, or Agent continuation categories.
- create plan without idempotencyKey.
- create plan with expectedSideEffects non-empty.
- create plan without ToolExecutionPolicy.
- create plan without ToolSandbox.
- execute an expired plan.

## Expiration Rules

- `expiresAt` is optional but recommended for every Sprint 11 ToolExecutionPlan.
- If `expiresAt` is present and is in the past, the plan status must be `expired` before execution can be attempted.
- `expired` plans cannot be approved, confirmed, or executed.
- An expired plan must not be refreshed in place. A new ToolExecutionPlan must be created with a new idempotencyKey or an explicitly revalidated idempotencyKey.
- Expiration does not retry, replay, rollback, or resume execution.

## Safety Invariants

- ToolExecutionPlan is not execution.
- `approved_record` means the plan record is approved for one ToolRun only.
- ToolExecutionPlan must not approve future ToolRuns.
- ToolExecutionPlan must not start AgentRun or complete Task.
- ToolExecutionPlan must not be treated as RecoveryPoint rollback authorization.
- Expired ToolExecutionPlan must not execute.
