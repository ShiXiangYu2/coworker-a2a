# Contract: WorkflowProposal

Status: proposed for Sprint 14

## Purpose

WorkflowProposal is a local, auditable record that groups Sprint 1-13 records into a human-reviewed workflow narrative. It is not a workflow runner and does not authorize execution.

## Fields

- `id: string`
- `title: string`
- `summary: string`
- `status: 'proposal' | 'draft' | 'review' | 'approved_record' | 'rejected' | 'superseded' | 'archived'`
- `sourceKind: 'task' | 'agent_run' | 'tool_run' | 'tool_execution_receipt' | 'file_change_proposal' | 'pull_request_plan' | 'external_action_proposal' | 'user_snippet' | 'sanitized_context_snapshot'`
- `sourceRecordId?: string`
- `sourceEvidenceRefs: WorkflowSourceEvidenceRef[]`
- `workflowIntent: 'coordination' | 'release_review' | 'remediation_plan' | 'external_governance' | 'file_git_pr_review' | 'audit_package'`
- `riskLevel: 'low' | 'medium' | 'high' | 'critical'`
- `executionCapability: 'none'`
- `canExecute: false`
- `requiresKelvinConfirmation: true`
- `createdBy: 'user' | 'agent_record' | 'system_seed'`
- `correlationId: string`
- `auditRefs: string[]`
- `createdAt: string`
- `updatedAt: string`
- `archivedAt?: string`

## Source Evidence Ref

```ts
type WorkflowSourceEvidenceRef = {
  sourceType:
    | 'task'
    | 'agent_run'
    | 'agent_result'
    | 'tool_call'
    | 'tool_run'
    | 'tool_result'
    | 'tool_execution_plan'
    | 'tool_execution_receipt'
    | 'file_change_proposal'
    | 'patch_draft'
    | 'git_change_plan'
    | 'pull_request_plan'
    | 'review_patch_record'
    | 'external_integration_profile'
    | 'mcp_connection_profile'
    | 'external_action_proposal'
    | 'external_action_review_record'
    | 'integration_risk_assessment'
    | 'collaboration_decision'
    | 'audit_event'
    | 'observability_event'
    | 'regression_gate'
    | 'release_readiness_checklist'
    | 'user_snippet'
    | 'sanitized_context_snapshot'
  sourceId?: string
  summary: string
  redactionStatus: 'sanitized' | 'redacted'
  isExecutionToken: false
}
```

## Rules

- `executionCapability` must always be `none`.
- `canExecute` must always be `false`.
- Source evidence is for review and explanation only.
- `approved_record` is not an execution token.
- WorkflowProposal must not create, start, run, continue, resume, retry, replay, or rollback any execution.

## POST /from-* API Boundary

Every `POST /api/workflow-proposals/from-*` route (from-task, from-agent-run, from-tool-run, from-tool-execution-receipt, from-file-change-proposal, from-pull-request-plan, from-external-action-proposal, from-user-snippet) must:

1. **Read only** the referenced source record's existing local state.
2. **Snapshot** the sanitized fields of that source record into the new WorkflowProposal's `sourceEvidenceRefs`.
3. **Create** a new WorkflowProposal local record.

Each `POST /from-*` route must not:

- trigger Agent runtime (no AgentRun creation, no Agent continuation, no Agent resume).
- trigger Tool runtime (no ToolRun execution, no permission request, no approve-execution, no execute-approved).
- recompute, recalculate, or re-evaluate any source record.
- mutate, update, or change the source record's status or fields.
- advance the source record's state machine.
- call Claude API, LLM provider, or any AI model.
- execute shell, Git, file write, external API, MCP, webhook, worker, or queue.
- create dependent records beyond the WorkflowProposal itself (steps, graph, readiness, and review must be created by separate APIs).

`POST /api/workflow-proposals/from-tool-run` specifically must not execute ToolRun, request ToolRun permission, approve ToolRun execution, call `execute-approved`, or mutate ToolRun state.

`POST /api/workflow-proposals/from-agent-run` specifically must not continue Agent, resume Agent, create a new AgentRun, generate new Agent execution, or mutate AgentRun state.
## Sprint 15 MVP Closure Evidence Boundary

WorkflowProposal may be referenced by MVPReadinessRecord, DemoScenarioRecord, and GovernanceSummaryRecord as sanitized evidence only.

WorkflowProposal must not become:

- a workflow execution token.
- a step execution token.
- an Agent continuation token.
- a ToolRun execution token.
- a release or deploy token.
- a Task completion token.

Sprint 15 record creation from WorkflowProposal must not execute workflow, execute steps, continue Agent, execute ToolRun, mutate WorkflowProposal, or mutate linked workflow records.
