# Contract: RegressionGate

Status: proposed for Sprint 10

## Purpose

RegressionGate defines the minimum evidence required to prove previous Sprint behavior has not regressed.

RegressionGate is a quality record only. It does not block, complete, retry, replay, restore, execute, or deploy anything automatically.

## Schema

```ts
RegressionGate {
  id: string
  gateVersion: string
  correlationId: string
  targetSprint: 'sprint_10' | 'sprint_11' | 'sprint_12' | 'sprint_13'

  status: 'draft' | 'evaluating_record' | 'passed' | 'failed' | 'blocked' | 'archived'

  requiredChecks: RegressionCheck[]
  forbiddenRegressions: string[]
  coverageSummary: {
    sprint1: boolean
    sprint2: boolean
    sprint3: boolean
    sprint4: boolean
    sprint5: boolean
    sprint6: boolean
    sprint7: boolean
    sprint8: boolean
    sprint9: boolean
    sprint10?: boolean
    sprint11?: boolean
    sprint12?: boolean
  }

  evidenceRefs?: string[]
  findingRefs?: string[]
  reviewedBy?: 'kelvin' | 'turing' | 'system'
  reviewedAt?: string

  createdAt: string
  updatedAt: string
}
```

```ts
RegressionCheck {
  id: string
  sprint:
    | 'sprint_1'
    | 'sprint_2'
    | 'sprint_3'
    | 'sprint_4'
    | 'sprint_5'
    | 'sprint_6'
    | 'sprint_7'
    | 'sprint_8'
    | 'sprint_9'
    | 'sprint_10'
    | 'sprint_11'
    | 'sprint_12'

  name: string
  expectedBehavior: string
  status: 'pending' | 'passed' | 'failed' | 'blocked' | 'not_applicable'
  evidenceRefs?: string[]
  checkedAt?: string
}
```

## Required Coverage

- Sprint 1: ChatHub MVP / SSE.
- Sprint 2: CEO Agent Router.
- Sprint 3: Harmony Task Engine.
- Sprint 4: analysis-only Agent Runtime.
- Sprint 5: Memory / Knowledge / local A2A draft.
- Sprint 6: ToolCall proposal / Permission / CommandPolicy / Human Confirmation / Audit.
- Sprint 7: Eval / Verification / Quality Gate recommendation-only.
- Sprint 8: Observability / Audit Log / Recovery / Resume view-only.
- Sprint 9: local controlled Multi-Agent Collaboration / A2A Runtime records.
- Sprint 10: production hardening remains non-executing.

Sprint 10 implementation covers Sprint 1-9 only. Sprint 11 and Sprint 12 checks are future boundaries and are not active Sprint 10 requirements.

## Forbidden Regressions

- ChatHub SSE stops streaming.
- Router no longer returns structured RouteDecision.
- Harmony Task state machine allows invalid transitions.
- Agent Runtime becomes executing instead of analysis-only.
- Memory / Knowledge / A2A records are auto-approved.
- ToolCall proposal becomes real Tool execution.
- Permission evaluation auto-approves records.
- Eval QualityGateDecision mutates target status automatically.
- ResumeToken resumes execution.
- CollaborationSession dispatches messages or starts Agents.
- Sprint 10 release readiness deploys or starts execution.
- Sprint 10 introduces active Sprint 11 Tool Runtime requirements.
- Sprint 10 introduces active Sprint 12 File / Git / PR requirements.

## Safety Invariants

- `passed` is a readiness recommendation, not a deployment trigger.
- `passed` is a human-readable readiness recommendation only.
- `failed` does not automatically block Task status.
- `blocked` does not automatically block Task status.
- RegressionGate must not mutate Sprint 1-9 resources.
- RegressionGate must not create ToolCall, ToolRun, AgentRun, EvalRun, A2ATurn, FilePatch, GitOperation, PR, deploy, external API, or MCP records.
- RegressionGate `passed` must not be used as a Sprint 11 Tool Runtime, File / Git / PR workflow, deploy, external API, or MCP execution permit.
- RegressionGate `passed` must not be consumed as an automatic precondition token by an execution path.

## Sprint 12 Regression Boundary

Future boundary only, not implemented in Sprint 10.

Sprint 12 may use RegressionGate as evidence that Sprint 1-11 did not regress.

For Sprint 12 implementation, `targetSprint = 'sprint_12'` is allowed and must cover Sprint 1-11 behavior.

RegressionGate may recommend readiness for File / Git / PR proposal workflow testing, but:

- `passed` is not a file write token.
- `passed` for `targetSprint = 'sprint_12'` is not an execution token.
- `passed` must not apply PatchDraft.
- `passed` must not run Git.
- `passed` must not create PRs.
- `passed` must not deploy or delete.
- `passed` must not satisfy Kelvin confirmation.
- `blocked` must not mutate proposal status automatically.

Sprint 12 RegressionGate must include checks proving:

- FileChangeProposal is independent from ToolRun.
- PatchDraft cannot be applied.
- GitChangePlan cannot run Git.
- PullRequestPlan cannot create PR.
- Kelvin approval only changes local record status.
- Sprint 11 `execute-approved` remains constrained and does not become file/Git/PR execution.
- Sprint 11 ToolResult and ToolExecutionReceipt can be evidence but cannot become File / Git / PR execution tokens.
- no FileWrite, FilePatchApply, GitOperation, PullRequestRun, DeployRun, DeleteOperation, worker, queue, retry, replay, rollback, or resume execution model is introduced.

## Sprint 11 Regression Boundary

Future boundary only, not implemented in Sprint 10.

Sprint 11 may use RegressionGate as evidence that Sprint 1-10 did not regress.

RegressionGate may recommend readiness for controlled Tool Runtime testing, but:

- `passed` is not a ToolRun execution token.
- `passed` for `targetSprint = 'sprint_11'` is not an execution token.
- `passed` must not approve ToolExecutionPlan.
- `passed` must not satisfy Kelvin confirmation.
- `passed` must not bypass RecoveryPoint.
- `passed` must not call `execute-approved`.
- `blocked` must not mutate ToolRun status automatically.

Sprint 11 RegressionGate must include checks proving:

- legacy ToolRun records cannot skip into Sprint 11 execution states.
- `allow_record_only` cannot execute.
- `execute-approved_local_deterministic_toolrun` is not generic `execute_tool`.
- expired ToolExecutionPlan cannot execute.
- `before_tool_execution` RecoveryPoint is required before execution.

## Sprint 13 External / MCP Governance Regression Boundary

Sprint 13 may use RegressionGate as evidence that Sprint 1-12 did not regress.

For Sprint 13 implementation, `targetSprint = 'sprint_13'` is allowed and must cover Sprint 1-12 behavior.

RegressionGate may recommend readiness for External / MCP governance proposal testing, but:

- `passed` is not an external API token.
- `passed` for `targetSprint = 'sprint_13'` is not an execution token.
- `passed` must not call external APIs.
- `passed` must not connect MCP.
- `passed` must not create webhooks.
- `passed` must not send messages.
- `passed` must not create workers, queues, or background jobs.
- `passed` must not read or write external systems.
- `passed` must not satisfy Kelvin confirmation.
- `blocked` must not mutate governance record status automatically.

Sprint 13 RegressionGate must include checks proving:

- ExternalActionProposal is independent from ToolRun.
- McpConnectionProfile remains disabled local record only.
- endpoint metadata does not persist secrets.
- external schemas are not fetched.
- ToolResult and ToolExecutionReceipt can be evidence but cannot become External / MCP execution tokens.
- FileChangeProposal and PullRequestPlan can be evidence but cannot become External / MCP execution tokens.
- Kelvin approval only changes local governance record status.
- no ExternalApiCall, McpSession, WebhookDispatch, IntegrationRun, ExternalSyncRun, MessageSendRun, worker, queue, retry, replay, rollback, or resume execution model is introduced.
## Sprint 14 Workflow Orchestration Regression Boundary

Sprint 14 may use RegressionGate as evidence that Sprint 1-13 did not regress.

For Sprint 14 implementation, `targetSprint = 'sprint_14'` is allowed and must cover Sprint 1-13 behavior.

RegressionGate `passed` is not a workflow execution token. It must not authorize workflow execution, step execution, Agent continuation, ToolRun execution, file write, Git execution, external API call, MCP connection, PR creation, deploy, Task completion, retry, replay, rollback, or resume execution.

Sprint 14 RegressionGate must include checks proving no execution-oriented workflow states, APIs, models, UI labels, or runtime calls exist.

## Sprint 15 MVP Closure Regression Boundary

Sprint 15 may use RegressionGate as evidence that Sprint 1-14 did not regress.

For Sprint 15 implementation, `targetSprint = 'sprint_15'` is allowed and must cover Sprint 1-14 behavior.

RegressionGate `passed` is not an execution, release, deploy, publish, or Task completion token. It must not authorize AgentRun execution, ToolRun execution, workflow execution, file write, Git execution, external API call, MCP connection, PR creation, deploy, publish, release, retry, replay, rollback, restore, resume execution, or automatic remediation.

Sprint 15 RegressionGate must include checks proving:

- MVPReadinessRecord is not an execution, release, or deploy token.
- DemoScenarioRecord cannot execute demo steps.
- GovernanceSummaryRecord cannot grant permission.
- MVPReviewRecord approval only changes local record status.
- Sprint 1-14 records are sanitized evidence only.
- forbidden API semantics are absent.
- forbidden UI labels are absent.
- no execution-oriented MVP, release, deploy, publish, worker, queue, retry, replay, rollback, or resume models are introduced.

## Sprint 16 MVP Demo Polish Regression Boundary

Sprint 16 may use RegressionGate as evidence that Sprint 1-15 did not regress.

For Sprint 16 implementation, `targetSprint = 'sprint_16'` is allowed and must cover Sprint 1-15 behavior.

RegressionGate `passed` is not an execution, release, deploy, publish, Task completion, permission, or future approval token. It must not authorize AgentRun execution, ToolRun execution, workflow execution, file write, Git execution, external API call, MCP connection, PR creation, deploy, publish, release, retry, replay, rollback, restore, resume execution, or automatic remediation.

Sprint 16 RegressionGate must include checks proving:

- MVPOperatorConsole is read-only.
- MVPRecordChainView treats Sprint 1-15 records as sanitized evidence only.
- MVPSafetyMatrixView cannot grant permission.
- any Sprint 16 API is GET-only read-only aggregation.
- no source records are mutated by Sprint 16 console views.
- Kelvin approval, `approved_record`, `passed`, and readiness status are not execution, release, deploy, publish, or Task completion tokens.
- forbidden API semantics are absent.
- forbidden UI labels are absent.
- no Sprint 16 Prisma models are added by default.

## Sprint 17 Evidence Import Regression Boundary

Sprint 17 may use RegressionGate as evidence that Sprint 1-16 did not regress.

For Sprint 17 implementation, `targetSprint = 'sprint_17'` is allowed and must cover Sprint 1-16 behavior.

RegressionGate `passed` is not a file read, command execution, URL fetch, external API, MCP, execution, release, deploy, publish, Task completion, permission, or future approval token.

Sprint 17 RegressionGate must include checks proving:

- evidence sources are user-explicit only.
- path, command, URL, endpoint, and MCP metadata are not dereferenced.
- raw input is not stored by default.
- secrets and credentials are rejected or redacted.
- EvidenceImportRecord and SanitizedEvidenceSnapshot are evidence only.
- EvidenceReviewRecord approval only changes local record status.
- no source records are mutated by Sprint 17 APIs.
- forbidden API semantics are absent.
- forbidden UI labels are absent.
- no FileReadRun, DirectoryReadRun, ClipboardReadRun, ShellCommand, GitOperation, UrlFetchRun, ExternalApiCall, McpSession, worker, queue, retry, replay, rollback, restore, or resume execution models are introduced.
## Sprint 18 Department Agent Profile Boundary

Sprint 18 DepartmentProfile, DepartmentAgentRole, DepartmentResponsibilityMatrix, DepartmentEscalationPolicy, DepartmentPermissionBoundary, and DepartmentReviewRecord records may reference this contract only as sanitized local evidence or read-only governance context.

Sprint 18 department records must not be consumed as execution, routing, runtime permission, release, deploy, external access, MCP access, PR creation, task completion, retry, replay, rollback, restore, resume, or future approval tokens.

Kelvin approval in Sprint 18 approves only one local department record. It must not execute Agent, continue Agent, execute ToolRun, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, or approve future department behavior.


## Sprint 19 Department Mapping Regression Gate

RegressionGate may include Sprint 19 mapping safety checks as evidence only.

RegressionGate pass must not become a mapping execution token, department routing token, runtime permission token, live import token, release token, deploy token, or Task completion token.

## Sprint 20 Human-Gated Execution Regression Gate

RegressionGate may include Sprint 20 execution gateway safety checks as evidence only.

RegressionGate pass must not become an execution token, Agent routing token, runtime permission token, ToolRun approval token, workflow execution token, file/Git/PR token, external API/MCP token, release token, deploy token, retry/replay/rollback/restore/resume token, or Task completion token.

## Sprint 21 Department Assignment Boundary

Sprint 21 DepartmentTaskIntakeRecord, DepartmentAssignmentProposal, DepartmentRoleFitReview, DepartmentAssignmentApprovalRecord, and DepartmentAssignmentAuditRecord may reference this contract only as sanitized evidence or local review context.

Sprint 21 assignment records must not be consumed as execution tokens, routing tokens, runtime assignment tokens, runtime permission grants, release tokens, deploy tokens, Task completion tokens, retry/replay/rollback/restore tokens, resume execution tokens, or future approval tokens.

Kelvin approval in Sprint 21 approves only one local assignment record. It must not execute Agent, continue Agent, auto-route Task, assign Agent at runtime, start AgentRun, execute ToolRun, request or approve runtime permission, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, retry, replay, rollback, restore, resume execution, or approve future assignment behavior.
