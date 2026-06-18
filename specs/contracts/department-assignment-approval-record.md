# Contract: DepartmentAssignmentApprovalRecord

Status: proposed for Sprint 21

## Purpose

DepartmentAssignmentApprovalRecord captures Kelvin or Operator review of one local assignment-related record.

Approval is single-local-record-only. It does not route, assign, execute, grant runtime permission, release, deploy, or complete a Task.

## Fields

- `id: string`
- `targetSprint: 'sprint_21'`
- `baseline: 'sprint_1_20_complete'`
- `status: DepartmentAssignmentRecordStatus`
- `targetType: 'department_task_intake_record' | 'department_assignment_proposal' | 'department_role_fit_review' | 'department_assignment_audit_record'`
- `targetId: string`
- `reviewer: 'kelvin' | 'operator' | 'owner'`
- `verdict: 'needs_changes' | 'approved_record' | 'rejected'`
- `reviewNotes: string`
- `confirmationArtifactId?: string`
- `approvalScope: 'single_local_assignment_record_only'`
- `doesNotExecuteAgent: true`
- `doesNotContinueAgent: true`
- `doesNotAutoRouteTask: true`
- `doesNotAssignRuntimeAgent: true`
- `doesNotExecuteToolRun: true`
- `doesNotRequestRuntimePermission: true`
- `doesNotApproveRuntimePermission: true`
- `doesNotExecuteWorkflow: true`
- `doesNotWriteFile: true`
- `doesNotRunGit: true`
- `doesNotCallExternalApi: true`
- `doesNotConnectMcp: true`
- `doesNotCreatePr: true`
- `doesNotDeployReleasePublish: true`
- `doesNotCompleteTask: true`
- `doesNotApproveFutureAssignments: true`
- `evidenceRefs: DepartmentAssignmentEvidenceRef[]`
- `auditRecordRefs: string[]`
- `isExecutionToken: false`
- `isRoutingToken: false`
- `isAssignmentToken: false`
- `isPermissionGrant: false`
- `isReleaseToken: false`
- `isDeployToken: false`
- `isTaskCompletionToken: false`
- `grantsRuntimePermission: false`
- `mutatesSourceRecords: false`
- `executesAgent: false`
- `continuesAgent: false`
- `routesTask: false`
- `autoRoutesTask: false`
- `assignsRuntimeAgent: false`
- `startsAgentRun: false`
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
- `createdAt: string`
- `updatedAt: string`

## Rules

- Approval only changes one local target record status.
- Approval must not approve future assignments or same-class assignments.
- Approval must not mutate Task state or Department runtime state.
