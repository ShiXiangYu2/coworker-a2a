# Contract: Controlled Tool Runtime Safety

Status: proposed for Sprint 11

## Purpose

This contract prevents Sprint 11 Controlled Real Tool Runtime from becoming unrestricted tool execution, shell execution, file mutation, external integration, or autonomous workflow execution.

## Core Boundary

Sprint 11 allows:

- deterministic local `internal_noop` execution.
- optional deterministic local `read_simulated` execution.
- ToolExecutionPlan records.
- ToolExecutionReceipt records.
- ToolExecutionPolicy records.
- ToolSandbox records.
- RecoveryPoint before execution.
- AuditEvent and ObservabilityEvent records.
- explicit user action through `execute-approved`.

Sprint 11 forbids:

- shell.
- Git.
- real file read.
- file write.
- patch.
- format.
- delete.
- PR.
- deploy.
- database migration.
- external API.
- MCP.
- browser automation.
- queue / worker execution.
- retry.
- replay.
- rollback.
- resume execution.
- automatic future approval.
- AgentRun start or continuation.
- Task automatic completion.
- Memory / Knowledge approval.
- A2A dispatch.

## Kelvin Boundary

Kelvin approval may:

- approve one specific ToolRun for one controlled execution.
- write local confirmation record.
- write AuditEvent and ObservabilityEvent.

Kelvin approval must not:

- approve a tool class.
- approve future ToolRuns.
- start AgentRun.
- complete Task.
- authorize shell, Git, file, PR, deploy, delete, external API, MCP, browser, database migration, retry, replay, rollback, or resume execution.

## Recovery Boundary

RecoveryPoint before execution is required.

RecoveryPoint may:

- inspect.
- compare.
- support audit reconstruction.

RecoveryPoint must not:

- rollback automatically.
- restore database state.
- retry execution.
- replay execution.
- resume execution.

## Eval / Readiness Boundary

Eval, RegressionGate, and ReleaseReadiness may:

- provide recommendations.
- provide evidence.
- flag risk.

They must not:

- approve execution.
- become execution tokens.
- mutate ToolRun status automatically.
- create ToolExecutionReceipt.
- trigger `execute-approved`.

## Required Tests

- ToolExecutor cannot import forbidden modules.
- ToolSandbox denies every forbidden capability.
- ToolExecutionPolicy default is deny.
- ToolRun state machine rejects illegal transitions.
- ToolResult.sideEffects non-empty fails.
- `read_simulated` cannot access filesystem, network, database, MCP, browser, environment, or external APIs.
- `execute-approved` cannot execute without ToolPermission, ToolExecutionPlan, RecoveryPoint, and required Kelvin confirmation.
- approval does not start AgentRun.
- approval does not complete Task.
- execution does not write Memory / Knowledge approved records.
- execution does not dispatch A2A.
