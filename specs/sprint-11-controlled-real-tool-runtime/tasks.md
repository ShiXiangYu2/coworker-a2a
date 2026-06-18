# Tasks: Sprint 11 - Controlled Real Tool Runtime

Status: proposed

## Phase 1 - Specs

- [ ] Add Sprint 11 PRD, plan, and tasks.
- [ ] Add `tool-executor.md`.
- [ ] Add `tool-sandbox.md`.
- [ ] Add `tool-execution-plan.md`.
- [ ] Add `tool-execution-receipt.md`.
- [ ] Add `tool-execution-policy.md`.
- [ ] Add `tool-run-execution-state-machine.md`.
- [ ] Add `controlled-tool-runtime-safety.md`.
- [ ] Update Sprint 6-10 related contracts with Sprint 11 boundaries.

## Phase 2 - Types and Pure Rules

- [ ] Add ToolExecutor type.
- [ ] Add ToolSandbox type.
- [ ] Add ToolExecutionPlan type.
- [ ] Add ToolExecutionReceipt type.
- [ ] Add ToolExecutionPolicy type.
- [ ] Add upgraded ToolRun state machine pure functions.
- [ ] Add ToolResult deterministic and sideEffect validation.
- [ ] Add idempotency validation.
- [ ] Add ToolSandbox forbidden capability validation.

## Phase 3 - Persistence Review

- [ ] Decide whether ToolExecutor / ToolSandbox / ToolExecutionPolicy are static config or tables.
- [ ] Decide whether ToolExecutionPlan and ToolExecutionReceipt require tables.
- [ ] Confirm no shell, Git, file, PR, deploy, external API, MCP, browser, database migration, queue, worker, retry, replay, rollback, auto approval, or Agent continuation tables are added.
- [ ] Confirm Sprint 1-10 data remains compatible.

## Phase 4 - API Design

- [ ] Add read APIs for ToolExecutionPolicy.
- [ ] Add read APIs for ToolExecutor.
- [ ] Add read APIs for ToolSandbox.
- [ ] Add ToolRun permission request API.
- [ ] Add ToolRun execution plan API.
- [ ] Add ToolExecutionPlan review APIs.
- [ ] Add ToolRun approve / cancel APIs.
- [ ] Add `execute-approved` API with strict guard checks.
- [ ] Add linked query APIs for ToolCall, Task, and AgentRun.
- [ ] Ensure every mutation returns `auditEvents` and/or `observabilityEvents`.
- [ ] Ensure only `execute-approved` contains allowed execution semantics.
- [ ] Ensure `execute-approved` implements only `execute-approved_local_deterministic_toolrun`, not generic `execute_tool`.
- [ ] Ensure `submit-confirmation` only creates / updates Kelvin confirmation records and does not execute ToolRun.
- [ ] Ensure `approve-execution` only moves a qualified ToolRun to `approved_for_execution` and does not execute ToolRun.

## Phase 5 - UI Design

- [ ] Add ToolCall `Plan Tool Execution`.
- [ ] Add ToolCall `View Execution Plan`.
- [ ] Add ToolRun `Approve This ToolRun`.
- [ ] Add ToolRun `Execute Approved Local Tool`.
- [ ] Add ToolRun `View Execution Receipt`.
- [ ] Add ToolRun `View Recovery Point`.
- [ ] Add Task detail `Tool Executions`.
- [ ] Add `View Tool Sandbox`.
- [ ] Add `View Execution Policy`.
- [ ] Display Sprint 11 safety note.
- [ ] Reject forbidden labels: `Run Command`, `Run Shell`, `Apply File Edit`, `Patch File`, `Format File`, `Create PR`, `Deploy`, `Delete`, `Call External API`, `Invoke MCP`, `Browse`, `Auto Approve`, `Retry Automatically`, `Replay`, `Rollback`, `Resume Execution`, `Continue Agent`.

## Phase 6 - Tests

- [ ] ToolRun state machine valid transitions.
- [ ] ToolRun state machine rejects invalid transitions.
- [ ] ToolRun cannot execute without ToolPermission.
- [ ] ToolPermission `allow_record_only` cannot execute.
- [ ] ToolRun cannot execute without ToolExecutionPlan.
- [ ] Expired ToolExecutionPlan cannot execute.
- [ ] ToolRun cannot execute without RecoveryPoint.
- [ ] RecoveryPoint `reason = before_tool_execution` is required before execution.
- [ ] ToolRun cannot execute without required Kelvin confirmation.
- [ ] Legacy `proposal_only` / `mock_only` ToolRun cannot skip into Sprint 11 execution states.
- [ ] ToolRun approval applies to one ToolRun only.
- [ ] `execute-approved` only executes approved deterministic local no-op / read_simulated ToolRun.
- [ ] `execute-approved_local_deterministic_toolrun` is not generic `execute_tool`.
- [ ] `internal_noop` returns empty sideEffects.
- [ ] `read_simulated` never reads files, network, database, MCP, browser, environment, or external APIs.
- [ ] ToolResult.sideEffects non-empty fails validation.
- [ ] Non-deterministic output fails validation.
- [ ] forbidden Tool categories are denied.
- [ ] Eval pass is not execution token.
- [ ] RegressionGate passed is not execution token.
- [ ] RegressionGate `targetSprint = sprint_11` passed is not an execution token.
- [ ] ReleaseReadiness approved_record is not execution token.
- [ ] ReleaseReadiness `targetSprint = sprint_11` approved_record is not an execution token.
- [ ] RecoveryPoint cannot rollback / restore / retry / replay / resume execution.
- [ ] Approval does not start AgentRun.
- [ ] Approval does not mark Task completed.
- [ ] Execution does not write Memory / Knowledge approved record.
- [ ] Execution does not send A2A.
- [ ] Forbidden API route semantics are absent except `execute-approved`.
- [ ] Forbidden UI labels are absent.
- [ ] Sprint 1-10 regression.

## Non-goals

- [ ] Do not run shell.
- [ ] Do not run Git.
- [ ] Do not read real workspace files.
- [ ] Do not write, patch, format, or delete files.
- [ ] Do not create PRs.
- [ ] Do not deploy.
- [ ] Do not call external API or MCP.
- [ ] Do not automate browsers.
- [ ] Do not run database migrations.
- [ ] Do not execute or continue Agents.
- [ ] Do not automatically complete Tasks.
- [ ] Do not retry, replay, rollback, or resume execution.
- [ ] Do not auto-approve future ToolRuns.
- [ ] Do not enter Sprint 12.
