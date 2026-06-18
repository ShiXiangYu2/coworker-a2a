# Tasks: Sprint 16 - MVP Demo Polish / Operator Console UX

Status: proposed

## Specs

- [ ] Add Sprint 16 PRD.
- [ ] Add Sprint 16 plan.
- [ ] Add Sprint 16 tasks.
- [ ] Add MVPOperatorConsole contract.
- [ ] Add MVPRecordChainView contract.
- [ ] Add MVPSafetyMatrixView contract.
- [ ] Add MVP demo polish safety contract.
- [ ] Update Sprint 15 MVP closure contracts with Sprint 16 read-only display references.
- [ ] Update AuditEvent and ObservabilityEvent with Sprint 16 view-only display events if needed.
- [ ] Update RegressionGate and ReleaseReadinessChecklist with Sprint 16 evidence-only display guidance.
- [ ] Update SecurityPolicy and safety contracts with Sprint 16 no-new-execution boundary.

## Implementation Tasks

- [ ] Add Sprint 16 TypeScript view model definitions only if implementation starts later.
- [ ] Add read-only MVPOperatorConsole UI only if implementation starts later.
- [ ] Add MVPRecordChainView derivation from existing local records only if implementation starts later.
- [ ] Add MVPSafetyMatrixView derivation from static safety rules and existing local records only if implementation starts later.
- [ ] Prefer existing linked query APIs.
- [ ] Add GET-only read-only aggregation APIs only if implementation review confirms they are necessary.
- [ ] Do not add Prisma models by default.
- [ ] Do not add POST / PUT / PATCH / DELETE Sprint 16 console APIs.
- [ ] Add Sprint 16 safety note to relevant UI surfaces.

## Required API Acceptance

- [ ] Sprint 16 implementation reuses existing linked query APIs by default.
- [ ] Any new Sprint 16 API is GET-only.
- [ ] Any new Sprint 16 API returns read-only aggregation only.
- [ ] Any new Sprint 16 API does not create, update, review, approve, reject, archive, delete, or mutate records.
- [ ] Any new Sprint 16 API does not mutate source evidence records.
- [ ] APIs do not execute AgentRun, ToolRun, workflow, file, Git, external, MCP, PR, deploy, publish, release, retry, replay, rollback, restore, or resume behavior.

## Required UI Acceptance

- [ ] UI shows Sprint 16 safety note.
- [ ] UI supports View MVP Demo Path.
- [ ] UI supports View Record Chain.
- [ ] UI supports View Safety Matrix.
- [ ] UI supports View Readiness Summary.
- [ ] UI supports View Audit Timeline.
- [ ] UI supports View Task Record Chain.
- [ ] UI supports View Linked Evidence.
- [ ] UI supports View Local Review Status.
- [ ] UI supports View Safety Boundary.
- [ ] Governance Console supports MVP Overview.
- [ ] Governance Console supports Human Approval Boundary.
- [ ] UI does not show forbidden labels: Execute, Run, Deploy, Publish, Release, Auto Fix, Auto Remediate, Complete Task, Continue Agent, Run Tool, Apply Change, Write File, Run Git, Call API, Connect MCP, Create PR, Retry, Replay, Rollback, Resume Execution.

## Required Test Acceptance

- [ ] MVPOperatorConsole is read-only.
- [ ] MVPRecordChainView is not an execution, release, deploy, publish, or task completion token.
- [ ] MVPSafetyMatrixView cannot grant permission.
- [ ] Sprint 1-15 records are sanitized evidence only.
- [ ] Kelvin approval does not execute AgentRun, ToolRun, workflow, file, Git, external, MCP, PR, deploy, publish, release, or Task completion.
- [ ] `approved_record` is not execution, release, deploy, publish, or task completion permission.
- [ ] `passed` is not execution, release, deploy, publish, or task completion permission.
- [ ] readiness status is not execution, release, deploy, publish, or task completion permission.
- [ ] EvalRun recommendation is evidence only.
- [ ] RegressionGate is evidence only.
- [ ] ReleaseReadinessChecklist is evidence only.
- [ ] RecoveryPoint does not enable rollback or restore.
- [ ] ResumePolicy does not enable resume execution.
- [ ] Forbidden API semantics are absent.
- [ ] Forbidden UI labels are absent.
- [ ] No Task completed mutation.
- [ ] Sprint 1-15 regression remains covered.

## Forbidden Models

Sprint 16 implementation must not add Prisma models by default.

Sprint 16 implementation must not add:

- MVPOperatorConsoleRecord.
- MVPConsoleExecution.
- MVPExecution.
- ReleaseRun.
- DeployRun.
- PublishRun.
- AgentContinuationRun.
- ToolRunExecution.
- WorkflowRun.
- WorkflowExecution.
- WorkflowStepExecution.
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
- RestoreJob.
- ResumeExecutionJob.

## Stage Acceptance

- [ ] Sprint 16 is documented as post-MVP polish only.
- [ ] Sprint 16 does not expand execution capability.
- [ ] Sprint 16 keeps Sprint 1-15 behavior intact.
- [ ] Sprint 16+ capability expansion requires separate boundary review.
