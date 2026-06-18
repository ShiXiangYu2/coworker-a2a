# Contract: Department Evidence Mapping Safety

Status: proposed for Sprint 19

## Baseline

Sprint 19 starts from Sprint 1-18 complete.

Department Evidence Mapping safety is local-record-only, review-only, evidence-only, and presentation-only.

## Required Safety Invariants

- Mapping records are not execution tokens.
- Mapping records are not routing tokens.
- Mapping records are not runtime permission grants.
- Mapping records are not release or deploy tokens.
- Mapping records are not task completion tokens.
- Mapping records do not approve future records.
- Mapping records do not import live evidence or sync external evidence.
- Mapping evidence refs are sanitized evidence only.
- Mapping policies are not consumed by Agent runtime, Agent router, Tool runtime, workflow runtime, file/Git/PR runtime, external connectors, MCP connectors, deployers, workers, queues, retry jobs, replay jobs, rollback jobs, restore jobs, or resume execution jobs.

## Shared Local Lifecycle

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

## Shared Token Blockers

Every Sprint 19 mapping record must include:

- `isExecutionToken: false`
- `isRoutingToken: false`
- `isPermissionGrant: false`
- `isReleaseToken: false`
- `isDeployToken: false`
- `isTaskCompletionToken: false`
- `grantsRuntimePermission: false`
- `mutatesSourceRecords: false`

## Forbidden Runtime Actions

- execute Agent.
- continue Agent.
- assign Agent at runtime.
- auto-route Task.
- execute ToolRun.
- request or approve runtime permission.
- execute workflow or step.
- read or write files.
- run shell or Git.
- create PR.
- call external API.
- connect MCP.
- import live evidence.
- sync evidence.
- create webhook, worker, queue, or background job.
- deploy, publish, or release.
- complete Task.
- retry, replay, rollback, restore, or resume execution.

## Required UI Denials

UI must avoid:

- `Run Mapping`
- `Execute Mapping`
- `Auto Route`
- `Assign Agent`
- `Grant Permission`
- `Import Live`
- `Sync Evidence`
- `Run Agent`
- `Run Tool`
- `Execute Workflow`
- `Write File`
- `Run Git`
- `Call API`
- `Connect MCP`
- `Create PR`
- `Deploy`
- `Release`
- `Complete Task`
- `Retry`
- `Replay`
- `Rollback`
- `Restore`
- `Resume Execution`

## Eval Requirements

Sprint 19 evals must verify:

- no forbidden states.
- no forbidden UI labels.
- no automatic router semantics.
- no runtime permission grants.
- no live evidence import or sync.
- all mapping records have consistent token blockers.
- all mapping lifecycle APIs are local-only.
- superseded state has supersede refs.
- no Task completed mutation.
- Kelvin approval is local-record-only.
- Sprint 1-18 regression remains intact.

## Sprint 20 Human-Gated Execution Boundary

Sprint 20 execution records may reference Sprint 19 mapping records only as sanitized evidence or local review context.

EvidenceToDepartmentMappingRecord, DepartmentEvidenceCoverageRecord, DepartmentReviewGapRecord, and DepartmentMappingReviewRecord must not become execution, routing, runtime permission, release, deploy, external access, MCP access, PR creation, task completion, retry, replay, rollback, restore, resume, or future approval tokens.

## Sprint 21 Department Assignment Boundary

Sprint 21 DepartmentTaskIntakeRecord, DepartmentAssignmentProposal, DepartmentRoleFitReview, DepartmentAssignmentApprovalRecord, and DepartmentAssignmentAuditRecord may reference this contract only as sanitized evidence or local review context.

Sprint 21 assignment records must not be consumed as execution tokens, routing tokens, runtime assignment tokens, runtime permission grants, release tokens, deploy tokens, Task completion tokens, retry/replay/rollback/restore tokens, resume execution tokens, or future approval tokens.

Kelvin approval in Sprint 21 approves only one local assignment record. It must not execute Agent, continue Agent, auto-route Task, assign Agent at runtime, start AgentRun, execute ToolRun, request or approve runtime permission, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, retry, replay, rollback, restore, resume execution, or approve future assignment behavior.
