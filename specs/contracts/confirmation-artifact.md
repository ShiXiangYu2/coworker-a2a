# Contract: ConfirmationArtifact

Status: proposed for Sprint 3

## Purpose

ConfirmationArtifact captures a high-risk decision that must stop at the Human Owner boundary.

Sprint 3 uses confirmation artifacts to approve or reject task state progression only. Approval does not execute any real-world side effect.

## Applicable Actions

Create a ConfirmationArtifact for any request involving:

- file or branch deletion
- publish, release, or deploy
- push, merge, or PR creation
- sending email or messages
- payment or purchase
- permission changes
- secrets or environment changes
- production configuration
- database migration
- non-empty future side effects

## Schema

```ts
ConfirmationArtifact {
  id: string
  taskId?: string
  resourceType?:
    | 'task'
    | 'memory_entry'
    | 'knowledge_item'
    | 'a2a_message'
    | 'context_packet'
    | 'tool_call'
    | 'eval_run'
    | 'eval_finding'
    | 'collaboration_session'
    | 'a2a_thread'
    | 'a2a_turn'
    | 'handoff_request'
    | 'collaboration_decision'
    | 'tool_run'
    | 'tool_execution_plan'
    | 'file_change_proposal'
    | 'patch_draft'
    | 'git_change_plan'
    | 'pull_request_plan'
    | 'review_patch_record'
  resourceId?: string

  status: 'pending' | 'approved' | 'rejected' | 'expired'
  action:
    | 'create_task'
    | 'high_risk_task'
    | 'future_tool_execution'
    | 'future_external_side_effect'
    | 'approve_memory_entry'
    | 'approve_knowledge_item'
    | 'approve_local_a2a_record'
    | 'approve_tool_call_record'
    | 'review_eval_finding'
    | 'review_quality_gate'
    | 'approve_collaboration_session_record'
    | 'approve_a2a_turn_record'
    | 'approve_handoff_record'
    | 'approve_collaboration_decision_record'
    | 'approve_tool_run_execution'
    | 'reject_tool_run_execution'
    | 'approve_file_change_proposal_record'
    | 'approve_patch_draft_record'
    | 'approve_git_change_plan_record'
    | 'approve_pull_request_plan_record'
    | 'approve_review_patch_record'
  reason: string
  requiresHumanOwner: true

  mustReview: string[]
  forbiddenRuntimeActions: string[]

  approvedBy?: string
  approvedAt?: string
  decisionReason?: string
  expiresAt?: string

  payload: Json

  createdAt: string
  updatedAt: string
}
```

## Default `mustReview`

```json
[
  "scope of requested action",
  "risk of external or irreversible side effects",
  "security-sensitive paths, credentials, permissions, or production configuration",
  "database schema or data migration risk",
  "whether Sprint 3 can safely continue without execution"
]
```

## Default `forbiddenRuntimeActions`

```json
[
  "execute-agent",
  "execute-tool",
  "run-shell-command",
  "write-file",
  "delete-file",
  "git-push",
  "create-pr",
  "merge-pr",
  "deploy",
  "send-email",
  "call-external-api",
  "write-memory",
  "send-a2a-message",
  "start-target-agent",
  "sync-external-knowledge",
  "invoke-mcp-tool",
  "automate-browser",
  "auto-fix",
  "auto-block-task",
  "auto-complete-task"
]
```

## Lifecycle

```text
pending -> approved
pending -> rejected
pending -> expired
```

Approval flow:

```text
ConfirmationArtifact.status = approved
If resourceType = task, Task.status = queued
If resourceType != task, only the referenced local record status changes
If resourceType = task, write AuditEvent(task.confirmation_approved)
If resourceType != task, write the resource-specific AuditEvent
```

Rejection flow:

```text
ConfirmationArtifact.status = rejected
If resourceType = task, Task.status = blocked
If resourceType != task, only the referenced local record status changes
If resourceType = task, write AuditEvent(task.confirmation_rejected)
If resourceType != task, write the resource-specific AuditEvent
```

Resource-specific AuditEvent is required for every non-task resource. Generic task confirmation events must not be used for Memory, Knowledge, A2A, Tool, ContextPacket, EvalRun, or EvalFinding resources.

For Sprint 6 `resourceType = tool_call`, use tool-specific AuditEvent types:

```text
Approval: AuditEvent(tool.approved_record)
Rejection: AuditEvent(tool.rejected)
Cancellation: AuditEvent(tool.cancelled)
```

ToolCall confirmation must not be recorded only as `task.confirmation_approved` or `task.confirmation_rejected`.

## Resume Boundary

Sprint 3 approval only permits Harmony to move the task from `pending_confirmation` to `queued`.

Approval does not authorize any current or future Tool Runtime to execute automatically. Future sprints must introduce a separate permission contract before any side effect can run.

It does not resume or start:

- Agent Runtime
- Tool Runtime
- shell commands
- file writes
- Git operations
- external APIs
- Memory writes
- A2A message sending
- external knowledge sync

## Sprint 5 Review Boundary

Sprint 5 may use ConfirmationArtifact for:

- MemoryEntry candidate approval
- KnowledgeItem approval
- A2AMessage local record approval

Approval means local record status progression only:

```text
MemoryEntry.candidate -> approved
KnowledgeItem.draft -> approved
A2AMessage.queued_for_review -> approved_record
```

Memory / Knowledge / A2A approval must not change Task status unless `resourceType = task`.

Approval does not:

- send A2A messages
- dispatch A2A messages
- queue A2A messages
- start target Agents
- call external APIs
- execute Tool Runtime
- run shell or Git
- modify files
- create PRs
- deploy
- delete
- sync external memory or knowledge

## Example

```json
{
  "id": "confirmation_001",
  "taskId": "task_001",
  "resourceType": "task",
  "resourceId": "task_001",
  "status": "pending",
  "action": "high_risk_task",
  "reason": "The request mentions deleting files and deploying to production.",
  "requiresHumanOwner": true,
  "mustReview": [
    "scope of requested action",
    "risk of external or irreversible side effects",
    "whether Sprint 3 can safely continue without execution"
  ],
  "forbiddenRuntimeActions": [
    "execute-agent",
    "execute-tool",
    "run-shell-command",
    "delete-file",
    "deploy"
  ],
  "payload": {
    "routeDecisionType": "needs_human_confirmation",
    "targetAgentId": "kelvin"
  },
  "createdAt": "2026-06-15T12:00:00.000Z",
  "updatedAt": "2026-06-15T12:00:00.000Z"
}
```

## Safety Invariants

- ConfirmationArtifact is required before high-risk progression.
- Approval never means execution in Sprint 3.
- Approval never grants blanket future tool permission.
- Rejection must block the task.
- Confirmation records must be auditable.
- Confirmation records must not store secrets or full sensitive payloads.
- Sprint 5 confirmation approval must not trigger external side effects or autonomous A2A loops.
- Sprint 5 confirmation approval for Memory, Knowledge, A2A, or ContextPacket must not change Task status unless `resourceType = task`.

## Sprint 6 Tool Review Boundary

Sprint 6 may use ConfirmationArtifact for ToolCall local record approval.

Approval means local ToolCall status progression only:

```text
ToolCall.pending_confirmation -> approved_record
```

ToolCall approval must not change Task status.

Approval does not:

- execute Tool Runtime
- start ToolRun execution
- run shell commands
- run Git operations
- modify, create, patch, format, or delete files
- create, merge, push, or edit PRs
- deploy, publish, or release
- run database migrations
- delete data
- call external APIs
- invoke MCP tools
- automate browsers

## Sprint 9 Collaboration Review Boundary

Sprint 9 may use ConfirmationArtifact for:

- CollaborationSession open-record or completion as local record.
- A2ATurn local record approval.
- HandoffRequest local record approval.
- CollaborationDecision local record approval.

Approval means local collaboration record status progression only:

```text
CollaborationSession.queued_for_review -> active
A2ATurn.queued_for_review -> approved_record
HandoffRequest.queued_for_review -> approved_record
CollaborationDecision.queued_for_review -> approved_record
```

Sprint 9 confirmation must use collaboration-specific AuditEvent types:

```text
collaboration.confirmation_required
collaboration.confirmation_approved
collaboration.confirmation_rejected
a2a_turn.approved_record
handoff.approved_record
collaboration_decision.approved_record
```

Sprint 9 confirmation approval must not:

- send, dispatch, queue, or deliver A2A messages
- start AgentRun
- start target Agent
- create the next A2ATurn automatically
- execute Tool Runtime
- create executable ToolRun
- run shell or Git
- modify files
- create PRs
- deploy
- delete
- call external APIs
- invoke MCP tools
- approve MemoryEntry or KnowledgeItem records
- start EvalRun
- mutate Task status unless `resourceType = task`
- mark Task completed

For Sprint 9 collaboration resources:

- `resourceType = collaboration_session` uses `action = approve_collaboration_session_record`.
- `resourceType = a2a_turn` uses `action = approve_a2a_turn_record`.
- `resourceType = handoff_request` uses `action = approve_handoff_record`.
- `resourceType = collaboration_decision` uses `action = approve_collaboration_decision_record`.
- `resourceType = a2a_thread` may be used for local thread review acknowledgement only and must not trigger turn creation.

## Sprint 8 Recovery / Resume Review Boundary

Sprint 8 may use ConfirmationArtifact only for human review of observability, recovery, or resume records if a future UI needs explicit owner acknowledgement.

Approval means local review status progression only. It must not convert a RecoveryPoint or ResumeToken into execution authorization.

Sprint 8 confirmation approval must not:

- restore database state
- replay or retry previous actions
- start or continue AgentRun
- create or execute ToolCall / ToolRun
- approve MemoryEntry or KnowledgeItem records
- send, dispatch, or queue A2AMessage records
- start EvalRun
- mutate Task status
- call external APIs
- run shell or Git
- modify files
- create PRs
- deploy
- delete

If `resourceType` is extended in Sprint 8 for observability resources, use resource-specific AuditEvent types such as:

```text
recovery.point_created
resume.token_created
resume.token_used
resume.view_restored
resume.execution_blocked
failure.classified
```
- enqueue jobs
- continue AgentRun
- mark Task completed

Sprint 6 confirmation approval must never transform a ToolPermission decision into runtime execution permission.

Sprint 6 confirmation approval must not create an executable ToolRun. If a ToolRun record is created at all, it must be a non-execution placeholder or deterministic mock-only record that follows the ToolRun safety contract.

## Sprint 7 Eval Review Boundary

Sprint 7 may use ConfirmationArtifact for EvalRun or EvalFinding review.

Approval means local Eval / Finding review progression only:

```text
EvalFinding.review_requested -> reviewed
EvalRun.qualityGateDecision remains recommendation-only
```

Eval confirmation must use eval-specific AuditEvent types:

```text
Approval: AuditEvent(eval.confirmation_approved)
Rejection: AuditEvent(eval.confirmation_rejected)
Review request: AuditEvent(eval.confirmation_required)
```

Sprint 7 confirmation approval must not:

- mutate the evaluated target record
- block, complete, cancel, or progress Tasks
- create ToolCalls
- approve ToolCalls
- start ToolRuns
- execute Tool Runtime
- run shell or Git
- modify files
- create PRs
- deploy
- delete
- approve MemoryEntry or KnowledgeItem records
- send A2A messages
- start target Agents
- call external APIs
- invoke MCP tools
- automate browsers

## Sprint 11 ToolRun Execution Confirmation Boundary

Sprint 11 may use ConfirmationArtifact for one specific ToolRun execution approval.

Allowed:

```text
resourceType = tool_run
action = approve_tool_run_execution
```

Approval means:

```text
ToolRun.awaiting_confirmation -> approved_for_execution
```

Only when all are true:

- ToolExecutionPlan exists.
- ToolPermission allows controlled execution or requires human and has been satisfied.
- RecoveryPoint exists before execution.
- ToolExecutionPolicy allows the category.
- ToolSandbox denies all forbidden capabilities.

Sprint 11 confirmation approval must not:

- approve future ToolRuns.
- approve a tool class.
- start AgentRun.
- continue AgentRun.
- mark Task completed.
- write Memory / Knowledge approved records.
- send A2A messages.
- run shell or Git.
- read real files.
- write, patch, format, or delete files.
- create PRs.
- deploy.
- call external APIs.
- invoke MCP.
- automate browsers.
- run database migrations.
- retry, replay, rollback, or resume execution.

Sprint 11 execution still requires explicit user action through `execute-approved` after approval.

## Sprint 12 File / Git / PR Review Boundary

Sprint 12 may use ConfirmationArtifact for local proposal record review.

Allowed resource / action pairs:

```text
resourceType = file_change_proposal, action = approve_file_change_proposal_record
resourceType = patch_draft, action = approve_patch_draft_record
resourceType = git_change_plan, action = approve_git_change_plan_record
resourceType = pull_request_plan, action = approve_pull_request_plan_record
resourceType = review_patch_record, action = approve_review_patch_record
```

Approval means local record status progression only:

```text
review -> approved_record
```

Sprint 12 confirmation approval must not:

- read real workspace files.
- write files.
- apply patches.
- format files.
- run shell.
- run Git.
- commit, push, merge, checkout, or rebase.
- create PRs.
- deploy.
- delete.
- call external APIs or MCP.
- automate browsers.
- start or continue AgentRun.
- execute ToolRun.
- complete Task.
- retry, replay, rollback, or resume execution.
- approve future File / Git / PR workflows automatically.

## Sprint 13 External / MCP Governance Review Boundary

Sprint 13 may use ConfirmationArtifact for local External / MCP governance record review.

Allowed resource / action pairs:

```text
resourceType = external_integration_profile, action = approve_external_integration_profile_record
resourceType = mcp_connection_profile, action = approve_mcp_connection_profile_record
resourceType = external_action_proposal, action = approve_external_action_proposal_record
resourceType = external_action_review_record, action = approve_external_action_review_record
resourceType = integration_risk_assessment, action = approve_integration_risk_assessment_record
```

Approval means local record status progression only:

```text
review -> approved_record
```

Sprint 13 confirmation approval must not:

- call external APIs.
- connect MCP.
- send network requests.
- create webhooks.
- create workers, queues, or background jobs.
- send email, chat, messages, webhooks, or notifications.
- read external systems or schemas.
- write external systems.
- start or continue AgentRun.
- execute ToolRun.
- complete Task.
- retry, replay, rollback, or resume execution.
- approve future External / MCP workflows automatically.
## Sprint 14 Workflow Confirmation Boundary

Sprint 14 may use ConfirmationArtifact for local WorkflowProposal, WorkflowStepRecord, WorkflowReviewRecord, and WorkflowReadinessAssessment review.

Confirmation approval only changes a single local record status. It must not execute workflow, execute step, continue Agent, execute ToolRun, write files, run Git, call external APIs, connect MCP, create PRs, deploy, complete Tasks, retry, replay, rollback, or resume execution.
## Sprint 15 MVP Closure Confirmation Boundary

ConfirmationArtifact may support MVPReviewRecord or MVPReadinessRecord review evidence only.

For Sprint 15, confirmation must only approve one local readiness or review record. It must not execute AgentRun, ToolRun, workflow, file, Git, external API, MCP, PR, deploy, publish, release, Task completion, retry, replay, rollback, or resume behavior.

ConfirmationArtifact must not approve future MVP readiness records automatically.
## Sprint 18 Department Agent Profile Boundary

Sprint 18 DepartmentProfile, DepartmentAgentRole, DepartmentResponsibilityMatrix, DepartmentEscalationPolicy, DepartmentPermissionBoundary, and DepartmentReviewRecord records may reference this contract only as sanitized local evidence or read-only governance context.

Sprint 18 department records must not be consumed as execution, routing, runtime permission, release, deploy, external access, MCP access, PR creation, task completion, retry, replay, rollback, restore, resume, or future approval tokens.

Kelvin approval in Sprint 18 approves only one local department record. It must not execute Agent, continue Agent, execute ToolRun, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, or approve future department behavior.

## Sprint 20 Human-Gated Execution Confirmation Boundary

Sprint 20 may use ConfirmationArtifact for local execution record review only.

Allowed resource / action pairs:

```text
resourceType = execution_intent, action = approve_execution_record
resourceType = execution_plan, action = approve_execution_record
resourceType = execution_gate, action = approve_execution_record
resourceType = execution_receipt, action = approve_execution_record
```

Approval means local record status progression only. It must not execute Agent, continue Agent, route Task, assign Agent, execute ToolRun, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, retry, replay, rollback, restore, resume execution, or approve future execution behavior.

