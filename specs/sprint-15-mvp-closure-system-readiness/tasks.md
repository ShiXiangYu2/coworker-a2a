# Tasks: Sprint 15 - MVP Closure / System Readiness

Status: proposed

## Specs

- [ ] Add Sprint 15 PRD.
- [ ] Add Sprint 15 plan.
- [ ] Add Sprint 15 tasks.
- [ ] Add MVPReadinessRecord contract.
- [ ] Add DemoScenarioRecord contract.
- [ ] Add GovernanceSummaryRecord contract.
- [ ] Add MVPReviewRecord contract.
- [ ] Add MVP readiness state machine contract.
- [ ] Add MVP closure safety contract.
- [ ] Update Sprint 1-14 evidence-producing contracts with Sprint 15 evidence-only references.
- [ ] Update AuditEvent and ObservabilityEvent with Sprint 15 local lifecycle events.
- [ ] Update RecoveryPoint and ResumePolicy with view-only / no-resume Sprint 15 boundary.
- [ ] Update EvalRun, EvalTarget, RegressionGate, and ReleaseReadinessChecklist with Sprint 15 evidence-only readiness checks.
- [ ] Update SecurityPolicy and production safety contracts with Sprint 15 no-new-execution boundary.

## Implementation Tasks

- [ ] Add Sprint 15 type definitions.
- [ ] Add pure readiness validation module.
- [ ] Add pure sanitized evidence ref validation.
- [ ] Add forbidden state validation.
- [ ] Add forbidden action validation.
- [ ] Add execution/release/deploy token blocker.
- [ ] Add local record persistence only if specs permit.
- [ ] Add local record APIs for MVPReadinessRecord.
- [ ] Add local record APIs for DemoScenarioRecord.
- [ ] Add local record APIs for GovernanceSummaryRecord.
- [ ] Add local record APIs for MVPReviewRecord.
- [ ] Add linked query APIs.
- [ ] Add ChatHub, Task UI, and Governance Console display entries.
- [ ] Add Sprint 15 safety note to the relevant UI surfaces.

## Required API Acceptance

- [ ] `POST /api/mvp-readiness-records` creates local readiness records only.
- [ ] `POST /api/demo-scenario-records` creates local demo scenario records only.
- [ ] `POST /api/governance-summary-records` creates local governance summary records only.
- [ ] `POST /api/mvp-review-records` creates local review records only.
- [ ] `approve-record` only changes one local record to `approved_record`.
- [ ] `reject` only changes one local record to `rejected`.
- [ ] `archive` only changes one local record to `archived`.
- [ ] POST routes do not mutate source evidence records.
- [ ] POST routes do not execute AgentRun, ToolRun, workflow, file, Git, external, MCP, PR, deploy, release, publish, retry, replay, rollback, or resume behavior.

## Required UI Acceptance

- [ ] UI shows Sprint 15 safety note.
- [ ] UI supports Create MVP Readiness Record.
- [ ] UI supports View MVP Readiness.
- [ ] UI supports View Demo Scenario.
- [ ] UI supports View Governance Summary.
- [ ] UI supports Submit MVP Review.
- [ ] UI supports Approve MVP Record.
- [ ] UI supports Reject MVP Record.
- [ ] UI supports Archive MVP Record.
- [ ] UI supports View Audit.
- [ ] UI supports View Timeline.
- [ ] UI does not show forbidden labels: Execute, Run, Deploy, Publish, Release, Auto Fix, Auto Remediate, Complete Task, Continue Agent, Run Tool, Apply Change, Write File, Run Git, Call API, Connect MCP, Create PR, Retry, Replay, Rollback, Resume Execution.

## Required Test Acceptance

- [ ] MVP readiness state machine accepts only `draft`, `review`, `approved_record`, `rejected`, and `archived`.
- [ ] Forbidden states are rejected: `running`, `executed`, `deployed`, `published`, `released`, `auto_fixed`, `auto_remediated`, `completed`, `retried`, `replayed`, `rolled_back`, `resumed`.
- [ ] MVPReadinessRecord is not an execution token.
- [ ] MVPReadinessRecord is not a release token.
- [ ] MVPReadinessRecord is not a deploy token.
- [ ] DemoScenarioRecord cannot execute demo steps.
- [ ] GovernanceSummaryRecord cannot grant permission.
- [ ] MVPReviewRecord approval only changes local record status.
- [ ] Kelvin approval does not execute AgentRun, ToolRun, workflow, file, Git, external, MCP, PR, deploy, release, publish, or Task completion.
- [ ] Sprint 1-14 records are sanitized evidence only.
- [ ] EvalRun recommendation is not execution, release, or deploy permission.
- [ ] RegressionGate `passed` is not execution, release, or deploy permission.
- [ ] ReleaseReadinessChecklist `approved_record` is not execution, release, or deploy permission.
- [ ] RecoveryPoint does not enable rollback or restore.
- [ ] ResumePolicy does not enable resume execution.
- [ ] Forbidden API semantics are absent.
- [ ] Forbidden UI labels are absent.
- [ ] No Task completed mutation.
- [ ] Sprint 1-14 regression remains covered.

## Forbidden Models

Sprint 15 implementation must not add:

- WorkflowRun.
- WorkflowExecution.
- WorkflowStepExecution.
- MVPExecution.
- ReleaseRun.
- DeployRun.
- PublishRun.
- AgentContinuationRun.
- ToolRunExecution.
- FileWrite.
- FilePatchApply.
- GitOperation.
- PullRequestRun.
- ExternalApiCall.
- McpSession.
- WebhookDispatch.
- Worker.
- Queue.
- AutoFix.
- AutoRemediation.
- RetryJob.
- ReplayJob.
- RollbackJob.
- ResumeExecutionJob.

## Stage Closure Acceptance

- [ ] Sprint 15 is documented as the recommended stage-final MVP sprint.
- [ ] Sprint 16+ is documented as a new phase requiring fresh boundary review.
- [ ] Sprint 15 does not expand execution capability.
