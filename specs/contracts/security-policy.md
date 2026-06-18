# Contract: SecurityPolicy

Status: proposed for Sprint 10

## Purpose

SecurityPolicy is the production hardening root policy for `coworker-a2a`.

It collects the cross-cutting rules that keep Sprint 1-9 local records safe before any future real Tool Runtime, File / Git / PR workflow, external integration, MCP connector, or deployment automation is introduced.

## Schema

```ts
SecurityPolicy {
  id: string
  policyVersion: string
  status: 'draft' | 'active' | 'archived'

  scope: 'global' | 'resource'
  resourceType?: string
  resourceId?: string

  defaultDecision: 'deny'

  appliesTo: (
    | 'chat'
    | 'router'
    | 'task'
    | 'agent'
    | 'memory'
    | 'knowledge'
    | 'context'
    | 'a2a'
    | 'tool'
    | 'eval'
    | 'observability'
    | 'recovery'
    | 'collaboration'
    | 'file'
    | 'git'
    | 'external'
    | 'mcp'
    | 'deploy'
  )[]

  allowedRecordActions: string[]
  forbiddenExecutionActions: string[]
  forbiddenApiRouteSemantics: string[]

  requiresHumanConfirmationFor: (
    | 'high_risk_record_approval'
    | 'critical_risk_record_approval'
    | 'permission_override_request'
    | 'release_readiness_approval'
    | 'security_policy_activation'
  )[]

  commandPolicyId?: string
  redactionPolicyId?: string
  secretRedactionPolicyId?: string
  apiAuthBoundaryId?: string
  productionObservabilityPolicyId?: string

  auditRequired: true
  correlationRequired: true
  redactionRequired: true

  createdBy: 'kelvin' | 'system'
  createdAt: string
  updatedAt: string
}
```

## Sprint 10 Default Policy

```ts
SecurityPolicy {
  id: 'security-policy-sprint-10'
  policyVersion: 'sprint-10.0'
  status: 'active'
  scope: 'global'
  defaultDecision: 'deny'
  allowedRecordActions: [
    'view',
    'inspect',
    'create_local_record',
    'submit_review',
    'approve_local_record',
    'reject_local_record',
    'archive_local_record'
  ]
  forbiddenExecutionActions: [
    'execute_agent',
    'execute_tool',
    'run_shell',
    'run_git',
    'write_file',
    'create_pr',
    'deploy',
    'delete',
    'call_external_api',
    'call_mcp',
    'dispatch_a2a',
    'resume_execution',
    'auto_fix',
    'bypass_permission'
  ]
  auditRequired: true
  correlationRequired: true
  redactionRequired: true
}
```

## Evaluation Rules

1. Missing SecurityPolicy means deny.
2. Unknown resource type means deny.
3. Unknown action means deny.
4. Any execution-like action is denied in Sprint 10.
5. Any policy conflict resolves to deny.
6. Human confirmation can approve local records only.
7. Human confirmation cannot authorize execution in Sprint 10.
8. SecurityPolicy activation requires Kelvin review.
9. Policy evaluation must not mutate the target record.
10. Policy evaluation must emit audit and observability records when implemented.
11. Resource-scoped SecurityPolicy must be equal to or stricter than the active global SecurityPolicy.
12. Resource-scoped SecurityPolicy must not introduce new allowed actions, execution capabilities, or permission bypass.

## Safety Invariants

- `defaultDecision` must be `deny`.
- SecurityPolicy must not contain execution allowlists in Sprint 10.
- SecurityPolicy must not create ToolRun, AgentRun, FilePatch, GitOperation, PullRequestRun, DeployRun, ExternalApiCall, McpSession, QueueJob, Worker, or AutoFixRun records.
- SecurityPolicy must not override CommandPolicy default-deny.
- SecurityPolicy must not bypass AgentPermissionBoundary.
- SecurityPolicy must not bypass Kelvin approval for high-risk local records.
- Local or resource-scoped SecurityPolicy can only narrow the global policy.
- If global and resource policies conflict, the more restrictive decision wins.

## Sprint 11 Controlled Tool Runtime Boundary

Future boundary only, not implemented in Sprint 10.

Sprint 11 may introduce a new global policy version, for example `security-policy-sprint-11`, that keeps `defaultDecision = deny` while recognizing one narrow controlled exception:

```text
execute-approved_local_deterministic_toolrun
```

This exception is not the generic `execute_tool` capability. Generic `execute_tool` remains denied.

Sprint 11 resource-scoped SecurityPolicy may reference this exception only for one specific ToolRun and only when the active Sprint 11 global policy version recognizes the exception.

It may allow only:

- one explicit `execute-approved_local_deterministic_toolrun` action.
- only for approved deterministic local `internal_noop` or `read_simulated` ToolRuns.
- only after ToolExecutionPolicy, ToolSandbox, ToolPermission, ToolExecutionPlan, RecoveryPoint, and required Kelvin confirmation all pass.

It must still deny:

- shell
- Git
- real file read
- file write, patch, format, delete
- PR
- deploy
- database migration
- external API
- MCP
- browser automation
- retry, replay, rollback, resume execution
- Agent continuation
- automatic future approvals

Any Sprint 11 resource-scoped policy must be stricter than the active Sprint 11 global SecurityPolicy version. It must not introduce generic `execute_tool`, shell, Git, file, PR, deploy, external API, MCP, browser, retry, replay, rollback, resume execution, Agent continuation, or future approval capabilities.

`execute-approved_local_deterministic_toolrun` must not be consumed as a reusable token. It is valid only for the exact ToolRun, ToolExecutionPlan, policyVersion, sandboxId, executorId, idempotencyKey, and confirmationArtifactId captured at approval time.

## Sprint 12 File / Git / PR Proposal Boundary

Future boundary only, not implemented in Sprint 10.

Sprint 12 must not introduce a new execution exception.

Allowed record actions may include:

- `create_file_change_proposal_record`
- `create_patch_draft_record`
- `create_git_change_plan_record`
- `create_pull_request_plan_record`
- `create_review_patch_record`
- `approve_file_git_pr_local_record`
- `reject_file_git_pr_local_record`
- `archive_file_git_pr_local_record`

These are local record actions only.

SecurityPolicy must still deny:

- real workspace file reads
- file writes
- patch application
- formatting
- shell
- Git
- commit, push, merge, checkout, rebase
- PR creation
- deploy
- delete
- external API
- MCP
- browser automation
- retry, replay, rollback, resume execution
- Agent continuation
- Task completion

Resource-scoped SecurityPolicy for Sprint 12 may narrow proposal review rules for a specific FileChangeProposal, PatchDraft, GitChangePlan, PullRequestPlan, or ReviewPatchRecord. It must not relax the global policy or grant execution capability.

## Sprint 13 External / MCP Governance Boundary

Future boundary only, not implemented in Sprint 10.

Sprint 13 must not introduce a new execution exception.

Allowed record actions may include:

- `create_external_integration_profile_record`
- `create_mcp_connection_profile_record`
- `create_external_action_proposal_record`
- `create_external_action_review_record`
- `create_integration_risk_assessment_record`
- `create_integration_audit_policy_record`
- `approve_external_mcp_local_record`
- `reject_external_mcp_local_record`
- `archive_external_mcp_local_record`

These are local record actions only.

SecurityPolicy must still deny:

- external API calls
- MCP connections
- network requests
- webhook creation or dispatch
- worker, queue, or background job creation
- email, chat, message, webhook, notification, or integration event sending
- external system reads
- external schema fetches
- external system writes
- shell
- Git
- file write, patch, format, delete
- PR creation
- deploy
- retry, replay, rollback, resume execution
- Agent continuation
- ToolRun execution
- Task completion

Resource-scoped SecurityPolicy for Sprint 13 may narrow governance review rules for a specific ExternalIntegrationProfile, McpConnectionProfile, ExternalActionProposal, ExternalActionReviewRecord, IntegrationRiskAssessment, or IntegrationAuditPolicy. It must not relax the global policy or grant external execution capability.
## Sprint 14 Workflow Orchestration Boundary

Sprint 14 must not introduce a new execution exception.

SecurityPolicy may allow local workflow record creation, review, approval-record, rejection, supersede, archive, and query actions only. It must not grant workflow execution, step execution, Agent continuation, ToolRun execution, file write, Git execution, external API call, MCP connection, PR creation, deploy, Task completion, retry, replay, rollback, or resume execution.

Resource-scoped SecurityPolicy for Sprint 14 may narrow governance review rules for a specific WorkflowProposal, WorkflowStepRecord, WorkflowDependencyGraph, WorkflowReviewRecord, or WorkflowReadinessAssessment. It must not relax global policy.
## Sprint 15 MVP Closure Security Boundary

SecurityPolicy must treat Sprint 15 as local readiness, demo, governance summary, and review records only.

Default deny remains in force for execution, release, deploy, publish, file write, shell, Git, external API, MCP, PR creation, webhook, worker, queue, Agent execution, ToolRun execution, workflow execution, Task completion, retry, replay, rollback, restore, and resume execution.

Scoped policies for Sprint 15 must not loosen global policy and must not convert readiness approval into execution, release, or deploy permission.

## Sprint 16 MVP Demo Polish Security Boundary

SecurityPolicy must treat Sprint 16 as read-only MVP demo polish and operator console presentation only.

Default deny remains in force for execution, release, deploy, publish, file write, shell, Git, external API, MCP, PR creation, webhook, worker, queue, Agent execution, ToolRun execution, workflow execution, Task completion, retry, replay, rollback, restore, and resume execution.

Scoped policies for Sprint 16 may allow only view, inspect, filter, sort, expand, collapse, compare, and GET-only read-only aggregation of existing local records. They must not loosen global policy and must not convert console display, Kelvin approval, `approved_record`, `passed`, or readiness status into execution, release, deploy, publish, or Task completion permission.

## Sprint 17 Evidence Import Security Boundary

SecurityPolicy must treat Sprint 17 as read-only evidence import records only.

Default deny remains in force for file reads, directory reads, clipboard reads, shell, Git, URL fetches, external API calls, MCP connections, external system reads or writes, execution, release, deploy, publish, PR creation, webhook, worker, queue, Agent execution, ToolRun execution, workflow execution, Task completion, retry, replay, rollback, restore, and resume execution.

Scoped policies for Sprint 17 may allow only local EvidenceSourceProfile, EvidenceImportRecord, SanitizedEvidenceSnapshot, EvidenceRedactionPolicy, and EvidenceReviewRecord creation, review, approval-record, rejection, archive, query, and display. They must not loosen global policy and must not convert evidence import, Kelvin approval, `approved_record`, sanitized snapshots, or reviews into execution, external access, release, deploy, publish, or Task completion permission.
## Sprint 18 Department Agent Profile Boundary

Sprint 18 DepartmentProfile, DepartmentAgentRole, DepartmentResponsibilityMatrix, DepartmentEscalationPolicy, DepartmentPermissionBoundary, and DepartmentReviewRecord records may reference this contract only as sanitized local evidence or read-only governance context.

Sprint 18 department records must not be consumed as execution, routing, runtime permission, release, deploy, external access, MCP access, PR creation, task completion, retry, replay, rollback, restore, resume, or future approval tokens.

Kelvin approval in Sprint 18 approves only one local department record. It must not execute Agent, continue Agent, execute ToolRun, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, or approve future department behavior.


## Sprint 19 Department Mapping Security Boundary

SecurityPolicy must treat Sprint 19 mapping records as local review records only.

SecurityPolicy must not consume mapping records as runtime permission grants, Agent router inputs, ToolRun approvals, workflow approvals, file/Git/PR approvals, external API/MCP approvals, live import approvals, deploy/release approvals, retry/replay/rollback/restore approvals, resume execution approvals, or Task completion signals.

## Sprint 20 Human-Gated Execution Security Boundary

SecurityPolicy must treat Sprint 20 execution records as local governance records only.

SecurityPolicy may allow local execution intent, plan, gate, approval, and receipt creation, query, review, approval-record, rejection, supersede, archive, and linked query actions only.

SecurityPolicy must not consume execution records as runtime permission grants, Agent router inputs, ToolRun approvals, workflow approvals, file/Git/PR approvals, external API/MCP approvals, live execution approvals, deploy/release approvals, retry/replay/rollback/restore approvals, resume execution approvals, or Task completion signals.

## Sprint 21 Department Assignment Boundary

Sprint 21 DepartmentTaskIntakeRecord, DepartmentAssignmentProposal, DepartmentRoleFitReview, DepartmentAssignmentApprovalRecord, and DepartmentAssignmentAuditRecord may reference this contract only as sanitized evidence or local review context.

Sprint 21 assignment records must not be consumed as execution tokens, routing tokens, runtime assignment tokens, runtime permission grants, release tokens, deploy tokens, Task completion tokens, retry/replay/rollback/restore tokens, resume execution tokens, or future approval tokens.

Kelvin approval in Sprint 21 approves only one local assignment record. It must not execute Agent, continue Agent, auto-route Task, assign Agent at runtime, start AgentRun, execute ToolRun, request or approve runtime permission, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, retry, replay, rollback, restore, resume execution, or approve future assignment behavior.
