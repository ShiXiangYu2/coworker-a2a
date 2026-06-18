# Plan: Sprint 15 - MVP Closure / System Readiness

Status: proposed

## Baseline

Sprint 15 assumes Sprint 1-14 are complete and validated.

Sprint 15 is a closure sprint. It organizes the existing MVP into local readiness, demo, governance summary, and review records. It does not add real execution capability.

## Implementation Shape

1. Add Sprint 15 contracts.
2. Add local record types for MVP readiness, demo scenario, governance summary, and MVP review.
3. Add pure validation rules:
   - readiness state machine validation.
   - sanitized evidence ref validation.
   - forbidden state validation.
   - forbidden action validation.
   - release/deploy/execution token blocker.
4. Add Prisma local record models only if implementation specs permit.
5. Add local record APIs only:
   - create.
   - query.
   - submit-review.
   - approve-record.
   - reject.
   - archive.
   - linked query.
6. Add ChatHub / Task UI / Governance Console display entries.
7. Add AuditEvent and ObservabilityEvent lifecycle entries.
8. Extend Eval / RegressionGate / ReleaseReadiness with Sprint 15 evidence-only checks.
9. Add tests proving Sprint 15 is closure-only and preserves Sprint 1-14 behavior.

## Record Flow

```text
Sprint 1-14 sanitized evidence
  -> DemoScenarioRecord
  -> GovernanceSummaryRecord
  -> MVPReadinessRecord
  -> MVPReviewRecord
  -> approved_record / rejected / archived
```

The flow is a documentation and governance flow only. It must not execute Agent, ToolRun, workflow, file, Git, external, MCP, PR, deploy, release, publish, task completion, retry, replay, rollback, or resume behavior.

## API Boundary

Sprint 15 APIs may:

- create local readiness records.
- create local demo scenario records.
- create local governance summary records.
- create local MVP review records.
- read records.
- submit records for review.
- approve a local record as `approved_record`.
- reject a local record.
- archive a local record.
- list linked local evidence.

Sprint 15 APIs must not:

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
- mutate source evidence records.

## UI Boundary

Allowed labels:

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

If Sprint 15 implementation uses Prisma, it may add only local record models matching:

- MVPReadinessRecord.
- DemoScenarioRecord.
- GovernanceSummaryRecord.
- MVPReviewRecord.

It must not add:

- MVPExecution.
- ReleaseRun.
- DeployRun.
- PublishRun.
- AgentContinuationRun.
- ToolRunExecution.
- WorkflowRun.
- WorkflowExecution.
- FileWrite.
- GitOperation.
- PullRequestRun.
- ExternalApiCall.
- McpSession.
- Worker.
- Queue.
- AutoFix.
- AutoRemediation.
- RetryJob.
- ReplayJob.
- RollbackJob.
- ResumeExecutionJob.

## Test Plan

Sprint 15 implementation should test:

- readiness state machine valid and invalid transitions.
- MVPReadinessRecord is not execution, release, or deploy token.
- DemoScenarioRecord cannot execute demo steps.
- GovernanceSummaryRecord cannot grant permission.
- MVPReviewRecord approval only changes local record status.
- Sprint 1-14 records are sanitized evidence only.
- source evidence records are not mutated by Sprint 15 POST routes.
- RegressionGate `passed` is not execution, release, or deploy token.
- ReleaseReadinessChecklist `approved_record` is not execution, release, or deploy token.
- forbidden API semantics are absent.
- forbidden UI labels are absent.
- no Task completed mutation.
- Sprint 1-14 regression remains covered.

## Stage Closure

Sprint 15 should be treated as the recommended stage-final MVP sprint.

Sprint 16+ should only start after a new phase review defines whether the product remains record-only or deliberately enters a new capability expansion phase.
