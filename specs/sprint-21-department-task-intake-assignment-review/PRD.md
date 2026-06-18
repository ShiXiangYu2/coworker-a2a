# Sprint 21 PRD: Department Task Intake / Assignment Review

## Baseline

Sprint 21 starts from Sprint 1-20 complete:

- Sprint 1-15 sealed MVP.
- Sprint 16 MVP Demo Polish / Operator Console UX complete.
- Sprint 17 Read-only Evidence Import Sandbox complete.
- Sprint 18 Department Agent Profiles complete.
- Sprint 19 Department-Aware Operator Review / Evidence-to-Department Mapping complete.
- Sprint 20 Department Runtime Execution Gateway / Human-Gated Execution complete.

Sprint 21 is the final governance-loop sprint before the project can be closed as a v1 Agent company governance prototype.

## Goal

Sprint 21 adds a local Department Task Intake / Assignment Review layer.

It lets an Operator review which Department should own a Task, which DepartmentAgentRole should be primary, which roles should support, what sanitized evidence supports the assignment, which risks or escalation notes apply, and whether Kelvin approves the local assignment record.

Sprint 21 does not route, assign, or execute anything at runtime.

## Scope

Sprint 21 may define only local records:

- DepartmentTaskIntakeRecord.
- DepartmentAssignmentProposal.
- DepartmentRoleFitReview.
- DepartmentAssignmentApprovalRecord.
- DepartmentAssignmentAuditRecord.
- local assignment audit timeline.

Sprint 21 may define local validation rules, state machines, API specs, UI entry specs, audit/observability integration, and eval acceptance criteria for those records.

## Non-Goals

Sprint 21 must not:

- execute Agent.
- continue Agent.
- auto-route Task.
- assign Agent at runtime.
- start AgentRun.
- execute ToolRun.
- request or approve runtime permission.
- execute workflow or step.
- read real files as product capability.
- write files.
- run shell or Git as product capability.
- call external APIs.
- connect MCP.
- create PRs.
- deploy, publish, or release.
- complete Tasks.
- retry, replay, rollback, restore, or resume execution.
- approve future assignments automatically.
- enter Sprint 22.

## Evidence Boundary

Sprint 1-20 records may be referenced only as sanitized evidence or local review references. They must not become execution, routing, runtime assignment, permission, release, deploy, or task completion tokens.

Allowed evidence references include:

- Task.
- AgentRun / AgentResult.
- ToolCall / ToolRun / ToolExecutionReceipt.
- WorkflowProposal / WorkflowStepRecord.
- EvidenceImportRecord / SanitizedEvidenceSnapshot.
- DepartmentProfile / DepartmentAgentRole / DepartmentResponsibilityMatrix / DepartmentEscalationPolicy / DepartmentPermissionBoundary / DepartmentReviewRecord.
- EvidenceToDepartmentMappingRecord / DepartmentEvidenceCoverageRecord / DepartmentReviewGapRecord / DepartmentMappingReviewRecord.
- ExecutionIntentRecord / ExecutionPlanRecord / ExecutionGateRecord / ExecutionApprovalRecord / ExecutionReceiptRecord.
- Audit / Observability / Eval / RegressionGate / ReleaseReadiness.

## Kelvin Boundary

Kelvin approval only approves one local assignment record.

It does not:

- execute Agent.
- continue Agent.
- auto-route Task.
- assign Agent at runtime.
- start AgentRun.
- execute ToolRun.
- request or approve runtime permission.
- execute workflow or step.
- write files or run Git.
- call external APIs or connect MCP.
- create PRs.
- deploy, publish, or release.
- complete Tasks.
- retry, replay, rollback, restore, or resume execution.
- approve future similar assignment behavior.

## API Boundary

Sprint 21 may define only local record APIs:

- `/api/department-task-intakes`
- `/api/department-assignment-proposals`
- `/api/department-role-fit-reviews`
- `/api/department-assignment-approvals`
- `/api/department-assignment-audit-records`

Each record API may support only:

- create.
- query.
- submit-review.
- approve-record.
- reject.
- supersede.
- archive.

Linked query APIs may include:

- `/api/tasks/[id]/department-intake`
- `/api/tasks/[id]/department-assignment-proposals`
- `/api/departments/[id]/task-intakes`
- `/api/departments/[id]/assignment-review`
- `/api/department-assignment-proposals/[id]/role-fit`
- `/api/department-assignment-proposals/[id]/audit`
- `/api/department-assignment-proposals/[id]/timeline`

These APIs must not expose Agent router semantics, automatic routing, runtime assignment, runtime permission, live execution, ToolRun execution, workflow execution, file write, Git, external API, MCP, PR, deploy, release, Task completion, retry, replay, rollback, restore, or resume execution semantics.

## UI Boundary

Allowed labels:

- View Task Intake
- View Department Assignment Proposal
- View Role Fit Review
- Submit Assignment Review
- Approve Assignment Record
- Reject Assignment Record
- Archive Assignment Record
- View Assignment Audit
- View Assignment Timeline

Forbidden labels:

- Route Task
- Auto Route
- Assign Agent
- Assign Runtime Agent
- Start Agent
- Continue Agent
- Run Agent
- Run Tool
- Execute Workflow
- Grant Permission
- Request Permission
- Apply Change
- Write File
- Run Git
- Call API
- Connect MCP
- Create PR
- Deploy
- Publish
- Release
- Complete Task
- Retry
- Replay
- Rollback
- Restore
- Resume Execution

## Success Criteria

- Sprint 21 specs define all local assignment records.
- Sprint 21 specs define consistent lifecycle and blockers.
- Sprint 21 specs keep Sprint 1-20 records as sanitized evidence or local review references only.
- Sprint 21 specs make Kelvin approval single-record-only.
- Sprint 21 specs define API and UI surfaces without forbidden runtime semantics.
- Sprint 21 specs preserve Sprint 1-20 behavior and allow the project to close as a v1 Agent company governance prototype after implementation and closure review.
