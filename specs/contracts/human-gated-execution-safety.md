# Contract: Human-Gated Execution Safety

Status: proposed for Sprint 20

## Baseline

Sprint 20 starts from Sprint 1-19 complete.

## Required Invariants

- Execution records are local governance records only.
- Execution records are not execution tokens.
- Execution records are not routing tokens.
- Execution records are not runtime permission grants.
- Execution records are not release or deploy tokens.
- Execution records are not task completion tokens.
- Execution records do not approve future records.
- Execution records do not mutate source records.

## Hard Denies

Sprint 20 must not:

- execute Agent.
- continue Agent.
- auto-route Task.
- assign Agent.
- execute ToolRun.
- request or approve runtime permission.
- execute workflow or step.
- read real files.
- write files.
- run shell or Git.
- call external APIs.
- connect MCP.
- create PRs.
- deploy, publish, or release.
- complete Tasks.
- retry, replay, rollback, restore, or resume execution.

## API Boundary

Allowed APIs are local record APIs only:

- create.
- query.
- submit-review.
- approve-record.
- reject.
- supersede.
- archive.
- linked query.

Allowed endpoint families:

- `/api/execution-intents`
- `/api/execution-plans`
- `/api/execution-gates`
- `/api/execution-approvals`
- `/api/execution-receipts`
- `/api/execution-intents/[id]/linked`
- `/api/execution-intents/[id]/audit`
- `/api/execution-intents/[id]/timeline`
- `/api/departments/[id]/execution-review`
- `/api/tasks/[id]/execution-intents`

Forbidden API semantics:

- execute.
- run.
- continue.
- route.
- assign.
- grant-permission.
- live-execution.
- execute-approved.
- deploy.
- release.
- complete-task.
- retry.
- replay.
- rollback.
- resume.

## Eval Boundary

Eval, RegressionGate, and ReleaseReadiness may provide recommendation-only evidence. They must not grant execution permission, auto-routing permission, runtime permission, release permission, deploy permission, or task completion.

## Sprint 21 Department Assignment Boundary

Sprint 21 DepartmentTaskIntakeRecord, DepartmentAssignmentProposal, DepartmentRoleFitReview, DepartmentAssignmentApprovalRecord, and DepartmentAssignmentAuditRecord may reference this contract only as sanitized evidence or local review context.

Sprint 21 assignment records must not be consumed as execution tokens, routing tokens, runtime assignment tokens, runtime permission grants, release tokens, deploy tokens, Task completion tokens, retry/replay/rollback/restore tokens, resume execution tokens, or future approval tokens.

Kelvin approval in Sprint 21 approves only one local assignment record. It must not execute Agent, continue Agent, auto-route Task, assign Agent at runtime, start AgentRun, execute ToolRun, request or approve runtime permission, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, retry, replay, rollback, restore, resume execution, or approve future assignment behavior.
