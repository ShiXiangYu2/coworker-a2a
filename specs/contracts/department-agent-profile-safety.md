# Contract: Department Agent Profile Safety

Status: proposed for Sprint 18

## Baseline

Sprint 18 starts from Sprint 1-17 complete.

Department Agent Profile safety is local-record-only, organization-profile-only, and review-only.

## Required Safety Invariants

- Department records are not execution tokens.
- Department records are not routing tokens.
- Department records are not runtime permission grants.
- Department records are not release or deploy tokens.
- Department records are not task completion tokens.
- Department approvals do not approve future records.
- Department evidence refs are sanitized evidence only.
- Department policies are not consumed by Agent runtime, Tool runtime, workflow runtime, file/Git/PR runtime, external connectors, MCP connectors, deployers, workers, queues, retry jobs, replay jobs, rollback jobs, restore jobs, or resume execution jobs.

## Shared Local Lifecycle

All Sprint 18 Department records use the same local lifecycle unless a future reviewed spec explicitly narrows a child record to DepartmentProfile-managed lifecycle.

Allowed local lifecycle actions:

- create.
- query.
- submit-review.
- approve-record.
- reject.
- supersede.
- archive.

Allowed local lifecycle statuses:

- `draft`
- `review`
- `approved_record`
- `rejected`
- `superseded`
- `archived`

Required lifecycle metadata:

- `reviewedBy?: string`
- `reviewedAt?: string`
- `archivedAt?: string`
- `supersedesRecordId?: string`
- `supersededByRecordId?: string`
- `supersededAt?: string`
- `supersedeReason?: string`

Superseded records must include a supersede reference and reason. Supersede metadata is descriptive and does not roll back, restore, retry, replay, resume, or mutate source records.

## Shared Token Blockers

Every Sprint 18 Department record must include these fixed blocker fields:

- `isExecutionToken: false`
- `isRoutingToken: false`
- `isPermissionGrant: false`
- `isReleaseToken: false`
- `isDeployToken: false`
- `isTaskCompletionToken: false`
- `grantsRuntimePermission: false`
- `mutatesSourceRecords: false`

These fields must be persisted or derived as immutable false values by Sprint 18 implementations. They are not configurable toggles.

## Permission Boundary Isolation

DepartmentPermissionBoundary describes allowed and forbidden department behavior for local review only.

It must not be consumed by:

- Agent router.
- Agent runtime.
- Tool runtime.
- workflow runtime.
- runtime permission system.
- file / Git / PR capability.
- external API connector.
- MCP connector.
- deploy / publish / release capability.
- worker, queue, retry, replay, rollback, restore, or resume capability.

DepartmentPermissionBoundary cannot grant runtime permission, approve future execution, authorize automatic routing, or satisfy Kelvin confirmation for any runtime action.

## Review Record Approval Isolation

DepartmentReviewRecord approval only approves one referenced local Department record.

It must not:

- approve future similar department behavior.
- approve a class of departments, roles, policies, boundaries, or escalations.
- grant runtime permission.
- route or assign tasks.
- continue Agent.
- execute Agent, ToolRun, workflow, file, Git, PR, external API, MCP, deploy, publish, release, retry, replay, rollback, restore, or resume behavior.
- complete Task.

## Forbidden Runtime Actions

- execute Agent.
- continue Agent.
- assign Agent at runtime.
- auto-route Task.
- delegate automatically.
- execute ToolRun.
- request or approve runtime permission.
- execute workflow or step.
- read or write files.
- run shell or Git.
- create PR.
- call external API.
- connect MCP.
- create webhook, worker, queue, or background job.
- deploy, publish, or release.
- complete Task.
- retry, replay, rollback, restore, or resume execution.

## Required UI Denials

UI must avoid:

- `Run Department`
- `Execute Department`
- `Assign Automatically`
- `Auto Route`
- `Delegate Now`
- `Continue Agent`
- `Run Agent`
- `Run Tool`
- `Execute Tool`
- `Execute Workflow`
- `Apply Change`
- `Write File`
- `Run Git`
- `Call API`
- `Connect MCP`
- `Create PR`
- `Deploy`
- `Publish`
- `Release`
- `Complete Task`
- `Retry`
- `Replay`
- `Rollback`
- `Restore`
- `Resume Execution`

## Eval Requirements

Sprint 18 evals must verify:

- no forbidden states.
- no forbidden UI labels.
- no automatic router semantics.
- no runtime permission grants.
- all department records have consistent token blockers.
- all department lifecycle APIs are local-only.
- superseded state has supersede refs.
- DepartmentPermissionBoundary cannot be consumed by runtime permission systems.
- DepartmentReviewRecord approval only approves one local referenced record.
- no Task completed mutation.
- Kelvin approval is local-record-only.
- Sprint 1-17 regression remains intact.

## Sprint 19 Department Evidence Mapping Boundary

Sprint 19 mapping records may present evidence coverage for Sprint 18 Department records. They remain local review and presentation records only.

Department Agent Profile safety must reject any use of mapping records as Agent router input, runtime permission grant, ToolRun approval, workflow approval, file/Git/PR approval, external API/MCP approval, deploy/release approval, Task completion signal, retry/replay/rollback/restore signal, or resume execution signal.

## Sprint 21 Department Assignment Boundary

Sprint 21 DepartmentTaskIntakeRecord, DepartmentAssignmentProposal, DepartmentRoleFitReview, DepartmentAssignmentApprovalRecord, and DepartmentAssignmentAuditRecord may reference this contract only as sanitized evidence or local review context.

Sprint 21 assignment records must not be consumed as execution tokens, routing tokens, runtime assignment tokens, runtime permission grants, release tokens, deploy tokens, Task completion tokens, retry/replay/rollback/restore tokens, resume execution tokens, or future approval tokens.

Kelvin approval in Sprint 21 approves only one local assignment record. It must not execute Agent, continue Agent, auto-route Task, assign Agent at runtime, start AgentRun, execute ToolRun, request or approve runtime permission, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, retry, replay, rollback, restore, resume execution, or approve future assignment behavior.
