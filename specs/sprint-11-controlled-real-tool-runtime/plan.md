# Plan: Sprint 11 - Controlled Real Tool Runtime

Status: proposed

## Implementation Order

1. Add Sprint 11 contracts for ToolExecutor, ToolSandbox, ToolExecutionPlan, ToolExecutionReceipt, ToolExecutionPolicy, ToolRun execution state machine, and safety.
2. Extend Sprint 6-10 tool, security, audit, observability, eval, recovery, and readiness contracts.
3. Add TypeScript types after specs review.
4. Add deterministic local ToolExecutor registry.
5. Add ToolRun state machine upgrade.
6. Add persistence after schema review.
7. Add controlled ToolExecutionPolicy and ToolSandbox validation.
8. Add API routes for planning, permission, confirmation, and `execute-approved`.
9. Add ChatHub / Task UI execution plan and receipt display.
10. Add tests proving only approved deterministic local no-op / read_simulated ToolRuns can execute.
11. Add regression tests proving Sprint 1-10 behavior does not regress.

## Recommended Persistence

Sprint 11 may add tables:

- `ToolExecutor`
- `ToolSandbox`
- `ToolExecutionPlan`
- `ToolExecutionReceipt`
- `ToolExecutionPolicy`

Sprint 11 may also extend `ToolRun` fields for execution lifecycle if the implementation chooses schema persistence over embedded JSON.

Do not add:

- CommandRun
- ShellSession
- GitOperation
- FilePatch
- PullRequestRun
- DeployRun
- ExternalApiCall
- McpSession
- BrowserSession
- DatabaseMigrationRun
- ToolExecutionWorker
- ToolQueue
- RetryJob
- ReplayJob
- RollbackJob
- AgentContinuationJob
- AutoApprovalRule

## API Groups

Tool execution policy:

- `GET /api/tool-execution-policy`
- `GET /api/tool-executors`
- `GET /api/tool-executors/:id`
- `GET /api/tool-sandboxes`
- `GET /api/tool-sandboxes/:id`

ToolRun lifecycle:

- `POST /api/tool-runs/:id/request-permission`
- `POST /api/tool-runs/:id/plan-execution`
- `GET /api/tool-runs/:id/execution-plan`
- `POST /api/tool-runs/:id/approve-execution`
- `POST /api/tool-runs/:id/cancel-execution`
- `POST /api/tool-runs/:id/execute-approved`
- `GET /api/tool-runs/:id/execution-receipt`

ToolExecutionPlan review:

- `POST /api/tool-execution-plans/:id/submit-confirmation`
- `POST /api/tool-execution-plans/:id/reject`

Linked queries:

- `GET /api/tool-calls/:id/execution-plans`
- `GET /api/tool-calls/:id/execution-receipts`
- `GET /api/harmony/tasks/:id/tool-executions`
- `GET /api/agent-runtime/runs/:id/tool-executions`

## Special API Rule

`POST /api/tool-runs/:id/execute-approved` is the only allowed Sprint 11 execution-semantics API.

It implements only `execute-approved_local_deterministic_toolrun`. It is not generic `execute_tool`, and it must not be generalized to shell, Git, file, PR, deploy, external API, MCP, browser, database migration, retry, replay, rollback, resume execution, or Agent continuation.

It must only execute a ToolRun when all are true:

- ToolRun status is `approved_for_execution`.
- ToolRun mode is `controlled_execution`.
- ToolExecutionPlan exists.
- ToolExecutionPlan is not expired.
- ToolPermission decision is `allow_controlled_execution`.
- required Kelvin confirmation exists.
- RecoveryPoint was created before execution with `reason = before_tool_execution`.
- ToolExecutor category is `internal_noop` or deterministic `read_simulated`.
- ToolSandbox denies all forbidden capabilities.
- idempotencyKey is present.
- no sideEffects are expected.

`POST /api/tool-execution-plans/:id/submit-confirmation` only creates or updates the Kelvin confirmation record for the plan. It does not execute a ToolRun.

`POST /api/tool-runs/:id/approve-execution` only moves one ToolRun to `approved_for_execution` after all preconditions are satisfied. It does not execute a ToolRun.

## Forbidden API Semantics

Do not add Sprint 11 API routes with these semantics:

- `/run-command`
- `/run-shell`
- `/shell`
- `/git`
- `/file-write`
- `/file-read`
- `/patch`
- `/format`
- `/create-pr`
- `/deploy`
- `/delete`
- `/external`
- `/call-external`
- `/mcp`
- `/browser`
- `/database-migration`
- `/retry`
- `/replay`
- `/rollback`
- `/resume-execution`
- `/auto-approve`
- `/continue-agent`
- `/execute-any`

Existing historical route names such as `/api/agent-runtime/runs` or `/api/tool-runs/:id` are not violations when they remain record queries.

## UI Entry Points

ToolCall card:

- `Plan Tool Execution`
- `View Execution Plan`
- `Request Permission`
- `Request Kelvin Approval`
- `View Execution Policy`

ToolRun card:

- `Approve This ToolRun`
- `Execute Approved Local Tool`
- `Cancel Tool Execution`
- `View Execution Receipt`
- `View Recovery Point`
- `View Timeline`

Task detail:

- `Tool Executions`
- `Execution Policy`
- `Tool Sandbox`
- `Audit`

## Safety Gates

- ToolRun cannot skip permission.
- ToolRun cannot skip confirmation when required.
- ToolRun cannot skip RecoveryPoint.
- ToolRun cannot execute unless `mode = controlled_execution`.
- Legacy `proposal_only` and `mock_only` ToolRuns cannot skip into Sprint 11 execution states.
- `allow_record_only` cannot execute.
- Expired ToolExecutionPlan cannot execute.
- RecoveryPoint reason must be `before_tool_execution`.
- ToolRun cannot execute if ToolExecutionPolicy denies the category.
- ToolRun cannot execute if ToolSandbox allows any forbidden capability.
- ToolRun cannot execute if ToolResult.sideEffects is non-empty.
- ToolRun cannot execute if output is non-deterministic.
- Kelvin approval applies to one ToolRun only.
- `read_simulated` must not read real files, network, MCP, browser, database, environment, or external APIs.
- Eval, RegressionGate, and ReleaseReadiness are evidence only and not execution tokens.
- RegressionGate `targetSprint = sprint_11` passed is not an execution token.
- ReleaseReadiness `targetSprint = sprint_11` approved_record is not an execution token.
- Sprint 11 must not import or call shell, Git, file write/read, external API, MCP, browser, deploy, migration, queue, worker, retry, replay, rollback, or Agent continuation paths.

## Validation Commands

When implemented:

```bash
npx prisma validate
npx prisma db push --skip-generate
npx prisma generate
npm run test
npm run lint
npm run build
```
