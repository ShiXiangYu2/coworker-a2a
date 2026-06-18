# Contract: ExecutionIntentRecord

Status: proposed for Sprint 20

## Purpose

ExecutionIntentRecord captures a proposed execution intent as a local governance record. It is not execution authorization.

## Fields

- `id: string`
- `targetSprint: 'sprint_20'`
- `baseline: 'sprint_1_19_complete'`
- `status: ExecutionGatewayRecordStatus`
- `intentTitle: string`
- `intentSummary: string`
- `requestedBy: 'user' | 'operator' | 'kelvin' | 'system_record'`
- `departmentProfileId?: string`
- `departmentAgentRoleId?: string`
- `sourceTaskId?: string`
- `requestedActionType: string`
- `requestedActionSummary: string`
- `expectedOutcome: string`
- `riskSummary: string`
- `sanitizedEvidenceRefs: ExecutionEvidenceRef[]`
- `departmentMappingRefs: string[]`
- `planRecordRefs: string[]`
- `gateRecordRefs: string[]`
- `approvalRecordRefs: string[]`
- `receiptRecordRefs: string[]`
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

## ExecutionEvidenceRef

```ts
type ExecutionEvidenceRef = {
  sourceType:
    | 'task'
    | 'agent_run'
    | 'agent_result'
    | 'tool_call'
    | 'tool_run'
    | 'tool_execution_plan'
    | 'tool_execution_receipt'
    | 'workflow_proposal'
    | 'workflow_step_record'
    | 'evidence_import_record'
    | 'sanitized_evidence_snapshot'
    | 'department_profile'
    | 'department_agent_role'
    | 'department_responsibility_matrix'
    | 'department_escalation_policy'
    | 'department_permission_boundary'
    | 'department_review_record'
    | 'evidence_to_department_mapping_record'
    | 'department_evidence_coverage_record'
    | 'department_review_gap_record'
    | 'department_mapping_review_record'
    | 'audit_event'
    | 'observability_event'
    | 'eval_run'
    | 'regression_gate'
    | 'release_readiness_checklist'
    | 'manual_note'
  sourceId?: string
  summary: string
  redactionStatus: 'sanitized' | 'redacted'
  reviewUseOnly: true
  localReferenceOnly: true
  isExecutionToken: false
  isRoutingToken: false
  isPermissionGrant: false
  isReleaseToken: false
  isDeployToken: false
  isTaskCompletionToken: false
  grantsRuntimePermission: false
  mutatesSourceRecords: false
}
```

Sprint 1-19 records referenced by ExecutionEvidenceRef are sanitized evidence or local review references only. They must not be dereferenced, executed, routed, used as permission grants, deployed, released, or consumed as Task completion tokens.

## Rules

- Create / query / submit-review / approve-record / reject / supersede / archive only.
- Approval changes only the local record status.
- It must not execute or authorize execution.

## Sprint 21 Department Assignment Boundary

Sprint 21 DepartmentTaskIntakeRecord, DepartmentAssignmentProposal, DepartmentRoleFitReview, DepartmentAssignmentApprovalRecord, and DepartmentAssignmentAuditRecord may reference this contract only as sanitized evidence or local review context.

Sprint 21 assignment records must not be consumed as execution tokens, routing tokens, runtime assignment tokens, runtime permission grants, release tokens, deploy tokens, Task completion tokens, retry/replay/rollback/restore tokens, resume execution tokens, or future approval tokens.

Kelvin approval in Sprint 21 approves only one local assignment record. It must not execute Agent, continue Agent, auto-route Task, assign Agent at runtime, start AgentRun, execute ToolRun, request or approve runtime permission, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, retry, replay, rollback, restore, resume execution, or approve future assignment behavior.
