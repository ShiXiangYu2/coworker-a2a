# Contract: ExecutionApprovalRecord

Status: proposed for Sprint 20

## Purpose

ExecutionApprovalRecord captures Kelvin or operator review of one local execution record.

## Fields

- `id: string`
- `targetSprint: 'sprint_20'`
- `baseline: 'sprint_1_19_complete'`
- `targetType: 'execution_intent' | 'execution_plan' | 'execution_gate' | 'execution_receipt'`
- `targetId: string`
- `status: ExecutionGatewayRecordStatus`
- `reviewer: 'kelvin' | 'owner' | 'operator'`
- `verdict: 'needs_changes' | 'approved_record' | 'rejected'`
- `reviewNotes: string`
- `confirmationArtifactId?: string`
- `approvalScope: 'single_local_record_only'`
- `doesNotExecuteAgent: true`
- `doesNotContinueAgent: true`
- `doesNotAutoRouteTask: true`
- `doesNotAssignAgent: true`
- `doesNotExecuteToolRun: true`
- `doesNotExecuteWorkflow: true`
- `doesNotWriteFile: true`
- `doesNotRunGit: true`
- `doesNotCallExternalApi: true`
- `doesNotConnectMcp: true`
- `doesNotCreatePr: true`
- `doesNotDeployReleasePublish: true`
- `doesNotCompleteTask: true`
- `doesNotApproveFutureExecutions: true`
- `isExecutionToken: false`
- `isRoutingToken: false`
- `isPermissionGrant: false`
- `isReleaseToken: false`
- `isDeployToken: false`
- `isTaskCompletionToken: false`
- `grantsRuntimePermission: false`
- `mutatesSourceRecords: false`
- `executesAgent: false`
- `continuesAgent: false`
- `routesTask: false`
- `assignsAgent: false`
- `executesToolRun: false`
- `executesWorkflow: false`
- `writesFile: false`
- `runsGit: false`
- `callsExternalApi: false`
- `connectsMcp: false`
- `createsPr: false`
- `deploysOrReleases: false`
- `completesTask: false`
- `createdBy: string`
- `reviewedBy?: string`
- `reviewedAt?: string`
- `archivedAt?: string`
- `supersedesRecordId?: string`
- `supersededByRecordId?: string`
- `supersededAt?: string`
- `supersedeReason?: string`
- `correlationId: string`
- `auditRefs: string[]`
- `createdAt: string`
- `updatedAt: string`

## Rules

- Approval only changes one local execution record.
- Approval must not approve future executions or same-class executions.

## Sprint 21 Department Assignment Boundary

Sprint 21 DepartmentTaskIntakeRecord, DepartmentAssignmentProposal, DepartmentRoleFitReview, DepartmentAssignmentApprovalRecord, and DepartmentAssignmentAuditRecord may reference this contract only as sanitized evidence or local review context.

Sprint 21 assignment records must not be consumed as execution tokens, routing tokens, runtime assignment tokens, runtime permission grants, release tokens, deploy tokens, Task completion tokens, retry/replay/rollback/restore tokens, resume execution tokens, or future approval tokens.

Kelvin approval in Sprint 21 approves only one local assignment record. It must not execute Agent, continue Agent, auto-route Task, assign Agent at runtime, start AgentRun, execute ToolRun, request or approve runtime permission, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, retry, replay, rollback, restore, resume execution, or approve future assignment behavior.
