# Contract: DepartmentPermissionBoundary

Status: proposed for Sprint 18

## Purpose

DepartmentPermissionBoundary records local organization permissions and denials for a department. It is stricter than runtime permissions: it documents governance boundaries but grants no runtime capability.

## Fields

- `id: string`
- `targetSprint: 'sprint_18'`
- `baseline: 'sprint_1_17_complete'`
- `departmentProfileId: string`
- `boundaryVersion: string`
- `status: DepartmentRecordStatus`
- `allowedLocalRecordActions: DepartmentLocalAction[]`
- `deniedRuntimeActions: string[]`
- `deniedExternalActions: string[]`
- `deniedFileGitPrActions: string[]`
- `deniedWorkflowActions: string[]`
- `deniedTaskActions: string[]`
- `approvalMeaning: 'local_department_record_review_only'`
- `approvalDoesNotExecute: true`
- `approvalDoesNotRoute: true`
- `approvalDoesNotGrantFuturePermission: true`
- `evidenceRefs: DepartmentEvidenceRef[]`
- `isExecutionToken: false`
- `isRoutingToken: false`
- `grantsRuntimePermission: false`
- `createdBy: 'user' | 'operator' | 'system_seed'`
- `correlationId: string`
- `auditRefs: string[]`
- `createdAt: string`
- `updatedAt: string`

## Allowed Local Record Actions

- `create_department_record`
- `view_department_record`
- `submit_department_review`
- `approve_department_record`
- `reject_department_record`
- `supersede_department_record`
- `archive_department_record`
- `view_department_audit`
- `view_department_timeline`

## Required Denials

- execute Agent.
- continue Agent.
- auto-route Task.
- execute ToolRun.
- execute workflow or step.
- write file.
- run Git.
- create PR.
- call external API.
- connect MCP.
- deploy, publish, or release.
- complete Task.
- retry, replay, rollback, restore, or resume execution.

## Rules

- DepartmentPermissionBoundary must not be consumed by runtime permission systems.
- Approval of this boundary only approves the local boundary record.
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

Sprint 19 may map sanitized evidence to DepartmentPermissionBoundary records for local governance review.

DepartmentPermissionBoundary remains non-consumable by runtime permission systems. Evidence mapping approval must not grant runtime permission or satisfy future runtime approval.

## Sprint 20 Human-Gated Execution Boundary

Sprint 20 execution records may reference DepartmentPermissionBoundary as sanitized evidence or local review context only.

DepartmentPermissionBoundary remains non-consumable by runtime permission systems. Execution gate or approval records must not convert it into runtime permission, execution authorization, routing authorization, deploy authorization, release authorization, or task completion authorization.

## Sprint 21 Department Assignment Boundary

Sprint 21 DepartmentTaskIntakeRecord, DepartmentAssignmentProposal, DepartmentRoleFitReview, DepartmentAssignmentApprovalRecord, and DepartmentAssignmentAuditRecord may reference this contract only as sanitized evidence or local review context.

Sprint 21 assignment records must not be consumed as execution tokens, routing tokens, runtime assignment tokens, runtime permission grants, release tokens, deploy tokens, Task completion tokens, retry/replay/rollback/restore tokens, resume execution tokens, or future approval tokens.

Kelvin approval in Sprint 21 approves only one local assignment record. It must not execute Agent, continue Agent, auto-route Task, assign Agent at runtime, start AgentRun, execute ToolRun, request or approve runtime permission, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, retry, replay, rollback, restore, resume execution, or approve future assignment behavior.
