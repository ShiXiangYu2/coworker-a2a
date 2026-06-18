# Sprint 20 PRD: Department Runtime Execution Gateway / Human-Gated Execution

## Baseline

Sprint 20 starts from Sprint 1-19 complete:

- Sprint 1-15 sealed MVP.
- Sprint 16 read-only Operator Console complete.
- Sprint 17 read-only Evidence Import Sandbox complete.
- Sprint 18 Department Agent Profiles complete.
- Sprint 19 Department-Aware Operator Review / Evidence-to-Department Mapping complete.

## Goal

Sprint 20 designs a local Human-Gated Execution Gateway record layer for the future Agent company.

The gateway records proposed execution intent, plan, gate, approval, receipt, and audit timeline. It does not execute anything.

## Scope

Sprint 20 may define only local records:

- ExecutionIntentRecord.
- ExecutionPlanRecord.
- ExecutionGateRecord.
- ExecutionApprovalRecord.
- ExecutionReceiptRecord.
- local execution audit timeline.

## Non-Goals

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

## Evidence Boundary

Sprint 1-19 records may be referenced only as sanitized evidence or local review references. They must not become execution, routing, permission, release, deploy, or task completion tokens.

## Kelvin Boundary

Kelvin approval only approves one local execution record. It does not authorize current execution, future execution, runtime permission, task routing, task assignment, deploy, release, or task completion.

## API Boundary

Sprint 20 may define only local record APIs:

- `/api/execution-intents`
- `/api/execution-plans`
- `/api/execution-gates`
- `/api/execution-approvals`
- `/api/execution-receipts`

Each record API may support only:

- create.
- query.
- submit-review.
- approve-record.
- reject.
- supersede.
- archive.

Linked query APIs may include:

- `/api/execution-intents/[id]/linked`
- `/api/execution-intents/[id]/audit`
- `/api/execution-intents/[id]/timeline`
- `/api/departments/[id]/execution-review`
- `/api/tasks/[id]/execution-intents`

These APIs must not expose live execution, Agent routing, ToolRun execution, workflow execution, file write, Git, external API, MCP, PR, deploy, release, Task completion, retry, replay, rollback, restore, or resume execution semantics.

## UI Boundary

Allowed labels:

- View Execution Intent
- View Execution Plan
- View Execution Gate
- View Execution Receipt
- Submit Execution Review
- Approve Execution Record
- Reject Execution Record
- Archive Execution Record
- View Execution Audit
- View Execution Timeline

Forbidden labels:

- Run Execution
- Execute Now
- Continue Agent
- Auto Route
- Assign Agent
- Run Tool
- Execute Workflow
- Apply Change
- Write File
- Run Git
- Call API
- Connect MCP
- Create PR
- Deploy
- Release
- Complete Task
- Retry
- Replay
- Rollback
- Resume Execution
