# Contract: MVPOperatorConsole

Status: proposed for Sprint 16

## Purpose

MVPOperatorConsole is a read-only presentation contract for the sealed Sprint 1-15 MVP. It organizes the demo path, record chain, safety matrix, audit timeline, and readiness summary for human review.

It is not a persisted Prisma record by default. It is not an execution token, release token, deploy token, publish token, task completion token, permission grant, or Kelvin confirmation artifact.

## Fields

- `id: string`
- `consoleVersion: string`
- `targetSprint: 'sprint_16'`
- `baseline: 'sprint_1_15_complete_mvp_sealed'`
- `title: string`
- `summary: string`
- `displayMode: 'demo_path' | 'operator_overview' | 'governance_review' | 'audit_walkthrough'`
- `recordChainView: MVPRecordChainView`
- `safetyMatrixView: MVPSafetyMatrixView`
- `readinessSummary: MVPReadinessDisplaySummary`
- `auditTimelineRefs: string[]`
- `observabilityTimelineRefs: string[]`
- `regressionGateRefs: string[]`
- `releaseReadinessRefs: string[]`
- `demoScenarioRefs: string[]`
- `governanceSummaryRefs: string[]`
- `allowedDisplayActions: MVPOperatorDisplayAction[]`
- `forbiddenDisplayActions: string[]`
- `isReadOnly: true`
- `mutatesSourceRecords: false`
- `isExecutionToken: false`
- `isReleaseToken: false`
- `isDeployToken: false`
- `isPublishToken: false`
- `isTaskCompletionToken: false`
- `createdFrom: 'existing_local_records' | 'linked_query_snapshot' | 'sanitized_context_snapshot'`
- `createdBy: 'user' | 'operator' | 'system_view'`
- `correlationId: string`
- `auditRefs: string[]`
- `createdAt: string`

## Display Action

```ts
type MVPOperatorDisplayAction =
  | 'view_mvp_demo_path'
  | 'view_record_chain'
  | 'view_safety_matrix'
  | 'view_readiness_summary'
  | 'view_audit_timeline'
  | 'view_task_record_chain'
  | 'view_linked_evidence'
  | 'view_local_review_status'
  | 'view_safety_boundary'
```

## Readiness Display Summary

```ts
type MVPReadinessDisplaySummary = {
  readinessRecordRefs: string[]
  reviewRecordRefs: string[]
  statusLabels: string[]
  recommendationLabels: string[]
  evidenceOnly: true
  approvedRecordIsExecutionToken: false
  passedIsExecutionToken: false
  readinessIsReleaseToken: false
}
```

## Rules

- `targetSprint` must be `sprint_16`.
- `baseline` must be `sprint_1_15_complete_mvp_sealed`.
- MVPOperatorConsole must be read-only.
- MVPOperatorConsole must not be persisted as a Prisma model by default.
- MVPOperatorConsole must not mutate source records.
- MVPOperatorConsole may only display existing local records and sanitized snapshots.
- `allowedDisplayActions` must be view-only.
- Kelvin approval, `approved_record`, `passed`, and readiness labels are evidence only.
- MVPOperatorConsole must not execute AgentRun, ToolRun, workflow, file, Git, external, MCP, PR, deploy, publish, release, task completion, retry, replay, rollback, restore, or resume behavior.

## Sprint 17 Evidence Display Boundary

MVPOperatorConsole may display Sprint 17 EvidenceImportRecord, SanitizedEvidenceSnapshot, EvidenceSourceProfile, EvidenceRedactionPolicy, and EvidenceReviewRecord as sanitized evidence only.

- Console display must not dereference path, command, URL, endpoint, or MCP metadata.
- Console display must not read files, run commands, fetch URLs, call external APIs, connect MCP, or import live data.
- Evidence import approval and sanitized snapshots remain evidence only and must not become execution, release, deploy, external access, or task completion tokens.
## Sprint 18 Department Agent Profile Boundary

Sprint 18 DepartmentProfile, DepartmentAgentRole, DepartmentResponsibilityMatrix, DepartmentEscalationPolicy, DepartmentPermissionBoundary, and DepartmentReviewRecord records may reference this contract only as sanitized local evidence or read-only governance context.

Sprint 18 department records must not be consumed as execution, routing, runtime permission, release, deploy, external access, MCP access, PR creation, task completion, retry, replay, rollback, restore, resume, or future approval tokens.

Kelvin approval in Sprint 18 approves only one local department record. It must not execute Agent, continue Agent, execute ToolRun, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, or approve future department behavior.


## Sprint 19 Department Mapping Console Entry

Operator Console may show View Department Evidence Map, View Evidence Coverage, View Department Review Gaps, View Mapping Audit, and View Mapping Timeline.

These UI entries are local presentation and review surfaces only. They must not expose Run Mapping, Execute Mapping, Auto Route, Assign Agent, Grant Permission, Import Live, Sync Evidence, Run Agent, Run Tool, Execute Workflow, Write File, Run Git, Call API, Connect MCP, Create PR, Deploy, Release, Complete Task, Retry, Replay, Rollback, Restore, or Resume Execution.

## Sprint 20 Human-Gated Execution Console Entry

Operator Console may show View Execution Intent, View Execution Plan, View Execution Gate, View Execution Receipt, Submit Execution Review, Approve Execution Record, Reject Execution Record, Archive Execution Record, View Execution Audit, and View Execution Timeline.

These UI entries are local presentation and review surfaces only. They must not expose Run Execution, Execute Now, Continue Agent, Auto Route, Assign Agent, Run Tool, Execute Workflow, Apply Change, Write File, Run Git, Call API, Connect MCP, Create PR, Deploy, Release, Complete Task, Retry, Replay, Rollback, or Resume Execution.

## Sprint 21 Department Assignment Console Entry

Operator Console may show View Task Intake, View Department Assignment Proposal, View Role Fit Review, Submit Assignment Review, Approve Assignment Record, Reject Assignment Record, Archive Assignment Record, View Assignment Audit, and View Assignment Timeline.

These UI entries are local presentation and review surfaces only. They must not expose Route Task, Auto Route, Assign Agent, Assign Runtime Agent, Start Agent, Continue Agent, Run Agent, Run Tool, Execute Workflow, Grant Permission, Request Permission, Apply Change, Write File, Run Git, Call API, Connect MCP, Create PR, Deploy, Publish, Release, Complete Task, Retry, Replay, Rollback, Restore, or Resume Execution.
