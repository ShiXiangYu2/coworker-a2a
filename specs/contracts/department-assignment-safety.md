# Contract: Department Assignment Safety

Status: proposed for Sprint 21

## Baseline

Sprint 21 starts from Sprint 1-20 complete.

Sprint 21 is the final local governance loop before the project can close as a v1 Agent company governance prototype.

## Required Invariants

- Assignment records are local governance records only.
- Assignment records are not execution tokens.
- Assignment records are not routing tokens.
- Assignment records are not runtime assignment tokens.
- Assignment records are not runtime permission grants.
- Assignment records are not release or deploy tokens.
- Assignment records are not Task completion tokens.
- Assignment records do not approve future records.
- Assignment records do not mutate source records.
- Assignment evidence refs are sanitized evidence or local review references only.

## DepartmentAssignmentEvidenceRef

```ts
type DepartmentAssignmentEvidenceRef = {
  sourceType:
    | 'task'
    | 'agent_run'
    | 'agent_result'
    | 'tool_call'
    | 'tool_run'
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
    | 'execution_intent_record'
    | 'execution_plan_record'
    | 'execution_gate_record'
    | 'execution_approval_record'
    | 'execution_receipt_record'
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
  isAssignmentToken: false
  isPermissionGrant: false
  isReleaseToken: false
  isDeployToken: false
  isTaskCompletionToken: false
  grantsRuntimePermission: false
  mutatesSourceRecords: false
}
```

## Shared Token Blockers

Every Sprint 21 assignment record must include:

- `isExecutionToken: false`
- `isRoutingToken: false`
- `isAssignmentToken: false`
- `isPermissionGrant: false`
- `isReleaseToken: false`
- `isDeployToken: false`
- `isTaskCompletionToken: false`
- `grantsRuntimePermission: false`
- `mutatesSourceRecords: false`

## Shared Local Lifecycle Metadata

Every Sprint 21 assignment record uses the same local lifecycle unless a future reviewed spec explicitly defines an append-only exception.

Sprint 21 defines no append-only exception. DepartmentTaskIntakeRecord, DepartmentAssignmentProposal, DepartmentRoleFitReview, DepartmentAssignmentApprovalRecord, and DepartmentAssignmentAuditRecord all use the full local lifecycle.

Allowed local lifecycle actions:

- create.
- query.
- submit-review.
- approve-record.
- reject.
- supersede.
- archive.

Required lifecycle metadata:

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

Lifecycle transitions are local record transitions only. They must not mutate source Task, target Department records, target assignment records, Agent runtime, Tool runtime, workflow runtime, file/Git/PR records, external/MCP records, deployment, release, retry/replay/rollback/restore records, resume execution records, or Task completion state.

## Shared Assignment / Runtime Blockers

Every Sprint 21 assignment record must include:

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

## Hard Denies

Sprint 21 must not:

- execute Agent.
- continue Agent.
- auto-route Task.
- route Task at runtime.
- assign Agent at runtime.
- start AgentRun.
- execute ToolRun.
- request or approve runtime permission.
- execute workflow or step.
- read real files as product capability.
- write files.
- run shell or Git as product capability.
- call external APIs.
- connect MCP.
- create PRs.
- deploy, publish, or release.
- complete Tasks.
- retry, replay, rollback, restore, or resume execution.

## API Boundary

Allowed endpoint families:

- `/api/department-task-intakes`
- `/api/department-assignment-proposals`
- `/api/department-role-fit-reviews`
- `/api/department-assignment-approvals`
- `/api/department-assignment-audit-records`
- `/api/tasks/[id]/department-intake`
- `/api/tasks/[id]/department-assignment-proposals`
- `/api/departments/[id]/task-intakes`
- `/api/departments/[id]/assignment-review`
- `/api/department-assignment-proposals/[id]/role-fit`
- `/api/department-assignment-proposals/[id]/audit`
- `/api/department-assignment-proposals/[id]/timeline`

Allowed API actions:

- create.
- query.
- submit-review.
- approve-record.
- reject.
- supersede.
- archive.
- linked query.

Forbidden API semantics:

- route.
- auto-route.
- assign-agent.
- assign-runtime.
- start-agent.
- continue-agent.
- execute.
- run.
- grant-permission.
- request-permission.
- execute-workflow.
- complete-task.
- retry.
- replay.
- rollback.
- restore.
- resume.

## UI Boundary

Allowed labels:

- View Task Intake
- View Department Assignment Proposal
- View Role Fit Review
- Submit Assignment Review
- Approve Assignment Record
- Reject Assignment Record
- Archive Assignment Record
- View Assignment Audit
- View Assignment Timeline

Forbidden labels:

- Route Task
- Auto Route
- Assign Agent
- Assign Runtime Agent
- Start Agent
- Continue Agent
- Run Agent
- Run Tool
- Execute Workflow
- Grant Permission
- Request Permission
- Apply Change
- Write File
- Run Git
- Call API
- Connect MCP
- Create PR
- Deploy
- Publish
- Release
- Complete Task
- Retry
- Replay
- Rollback
- Restore
- Resume Execution

## Eval Boundary

Eval, RegressionGate, and ReleaseReadiness may provide recommendation-only evidence.

They must not grant assignment execution permission, automatic routing permission, runtime assignment permission, runtime permission, release permission, deploy permission, or Task completion.
