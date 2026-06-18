# Contract: MVP Demo Polish Safety

Status: proposed for Sprint 16

## Purpose

This contract defines the safety boundary for Sprint 16 MVP Demo Polish / Operator Console UX.

Sprint 16 introduces read-only presentation specs only. It must not become an execution console, workflow runner, Agent continuation engine, ToolRun executor, file writer, Git executor, external API caller, MCP connector, PR creator, deployer, publisher, releaser, Task completion engine, retry engine, replay engine, rollback engine, restore engine, or resume engine.

## Baseline

Sprint 16 starts from:

- Sprint 1-15 complete.
- MVP sealed.
- Sprint 16+ treated as a new phase requiring fresh boundary review.

## Hard Denies

Sprint 16 must not:

- add real execution capability.
- execute AgentRun.
- execute ToolRun.
- execute workflow.
- execute workflow steps.
- write files, apply patches, or format product target files.
- execute shell or Git.
- commit, push, merge, checkout, or rebase.
- create PRs.
- call external APIs.
- connect MCP.
- invoke MCP tools.
- create webhook, worker, queue, or background job.
- deploy, publish, release, or delete.
- auto-fix or auto-remediate.
- complete Tasks.
- retry, replay, rollback, restore, or resume execution.
- auto-approve future records.
- mutate source evidence records from console views.
- add Prisma models by default.

## API Safety

Sprint 16 should reuse existing linked query APIs.

If new APIs are later approved, they must be GET-only read-only aggregation APIs. They must not:

- create records.
- update records.
- submit review.
- approve records.
- reject records.
- archive records.
- delete records.
- mutate source records.
- execute runtime behavior.
- perform external or MCP calls.
- write files or run Git.
- deploy, publish, release, retry, replay, rollback, restore, or resume.

## UI Safety

Allowed UI verbs:

- View.
- Inspect.
- Filter.
- Sort.
- Expand.
- Collapse.
- Compare.

Recommended labels:

- View MVP Demo Path.
- View Record Chain.
- View Safety Matrix.
- View Readiness Summary.
- View Audit Timeline.
- View Linked Evidence.
- View Local Review Status.
- View Safety Boundary.

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

## Evidence and Token Boundary

Sprint 1-15 records may be displayed only as sanitized evidence.

The following are not execution, release, deploy, publish, or task completion tokens:

- Kelvin approval.
- `approved_record`.
- `passed`.
- readiness status.
- MVPReadinessRecord.
- DemoScenarioRecord.
- GovernanceSummaryRecord.
- MVPReviewRecord.
- EvalRun.
- RegressionGate.
- ReleaseReadinessChecklist.
- AuditEvent.
- ObservabilityEvent.
- RecoveryPoint.
- ResumePolicy.

## Observability / Audit / Recovery / Resume

Sprint 16 may display existing events and policies only.

- AuditEvent is display evidence.
- ObservabilityEvent is timeline evidence.
- RecoveryPoint is inspection evidence.
- ResumePolicy is no-resume boundary evidence.

No rollback, restore, retry, replay, or resume execution may be triggered.

## Acceptance

- Sprint 16 specs are presentation-only.
- No Prisma model is added by default.
- No execution API is introduced.
- Any future aggregation API is GET-only and read-only.
- Console views do not mutate source records.
- UI avoids forbidden labels.
- Sprint 1-15 capabilities do not regress.

## Sprint 17 Evidence Import Display Boundary

Sprint 16 operator console views may display Sprint 17 evidence import records only as sanitized evidence.

Console views must not read files, open paths, run commands, run Git, fetch URLs, call APIs, connect MCP, import live data, sync systems, execute workflows, deploy, release, create PRs, retry, replay, rollback, restore, or resume execution.
