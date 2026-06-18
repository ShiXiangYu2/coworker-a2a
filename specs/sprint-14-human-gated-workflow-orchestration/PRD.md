# PRD: Sprint 14 - Human-Gated Workflow Orchestration Records

Created: 2026-06-17
Status: proposed

## Current Baseline

Sprint 14 starts from the real project baseline where Sprint 1-13 are complete and have passed final validation.

Sprint 14 must preserve all Sprint 1-13 behavior. It must not introduce workflow execution, step execution, Agent continuation, ToolRun execution, file writes, Git execution, external API calls, MCP connections, PR creation, deploy, Task completion, retry, replay, rollback, or resume execution.

## Problem

Sprint 1-13 created separate local governance records for tasks, agent analysis, controlled local tools, File / Git / PR proposals, and External / MCP governance. The product now needs a way to group these records into a human-reviewed workflow narrative without turning the system into an autonomous workflow runner.

## Product Goal

Introduce a local, auditable Human-Gated Workflow Orchestration record layer:

```text
Task / AgentRun / ToolRun / ToolExecutionReceipt / FileChangeProposal / PullRequestPlan / ExternalActionProposal
  -> WorkflowProposal
  -> WorkflowStepRecord[]
  -> WorkflowDependencyGraph
  -> WorkflowReadinessAssessment
  -> WorkflowReviewRecord
  -> Kelvin review
  -> approved_record / rejected / superseded / archived
  -> AuditEvent / ObservabilityEvent
  -> ChatHub / Task UI display
```

Sprint 14 explicitly does not implement this execution chain:

```text
WorkflowProposal
  -> run workflow
  -> execute step
  -> continue Agent
  -> execute ToolRun
  -> apply file change
  -> run Git
  -> call external API
  -> connect MCP
  -> create PR
  -> deploy
  -> complete Task
```

## Scope

Sprint 14 includes local records only:

- WorkflowProposal.
- WorkflowStepRecord.
- WorkflowDependencyGraph.
- WorkflowReviewRecord.
- WorkflowReadinessAssessment.
- Workflow orchestration state machine.
- Workflow orchestration safety contract.
- API design for local record creation, review, archive, and linked queries.
- ChatHub / Task UI entry design.
- AuditEvent and ObservabilityEvent integration.
- Recovery / Resume view-only integration.
- Eval / RegressionGate / ReleaseReadiness recommendation-only integration.

## Non-Goals

Sprint 14 must not:

- execute workflow.
- execute workflow step.
- continue AgentRun.
- execute ToolRun.
- write files, apply patches, or format files.
- execute shell or Git.
- commit, push, merge, checkout, or rebase.
- create PR.
- deploy or delete.
- call external APIs.
- connect MCP or create MCP sessions.
- create webhook, worker, queue, or background job.
- automatically complete Task.
- retry, replay, rollback, restore, or resume execution.
- approve future workflow records automatically.
- change Sprint 1-13 behavior.

## Persistence Decision

Sprint 14 should eventually add database tables during implementation because the workflow requires auditable local records:

- `WorkflowProposal`
- `WorkflowStepRecord`
- `WorkflowDependencyGraph`
- `WorkflowReviewRecord`
- `WorkflowReadinessAssessment`

This specs task must not modify Prisma schema.

Do not add execution-oriented models:

- WorkflowRun
- WorkflowExecution
- WorkflowStepExecution
- AgentContinuationRun
- ToolRunExecution
- FileApplyRun
- GitOperation
- ExternalApiCall
- McpSession
- DeployRun
- RetryJob
- ReplayJob
- RollbackJob
- ResumeExecutionJob

## Source Evidence

Workflow records may reference Sprint 1-13 records as sanitized evidence:

- Task.
- AgentRun / AgentResult.
- ToolCall / ToolRun / ToolResult.
- ToolExecutionPlan / ToolExecutionReceipt.
- FileChangeProposal / PatchDraft / GitChangePlan / PullRequestPlan / ReviewPatchRecord.
- ExternalIntegrationProfile / McpConnectionProfile / ExternalActionProposal / ExternalActionReviewRecord / IntegrationRiskAssessment.
- CollaborationDecision.
- AuditEvent / ObservabilityEvent.
- RegressionGate / ReleaseReadinessChecklist.
- user-provided snippet.
- sanitized context snapshot.

Evidence is never an execution token. `approved_record`, `passed`, or any prior confirmation only proves a local record state and must not authorize workflow execution, step execution, Agent continuation, ToolRun execution, file write, Git execution, external API call, MCP connection, PR creation, deploy, Task completion, retry, replay, rollback, or resume execution.

## POST /from-* API Boundary

Every `POST /api/workflow-proposals/from-*` route (from-task, from-agent-run, from-tool-run, from-tool-execution-receipt, from-file-change-proposal, from-pull-request-plan, from-external-action-proposal, from-user-snippet) is a read-and-snapshot operation:

1. Read the referenced source record's existing local state.
2. Extract sanitized fields into the new WorkflowProposal's `sourceEvidenceRefs`.
3. Create a new WorkflowProposal local record.

These routes must not:

- trigger Agent runtime (no AgentRun creation, no Agent continuation, no Agent resume).
- trigger Tool runtime (no ToolRun execution, no permission request, no approve-execution, no execute-approved).
- recompute, recalculate, or re-evaluate any source record.
- mutate, update, or change the source record's status or fields.
- advance the source record's state machine.
- call Claude API, LLM provider, or any AI model.
- execute shell, Git, file write, external API, MCP, webhook, worker, or queue.

`POST /from-tool-run` specifically must not execute the ToolRun, request ToolRun permission, approve ToolRun execution, or execute-approved the ToolRun. It reads the ToolRun's existing record and snapshots it.

`POST /from-agent-run` specifically must not continue the Agent, resume the Agent, create a new AgentRun, or generate new Agent execution. It reads the AgentRun's existing record and snapshots it.

## Kelvin Boundary

Kelvin approval in Sprint 14 only changes a single local record status:

- WorkflowProposal.
- WorkflowStepRecord.
- WorkflowReviewRecord.
- WorkflowReadinessAssessment.

Kelvin approval must not execute workflow, execute step, continue Agent, execute ToolRun, write files, run Git, call external APIs, connect MCP, create PRs, deploy, complete Tasks, approve future workflow records, retry, replay, rollback, or resume execution.

## Required Safety Note

```text
Sprint 14 records human-gated workflow orchestration proposals only. It does not execute workflows, execute steps, continue Agents, execute ToolRuns, write files, run Git, call external APIs, connect MCP, create PRs, deploy, complete Tasks, retry, replay, rollback, or resume execution.
```

## Allowed UI Labels

- `Create Workflow Proposal`
- `View Workflow Proposal`
- `View Workflow Steps`
- `View Dependency Graph`
- `Assess Workflow Readiness`
- `View Readiness Assessment`
- `Submit Workflow Review`
- `Approve Workflow Record`
- `Reject Workflow Record`
- `Archive Workflow Record`
- `View Workflow Audit`
- `View Timeline`

## Disallowed UI Labels

- `Run Workflow`
- `Execute Workflow`
- `Execute Step`
- `Continue Agent`
- `Run Tool`
- `Apply Change`
- `Write File`
- `Run Git`
- `Call API`
- `Connect MCP`
- `Create PR`
- `Deploy`
- `Complete Task`
- `Retry`
- `Replay`
- `Rollback`
- `Resume Execution`

## Step Kind Semantics

WorkflowStepRecord `stepKind` values describe human review intent only:

- `approve_record` — The human intends to review and potentially approve a referenced local record. It does not automatically approve the referenced record, does not execute the referenced record, and does not trigger any runtime behavior. The human must still explicitly call the referenced record's approve-record API separately.
- `reject_record` — The human intends to review and potentially reject a referenced local record. It does not automatically reject the referenced record, does not execute the referenced record, and does not trigger any runtime behavior. The human must still explicitly call the referenced record's reject API separately.
- All other stepKinds (`inspect_record`, `review_record`, `compare_evidence`, `assess_risk`, `document_decision`) describe review and documentation activities only.

## Readiness Recommendation Semantics

WorkflowReadinessAssessment `recommendation` values describe human review intent only:

- `needs_review` — The human reviewer should continue reviewing manually. This must not be displayed as `Continue`, `Continue Agent`, or any execution-triggering label.
- `request_changes` — The human reviewer should request changes to the workflow proposal.
- `approve_record` — The human reviewer may approve the workflow proposal record. This is not execution permission.
- `reject_record` — The human reviewer may reject the workflow proposal record.

No `recommendation` value triggers workflow execution, step execution, Agent continuation, ToolRun execution, or any runtime behavior.

## Acceptance Criteria

- Sprint 14 uses Sprint 1-13 complete as the baseline.
- WorkflowProposal is independent from ToolRun execution.
- WorkflowStepRecord cannot execute.
- WorkflowDependencyGraph contains metadata and dependencies only.
- WorkflowReadinessAssessment is recommendation-only.
- WorkflowReviewRecord approval only changes local record state.
- No Workflow state is named `running`, `executed`, `step_executed`, `continued`, `completed`, `retried`, `replayed`, `rolled_back`, `resumed`, `applied`, `called`, `connected`, or `deployed`.
- APIs support local proposal, step, graph, readiness, review, archive, and linked queries only.
- APIs do not include execution semantics.
- `POST /from-*` APIs read and snapshot only; they do not trigger Agent runtime, Tool runtime, recompute, or mutate source records.
- `approve_record` and `reject_record` stepKinds describe human review intent only; they do not automatically approve or reject referenced records.
- Readiness recommendation `needs_review` is not displayed as `Continue` or `Continue Agent`.
- WorkflowReviewRecord and WorkflowReadinessAssessment include `correlationId`, `auditRefs`, and `createdBy` fields.
- UI forbidden labels are absent.
- Audit / Observability / Recovery / Resume remain view-only and audit-only.
- Eval / RegressionGate / ReleaseReadiness remain recommendation-only and are not execution tokens.
- Sprint 1-13 behavior does not regress.
