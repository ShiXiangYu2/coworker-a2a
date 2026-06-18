# PRD: Sprint 18 - Department Agent Profiles

Created: 2026-06-17
Status: proposed

## Current Baseline

Sprint 18 starts from Sprint 1-17 complete:

- Sprint 1-15 complete and sealed as MVP.
- Sprint 16 MVP Demo Polish / Operator Console UX complete and closed.
- Sprint 17 Read-only Evidence Import Sandbox complete and closed.

Sprint 18 is the first organization-layer sprint for the "Agent company" direction. It must not add real execution, automatic routing, runtime permission, file / Git / PR, external API, MCP, workflow execution, Agent continuation, ToolRun execution, deploy, publish, release, task completion, retry, replay, rollback, restore, or resume capability.

## Problem

The system has local tasks, Agent records, tool records, proposal records, workflow records, evidence import records, audit events, evals, regression gates, readiness records, and an operator console. It still lacks a company-like organization layer that explains:

- which department an Agent role belongs to.
- what responsibilities each department owns.
- what each department is explicitly not allowed to do.
- when a department must escalate to Kelvin or another human review path.
- how department records cite Sprint 1-17 evidence without becoming execution permission.

## Product Goal

Introduce local, auditable Department Agent Profile records:

```text
Sprint 1-17 sanitized evidence
  -> DepartmentProfile
  -> DepartmentAgentRole
  -> DepartmentResponsibilityMatrix
  -> DepartmentEscalationPolicy
  -> DepartmentPermissionBoundary
  -> DepartmentReviewRecord
  -> AuditEvent / ObservabilityEvent
  -> ChatHub / Task / Operator Console display
```

Sprint 18 explicitly does not implement this chain:

```text
DepartmentProfile
  -> auto route Task
  -> assign Agent
  -> continue Agent
  -> execute AgentRun
  -> execute ToolRun
  -> execute workflow / step
  -> write file / run Git
  -> call external API / connect MCP
  -> create PR / deploy / publish / release
  -> complete Task
  -> retry / replay / rollback / restore / resume execution
```

## Scope

Sprint 18 includes specs for:

- DepartmentProfile.
- DepartmentAgentRole.
- DepartmentResponsibilityMatrix.
- DepartmentEscalationPolicy.
- DepartmentPermissionBoundary.
- DepartmentReviewRecord.
- Department profile state machine.
- Department Agent profile safety contract.
- API design for local department records.
- ChatHub / Task / Operator Console department display design.
- AuditEvent and ObservabilityEvent integration.
- Recovery / Resume view-only integration.
- Eval / RegressionGate / ReleaseReadiness evidence-only checks.

## Non-Goals

Sprint 18 must not:

- execute Agent.
- continue Agent.
- auto-route Task.
- assign Agent at runtime.
- execute ToolRun.
- request or approve runtime permission.
- execute workflow or workflow step.
- read files, write files, apply patches, or format product target files.
- execute shell or Git.
- create PR.
- call external API.
- connect MCP.
- create webhook, worker, queue, or background job.
- deploy, publish, release, or delete.
- complete Task.
- retry, replay, rollback, restore, or resume execution.
- approve future department behavior automatically.
- enter Sprint 18 implementation or Sprint 19.

## Evidence Boundary

Sprint 1-17 records may be referenced only as sanitized evidence:

- Task.
- AgentRun / AgentResult.
- ToolCall / ToolRun / ToolExecutionReceipt.
- FileChangeProposal / PullRequestPlan.
- ExternalActionProposal / McpConnectionProfile.
- WorkflowProposal / WorkflowStepRecord.
- MVPReadinessRecord / GovernanceSummaryRecord.
- EvidenceImportRecord / SanitizedEvidenceSnapshot.
- AuditEvent / ObservabilityEvent.
- EvalRun / RegressionGate / ReleaseReadinessChecklist.

Evidence refs must not be interpreted as execution, routing, permission, release, deploy, external access, MCP access, or task completion tokens.

## Kelvin Human Confirmation Boundary

Kelvin approval in Sprint 18 only approves one local department profile, role, boundary, or review record.

Kelvin approval must not:

- execute Agent.
- continue Agent.
- execute ToolRun.
- execute workflow or workflow step.
- write files.
- execute Git.
- call external API.
- connect MCP.
- create PR.
- deploy, publish, release, or delete.
- complete Task.
- approve future similar department behavior.
- retry, replay, rollback, restore, or resume execution.

## API Design

Sprint 18 APIs may create, query, submit-review, approve-record, reject, supersede, and archive local department records only.

All Department records must share the same local lifecycle capability unless a future reviewed spec explicitly narrows a child record to DepartmentProfile-managed lifecycle. For Sprint 18, the required lifecycle surface is:

- create.
- query.
- submit-review.
- approve-record.
- reject.
- supersede.
- archive.

Every Department record type must include local lifecycle metadata:

- `reviewedBy?: string`
- `reviewedAt?: string`
- `archivedAt?: string`
- `supersedesRecordId?: string`
- `supersededByRecordId?: string`
- `supersededAt?: string`
- `supersedeReason?: string`

Every Department record type must include consistent token blockers:

- `isExecutionToken: false`
- `isRoutingToken: false`
- `isPermissionGrant: false`
- `isReleaseToken: false`
- `isDeployToken: false`
- `isTaskCompletionToken: false`
- `grantsRuntimePermission: false`
- `mutatesSourceRecords: false`

Recommended route groups:

- `GET /api/department-profiles`
- `POST /api/department-profiles`
- `GET /api/department-profiles/:id`
- `POST /api/department-profiles/:id/submit-review`
- `POST /api/department-profiles/:id/approve-record`
- `POST /api/department-profiles/:id/reject`
- `POST /api/department-profiles/:id/supersede`
- `POST /api/department-profiles/:id/archive`
- `GET /api/department-agent-roles`
- `POST /api/department-agent-roles`
- `GET /api/department-agent-roles/:id`
- `POST /api/department-agent-roles/:id/submit-review`
- `POST /api/department-agent-roles/:id/approve-record`
- `POST /api/department-agent-roles/:id/reject`
- `POST /api/department-agent-roles/:id/supersede`
- `POST /api/department-agent-roles/:id/archive`
- `GET /api/department-responsibility-matrices`
- `POST /api/department-responsibility-matrices`
- `GET /api/department-responsibility-matrices/:id`
- `POST /api/department-responsibility-matrices/:id/submit-review`
- `POST /api/department-responsibility-matrices/:id/approve-record`
- `POST /api/department-responsibility-matrices/:id/reject`
- `POST /api/department-responsibility-matrices/:id/supersede`
- `POST /api/department-responsibility-matrices/:id/archive`
- `GET /api/department-escalation-policies`
- `POST /api/department-escalation-policies`
- `GET /api/department-escalation-policies/:id`
- `POST /api/department-escalation-policies/:id/submit-review`
- `POST /api/department-escalation-policies/:id/approve-record`
- `POST /api/department-escalation-policies/:id/reject`
- `POST /api/department-escalation-policies/:id/supersede`
- `POST /api/department-escalation-policies/:id/archive`
- `GET /api/department-permission-boundaries`
- `POST /api/department-permission-boundaries`
- `GET /api/department-permission-boundaries/:id`
- `POST /api/department-permission-boundaries/:id/submit-review`
- `POST /api/department-permission-boundaries/:id/approve-record`
- `POST /api/department-permission-boundaries/:id/reject`
- `POST /api/department-permission-boundaries/:id/supersede`
- `POST /api/department-permission-boundaries/:id/archive`
- `GET /api/department-review-records`
- `POST /api/department-review-records`
- `GET /api/department-review-records/:id`
- `POST /api/department-review-records/:id/submit-review`
- `POST /api/department-review-records/:id/approve-record`
- `POST /api/department-review-records/:id/reject`
- `POST /api/department-review-records/:id/supersede`
- `POST /api/department-review-records/:id/archive`
- `GET /api/department-profiles/:id/evidence`
- `GET /api/department-profiles/:id/audit`
- `GET /api/department-profiles/:id/timeline`

APIs must not add Agent router automatic routing semantics or runtime permission semantics.

DepartmentPermissionBoundary records must not be consumed by any runtime permission system. They are descriptive local governance records only.

DepartmentReviewRecord approval only approves the single referenced local Department record. It must not approve future similar department behavior.

## UI Design

ChatHub, Task UI, and Operator Console may expose:

- View Department Profile.
- View Department Agent Role.
- View Responsibility Matrix.
- View Escalation Policy.
- View Department Permission Boundary.
- Submit Department Review.
- Approve Department Record.
- Reject Department Record.
- Archive Department Record.
- View Department Audit.
- View Department Timeline.

Required Sprint 18 safety note:

```text
Department records describe organization responsibilities and review boundaries only. They do not route tasks, continue agents, execute tools, run workflows, write files, call external systems, connect MCP, deploy, release, or complete tasks.
```

Forbidden UI labels:

- `Run Department`
- `Execute Department`
- `Assign Automatically`
- `Auto Route`
- `Delegate Now`
- `Continue Agent`
- `Run Agent`
- `Run Tool`
- `Execute Tool`
- `Execute Workflow`
- `Apply Change`
- `Write File`
- `Run Git`
- `Call API`
- `Connect MCP`
- `Create PR`
- `Deploy`
- `Publish`
- `Release`
- `Complete Task`
- `Retry`
- `Replay`
- `Rollback`
- `Restore`
- `Resume Execution`

## Observability / Audit / Recovery / Resume

Sprint 18 may add audit and observability events for local department record lifecycle changes.

Recovery and Resume integrations remain view-only and audit-only:

- RecoveryPoint can be linked as evidence.
- ResumePolicy can state that department records are not resumable execution.
- No rollback, restore, retry, replay, or resume execution may be triggered.

## Eval / RegressionGate / ReleaseReadiness

EvalRun, RegressionGate, and ReleaseReadinessChecklist may provide recommendation or evidence only.

They must not:

- execute Agent.
- route Task.
- grant runtime permission.
- approve department records automatically.
- release, deploy, or publish.
- satisfy Kelvin confirmation.
- complete Task.
- mutate source records.

Sprint 18 readiness must cover Sprint 1-17 regression.

## Acceptance Criteria

- Sprint 18 specs define local department organization records.
- Sprint 18 baseline is Sprint 1-17 complete.
- No real execution capability is introduced.
- Department records never become execution, routing, permission, release, deploy, or task completion tokens.
- Kelvin approval only changes one local department record status.
- State machine includes only `draft`, `review`, `approved_record`, `rejected`, `superseded`, and `archived`.
- Forbidden runtime states are absent.
- APIs are local record lifecycle and linked query only.
- All Department records have consistent token blockers.
- All Department record lifecycle APIs are local-only.
- Superseded records include supersede references and reason metadata.
- DepartmentPermissionBoundary cannot grant runtime permission or be consumed by runtime permission systems.
- No Agent router automatic routing is introduced.
- UI includes safety note and avoids forbidden labels.
- Observability, Audit, Recovery, Resume, Eval, RegressionGate, and ReleaseReadiness remain view-only / audit-only / recommendation-only / evidence-only.
- Sprint 1-17 behavior does not regress.
