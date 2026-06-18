# Contract: DepartmentAssignmentAuditRecord

Status: proposed for Sprint 21

## Purpose

DepartmentAssignmentAuditRecord captures local lifecycle and review events for Sprint 21 assignment records.

It is local audit only and must not mutate the target Task or trigger runtime assignment.

DepartmentAssignmentAuditRecord uses the same full local lifecycle as other Sprint 21 assignment records. Its lifecycle transitions apply only to the audit record itself, not to the target Task, target assignment record, Agent runtime, Tool runtime, workflow runtime, or any external system.

## Fields

- `id: string`
- `targetSprint: 'sprint_21'`
- `baseline: 'sprint_1_20_complete'`
- `status: DepartmentAssignmentRecordStatus`
- `targetType: 'department_task_intake_record' | 'department_assignment_proposal' | 'department_role_fit_review' | 'department_assignment_approval_record'`
- `targetId: string`
- `eventType: 'created' | 'submitted_for_review' | 'approved_record' | 'rejected' | 'superseded' | 'archived' | 'linked_query_viewed'`
- `actorType: 'operator' | 'kelvin' | 'system_record'`
- `actorId?: string`
- `beforeStatus?: DepartmentAssignmentRecordStatus`
- `afterStatus?: DepartmentAssignmentRecordStatus`
- `reason: string`
- `evidenceRefs: DepartmentAssignmentEvidenceRef[]`
- `localAuditOnly: true`
- `doesNotMutateTargetTask: true`
- `doesNotAssignRuntimeAgent: true`
- `doesNotTriggerExecution: true`
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

- Audit records are evidence and timeline records only.
- Audit records must not mutate source Task, Department records, Agent runtime, Tool runtime, workflow runtime, file/Git/PR records, external/MCP records, deployment, release, or Task completion.
- submit-review, approve-record, reject, supersede, and archive only change the local DepartmentAssignmentAuditRecord status.
- Audit approval must not approve the target assignment record, source Task, future assignment behavior, runtime assignment, AgentRun start, ToolRun execution, workflow execution, runtime permission, deploy, release, retry, replay, rollback, restore, or resume execution.
