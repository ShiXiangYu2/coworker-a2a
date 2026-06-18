# Plan: Sprint 16 - MVP Demo Polish / Operator Console UX

Status: proposed

## Baseline

Sprint 16 assumes Sprint 1-15 are complete, validated, and sealed as the phase MVP.

Sprint 16 is a new post-MVP phase. It polishes the demo path and operator console presentation only. It does not add real execution capability.

## Implementation Shape

1. Add Sprint 16 specs.
2. Add read-only presentation contracts:
   - MVPOperatorConsole.
   - MVPRecordChainView.
   - MVPSafetyMatrixView.
   - MVP demo polish safety.
3. Prefer existing Sprint 1-15 linked query APIs.
4. If necessary, define GET-only read-only aggregation APIs.
5. Add ChatHub / Task / Governance Console display requirements.
6. Add copy rules for read-only evidence and Kelvin approval boundaries.
7. Add acceptance checks proving:
   - no source record mutation.
   - no execution semantics.
   - no forbidden labels.
   - Sprint 1-15 regression remains covered.

## Read-Only Display Flow

```text
Sprint 1-15 local records
  -> read existing linked query APIs
  -> build in-memory MVPRecordChainView
  -> build in-memory MVPSafetyMatrixView
  -> display MVPOperatorConsole
```

The flow is a presentation flow only. It must not execute Agent, ToolRun, workflow, file, Git, external, MCP, PR, deploy, publish, release, task completion, retry, replay, rollback, restore, or resume behavior.

## API Boundary

Sprint 16 should not require new API routes by default.

Allowed API behavior if later approved:

- GET-only read-only aggregation.
- return existing local records.
- return derived display summaries.
- return audit timeline views.
- return safety matrix views.
- return readiness summary views.

Forbidden API behavior:

- POST / PUT / PATCH / DELETE for Sprint 16 console features.
- create, review, approve, reject, archive, delete, or mutate records.
- execute AgentRun.
- execute ToolRun.
- execute workflow or step.
- write files.
- run Git or shell.
- create PR.
- call external APIs.
- connect MCP.
- create webhook, worker, queue, or background job.
- deploy, publish, release, or delete.
- complete Task.
- retry, replay, rollback, restore, or resume execution.

## UI Boundary

Allowed labels:

- View MVP Demo Path.
- View Record Chain.
- View Safety Matrix.
- View Readiness Summary.
- View Audit Timeline.
- View Task Record Chain.
- View Linked Evidence.
- View Local Review Status.
- View Safety Boundary.
- MVP Overview.
- Human Approval Boundary.

Forbidden labels:

- Execute.
- Run.
- Deploy.
- Publish.
- Release.
- Auto Fix.
- Auto Remediate.
- Complete Task.
- Continue Agent.
- Run Tool.
- Apply Change.
- Write File.
- Run Git.
- Call API.
- Connect MCP.
- Create PR.
- Retry.
- Replay.
- Rollback.
- Resume Execution.

## Data Model Guidance

Sprint 16 should not add Prisma models by default.

The console should be built from derived TypeScript view models and existing local records. Future persisted console preferences, saved filters, or saved dashboards require a separate boundary review before implementation.

## Test Plan

Sprint 16 implementation should test:

- MVPOperatorConsole uses read-only data only.
- MVPRecordChainView treats all Sprint 1-15 records as sanitized evidence only.
- MVPSafetyMatrixView marks execution, release, deploy, publish, external, MCP, file, Git, PR, retry, replay, rollback, restore, and resume as denied.
- any Sprint 16 API is GET-only and does not mutate source records.
- Kelvin approval, `approved_record`, `passed`, and readiness status are not execution, release, deploy, publish, or task completion tokens.
- forbidden UI labels are absent.
- Observability / Audit / Recovery / Resume / Eval / RegressionGate / ReleaseReadiness remain view-only / audit-only / recommendation-only / evidence-only.
- Sprint 1-15 regression remains covered.

## New Phase Position

Sprint 16 is the first post-MVP polish sprint. It is not a capability expansion sprint.

Any Sprint 16+ proposal to add real execution, external reads, MCP sessions, file writes, Git operations, PR creation, deploy, publish, release, workers, queues, retry, replay, rollback, restore, or resume execution must be treated as a new scope and safety review.
