# Contract: DepartmentReviewRecord

Status: proposed for Sprint 18

## Purpose

DepartmentReviewRecord captures human review of local department records. It can approve or reject the local record only.

It is not Kelvin approval for execution, routing, runtime permission, deployment, release, or task completion.

## Fields

- `id: string`
- `targetSprint: 'sprint_18'`
- `baseline: 'sprint_1_17_complete'`
- `targetType: 'department_profile' | 'department_agent_role' | 'department_responsibility_matrix' | 'department_escalation_policy' | 'department_permission_boundary'`
- `targetId: string`
- `status: DepartmentRecordStatus`
- `reviewer: 'kelvin' | 'owner' | 'operator'`
- `verdict: 'needs_changes' | 'approved_record' | 'rejected'`
- `reviewNotes: string`
- `confirmationArtifactId?: string`
- `evidenceRefs: DepartmentEvidenceRef[]`
- `doesNotExecuteAgent: true`
- `doesNotContinueAgent: true`
- `doesNotExecuteToolRun: true`
- `doesNotExecuteWorkflow: true`
- `doesNotWriteFile: true`
- `doesNotRunGit: true`
- `doesNotCallExternalApi: true`
- `doesNotConnectMcp: true`
- `doesNotCreatePr: true`
- `doesNotDeployReleasePublish: true`
- `doesNotCompleteTask: true`
- `doesNotApproveFutureRecords: true`
- `createdBy: 'user' | 'operator' | 'system_record'`
- `correlationId: string`
- `auditRefs: string[]`
- `createdAt: string`
- `updatedAt: string`
- `archivedAt?: string`

## Rules

- Review approval changes only one local department record status.
- Review approval must not execute, route, continue, assign, call, connect, deploy, release, or complete anything.
- Review approval must not approve future department records automatically.
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

Sprint 19 may reference DepartmentReviewRecord as local review evidence for mapping records.

DepartmentReviewRecord approval remains scoped to one local Department record. It must not approve future mapping behavior, runtime routing, runtime permission, Agent execution, ToolRun execution, workflow execution, deploy, release, or Task completion.

## Sprint 21 Department Assignment Boundary

Sprint 21 DepartmentTaskIntakeRecord, DepartmentAssignmentProposal, DepartmentRoleFitReview, DepartmentAssignmentApprovalRecord, and DepartmentAssignmentAuditRecord may reference this contract only as sanitized evidence or local review context.

Sprint 21 assignment records must not be consumed as execution tokens, routing tokens, runtime assignment tokens, runtime permission grants, release tokens, deploy tokens, Task completion tokens, retry/replay/rollback/restore tokens, resume execution tokens, or future approval tokens.

Kelvin approval in Sprint 21 approves only one local assignment record. It must not execute Agent, continue Agent, auto-route Task, assign Agent at runtime, start AgentRun, execute ToolRun, request or approve runtime permission, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, retry, replay, rollback, restore, resume execution, or approve future assignment behavior.
