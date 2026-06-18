# Contract: Workflow Orchestration Safety

Status: proposed for Sprint 14

## Safety Boundary

Sprint 14 introduces local Human-Gated Workflow Orchestration records only. It must not become a workflow runner, Agent continuation engine, ToolRun executor, file writer, Git executor, external API caller, MCP connector, PR creator, deployer, or Task completion engine.

## Hard Denies

Sprint 14 must not:

- execute workflows.
- execute workflow steps.
- continue Agents.
- execute ToolRuns.
- write files, apply patches, or format.
- execute shell or Git.
- commit, push, merge, checkout, or rebase.
- create PRs.
- deploy or delete.
- call external APIs.
- connect MCP.
- create webhook, worker, queue, or background job.
- complete Tasks.
- retry, replay, rollback, restore, or resume execution.
- auto-approve future workflows.

## POST /from-* API Safety Boundary

Every `POST /api/workflow-proposals/from-*` route creates a WorkflowProposal by reading an existing local source record. These routes must not:

- trigger Agent runtime (no AgentRun creation, no Agent continuation, no Agent resume, no LLM call for agent analysis).
- trigger Tool runtime (no ToolRun execution, no Tool permission request, no ToolRun approve-execution, no ToolRun execute-approved).
- recompute, recalculate, re-evaluate, or re-run any source record's logic.
- mutate, update, advance, or change the source record's status, fields, or state machine.
- call Claude API, any LLM provider, or any AI model for routing, analysis, or decision-making.
- execute shell, Git, file write, external API, MCP, webhook, worker, or queue.
- create dependent records beyond the WorkflowProposal itself.

The from-* routes are read-and-snapshot only: read the source record, extract sanitized fields, write a new WorkflowProposal.

`POST /api/workflow-proposals/from-tool-run` specifically must not execute ToolRun, request ToolRun permission, approve ToolRun execution, call `execute-approved`, or mutate ToolRun status.

`POST /api/workflow-proposals/from-agent-run` specifically must not continue Agent, resume Agent, create a new AgentRun, generate new Agent execution, or mutate AgentRun status.

## Evidence Boundary

Workflow records may reference Sprint 1-13 records as sanitized evidence only. Evidence must not be treated as permission to execute any workflow, step, Agent, ToolRun, file, Git, external, MCP, PR, deploy, Task, retry, replay, rollback, or resume action.

## Kelvin Boundary

Kelvin approval changes a single local WorkflowProposal, WorkflowStepRecord, WorkflowReviewRecord, or WorkflowReadinessAssessment status. It never starts execution.

`approve_record` and `reject_record` WorkflowStepRecord kinds describe human review intent only. They must not automatically approve, reject, execute, or mutate the referenced record.

WorkflowReadinessAssessment `needs_review` means human review only. It must not be implemented or displayed as workflow continuation, Agent continuation, retry, replay, rollback, or resume execution.

## Required UI Safety Note

```text
Sprint 14 records human-gated workflow orchestration proposals only. It does not execute workflows, execute steps, continue Agents, execute ToolRuns, write files, run Git, call external APIs, connect MCP, create PRs, deploy, complete Tasks, retry, replay, rollback, or resume execution.
```

## Acceptance Checks

- no execution-oriented models are introduced.
- no execution-oriented API route names are introduced.
- no forbidden UI labels are shown.
- no state contains `running`, `executed`, `step_executed`, `continued`, `completed`, `retried`, `replayed`, `rolled_back`, `resumed`, `applied`, `called`, `connected`, or `deployed`.
- RegressionGate and ReleaseReadiness remain evidence-only.
- Sprint 1-13 behavior does not regress.
## Sprint 15 MVP Closure Boundary

Sprint 15 may reference Workflow Orchestration records as local MVP closure evidence only.

Workflow Orchestration records must not grant MVPReadinessRecord, DemoScenarioRecord, GovernanceSummaryRecord, or MVPReviewRecord any ability to execute workflow, execute steps, continue Agent, execute ToolRun, write files, run Git, call external APIs, connect MCP, create PRs, deploy, publish, release, complete Task, retry, replay, rollback, or resume execution.

Sprint 15 approval is a local readiness approval only and must not be interpreted as workflow approval or workflow execution permission.

## Sprint 16 MVP Demo Polish Boundary

Sprint 16 may display Workflow Orchestration records in MVPRecordChainView and MVPOperatorConsole as sanitized evidence only.

Workflow Orchestration records must not grant Sprint 16 console views any ability to execute workflows, execute steps, continue Agent, execute ToolRun, write files, run Git, call external APIs, connect MCP, create PRs, deploy, publish, release, complete Task, retry, replay, rollback, restore, or resume execution.

Sprint 16 console display must not mutate WorkflowProposal, WorkflowStepRecord, WorkflowDependencyGraph, WorkflowReviewRecord, or WorkflowReadinessAssessment.

## Sprint 17 Evidence Import Boundary

Sprint 17 may reference Workflow Orchestration records as sanitized evidence only.

Workflow records must not grant Sprint 17 any ability to execute workflows, execute steps, continue Agent, execute ToolRun, write files, run Git, call external APIs, connect MCP, create PRs, deploy, publish, release, complete Task, retry, replay, rollback, restore, or resume execution.

Sprint 17 evidence imports must not mutate WorkflowProposal, WorkflowStepRecord, WorkflowDependencyGraph, WorkflowReviewRecord, or WorkflowReadinessAssessment.
## Sprint 18 Department Agent Profile Boundary

Sprint 18 DepartmentProfile, DepartmentAgentRole, DepartmentResponsibilityMatrix, DepartmentEscalationPolicy, DepartmentPermissionBoundary, and DepartmentReviewRecord records may reference this contract only as sanitized local evidence or read-only governance context.

Sprint 18 department records must not be consumed as execution, routing, runtime permission, release, deploy, external access, MCP access, PR creation, task completion, retry, replay, rollback, restore, resume, or future approval tokens.

Kelvin approval in Sprint 18 approves only one local department record. It must not execute Agent, continue Agent, execute ToolRun, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, or approve future department behavior.

## Sprint 20 Human-Gated Execution Boundary

Sprint 20 execution records may reference WorkflowProposal, WorkflowStepRecord, WorkflowReviewRecord, WorkflowDependencyGraph, and WorkflowReadinessAssessment only as sanitized evidence or local review context.

Execution records must not execute workflows, execute steps, continue Agents, execute ToolRuns, write files, run Git, call external APIs, connect MCP, create PRs, deploy, release, complete Tasks, retry, replay, rollback, restore, or resume execution.

