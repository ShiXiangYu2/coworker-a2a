# PRD: Sprint 16 - MVP Demo Polish / Operator Console UX

Created: 2026-06-17
Status: proposed

## Current Baseline

Sprint 16 starts after the sealed MVP baseline where Sprint 1-15 are complete and have passed final closure validation.

Sprint 16 is the first post-MVP phase. It must begin with a fresh boundary review and must not inherit permission to add real execution, release, deploy, external, MCP, file, Git, PR, retry, replay, rollback, restore, or resume capability.

## Problem

Sprint 1-15 created a complete local, auditable MVP:

- ChatHub and Harmony Task.
- AgentRun analysis-only records.
- ToolCall / ToolRun controlled deterministic local runtime records.
- File / Git / PR proposal-only records.
- External / MCP governance-only records.
- Human-gated Workflow Orchestration record-only records.
- MVP readiness, demo, governance summary, and review records.
- Audit, Observability, Recovery, Eval, RegressionGate, and ReleaseReadiness evidence records.

The product now needs a clearer operator-facing demo path and governance console presentation so a human reviewer can understand the complete record chain, safety boundaries, Kelvin approval semantics, audit timeline, and readiness summary without mistaking any display for execution permission.

## Product Goal

Introduce read-only MVP Demo Polish / Operator Console UX specs:

```text
Sprint 1-15 sealed MVP records
  -> MVPRecordChainView
  -> MVPSafetyMatrixView
  -> MVPOperatorConsole
  -> ChatHub / Task / Governance Console display
  -> read-only audit timeline and readiness summary
```

Sprint 16 explicitly does not implement this chain:

```text
Operator Console
  -> execute Agent
  -> execute ToolRun
  -> execute workflow
  -> write file
  -> run Git
  -> call external API
  -> connect MCP
  -> create PR
  -> deploy / publish / release
  -> complete Task
  -> retry / replay / rollback / restore / resume execution
```

## Scope

Sprint 16 includes specs for read-only presentation only:

- MVPOperatorConsole.
- MVPRecordChainView.
- MVPSafetyMatrixView.
- MVP demo polish safety contract.
- ChatHub MVP demo path display.
- Task record chain display.
- Governance Console overview, timeline, safety matrix, and readiness summary.
- Read-only usage of existing linked query APIs.
- Optional future GET-only aggregation API design.
- UI copy rules that avoid execution semantics.
- Acceptance criteria proving Sprint 1-15 capabilities do not regress.

## Non-Goals

Sprint 16 must not:

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
- add Prisma models by default.
- enter Sprint 16 implementation or Sprint 17.

## Data Model Position

Sprint 16 should not add Prisma models by default.

The preferred implementation shape is local UI view models derived from existing Sprint 1-15 records:

- `MVPRecordChainView`.
- `MVPSafetyMatrixView`.
- `MVPOperatorConsole`.

If a future implementation proposes persisted console state, saved views, or new records, that must be reviewed as a new scope expansion before implementation.

## API Boundary

Sprint 16 should prefer existing linked query APIs from Sprint 1-15.

If implementation later needs new APIs, they may only be GET-only read-only aggregation APIs such as:

- `GET /api/mvp-operator-console/overview`
- `GET /api/mvp-operator-console/record-chain`
- `GET /api/mvp-operator-console/safety-matrix`
- `GET /api/mvp-operator-console/audit-timeline`

These APIs must not:

- create, update, review, approve, reject, archive, or delete records.
- mutate source records.
- trigger Agent runtime.
- trigger Tool runtime.
- execute workflow or steps.
- write files.
- execute shell or Git.
- call external APIs or MCP.
- create PRs.
- deploy, publish, or release.
- complete Task.
- retry, replay, rollback, restore, or resume execution.

## Evidence Boundary

Sprint 1-15 records may be displayed only as sanitized evidence:

- Task.
- AgentRun / AgentResult.
- ToolCall / ToolRun / ToolResult / ToolExecutionReceipt.
- FileChangeProposal / PatchDraft / GitChangePlan / PullRequestPlan / ReviewPatchRecord.
- ExternalActionProposal / IntegrationRiskAssessment / ExternalActionReviewRecord.
- WorkflowProposal / WorkflowStepRecord / WorkflowDependencyGraph / WorkflowReadinessAssessment / WorkflowReviewRecord.
- MVPReadinessRecord / DemoScenarioRecord / GovernanceSummaryRecord / MVPReviewRecord.
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

## Kelvin / Readiness Boundary

Kelvin approval, `approved_record`, `passed`, and readiness status in Sprint 16 views mean local review or evidence only.

They must not:

- execute AgentRun.
- execute ToolRun.
- execute workflow or workflow step.
- write files, apply patches, or format files.
- execute shell or Git.
- create PR.
- call external APIs.
- connect MCP.
- deploy, publish, release, or delete.
- complete Task.
- retry, replay, rollback, restore, or resume execution.
- approve future records automatically.

## UI Design

ChatHub may expose:

- View MVP Demo Path.
- View Record Chain.
- View Safety Matrix.
- View Readiness Summary.
- View Audit Timeline.

Task UI may expose:

- View Task Record Chain.
- View Linked Evidence.
- View Local Review Status.
- View Safety Boundary.

Governance Console may expose:

- MVP Overview.
- Record Chain.
- Human Approval Boundary.
- Audit Timeline.
- Safety Matrix.
- Regression / Release Readiness.
- Demo Scenario.

Required Sprint 16 safety note:

```text
Sprint 16 operator console views are read-only MVP demo and governance presentations. They do not execute, release, deploy, publish, complete tasks, or authorize future actions.
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

Sprint 16 may display existing audit and observability events in read-only timelines.

Recovery and Resume integrations remain view-only and audit-only:

- RecoveryPoint can be displayed as evidence.
- ResumePolicy can be displayed as a no-resume boundary.
- No rollback, restore, retry, replay, or resume execution may be triggered.

## Eval / RegressionGate / ReleaseReadiness

EvalRun, RegressionGate, and ReleaseReadinessChecklist may be displayed as recommendation or evidence only.

They must not:

- execute anything.
- approve MVP console views automatically.
- release, deploy, or publish.
- satisfy Kelvin confirmation.
- complete Task.
- mutate source records.

Sprint 16 presentation must preserve Sprint 1-15 regression coverage.

## Acceptance Criteria

- Sprint 16 specs define read-only MVP demo polish and operator console UX.
- No Prisma models are added by default.
- No execution states are introduced.
- No execution APIs are introduced.
- Any future Sprint 16 API is GET-only read-only aggregation.
- Operator Console displays local records, audit timeline, readiness summary, and safety matrix without mutating source records.
- Sprint 1-15 records are treated as sanitized evidence only.
- Kelvin approval, `approved_record`, `passed`, and readiness status are not execution, release, or deploy tokens.
- UI includes safety note and avoids forbidden labels.
- Observability, Audit, Recovery, Resume, Eval, RegressionGate, and ReleaseReadiness remain view-only / audit-only / recommendation-only / evidence-only.
- Sprint 1-15 behavior does not regress.
