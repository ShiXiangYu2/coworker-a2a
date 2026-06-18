# Contract: DepartmentResponsibilityMatrix

Status: proposed for Sprint 18

## Purpose

DepartmentResponsibilityMatrix is a local, auditable matrix of department responsibilities. It supports organization review and Operator Console display.

It is not a task router, scheduler, delegation engine, or workflow runner.

## Fields

- `id: string`
- `targetSprint: 'sprint_18'`
- `baseline: 'sprint_1_17_complete'`
- `departmentProfileId: string`
- `matrixVersion: string`
- `status: DepartmentRecordStatus`
- `rows: DepartmentResponsibilityRow[]`
- `evidenceRefs: DepartmentEvidenceRef[]`
- `isExecutionToken: false`
- `isRoutingToken: false`
- `isPermissionGrant: false`
- `createdBy: 'user' | 'operator' | 'system_seed'`
- `correlationId: string`
- `auditRefs: string[]`
- `createdAt: string`
- `updatedAt: string`

## Row

```ts
type DepartmentResponsibilityRow = {
  responsibilityKey: string
  description: string
  primaryDepartmentRef: string
  supportingDepartmentRefs: string[]
  consultedDepartmentRefs: string[]
  informedDepartmentRefs: string[]
  evidenceRequired: boolean
  humanReviewRequired: boolean
  forbiddenAutonomy: string[]
}
```

## Rules

- Responsibility rows are descriptive governance records.
- RACI-like fields must not create assignments or route tasks automatically.
- Missing evidence may create review warnings only, not runtime blockers or auto-fixes.
- Matrix approval does not approve future department behavior.
## Unified Sprint 18 Lifecycle Fields

All Department records use the same local lifecycle metadata so implementation can apply one review and archive pattern consistently:

- `reviewedBy?: string`
- `reviewedAt?: string`
- `archivedAt?: string`
- `supersedesRecordId?: string`
- `supersededByRecordId?: string`
- `supersededAt?: string`
- `supersedeReason?: string`

All Department records must include consistent token blockers:

- `isExecutionToken: false`
- `isRoutingToken: false`
- `isPermissionGrant: false`
- `isReleaseToken: false`
- `isDeployToken: false`
- `isTaskCompletionToken: false`
- `grantsRuntimePermission: false`
- `mutatesSourceRecords: false`

Lifecycle APIs for every Department record are local-only: create, query, submit-review, approve-record, reject, supersede, and archive. These lifecycle actions must not start Agent runtime, route Tasks, request or approve runtime permission, execute ToolRun, execute workflow, mutate source records, call external systems, connect MCP, deploy, release, complete tasks, retry, replay, rollback, restore, or resume execution.


## Sprint 19 Department Evidence Mapping Boundary

Sprint 19 may map sanitized evidence to DepartmentResponsibilityMatrix records to show responsibility coverage and gaps.

Coverage is review evidence only. It must not auto-route Task, delegate work, grant runtime permission, execute Agent, execute ToolRun, execute workflow, deploy, release, or complete Task.

## Sprint 21 Department Assignment Boundary

Sprint 21 DepartmentTaskIntakeRecord, DepartmentAssignmentProposal, DepartmentRoleFitReview, DepartmentAssignmentApprovalRecord, and DepartmentAssignmentAuditRecord may reference this contract only as sanitized evidence or local review context.

Sprint 21 assignment records must not be consumed as execution tokens, routing tokens, runtime assignment tokens, runtime permission grants, release tokens, deploy tokens, Task completion tokens, retry/replay/rollback/restore tokens, resume execution tokens, or future approval tokens.

Kelvin approval in Sprint 21 approves only one local assignment record. It must not execute Agent, continue Agent, auto-route Task, assign Agent at runtime, start AgentRun, execute ToolRun, request or approve runtime permission, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, retry, replay, rollback, restore, resume execution, or approve future assignment behavior.
