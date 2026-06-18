# Tasks: Sprint 14 - Human-Gated Workflow Orchestration Records

Status: proposed

## Specs

- [ ] Add WorkflowProposal contract.
- [ ] Add WorkflowStepRecord contract.
- [ ] Add WorkflowDependencyGraph contract.
- [ ] Add WorkflowReviewRecord contract.
- [ ] Add WorkflowReadinessAssessment contract.
- [ ] Add Workflow orchestration state machine contract.
- [ ] Add Workflow orchestration safety contract.
- [ ] Update evidence, confirmation, audit, observability, recovery, resume, eval, readiness, regression, security, and safety contracts.

## Implementation Tasks

- [ ] Add Sprint 14 TypeScript types.
- [ ] Add pure workflow record validation helpers.
- [ ] Add source evidence ref validator for Sprint 1-13 records.
- [ ] Add workflow state machine validator.
- [ ] Add step dependency graph integrity validator.
- [ ] Add forbidden state and forbidden action validation.
- [ ] Add persistence models only after schema review.
- [ ] Add local workflow proposal APIs.
- [ ] Add local workflow step APIs.
- [ ] Add dependency graph, readiness, and review APIs.
- [ ] Add linked query APIs.
- [ ] Add ChatHub / Task UI workflow cards.
- [ ] Add tests for state machine transitions.
- [ ] Add tests for hard prohibitions.
- [ ] Add Sprint 1-13 regression tests.

## Acceptance Criteria

- WorkflowProposal is a local auditable record only.
- WorkflowStepRecord is a local auditable record only.
- WorkflowDependencyGraph stores dependency metadata only.
- WorkflowReadinessAssessment is recommendation-only.
- WorkflowReviewRecord approval is not an execution token.
- Kelvin approval only changes local workflow / step / review record status.
- Workflow records can reference Sprint 1-13 records as sanitized evidence only.
- Evidence refs do not execute workflow, steps, Agents, ToolRuns, file writes, Git, external APIs, MCP, PR creation, deploy, Task completion, retry, replay, rollback, or resume execution.
- Workflow states do not include `running`, `executed`, `step_executed`, `continued`, `completed`, `retried`, `replayed`, `rolled_back`, `resumed`, `applied`, `called`, `connected`, or `deployed`.
- Sprint 14 APIs only create, review, approve-record, reject, supersede, archive, or query local records.
- Sprint 14 APIs do not include execution semantics.
- `POST /from-*` APIs do not trigger Agent runtime, Tool runtime, recompute, or mutate source records. They read and snapshot only.
- `POST /from-tool-run` does not execute ToolRun, request permission, approve execution, or execute-approved.
- `POST /from-agent-run` does not continue Agent, resume Agent, create new AgentRun, or generate new Agent execution.
- `approve_record` and `reject_record` stepKinds describe human review intent only; they do not automatically approve or reject referenced records and do not trigger runtime.
- Readiness recommendation `needs_review` is not displayed as `Continue` or `Continue Agent` and does not trigger execution.
- WorkflowReviewRecord and WorkflowReadinessAssessment include `correlationId`, `auditRefs`, and `createdBy` fields.
- WorkflowReviewRecord and WorkflowReadinessAssessment follow the documented safe lifecycle (correlationId matches WorkflowProposal, auditRefs track AuditEvent links).
- Sprint 14 implementation must not add WorkflowRun, WorkflowExecution, or WorkflowStepExecution models.
- UI does not show forbidden execution labels.
- RegressionGate `targetSprint = 'sprint_14'` covers Sprint 1-13 regression.
- ReleaseReadinessChecklist `targetSprint = 'sprint_14'` covers Sprint 1-13 regression.
- RegressionGate `passed` is not an execution token.
- ReleaseReadiness `approved_record` is not an execution token.
- Sprint 1-13 behavior does not regress.

## Non-Goals

- No workflow execution.
- No step execution.
- No Agent continuation.
- No ToolRun execution.
- No file write, patch apply, or format.
- No shell or Git.
- No commit, push, merge, checkout, or rebase.
- No PR creation.
- No deploy or delete.
- No external API calls.
- No MCP connection.
- No webhook, worker, queue, or background job.
- No Task completion.
- No retry, replay, rollback, or resume execution.
- No future automatic approval.
