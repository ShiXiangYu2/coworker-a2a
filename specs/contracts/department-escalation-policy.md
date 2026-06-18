# Contract: DepartmentEscalationPolicy

Status: proposed for Sprint 18

## Purpose

DepartmentEscalationPolicy describes when a department should ask for human review or cross-department review. It is a local policy record only.

It must not auto-route, auto-delegate, continue Agent, execute ToolRun, or create runtime escalation.

## Fields

- `id: string`
- `targetSprint: 'sprint_18'`
- `baseline: 'sprint_1_17_complete'`
- `departmentProfileId: string`
- `policyVersion: string`
- `status: DepartmentRecordStatus`
- `escalationTriggers: DepartmentEscalationTrigger[]`
- `forbiddenEscalationSemantics: string[]`
- `evidenceRefs: DepartmentEvidenceRef[]`
- `isExecutionToken: false`
- `isAutoRoutingToken: false`
- `isPermissionGrant: false`
- `createdBy: 'user' | 'operator' | 'system_seed'`
- `correlationId: string`
- `auditRefs: string[]`
- `createdAt: string`
- `updatedAt: string`

## Trigger

```ts
type DepartmentEscalationTrigger = {
  triggerKey: string
  conditionSummary: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  escalateTo: 'kelvin' | 'owner' | 'operator' | 'department_review'
  requiredEvidenceRefs: string[]
  responseExpectation: string
}
```

## Required Forbidden Semantics

- `auto_route`
- `auto_execute`
- `resume_agent`
- `execute_tool`
- `execute_workflow`
- `complete_task`
- `call_external_system`
- `connect_mcp`

## Rules

- Escalation means "recommend human review", not runtime action.
- No trigger may send messages, dispatch webhooks, create jobs, or mutate source records.
- EscalationPolicy approval does not approve future runtime escalation.
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

Sprint 19 may map sanitized evidence to DepartmentEscalationPolicy records to explain local escalation review coverage.

Mapping or coverage records must not trigger escalation at runtime, assign Agent, continue Agent, connect external systems, notify external systems, retry, replay, rollback, restore, or resume execution.

## Sprint 21 Department Assignment Boundary

Sprint 21 DepartmentTaskIntakeRecord, DepartmentAssignmentProposal, DepartmentRoleFitReview, DepartmentAssignmentApprovalRecord, and DepartmentAssignmentAuditRecord may reference this contract only as sanitized evidence or local review context.

Sprint 21 assignment records must not be consumed as execution tokens, routing tokens, runtime assignment tokens, runtime permission grants, release tokens, deploy tokens, Task completion tokens, retry/replay/rollback/restore tokens, resume execution tokens, or future approval tokens.

Kelvin approval in Sprint 21 approves only one local assignment record. It must not execute Agent, continue Agent, auto-route Task, assign Agent at runtime, start AgentRun, execute ToolRun, request or approve runtime permission, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, retry, replay, rollback, restore, resume execution, or approve future assignment behavior.
