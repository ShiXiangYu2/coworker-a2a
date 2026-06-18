# Contract: DepartmentProfile

Status: proposed for Sprint 18

## Purpose

DepartmentProfile defines a local, auditable department in the Agent company organization layer. It describes mission, scope, linked Agent roles, responsibility matrix, escalation policy, permission boundary, and sanitized evidence refs.

DepartmentProfile is not an execution handle, routing handle, permission grant, release token, deploy token, or task completion token.

## Fields

- `id: string`
- `targetSprint: 'sprint_18'`
- `baseline: 'sprint_1_17_complete'`
- `departmentKey: string`
- `displayName: string`
- `mission: string`
- `scopeSummary: string`
- `status: DepartmentRecordStatus`
- `departmentType: 'ceo_office' | 'product' | 'engineering' | 'qa' | 'security' | 'operations' | 'research' | 'customer_success' | 'finance' | 'legal' | 'custom'`
- `agentRoleRefs: string[]`
- `responsibilityMatrixRef?: string`
- `escalationPolicyRef?: string`
- `permissionBoundaryRef?: string`
- `evidenceRefs: DepartmentEvidenceRef[]`
- `riskFindings: string[]`
- `openIssues: string[]`
- `isExecutionToken: false`
- `isRoutingToken: false`
- `isPermissionGrant: false`
- `isReleaseToken: false`
- `isDeployToken: false`
- `isTaskCompletionToken: false`
- `requiresKelvinConfirmation: true`
- `createdBy: 'user' | 'operator' | 'system_seed'`
- `reviewedBy?: string`
- `reviewedAt?: string`
- `correlationId: string`
- `auditRefs: string[]`
- `createdAt: string`
- `updatedAt: string`
- `archivedAt?: string`

## Evidence Ref

```ts
type DepartmentEvidenceRef = {
  sourceType:
    | 'task'
    | 'agent_run'
    | 'agent_result'
    | 'tool_call'
    | 'tool_run'
    | 'tool_execution_receipt'
    | 'file_change_proposal'
    | 'pull_request_plan'
    | 'external_action_proposal'
    | 'mcp_connection_profile'
    | 'workflow_proposal'
    | 'workflow_step_record'
    | 'mvp_readiness_record'
    | 'governance_summary_record'
    | 'evidence_import_record'
    | 'sanitized_evidence_snapshot'
    | 'audit_event'
    | 'observability_event'
    | 'eval_run'
    | 'regression_gate'
    | 'release_readiness_checklist'
  sourceId: string
  summary: string
  redactionStatus: 'sanitized' | 'redacted'
  evidenceOnly: true
  isExecutionToken: false
  isRoutingToken: false
  isPermissionGrant: false
}
```

## Rules

- `targetSprint` must be `sprint_18`.
- `baseline` must be `sprint_1_17_complete`.
- DepartmentProfile may reference Sprint 1-17 records only as sanitized evidence.
- DepartmentProfile must not execute Agent, continue Agent, execute ToolRun, execute workflow, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, retry, replay, rollback, restore, or resume execution.
- Kelvin approval of DepartmentProfile only changes this local record status.
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

Sprint 19 may map sanitized evidence to DepartmentProfile records for local Operator review.

DepartmentProfile must not consume mapping records as execution, routing, runtime permission, release, deploy, or Task completion tokens. Mapping approval does not activate the department at runtime.

## Sprint 20 Human-Gated Execution Boundary

Sprint 20 execution records may reference DepartmentProfile as sanitized evidence or local review context only.

DepartmentProfile must not become an execution authorization, Agent router input, runtime permission grant, release token, deploy token, task completion token, or future approval token.

## Sprint 21 Department Assignment Boundary

Sprint 21 DepartmentTaskIntakeRecord, DepartmentAssignmentProposal, DepartmentRoleFitReview, DepartmentAssignmentApprovalRecord, and DepartmentAssignmentAuditRecord may reference this contract only as sanitized evidence or local review context.

Sprint 21 assignment records must not be consumed as execution tokens, routing tokens, runtime assignment tokens, runtime permission grants, release tokens, deploy tokens, Task completion tokens, retry/replay/rollback/restore tokens, resume execution tokens, or future approval tokens.

Kelvin approval in Sprint 21 approves only one local assignment record. It must not execute Agent, continue Agent, auto-route Task, assign Agent at runtime, start AgentRun, execute ToolRun, request or approve runtime permission, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, retry, replay, rollback, restore, resume execution, or approve future assignment behavior.
