# PRD: Sprint 11 - Controlled Real Tool Runtime

Created: 2026-06-16
Status: proposed

## Problem

Sprint 6 introduced ToolCall proposals, ToolPermission, CommandPolicy, Human Confirmation, AuditEvent, and non-execution ToolRun placeholders.

Sprint 10 hardened production security, Agent permission boundaries, redaction, auth, release readiness, and regression gates.

The system is now ready to introduce the first extremely narrow real Tool Runtime, but only for deterministic local tools that are safe, bounded, auditable, idempotent, and side-effect classified.

## Product Goal

Implement this slice:

```text
ToolCall proposal
  -> ToolPermission
  -> ToolRun created
  -> ToolExecutionPlan
  -> RecoveryPoint
  -> Kelvin confirmation when required
  -> execute-approved explicit user action
  -> deterministic local ToolExecutor
  -> ToolExecutionReceipt
  -> ToolResult
  -> AuditEvent / ObservabilityEvent
  -> ChatHub / Task UI display
```

Do not implement this later slice:

```text
ToolRun
  -> shell / Git / file write / patch / format
  -> PR / deploy / delete
  -> external API / MCP / browser automation
  -> database migration
  -> Agent continuation
  -> Task completion
  -> automatic retry / replay / rollback / resume execution
  -> future automatic approval
```

## Scope

Sprint 11 includes:

- ToolExecutor contract.
- ToolSandbox contract.
- ToolExecutionPlan contract.
- ToolExecutionReceipt contract.
- ToolExecutionPolicy contract.
- ToolRun execution state machine contract.
- Controlled Tool Runtime safety contract.
- ToolRun status model upgrade for controlled execution.
- API design for one explicit controlled execution path.
- ChatHub / Task UI entry design.
- AuditEvent and ObservabilityEvent integration.
- RecoveryPoint before execution.
- Eval / RegressionGate / ReleaseReadiness recommendation-only integration.

Sprint 11 does not include:

- shell commands.
- Git operations.
- file read of real workspace files.
- file write, patch, format, or delete.
- PR creation, merge, push, or review automation.
- deploy, release, publish, or infrastructure changes.
- database migration.
- external API calls.
- MCP calls.
- browser automation.
- queue, worker, webhook, or scheduled tool execution.
- AgentRun startup or continuation.
- automatic Task completion.
- automatic retry, replay, rollback, or resume execution.
- automatic approval of future ToolRuns.

## Allowed Tool Categories

Required:

- `internal_noop`

Optional:

- deterministic `read_simulated`

`read_simulated` means reading static fixture or in-memory deterministic data only. It must not read files, network, databases, MCP, browsers, environment variables, secrets, or external systems.

## Required Safety Note

```text
Sprint 11 executes only approved deterministic local no-op or simulated-read tools. It does not run shell, Git, file reads or writes, patches, formatting, PRs, deploys, deletes, external APIs, MCP, browser automation, database migrations, Agent continuation, automatic retry, replay, rollback, resume execution, or Task completion.
```

## Allowed UI Labels

- `Plan Tool Execution`
- `View Execution Plan`
- `Request Permission`
- `Request Kelvin Approval`
- `Approve This ToolRun`
- `Execute Approved Local Tool`
- `Cancel Tool Execution`
- `View Execution Receipt`
- `View Tool Sandbox`
- `View Execution Policy`
- `View Recovery Point`
- `View Audit`
- `View Timeline`

## Disallowed UI Labels

- `Run Command`
- `Run Shell`
- `Apply File Edit`
- `Patch File`
- `Format File`
- `Create PR`
- `Deploy`
- `Delete`
- `Call External API`
- `Invoke MCP`
- `Browse`
- `Auto Approve`
- `Retry Automatically`
- `Replay`
- `Rollback`
- `Resume Execution`
- `Continue Agent`

## Acceptance Criteria

- Only `internal_noop` and optional deterministic `read_simulated` can be executable in Sprint 11.
- ToolExecutionPolicy remains default-deny.
- ToolSandbox denies shell, Git, file read, file write, network, external API, MCP, browser, database migration, and environment reads.
- ToolRun cannot execute without ToolPermission.
- ToolRun cannot execute without ToolExecutionPlan.
- ToolRun cannot execute without RecoveryPoint created before execution.
- ToolRun cannot execute without required Kelvin confirmation.
- `execute-approved` is the only Sprint 11 execution-semantics API and only executes approved deterministic local no-op / read_simulated ToolRuns.
- ToolResult.sideEffects must be an empty array.
- Non-deterministic output must fail.
- Kelvin approval applies only to one ToolRun.
- Kelvin approval does not start AgentRun.
- Kelvin approval does not mark Task completed.
- Eval, RegressionGate, and ReleaseReadiness never approve execution automatically and are not execution tokens.
- RecoveryPoint remains inspect / compare only and cannot rollback, restore, retry, replay, or resume execution.
- Sprint 1-10 behavior does not regress.
