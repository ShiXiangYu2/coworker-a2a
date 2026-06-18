# Contract: ReleaseReadinessChecklist

Status: proposed for Sprint 10

## Purpose

ReleaseReadinessChecklist records whether the system is ready for a reviewed release or future implementation phase.

Sprint 10 readiness approval is a local record only. It does not deploy, merge, push, create PRs, or start any runtime.

## Schema

```ts
ReleaseReadinessChecklist {
  id: string
  checklistVersion: string
  targetSprint: 'sprint_10' | 'sprint_11' | 'sprint_12' | 'sprint_13'
  targetRelease?: string
  correlationId: string

  status:
    | 'draft'
    | 'ready_for_review'
    | 'approved_record'
    | 'rejected'
    | 'blocked'
    | 'archived'

  securityPolicyId: string
  regressionGateId: string
  apiAuthBoundaryId?: string
  productionObservabilityPolicyId?: string

  checks: ReleaseReadinessCheck[]
  findings?: {
    id: string
    severity: 'info' | 'low' | 'medium' | 'high' | 'critical'
    summary: string
    targetPath?: string
    evidenceRefs?: string[]
    status: 'open' | 'reviewed' | 'dismissed'
  }[]

  reviewedBy?: 'kelvin' | 'turing' | 'system'
  reviewedAt?: string

  createdAt: string
  updatedAt: string
}
```

```ts
ReleaseReadinessCheck {
  id: string
  category:
    | 'security'
    | 'auth'
    | 'redaction'
    | 'audit'
    | 'observability'
    | 'regression'
    | 'ui'
    | 'data'
    | 'build'
    | 'docs'
    | 'deployment_readiness'

  name: string
  description: string
  status: 'pending' | 'passed' | 'failed' | 'blocked' | 'not_applicable'
  required: boolean
  evidenceRefs?: string[]
  checkedAt?: string
}
```

## Required Check Categories

- SecurityPolicy default-deny.
- AgentPermissionBoundary forbids execution.
- Claude CEO plan-only boundary.
- CommandPolicy default-deny.
- Permission evaluation does not auto-approve.
- Secrets and blocked payload redaction.
- AuditEvent append-only.
- Observability correlationId coverage.
- ApiAuthBoundary roles.
- UI forbidden label scan.
- API forbidden route semantics scan.
- Sprint 1-9 RegressionGate coverage for Sprint 10.
- Sprint 10 implementation must not include active Sprint 11 controlled Tool Runtime readiness checks.
- Sprint 10 implementation must not include active Sprint 12 File / Git / PR readiness checks.

## State Rules

Allowed transitions:

- `draft -> ready_for_review`
- `ready_for_review -> approved_record`
- `ready_for_review -> rejected`
- `ready_for_review -> blocked`
- `approved_record -> archived`
- `rejected -> archived`
- `blocked -> ready_for_review`
- `blocked -> archived`

`approved_record`, `rejected`, and `archived` are terminal for release readiness decision purposes unless a new checklist version is created.

`approved_record` is a human-readable readiness recommendation only.

It must not be used as:

- a Sprint 11 Tool Runtime execution permit.
- a Sprint 11 `execute-approved_local_deterministic_toolrun` token.
- a File / Git / PR workflow execution permit.
- a deploy permit.
- an external API or MCP permit.
- an automatic precondition token consumed by an execution path.
- a Sprint 12 File / Git / PR write, apply, Git, PR, deploy, or delete permit.

## Safety Invariants

- ReleaseReadinessChecklist approval must not deploy.
- ReleaseReadinessChecklist approval must not create PRs.
- ReleaseReadinessChecklist approval must not start AgentRun, ToolRun, EvalRun, A2A dispatch, or external integration.
- ReleaseReadinessChecklist status must not mutate Task, AgentRun, ToolCall, Memory, Eval, A2A, or Collaboration target states.
- ReleaseReadinessChecklist approval must not be treated as an execution token by future sprints.

## Sprint 11 Tool Runtime Readiness Boundary

Future boundary only, not implemented in Sprint 10.

Sprint 11 may reference ReleaseReadinessChecklist as evidence only.

`approved_record` must not:

- approve ToolRun execution.
- become an execution token for `targetSprint = 'sprint_11'`.
- approve ToolExecutionPlan.
- satisfy Kelvin confirmation.
- bypass ToolExecutionPolicy.
- bypass ToolSandbox.
- bypass RecoveryPoint.
- call `execute-approved`.
- authorize shell, Git, file, PR, deploy, external API, MCP, browser, database migration, retry, replay, rollback, or Agent continuation.

For `targetSprint = 'sprint_11'`, required readiness checks must include:

- `execute-approved_local_deterministic_toolrun` is not generic `execute_tool`.
- legacy ToolRun records cannot enter Sprint 11 execution states.
- `allow_record_only` cannot execute.
- expired ToolExecutionPlan cannot execute.
- `before_tool_execution` RecoveryPoint exists before execution.
- RegressionGate `targetSprint = 'sprint_11'` covers Sprint 1-10 behavior.

## Sprint 12 File / Git / PR Readiness Boundary

Future boundary only, not implemented in Sprint 10.

Sprint 12 may reference ReleaseReadinessChecklist as evidence only.

For Sprint 12 implementation, `targetSprint = 'sprint_12'` is allowed and must reference RegressionGate evidence covering Sprint 1-11 behavior.

`approved_record` must not:

- write files.
- apply PatchDraft.
- format files.
- run shell or Git.
- commit, push, merge, checkout, or rebase.
- create PRs.
- deploy.
- delete.
- approve future File / Git / PR workflows automatically.
- satisfy Kelvin confirmation.
- start AgentRun or execute ToolRun.
- complete Task.
- authorize File / Git / PR execution from ToolResult or ToolExecutionReceipt evidence.

For `targetSprint = 'sprint_12'`, required readiness checks must include:

- FileChangeProposal is independent from ToolRun.
- PatchDraft is persisted but cannot be applied.
- GitChangePlan cannot run Git.
- PullRequestPlan cannot create PR.
- proposal sources are limited to AgentResult, ToolResult, ToolExecutionReceipt, CollaborationDecision, user-provided snippet, and sanitized context snapshot.
- RegressionGate `targetSprint = 'sprint_12'` covers Sprint 1-11 behavior.
- Sprint 11 ToolResult and ToolExecutionReceipt are evidence only and are not File / Git / PR execution tokens.
- no FileWrite, FilePatchApply, GitOperation, PullRequestRun, DeployRun, DeleteOperation, worker, queue, retry, replay, rollback, or resume execution model is introduced.

## Sprint 13 External / MCP Governance Readiness Boundary

Sprint 13 may reference ReleaseReadinessChecklist as evidence only.

For Sprint 13 implementation, `targetSprint = 'sprint_13'` is allowed and must reference RegressionGate evidence covering Sprint 1-12 behavior.

`approved_record` must not:

- call external APIs.
- connect MCP.
- send network requests.
- create webhooks.
- create workers, queues, or background jobs.
- send email, chat, messages, webhooks, or notifications.
- read external system data or fetch external schemas.
- write external systems.
- approve future External / MCP workflows automatically.
- satisfy Kelvin confirmation.
- start AgentRun or execute ToolRun.
- complete Task.
- authorize External / MCP execution from ToolResult, ToolExecutionReceipt, FileChangeProposal, or PullRequestPlan evidence.

For `targetSprint = 'sprint_13'`, required readiness checks must include:

- ExternalActionProposal is independent from ToolRun.
- McpConnectionProfile is disabled local record only.
- endpoint metadata stores no secrets.
- external schemas are not fetched.
- external proposal sources are limited to AgentResult, ToolResult, ToolExecutionReceipt, CollaborationDecision, FileChangeProposal, PullRequestPlan, user-provided snippet, and sanitized context snapshot.
- RegressionGate `targetSprint = 'sprint_13'` covers Sprint 1-12 behavior.
- Sprint 11 ToolResult and ToolExecutionReceipt are evidence only and are not External / MCP execution tokens.
- Sprint 12 FileChangeProposal and PullRequestPlan are evidence only and are not External / MCP execution tokens.
- no ExternalApiCall, McpSession, WebhookDispatch, IntegrationRun, ExternalSyncRun, MessageSendRun, worker, queue, retry, replay, rollback, or resume execution model is introduced.
## Sprint 14 Workflow Orchestration Readiness Boundary

Sprint 14 may reference ReleaseReadinessChecklist as evidence only.

For Sprint 14 implementation, `targetSprint = 'sprint_14'` is allowed and must reference RegressionGate evidence covering Sprint 1-13 behavior.

ReleaseReadinessChecklist `approved_record` is not a workflow execution token. It must not authorize workflow execution, step execution, Agent continuation, ToolRun execution, file write, Git execution, external API call, MCP connection, PR creation, deploy, Task completion, retry, replay, rollback, or resume execution.

## Sprint 15 MVP Closure Readiness Boundary

Sprint 15 may reference ReleaseReadinessChecklist as evidence only.

For Sprint 15 implementation, `targetSprint = 'sprint_15'` is allowed and must reference RegressionGate evidence covering Sprint 1-14 behavior.

ReleaseReadinessChecklist `approved_record` is not an execution, release, deploy, publish, or Task completion token. It must not authorize AgentRun execution, ToolRun execution, workflow execution, file write, Git execution, external API call, MCP connection, PR creation, deploy, publish, release, retry, replay, rollback, restore, resume execution, or automatic remediation.

For `targetSprint = 'sprint_15'`, required readiness checks must include:

- MVPReadinessRecord is local readiness evidence only.
- DemoScenarioRecord is a local demo script only.
- GovernanceSummaryRecord is a local summary only.
- MVPReviewRecord approval only changes local record status.
- Sprint 1-14 records are sanitized evidence only and are not execution, release, or deploy tokens.
- Sprint 15 is documented as the recommended stage-final MVP sprint.
- Sprint 16+ requires a fresh phase boundary review.

## Sprint 16 MVP Demo Polish Readiness Boundary

Sprint 16 may reference ReleaseReadinessChecklist as evidence only.

For Sprint 16 implementation, `targetSprint = 'sprint_16'` is allowed and must reference RegressionGate evidence covering Sprint 1-15 behavior.

ReleaseReadinessChecklist `approved_record` is not an execution, release, deploy, publish, or Task completion token. It must not authorize AgentRun execution, ToolRun execution, workflow execution, file write, Git execution, external API call, MCP connection, PR creation, deploy, publish, release, retry, replay, rollback, restore, resume execution, or automatic remediation.

For `targetSprint = 'sprint_16'`, required readiness checks must include:

- MVPOperatorConsole is read-only presentation only.
- MVPRecordChainView is sanitized evidence only.
- MVPSafetyMatrixView cannot grant permission.
- Sprint 1-15 records are not execution, release, or deploy tokens.
- Sprint 16 defaults to no new Prisma models.
- Sprint 16 APIs, if any, are GET-only read-only aggregation.
- Sprint 16 keeps MVP sealed behavior intact.

## Sprint 17 Evidence Import Readiness Boundary

Sprint 17 may reference ReleaseReadinessChecklist as evidence only.

For Sprint 17 implementation, `targetSprint = 'sprint_17'` is allowed and must reference RegressionGate evidence covering Sprint 1-16 behavior.

ReleaseReadinessChecklist `approved_record` is not a file read, command execution, URL fetch, external API, MCP, execution, release, deploy, publish, or Task completion token.

For `targetSprint = 'sprint_17'`, required readiness checks must include:

- EvidenceImportRecord is local evidence only.
- SanitizedEvidenceSnapshot is sanitized evidence only.
- EvidenceSourceProfile metadata is not dereferenced.
- EvidenceRedactionPolicy rejects or redacts secrets.
- EvidenceReviewRecord approval only changes local record status.
- Sprint 17 APIs do not read files, execute commands, fetch URLs, call external APIs, connect MCP, or mutate source records.
- Sprint 17 keeps Sprint 1-16 behavior intact.
## Sprint 18 Department Agent Profile Boundary

Sprint 18 DepartmentProfile, DepartmentAgentRole, DepartmentResponsibilityMatrix, DepartmentEscalationPolicy, DepartmentPermissionBoundary, and DepartmentReviewRecord records may reference this contract only as sanitized local evidence or read-only governance context.

Sprint 18 department records must not be consumed as execution, routing, runtime permission, release, deploy, external access, MCP access, PR creation, task completion, retry, replay, rollback, restore, resume, or future approval tokens.

Kelvin approval in Sprint 18 approves only one local department record. It must not execute Agent, continue Agent, execute ToolRun, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, or approve future department behavior.


## Sprint 19 Department Mapping Release Readiness Boundary

Sprint 19 may reference ReleaseReadinessChecklist as evidence only.

ReleaseReadinessChecklist approval must not authorize mapping execution, department routing, runtime permission, live evidence import, Agent continuation, ToolRun execution, workflow execution, file write, Git execution, external API call, MCP connection, PR creation, deploy, release, retry, replay, rollback, restore, resume execution, or Task completion.

## Sprint 20 Human-Gated Execution Readiness Boundary

Sprint 20 may reference ReleaseReadinessChecklist as evidence only.

ReleaseReadinessChecklist approval must not authorize execution gateway records as real execution, Agent routing, runtime permission, ToolRun approval, workflow execution, file write, Git execution, external API call, MCP connection, PR creation, deploy, release, retry, replay, rollback, restore, resume execution, or Task completion.

## Sprint 21 Department Assignment Boundary

Sprint 21 DepartmentTaskIntakeRecord, DepartmentAssignmentProposal, DepartmentRoleFitReview, DepartmentAssignmentApprovalRecord, and DepartmentAssignmentAuditRecord may reference this contract only as sanitized evidence or local review context.

Sprint 21 assignment records must not be consumed as execution tokens, routing tokens, runtime assignment tokens, runtime permission grants, release tokens, deploy tokens, Task completion tokens, retry/replay/rollback/restore tokens, resume execution tokens, or future approval tokens.

Kelvin approval in Sprint 21 approves only one local assignment record. It must not execute Agent, continue Agent, auto-route Task, assign Agent at runtime, start AgentRun, execute ToolRun, request or approve runtime permission, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, retry, replay, rollback, restore, resume execution, or approve future assignment behavior.
