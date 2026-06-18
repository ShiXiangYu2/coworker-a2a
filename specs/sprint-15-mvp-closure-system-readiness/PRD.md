# PRD: Sprint 15 - MVP Closure / System Readiness

Created: 2026-06-17
Status: proposed

## Current Baseline

Sprint 15 starts from the real project baseline where Sprint 1-14 are complete and have passed final validation.

Sprint 15 is the stage-end MVP closure sprint. It must preserve all Sprint 1-14 behavior and must not expand real execution capability.

## Problem

Sprint 1-14 created the core MVP record layers:

- ChatHub and Harmony Task.
- AgentRun analysis-only records.
- ToolCall / ToolRun controlled deterministic local runtime records.
- File / Git / PR proposal-only records.
- External / MCP governance-only records.
- Human-gated Workflow Orchestration record-only records.
- Audit, Observability, Recovery, Eval, RegressionGate, and ReleaseReadiness records.

The product now needs a clear MVP readiness layer that can present these records as a coherent demo, review, and handoff package without turning readiness approval into release, deploy, execution, or task completion.

## Product Goal

Introduce local, auditable MVP Closure / System Readiness records:

```text
Sprint 1-14 records
  -> DemoScenarioRecord
  -> GovernanceSummaryRecord
  -> MVPReadinessRecord
  -> MVPReviewRecord
  -> Kelvin review
  -> approved_record / rejected / archived
  -> AuditEvent / ObservabilityEvent
  -> ChatHub / Task UI / Governance Console display
```

Sprint 15 explicitly does not implement this execution chain:

```text
MVPReadinessRecord
  -> execute Agent
  -> execute ToolRun
  -> execute workflow
  -> write file
  -> run Git
  -> call external API
  -> connect MCP
  -> create PR
  -> deploy
  -> publish
  -> release
  -> complete Task
```

## Scope

Sprint 15 includes local records only:

- MVPReadinessRecord.
- DemoScenarioRecord.
- GovernanceSummaryRecord.
- MVPReviewRecord.
- MVP readiness state machine.
- MVP closure safety contract.
- API design for local readiness, demo, governance summary, review, approve-record, reject, archive, and linked queries.
- ChatHub / Task UI / Governance Console entry design.
- AuditEvent and ObservabilityEvent integration.
- Recovery / Resume view-only integration.
- Eval / RegressionGate / ReleaseReadiness recommendation-only integration.
- MVP acceptance matrix and demo path documentation.

## Non-Goals

Sprint 15 must not:

- add real execution capability.
- execute AgentRun, ToolRun, workflow, or workflow step.
- write files, apply patches, or format product target files.
- execute shell or Git as product capability.
- commit, push, merge, checkout, or rebase.
- create PR.
- call external APIs.
- connect MCP.
- create webhook, worker, queue, or background job.
- deploy, publish, release, or delete.
- auto-fix or auto-remediate.
- complete Task.
- retry, replay, rollback, restore, or resume execution.
- approve future records automatically.
- enter Sprint 16 implementation.

## Record Model Summary

Sprint 15 introduces four local record types:

- `MVPReadinessRecord`: the stage-end readiness package for Sprint 1-14.
- `DemoScenarioRecord`: a human-readable, local demo script and evidence chain.
- `GovernanceSummaryRecord`: a compact governance and safety summary across Sprint 1-14.
- `MVPReviewRecord`: Kelvin or operator review of a local readiness/demo/governance record.

All records must carry:

- `status` from the Sprint 15 state machine.
- `targetSprint: 'sprint_15'`.
- `baselineSprints` covering Sprint 1-14.
- sanitized evidence refs only.
- `isExecutionToken: false`.
- `isReleaseToken: false`.
- `isDeployToken: false`.
- `requiresKelvinConfirmation` where approval is possible.
- `createdBy`, `correlationId`, `auditRefs`, timestamps.

## Evidence Boundary

Sprint 1-14 records may be referenced only as sanitized evidence:

- Task.
- AgentRun / AgentResult.
- ToolCall / ToolRun / ToolResult / ToolExecutionReceipt.
- FileChangeProposal / PatchDraft / GitChangePlan / PullRequestPlan / ReviewPatchRecord.
- ExternalActionProposal / IntegrationRiskAssessment / ExternalActionReviewRecord.
- WorkflowProposal / WorkflowStepRecord / WorkflowDependencyGraph / WorkflowReadinessAssessment / WorkflowReviewRecord.
- AuditEvent / ObservabilityEvent / RecoveryPoint.
- EvalRun / RegressionGate / ReleaseReadinessChecklist.
- user-provided snippets and sanitized context snapshots.

Evidence must not be interpreted as:

- execution token.
- release token.
- deploy token.
- task completion token.
- Kelvin confirmation.
- permission grant.
- future automatic approval.

## Kelvin Human Confirmation Boundary

Kelvin approval in Sprint 15 only changes one local readiness or review record status to `approved_record`.

Kelvin approval must not:

- execute AgentRun.
- execute ToolRun.
- execute workflow or workflow step.
- write files, apply patches, or format files.
- execute shell or Git.
- create PR.
- call external APIs.
- connect MCP.
- deploy, publish, release, or delete.
- create webhook, worker, queue, or background job.
- complete Task.
- retry, replay, rollback, restore, or resume execution.
- approve future readiness records automatically.

## MVP Readiness State Machine

Allowed states:

- `draft`
- `review`
- `approved_record`
- `rejected`
- `archived`

Forbidden states:

- `running`
- `executed`
- `deployed`
- `published`
- `released`
- `auto_fixed`
- `auto_remediated`
- `completed`
- `retried`
- `replayed`
- `rolled_back`
- `resumed`

`approved_record` means the local readiness record was approved for human review purposes only. It is not a product release, deployment, publish, execution, or task completion.

## API Design

Sprint 15 API routes are local record APIs only.

Recommended route groups:

- `GET /api/mvp-readiness-records`
- `POST /api/mvp-readiness-records`
- `GET /api/mvp-readiness-records/:id`
- `POST /api/mvp-readiness-records/:id/submit-review`
- `POST /api/mvp-readiness-records/:id/approve-record`
- `POST /api/mvp-readiness-records/:id/reject`
- `POST /api/mvp-readiness-records/:id/archive`
- `GET /api/demo-scenario-records`
- `POST /api/demo-scenario-records`
- `GET /api/demo-scenario-records/:id`
- `POST /api/demo-scenario-records/:id/archive`
- `GET /api/governance-summary-records`
- `POST /api/governance-summary-records`
- `GET /api/governance-summary-records/:id`
- `POST /api/governance-summary-records/:id/archive`
- `GET /api/mvp-review-records`
- `POST /api/mvp-review-records`
- `GET /api/mvp-review-records/:id`
- `POST /api/mvp-review-records/:id/approve-record`
- `POST /api/mvp-review-records/:id/reject`
- `POST /api/mvp-review-records/:id/archive`

Linked query routes may connect MVP readiness records to Task, AgentRun, ToolRun, FileChangeProposal, ExternalActionProposal, WorkflowProposal, AuditEvent, RegressionGate, and ReleaseReadinessChecklist records.

All POST routes must create, review, approve-record, reject, or archive local records only. They must not execute runtime behavior or mutate source evidence records.

## UI Design

ChatHub, Task UI, and Governance Console may expose:

- Create MVP Readiness Record.
- View MVP Readiness.
- View Demo Scenario.
- View Governance Summary.
- Submit MVP Review.
- Approve MVP Record.
- Reject MVP Record.
- Archive MVP Record.
- View Audit.
- View Timeline.

Required Sprint 15 safety note:

```text
Sprint 15 readiness records are local MVP closure evidence only. Approval does not execute, release, deploy, publish, complete tasks, or authorize future actions.
```

Forbidden UI labels:

- `Execute`
- `Run`
- `Deploy`
- `Publish`
- `Release`
- `Auto Fix`
- `Auto Remediate`
- `Complete Task`
- `Continue Agent`
- `Run Tool`
- `Apply Change`
- `Write File`
- `Run Git`
- `Call API`
- `Connect MCP`
- `Create PR`
- `Retry`
- `Replay`
- `Rollback`
- `Resume Execution`

## Observability / Audit / Recovery / Resume

Sprint 15 may add audit and observability events for local readiness record lifecycle changes.

Recovery and Resume integrations remain view-only and audit-only:

- RecoveryPoint can be linked as evidence.
- ResumePolicy can state that MVP closure records are not resumable execution.
- No rollback, restore, retry, replay, or resume execution may be triggered.

## Eval / RegressionGate / ReleaseReadiness

EvalRun, RegressionGate, and ReleaseReadinessChecklist may provide recommendation or evidence only.

They must not:

- execute anything.
- approve MVP readiness automatically.
- release, deploy, or publish.
- satisfy Kelvin confirmation.
- complete Task.
- mutate source records.

Sprint 15 readiness must cover Sprint 1-14 regression.

## Acceptance Criteria

- Sprint 15 specs define local readiness, demo, governance summary, and review records.
- No execution states are introduced.
- No execution APIs are introduced.
- No deployment, release, publish, PR, Git, file write, external API, MCP, worker, queue, retry, replay, rollback, or resume capability is introduced.
- Sprint 1-14 records are treated as sanitized evidence only.
- Kelvin approval only changes one local readiness or review record.
- UI includes safety note and avoids forbidden labels.
- RegressionGate and ReleaseReadiness support `targetSprint = 'sprint_15'` as evidence only.
- Sprint 15 is documented as the recommended stage-final MVP sprint.

## Stage Closure Position

Sprint 15 is recommended as the phase-final MVP closure sprint.

If Sprint 16+ is considered later, it must be treated as a new phase with a fresh boundary review. Sprint 16+ must not inherit permission to add execution, deploy, release, external, MCP, file, Git, PR, retry, replay, rollback, or resume capability without explicit new specs and approval.
