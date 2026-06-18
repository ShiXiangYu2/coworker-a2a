# Plan: Sprint 14 - Human-Gated Workflow Orchestration Records

Status: proposed

## Current Baseline

Sprint 14 starts after Sprint 1-13 are complete. Sprint 14 must preserve Sprint 1-13 behavior and remain local-record-only for workflow orchestration.

## Implementation Order

1. Add Sprint 14 contracts for WorkflowProposal, WorkflowStepRecord, WorkflowDependencyGraph, WorkflowReviewRecord, WorkflowReadinessAssessment, workflow state machine, and workflow safety.
2. Extend evidence, confirmation, audit, observability, recovery, resume, eval, regression, readiness, security, and safety contracts.
3. Review specs for execution ambiguity before implementation.
4. Add TypeScript types only after specs review.
5. Add pure validation for source evidence refs, workflow status, step dependencies, forbidden state names, and forbidden action terms.
6. Add persistence only after schema review.
7. Add local workflow record APIs only.
8. Add ChatHub / Task UI workflow display only.
9. Add tests proving Sprint 14 cannot execute workflows, execute steps, continue Agents, execute ToolRuns, write files, run Git, call external APIs, connect MCP, create PRs, deploy, complete Tasks, retry, replay, rollback, or resume execution.
10. Add regression tests proving Sprint 1-13 behavior does not regress.

## Recommended Persistence

Sprint 14 may add tables during implementation:

- `WorkflowProposal`
- `WorkflowStepRecord`
- `WorkflowDependencyGraph`
- `WorkflowReviewRecord`
- `WorkflowReadinessAssessment`

Do not add:

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
- Worker
- Queue
- RetryJob
- ReplayJob
- RollbackJob
- ResumeExecutionJob

## API Groups

Workflow proposals:

- `POST /api/workflow-proposals/from-task`
- `POST /api/workflow-proposals/from-agent-run`
- `POST /api/workflow-proposals/from-tool-run`
- `POST /api/workflow-proposals/from-tool-execution-receipt`
- `POST /api/workflow-proposals/from-file-change-proposal`
- `POST /api/workflow-proposals/from-pull-request-plan`
- `POST /api/workflow-proposals/from-external-action-proposal`
- `POST /api/workflow-proposals/from-user-snippet`
- `GET /api/workflow-proposals`
- `GET /api/workflow-proposals/:id`
- `POST /api/workflow-proposals/:id/submit-review`
- `POST /api/workflow-proposals/:id/approve-record`
- `POST /api/workflow-proposals/:id/reject`
- `POST /api/workflow-proposals/:id/supersede`
- `POST /api/workflow-proposals/:id/archive`

Workflow steps:

- `POST /api/workflow-proposals/:id/steps`
- `GET /api/workflow-proposals/:id/steps`
- `GET /api/workflow-step-records/:id`
- `POST /api/workflow-step-records/:id/submit-review`
- `POST /api/workflow-step-records/:id/approve-record`
- `POST /api/workflow-step-records/:id/reject`
- `POST /api/workflow-step-records/:id/archive`

Dependency graph, readiness, and review:

- `POST /api/workflow-proposals/:id/dependency-graph`
- `GET /api/workflow-proposals/:id/dependency-graph`
- `POST /api/workflow-proposals/:id/readiness-assessment`
- `GET /api/workflow-proposals/:id/readiness-assessments`
- `POST /api/workflow-proposals/:id/reviews`
- `GET /api/workflow-proposals/:id/reviews`

Linked queries:

- `GET /api/harmony/tasks/:id/workflow-proposals`
- `GET /api/agent-runtime/runs/:id/workflow-proposals`
- `GET /api/tool-runs/:id/workflow-proposals`
- `GET /api/tool-execution-receipts/:id/workflow-proposals`
- `GET /api/file-change-proposals/:id/workflow-proposals`
- `GET /api/pull-request-plans/:id/workflow-proposals`
- `GET /api/external-action-proposals/:id/workflow-proposals`

## Forbidden API Semantics

Do not add Sprint 14 API routes with these semantics:

- `/run`
- `/execute`
- `/execute-workflow`
- `/execute-step`
- `/continue-agent`
- `/run-tool`
- `/apply`
- `/write-file`
- `/run-git`
- `/call-api`
- `/connect-mcp`
- `/create-pr`
- `/deploy`
- `/complete-task`
- `/retry`
- `/replay`
- `/rollback`
- `/resume-execution`

## POST API Boundary

Every Sprint 14 `POST` route must create, submit, approve, reject, supersede, or archive local workflow records only.

Sprint 14 `POST` routes must not:

- execute workflow or step.
- continue AgentRuns.
- execute ToolRuns.
- write files, apply patches, or format files.
- execute shell or Git.
- call external APIs.
- connect MCP.
- create PRs.
- deploy or delete.
- complete Tasks.
- create worker, queue, webhook, or background job.
- retry, replay, rollback, restore, or resume execution.

## POST /from-* API Boundary

Every `POST /api/workflow-proposals/from-*` route is a read-and-snapshot operation:

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
- create dependent records beyond the WorkflowProposal itself.

`POST /from-tool-run` specifically must not execute the ToolRun, request ToolRun permission, approve ToolRun execution, or execute-approved the ToolRun.

`POST /from-agent-run` specifically must not continue the Agent, resume the Agent, create a new AgentRun, or generate new Agent execution.

## Step Kind Semantics

WorkflowStepRecord `stepKind` values describe human review intent only:

- `approve_record` — Human intends to review and potentially approve a referenced local record. Does not automatically approve, execute, or trigger runtime for the referenced record.
- `reject_record` — Human intends to review and potentially reject a referenced local record. Does not automatically reject, execute, or trigger runtime for the referenced record.
- All other stepKinds (`inspect_record`, `review_record`, `compare_evidence`, `assess_risk`, `document_decision`) describe review and documentation activities only.

## Readiness Recommendation Semantics

WorkflowReadinessAssessment `recommendation` values describe human review intent only:

- `needs_review` — Human should continue reviewing manually. Must not be displayed as `Continue`, `Continue Agent`, or any execution-triggering label.
- `request_changes` — Human should request changes.
- `approve_record` — Human may approve the record. Not execution permission.
- `reject_record` — Human may reject the record.

No `recommendation` value triggers workflow execution, step execution, Agent continuation, ToolRun execution, or any runtime behavior.

## UI Entry Points

Task / AgentRun / ToolRun / ToolExecutionReceipt / FileChangeProposal / PullRequestPlan / ExternalActionProposal cards:

- `Create Workflow Proposal`
- `View Workflow Proposals`
- `View Source Evidence`

Workflow card:

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

## Safety Gates

- WorkflowProposal cannot execute.
- WorkflowStepRecord cannot execute.
- WorkflowDependencyGraph cannot run dependency steps.
- WorkflowReadinessAssessment is not an execution token.
- WorkflowReviewRecord approval changes local record state only.
- Kelvin confirmation cannot execute or continue anything.
- Evidence refs cannot grant execution permission.
- Eval, RegressionGate, and ReleaseReadiness are evidence only.
- RecoveryPoint and ResumePolicy remain view-only and cannot restore, retry, replay, rollback, or resume execution.

## Validation Commands

When implemented:

```bash
npm run test
npm run lint
npm run build
```

If Sprint 14 later adds persistence:

```bash
npx prisma validate
npx prisma db push --skip-generate
npx prisma generate
```
