# Contract: RecoveryPoint

Status: proposed for Sprint 8

## Purpose

RecoveryPoint is a sanitized snapshot of a local resource at a meaningful lifecycle moment.

Sprint 8 RecoveryPoint supports inspection and reproducibility only. It must not restore database state or trigger execution.

## Schema

```ts
RecoveryPoint {
  id: string
  schemaVersion: string
  correlationId: string

  resourceType:
    | 'task'
    | 'agent_run'
    | 'tool_call'
    | 'tool_run'
    | 'tool_execution_plan'
    | 'tool_execution_receipt'
    | 'file_change_proposal'
    | 'patch_draft'
    | 'git_change_plan'
    | 'pull_request_plan'
    | 'review_patch_record'
    | 'eval_run'
    | 'memory_entry'
    | 'knowledge_item'
    | 'a2a_message'
    | 'context_packet'
    | 'confirmation_artifact'

  resourceId: string
  resourceStatusAtSnapshot?: string

  reason:
    | 'before_state_transition'
    | 'after_state_transition'
    | 'before_confirmation'
    | 'after_confirmation'
    | 'before_tool_execution'
    | 'before_cancel'
    | 'failure_detected'
    | 'manual_checkpoint'

  snapshotSchemaVersion: string
  snapshot: Json
  snapshotHash: string
  sourceEventId?: string
  redactionStatus: 'not_required' | 'redacted' | 'blocked'

  restorableViewOnly: true
  canTriggerExecution: false

  createdBy: 'system' | 'user' | 'kelvin'
  createdAt: string
}
```

## Creation Rules

Create a RecoveryPoint for:

- Task state transition before and after snapshots.
- AgentRun terminal state snapshots.
- ToolCall confirmation, rejection, cancellation, blocking, and permission-denied snapshots.
- EvalRun completion, blocking, failure, and cancellation snapshots.
- MemoryEntry, KnowledgeItem, and A2AMessage lifecycle snapshots.
- ConfirmationArtifact approval and rejection snapshots.
- FailureClassification creation.
- Manual user checkpoint.

## Snapshot Rules

Snapshots must include enough information to understand state, but must not include:

- secrets
- API keys
- raw environment dumps
- full shell stdout or stderr
- full file contents
- raw external API payloads
- private tokens

If `redactionStatus = 'blocked'`, the blocked payload must not be stored in `snapshot`. The RecoveryPoint may store only a compact blocked marker, redaction reason, hashes, and safe resource metadata.

## Use Rules

RecoveryPoint may be used to:

- view a sanitized snapshot.
- inspect a resource at a prior lifecycle moment.
- compare two sanitized snapshots.

RecoveryPoint must not be used to:

- restore database state.
- replay previous actions.
- retry previous actions.
- start Agent, Tool, Memory, A2A, or Eval behavior.
- mutate the referenced resource.

## Safety Invariants

- `restorableViewOnly` must always be true in Sprint 8.
- `canTriggerExecution` must always be false in Sprint 8.
- RecoveryPoint creation must not mutate the target record beyond recording the RecoveryPoint itself.
- RecoveryPoint use must not restore database state.
- RecoveryPoint use must not start Agent, Tool, Memory, A2A, or Eval behavior.

## Sprint 11 Tool Execution Recovery Boundary

Sprint 11 must create a RecoveryPoint before controlled ToolRun execution.

Allowed resource types:

- `tool_run`
- `tool_execution_plan`

The pre-execution RecoveryPoint is required before `approved_for_execution -> executing`.

For Sprint 11 ToolRun execution, the RecoveryPoint must use:

```text
reason = 'before_tool_execution'
```

Generic `before_state_transition` snapshots are not sufficient to satisfy Sprint 11 pre-execution requirements unless they are explicitly migrated or re-created as `before_tool_execution`.

RecoveryPoint may be used to:

- inspect pre-execution ToolRun state.
- compare pre-execution and post-execution local records.
- reconstruct audit.

RecoveryPoint must not be used to:

- rollback ToolRun.
- restore database state.
- retry ToolRun.
- replay ToolRun.
- resume ToolRun.
- approve execution.
- bypass Kelvin.

## Sprint 12 File / Git / PR Recovery Boundary

Sprint 12 may create RecoveryPoint snapshots for:

- FileChangeProposal.
- PatchDraft.
- GitChangePlan.
- PullRequestPlan.
- ReviewPatchRecord.

RecoveryPoint may be used to:

- inspect a sanitized proposal record.
- compare proposal record versions.
- reconstruct audit context.

RecoveryPoint must not be used to:

- read real workspace files.
- restore file contents.
- apply PatchDraft.
- write files.
- run Git.
- create PRs.
- deploy.
- delete.
- retry, replay, rollback, or resume execution.

## Sprint 13 External / MCP Governance Recovery Boundary

Sprint 13 may create RecoveryPoint snapshots for:

- ExternalIntegrationProfile.
- McpConnectionProfile.
- ExternalActionProposal.
- ExternalActionReviewRecord.
- IntegrationRiskAssessment.
- IntegrationAuditPolicy.

RecoveryPoint may be used to:

- inspect a sanitized governance record.
- compare governance record versions.
- reconstruct audit context.

RecoveryPoint must not be used to:

- call external APIs.
- connect MCP.
- send network requests.
- create webhooks.
- create workers, queues, or background jobs.
- send messages.
- read or write external systems.
- fetch external schemas.
- retry, replay, rollback, or resume execution.
## Sprint 14 Workflow Recovery Boundary

Sprint 14 may create RecoveryPoint snapshots for WorkflowProposal, WorkflowStepRecord, WorkflowDependencyGraph, WorkflowReviewRecord, and WorkflowReadinessAssessment inspection and comparison only.

RecoveryPoint must not rollback, restore, retry, replay, resume, execute workflow, execute step, continue Agent, execute ToolRun, write files, run Git, call external APIs, connect MCP, create PRs, deploy, or complete Tasks.
## Sprint 15 MVP Closure Recovery Boundary

RecoveryPoint may be linked to MVPReadinessRecord, DemoScenarioRecord, GovernanceSummaryRecord, or MVPReviewRecord as evidence only.

Sprint 15 must not use RecoveryPoint to rollback, restore, retry, replay, or resume execution.

RecoveryPoint linkage must not execute AgentRun, ToolRun, workflow, file, Git, external API, MCP, PR, deploy, publish, release, or Task completion.

## Sprint 17 Evidence Import Recovery Boundary

RecoveryPoint may be linked to EvidenceSourceProfile, EvidenceImportRecord, SanitizedEvidenceSnapshot, EvidenceRedactionPolicy, or EvidenceReviewRecord as evidence only.

Sprint 17 must not use RecoveryPoint to rollback, restore, retry, replay, or resume execution.

RecoveryPoint linkage must not read files, read directories, read clipboard, execute shell, execute Git, fetch URLs, call external APIs, connect MCP, execute AgentRun, execute ToolRun, execute workflow, create PR, deploy, publish, release, or complete Task.
## Sprint 18 Department Agent Profile Boundary

Sprint 18 DepartmentProfile, DepartmentAgentRole, DepartmentResponsibilityMatrix, DepartmentEscalationPolicy, DepartmentPermissionBoundary, and DepartmentReviewRecord records may reference this contract only as sanitized local evidence or read-only governance context.

Sprint 18 department records must not be consumed as execution, routing, runtime permission, release, deploy, external access, MCP access, PR creation, task completion, retry, replay, rollback, restore, resume, or future approval tokens.

Kelvin approval in Sprint 18 approves only one local department record. It must not execute Agent, continue Agent, execute ToolRun, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, or approve future department behavior.


## Sprint 19 Department Mapping Recovery Boundary

RecoveryPoint may reference Sprint 19 mapping records for audit inspection only.

RecoveryPoint must not restore, roll back, retry, replay, resume, remap, reroute, reassign, execute, import live evidence, deploy, release, or complete tasks for mapping records.

## Sprint 20 Human-Gated Execution Recovery Boundary

RecoveryPoint may reference Sprint 20 execution records for audit inspection and local comparison only.

RecoveryPoint must not restore, roll back, retry, replay, resume, execute Agent, continue Agent, route Task, assign Agent, execute ToolRun, execute workflow, write files, run Git, call external API, connect MCP, create PR, deploy, release, or complete Tasks for execution records.

## Sprint 21 Department Assignment Boundary

Sprint 21 DepartmentTaskIntakeRecord, DepartmentAssignmentProposal, DepartmentRoleFitReview, DepartmentAssignmentApprovalRecord, and DepartmentAssignmentAuditRecord may reference this contract only as sanitized evidence or local review context.

Sprint 21 assignment records must not be consumed as execution tokens, routing tokens, runtime assignment tokens, runtime permission grants, release tokens, deploy tokens, Task completion tokens, retry/replay/rollback/restore tokens, resume execution tokens, or future approval tokens.

Kelvin approval in Sprint 21 approves only one local assignment record. It must not execute Agent, continue Agent, auto-route Task, assign Agent at runtime, start AgentRun, execute ToolRun, request or approve runtime permission, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, retry, replay, rollback, restore, resume execution, or approve future assignment behavior.
