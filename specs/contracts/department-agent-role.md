# Contract: DepartmentAgentRole

Status: proposed for Sprint 18

## Purpose

DepartmentAgentRole maps one or more existing AgentProfile records into a local department role. It describes responsibilities, non-responsibilities, required evidence, collaboration peers, and escalation triggers.

It does not start, continue, assign, delegate, or execute any Agent.

## Fields

- `id: string`
- `targetSprint: 'sprint_18'`
- `baseline: 'sprint_1_17_complete'`
- `departmentProfileId: string`
- `roleKey: string`
- `displayName: string`
- `agentProfileRefs: string[]`
- `responsibilities: string[]`
- `nonResponsibilities: string[]`
- `requiredEvidenceKinds: string[]`
- `allowedRecordActions: DepartmentLocalAction[]`
- `forbiddenRuntimeActions: string[]`
- `collaborationPeers: string[]`
- `escalationTriggers: string[]`
- `status: DepartmentRecordStatus`
- `evidenceRefs: DepartmentEvidenceRef[]`
- `isExecutionToken: false`
- `isAutoRoutingToken: false`
- `grantsRuntimePermission: false`
- `createdBy: 'user' | 'operator' | 'system_seed'`
- `correlationId: string`
- `auditRefs: string[]`
- `createdAt: string`
- `updatedAt: string`
- `archivedAt?: string`

## Rules

- DepartmentAgentRole may describe role ownership only.
- `agentProfileRefs` are local references only and must not instantiate Agent runtime.
- `collaborationPeers` are descriptive only and must not dispatch A2A messages.
- `escalationTriggers` describe when human review is recommended; they do not auto-route or escalate at runtime.
- Role approval is not a permission grant and does not approve future actions.
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

Sprint 19 may map sanitized evidence to DepartmentAgentRole records for local review of role support.

DepartmentAgentRole must not use mapping records to run Agent, continue Agent, assign Agent, route Task, grant permission, execute ToolRun, execute workflow, or complete Task.

## Sprint 21 Department Assignment Boundary

Sprint 21 DepartmentTaskIntakeRecord, DepartmentAssignmentProposal, DepartmentRoleFitReview, DepartmentAssignmentApprovalRecord, and DepartmentAssignmentAuditRecord may reference this contract only as sanitized evidence or local review context.

Sprint 21 assignment records must not be consumed as execution tokens, routing tokens, runtime assignment tokens, runtime permission grants, release tokens, deploy tokens, Task completion tokens, retry/replay/rollback/restore tokens, resume execution tokens, or future approval tokens.

Kelvin approval in Sprint 21 approves only one local assignment record. It must not execute Agent, continue Agent, auto-route Task, assign Agent at runtime, start AgentRun, execute ToolRun, request or approve runtime permission, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, retry, replay, rollback, restore, resume execution, or approve future assignment behavior.
