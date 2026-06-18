# Contract: DepartmentMappingReviewRecord

Status: proposed for Sprint 19

## Purpose

DepartmentMappingReviewRecord captures human review of local mapping, coverage, or gap records.

Approval changes only one local target record status. It is not Kelvin approval for execution, routing, runtime permission, live evidence import, deployment, release, or task completion.

## Fields

- `id: string`
- `targetSprint: 'sprint_19'`
- `baseline: 'sprint_1_18_complete'`
- `targetType: 'mapping_record' | 'coverage_record' | 'gap_record'`
- `targetId: string`
- `status: DepartmentEvidenceMappingStatus`
- `reviewer: 'kelvin' | 'owner' | 'operator'`
- `verdict: 'needs_changes' | 'approved_record' | 'rejected'`
- `reviewNotes: string`
- `confirmationArtifactId?: string`
- `doesNotExecuteAgent: true`
- `doesNotContinueAgent: true`
- `doesNotRouteTask: true`
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
- `doesNotApproveFutureMappings: true`
- `isExecutionToken: false`
- `isRoutingToken: false`
- `isPermissionGrant: false`
- `isReleaseToken: false`
- `isDeployToken: false`
- `isTaskCompletionToken: false`
- `grantsRuntimePermission: false`
- `mutatesSourceRecords: false`
- `createdBy: 'user' | 'operator' | 'system_record'`
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

- Review approval changes only one local mapping, coverage, or gap record status.
- Review approval must not approve future mapping records.
- Review approval must not execute, route, assign, continue, call, connect, deploy, release, sync, import live evidence, or complete anything.
