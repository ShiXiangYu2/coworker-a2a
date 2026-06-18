# Contract: AuditEvent

Status: proposed for Sprint 3

## Purpose

AuditEvent is the append-only record of Harmony decisions and state transitions.

It exists so future recovery, debugging, verification, and human review can reconstruct what happened without relying on free-form chat history.

## Schema

```ts
AuditEvent {
  id: string
  correlationId?: string
  taskId?: string
  taskRunId?: string
  taskStepId?: string

  eventType:
    | 'task.created'
    | 'task.status_changed'
    | 'task.cancelled'
    | 'task.confirmation_required'
    | 'task.confirmation_approved'
    | 'task.confirmation_rejected'
    | 'task.run_created'
    | 'task.step_created'
    | 'task.step_completed'
    | 'task.blocked'
    | 'task.failed'
    | 'agent.run_created'
    | 'agent.run_started'
    | 'agent.run_completed'
    | 'agent.run_blocked'
    | 'agent.run_failed'
    | 'agent.run_cancelled'
    | 'memory.candidate_created'
    | 'memory.approved'
    | 'memory.rejected'
    | 'memory.superseded'
    | 'memory.archived'
    | 'knowledge.created'
    | 'knowledge.approved'
    | 'knowledge.rejected'
    | 'knowledge.superseded'
    | 'knowledge.archived'
    | 'context_packet.created'
    | 'context_packet.attached'
    | 'context_packet.superseded'
    | 'a2a.draft_created'
    | 'a2a.submitted_for_review'
    | 'a2a.approved_record'
    | 'a2a.rejected'
    | 'a2a.superseded'
    | 'a2a.archived'
    | 'tool.call_proposed'
    | 'tool.permission_evaluated'
    | 'tool.permission_denied'
    | 'tool.confirmation_required'
    | 'tool.approved_record'
    | 'tool.rejected'
    | 'tool.cancelled'
    | 'tool.blocked'
    | 'tool.run_created'
    | 'tool.run_skipped'
    | 'tool.run_mock_completed'
    | 'tool.run_failed_validation'
    | 'eval.target_created'
    | 'eval.run_created'
    | 'eval.run_started'
    | 'eval.run_completed'
    | 'eval.run_blocked'
    | 'eval.run_failed'
    | 'eval.run_cancelled'
    | 'eval.check_recorded'
    | 'eval.finding_created'
    | 'eval.finding_review_requested'
    | 'eval.finding_reviewed'
    | 'eval.finding_dismissed'
    | 'eval.quality_gate_recorded'
    | 'eval.confirmation_required'
    | 'eval.confirmation_approved'
    | 'eval.confirmation_rejected'
    | 'observability.event_recorded'
    | 'observability.timeline_viewed'
    | 'journal.entry_recorded'
    | 'recovery.point_created'
    | 'resume.token_created'
    | 'resume.token_used'
    | 'resume.view_restored'
    | 'resume.execution_blocked'
    | 'failure.classified'
    | 'collaboration.session_created'
    | 'collaboration.submitted_for_review'
    | 'collaboration.opened_record'
    | 'collaboration.paused'
    | 'collaboration.waiting_human'
    | 'collaboration.completed_record'
    | 'collaboration.blocked'
    | 'collaboration.rejected'
    | 'collaboration.cancelled'
    | 'collaboration.archived'
    | 'collaboration.confirmation_required'
    | 'collaboration.confirmation_approved'
    | 'collaboration.confirmation_rejected'
    | 'a2a_thread.created'
    | 'a2a_thread.closed_record'
    | 'a2a_thread.archived'
    | 'a2a_turn.created'
    | 'a2a_turn.recorded'
    | 'a2a_turn.submitted_for_review'
    | 'a2a_turn.approved_record'
    | 'a2a_turn.rejected'
    | 'a2a_turn.archived'
    | 'handoff.created'
    | 'handoff.submitted_for_review'
    | 'handoff.approved_record'
    | 'handoff.rejected'
    | 'handoff.cancelled'
    | 'collaboration_decision.created'
    | 'collaboration_decision.submitted_for_review'
    | 'collaboration_decision.approved_record'
    | 'collaboration_decision.rejected'
    | 'collaboration_decision.superseded'
    | 'security.policy_created'
    | 'security.policy_review_requested'
    | 'security.policy_approved_record'
    | 'security.policy_rejected'
    | 'agent_profile.created'
    | 'agent_profile.updated_record'
    | 'agent_permission_boundary.created'
    | 'agent_permission_boundary.reviewed'
    | 'skill_io_contract.created'
    | 'release_readiness.created'
    | 'release_readiness.submitted_for_review'
    | 'release_readiness.approved_record'
    | 'release_readiness.rejected'
    | 'release_readiness.blocked'
    | 'regression_gate.created'
    | 'regression_gate.evaluated_record'
    | 'regression_gate.passed_record'
    | 'regression_gate.failed_record'
    | 'regression_gate.blocked_record'
    | 'api_auth_boundary.created'
    | 'redaction.blocked_payload'
    | 'production_observability.policy_recorded'
    | 'tool.execution_plan_created'
    | 'tool.execution_plan_rejected'
    | 'tool.execution_permission_requested'
    | 'tool.execution_approved'
    | 'tool.execution_rejected'
    | 'tool.execution_started'
    | 'tool.execution_succeeded'
    | 'tool.execution_failed'
    | 'tool.execution_cancelled'
    | 'tool.execution_receipt_created'
    | 'file_change.proposal_created'
    | 'file_change.submitted_for_review'
    | 'file_change.approved_record'
    | 'file_change.rejected'
    | 'file_change.superseded'
    | 'file_change.archived'
    | 'patch_draft.created'
    | 'patch_draft.submitted_for_review'
    | 'patch_draft.approved_record'
    | 'patch_draft.rejected'
    | 'patch_draft.superseded'
    | 'patch_draft.archived'
    | 'git_change_plan.created'
    | 'git_change_plan.submitted_for_review'
    | 'git_change_plan.approved_record'
    | 'git_change_plan.rejected'
    | 'pull_request_plan.created'
    | 'pull_request_plan.submitted_for_review'
    | 'pull_request_plan.approved_record'
    | 'pull_request_plan.rejected'
    | 'review_patch_record.created'
    | 'review_patch_record.approved_record'
    | 'review_patch_record.rejected'
    | 'review_patch_record.archived'
    | 'external_integration_profile.created'
    | 'external_integration_profile.submitted_for_review'
    | 'external_integration_profile.approved_record'
    | 'external_integration_profile.rejected'
    | 'external_integration_profile.archived'
    | 'mcp_connection_profile.created'
    | 'mcp_connection_profile.submitted_for_review'
    | 'mcp_connection_profile.approved_record'
    | 'mcp_connection_profile.rejected'
    | 'mcp_connection_profile.archived'
    | 'external_action.proposal_created'
    | 'external_action.submitted_for_review'
    | 'external_action.approved_record'
    | 'external_action.rejected'
    | 'external_action.superseded'
    | 'external_action.archived'
    | 'integration_risk.assessment_created'
    | 'integration_risk.approved_record'
    | 'integration_risk.rejected'
    | 'external_action_review.created'
    | 'external_action_review.approved_record'
    | 'external_action_review.rejected'
    | 'external_action_review.archived'
    | 'integration_audit_policy.recorded'

  actorType:
    | 'user'
    | 'system'
    | 'router'
    | 'agent_placeholder'
    | 'agent_runtime'
    | 'eval_runtime'
    | 'turing'
    | 'kelvin'
    | 'owner'
    | 'operator'
    | 'viewer'
    | 'agent_record'
  actorId?: string

  beforeStatus?: string
  afterStatus?: string
  reason: string
  payload?: Json

  createdAt: string
}
```

## Required Events

| Action | Event |
| --- | --- |
| Task is created | `task.created` |
| Task status changes | `task.status_changed` |
| Task is cancelled | `task.cancelled` |
| Confirmation is required | `task.confirmation_required` |
| Confirmation is approved | `task.confirmation_approved` |
| Confirmation is rejected | `task.confirmation_rejected` |
| TaskRun is created | `task.run_created` |
| TaskStep is created | `task.step_created` |
| TaskStep is completed | `task.step_completed` |
| Task becomes blocked | `task.blocked` |
| Task processing fails | `task.failed` |
| AgentRun is created | `agent.run_created` |
| AgentRun starts analysis | `agent.run_started` |
| AgentRun completes analysis | `agent.run_completed` |
| AgentRun is blocked | `agent.run_blocked` |
| AgentRun fails | `agent.run_failed` |
| AgentRun is cancelled | `agent.run_cancelled` |
| MemoryEntry candidate is created | `memory.candidate_created` |
| MemoryEntry is approved | `memory.approved` |
| MemoryEntry is rejected | `memory.rejected` |
| MemoryEntry is superseded | `memory.superseded` |
| MemoryEntry is archived | `memory.archived` |
| KnowledgeItem is created | `knowledge.created` |
| KnowledgeItem is approved | `knowledge.approved` |
| KnowledgeItem is rejected | `knowledge.rejected` |
| KnowledgeItem is superseded | `knowledge.superseded` |
| KnowledgeItem is archived | `knowledge.archived` |
| ContextPacket is created | `context_packet.created` |
| ContextPacket is attached | `context_packet.attached` |
| ContextPacket is superseded | `context_packet.superseded` |
| A2AMessage draft is created | `a2a.draft_created` |
| A2AMessage is submitted for review | `a2a.submitted_for_review` |
| A2AMessage is approved as local record | `a2a.approved_record` |
| A2AMessage is rejected | `a2a.rejected` |
| A2AMessage is superseded | `a2a.superseded` |
| A2AMessage is archived | `a2a.archived` |
| ToolCall proposal is created | `tool.call_proposed` |
| ToolPermission is evaluated | `tool.permission_evaluated` |
| ToolCall permission is denied | `tool.permission_denied` |
| ToolCall requires confirmation | `tool.confirmation_required` |
| ToolCall is approved as local record | `tool.approved_record` |
| ToolCall is rejected | `tool.rejected` |
| ToolCall is cancelled | `tool.cancelled` |
| ToolCall is blocked | `tool.blocked` |
| ToolRun placeholder is created | `tool.run_created` |
| ToolRun placeholder is skipped | `tool.run_skipped` |
| ToolRun mock-only record completes | `tool.run_mock_completed` |
| ToolRun validation fails | `tool.run_failed_validation` |
| EvalTarget is created | `eval.target_created` |
| EvalRun is created | `eval.run_created` |
| EvalRun starts | `eval.run_started` |
| EvalRun completes | `eval.run_completed` |
| EvalRun is blocked | `eval.run_blocked` |
| EvalRun fails | `eval.run_failed` |
| EvalRun is cancelled | `eval.run_cancelled` |
| EvalCheck is recorded | `eval.check_recorded` |
| EvalFinding is created | `eval.finding_created` |
| EvalFinding requests review | `eval.finding_review_requested` |
| EvalFinding is reviewed | `eval.finding_reviewed` |
| EvalFinding is dismissed | `eval.finding_dismissed` |
| QualityGateDecision is recorded | `eval.quality_gate_recorded` |
| Eval review requires confirmation | `eval.confirmation_required` |
| Eval review is approved | `eval.confirmation_approved` |
| Eval review is rejected | `eval.confirmation_rejected` |

## Payload Guidelines

Payload may include:

- RouteDecision summary.
- matchedSignals.
- targetAgentId.
- confidence.
- transition event name.
- confirmation artifact id.
- validation error summaries.
- agentRunId.
- AgentResult status and confidence.
- memoryEntryId.
- knowledgeItemId.
- contextPacketId.
- a2aMessageId.
- local review decision summary.
- toolCallId.
- toolRunId.
- toolId.
- toolName.
- permissionDecisionId.
- policyRef.
- matchedRules.
- deniedRules.
- evalTargetId.
- evalRunId.
- evalCheckId.
- evalFindingId.
- qualityGateDecision.
- auth role attribution.
- production readiness summary.
- regression gate summary.
- file change proposal summary.
- patch draft hash.
- Git plan summary.
- PR plan title and checklist summary.
- patch review verdict.
- external integration profile summary.
- MCP profile disabled status.
- external action proposal summary.
- integration risk summary.
- external review verdict.

Payload must not include:

- secrets
- API keys
- environment variable dumps
- full shell stdout/stderr
- full file contents
- private tokens
- raw external API payloads
- full unsanitized file contents

## Example

```json
{
  "id": "audit_001",
  "correlationId": "req_001",
  "taskId": "task_001",
  "eventType": "task.created",
  "actorType": "router",
  "actorId": "elon",
  "afterStatus": "queued",
  "reason": "RouteDecision delegated product work to Jobs.",
  "payload": {
    "targetAgentId": "jobs",
    "confidence": 0.86,
    "matchedSignals": ["prd"]
  },
  "createdAt": "2026-06-15T12:00:00.000Z"
}
```

## Append-only Rule

AuditEvent records must never be edited to rewrite history.

If a correction is needed, append a new event:

```text
task.failed
task.status_changed
task.confirmation_rejected
```

## Sprint 3, Sprint 4, and Sprint 5 Safety Boundary

Audit events describe decisions, state, and analysis lifecycle only. They must not trigger execution.

No AuditEvent handler may execute agents, tools, shell commands, file mutations, Git operations, PR creation, deploys, deletes, Memory writes, or external APIs in Sprint 3 or Sprint 4.

Sprint 4 `agent.*` events describe analysis-only AgentRun lifecycle. They do not imply tool execution, task completion, file changes, PRs, deploys, deletes, Memory writes, or external side effects.

Sprint 5 `memory.*`, `knowledge.*`, `context_packet.*`, and `a2a.*` events describe local record lifecycle only. They do not imply:

- Tool Runtime execution
- external API calls
- external knowledge sync
- file writes
- Git operations
- PR creation
- deploys
- deletes
- message sending
- target Agent startup
- autonomous A2A loops

Sprint 6 `tool.*` events describe tool proposal, permission, confirmation, and mock-only lifecycle only. They do not imply:

- real Tool Runtime execution
- shell commands
- Git operations
- file writes, patches, formatting, or deletes
- PR creation, merge, or push
- deploys, releases, or publishes
- database migrations or data deletion
- external API calls
- MCP execution
- browser automation

Sprint 7 `eval.*` events describe verification, findings, quality gate recommendations, and local review lifecycle only. They do not imply:

- target record mutation
- automatic Task blocking, completion, cancellation, or progression
- ToolCall creation
- ToolCall approval
- Tool Runtime execution
- shell commands
- Git operations
- file writes, patches, formatting, or deletes
- PR creation, merge, or push
- deploys, releases, or publishes
- database migrations or data deletion
- MemoryEntry or KnowledgeItem approval
- A2A message sending
- target Agent startup
- external API calls
- MCP execution
- browser automation

## Sprint 8 Observability / Recovery / Resume Boundary

Sprint 8 may mirror or reference AuditEvent records from ObservabilityEvent, RunJournal, RecoveryPoint, ResumeToken, and FailureClassification records.

Additional Sprint 8 event types:

```text
observability.event_recorded
observability.timeline_viewed
journal.entry_recorded
recovery.point_created
resume.token_created
resume.token_used
resume.view_restored
resume.execution_blocked
failure.classified
```

Additional Sprint 9 event types:

```text
collaboration.session_created
collaboration.submitted_for_review
collaboration.opened_record
collaboration.paused
collaboration.waiting_human
collaboration.completed_record
collaboration.blocked
collaboration.rejected
collaboration.cancelled
collaboration.archived
collaboration.confirmation_required
collaboration.confirmation_approved
collaboration.confirmation_rejected
a2a_thread.created
a2a_thread.closed_record
a2a_thread.archived
a2a_turn.created
a2a_turn.recorded
a2a_turn.submitted_for_review
a2a_turn.approved_record
a2a_turn.rejected
a2a_turn.archived
handoff.created
handoff.submitted_for_review
handoff.approved_record
handoff.rejected
handoff.cancelled
collaboration_decision.created
collaboration_decision.submitted_for_review
collaboration_decision.approved_record
collaboration_decision.rejected
collaboration_decision.superseded
```

Sprint 8 audit and observability events describe inspection, snapshots, resume views, and failure classification only. They do not imply:

- replay
- retry
- rollback
- database state restoration
- AgentRun startup or continuation
- ToolCall creation or ToolRun execution
- MemoryEntry or KnowledgeItem approval
- A2A message sending or dispatch
- EvalRun startup
- automatic Task blocking, completion, cancellation, or progression
- shell commands
- Git operations
- file writes, patches, formatting, or deletes
- PR creation, merge, or push
- deploys, releases, or publishes
- external API calls
- MCP execution
- browser automation
- worker or queue execution

## Sprint 9 Multi-Agent Collaboration / A2A Runtime Boundary

Sprint 9 `collaboration.*`, `a2a_thread.*`, `a2a_turn.*`, `handoff.*`, and `collaboration_decision.*` events describe local collaboration records only.

They do not imply:

- cross-process A2A communication
- message sending, dispatch, enqueue, delivery, or webhooks
- autonomous loops
- automatic next turn creation
- AgentRun startup or continuation
- ToolCall creation or ToolRun execution
- MemoryEntry or KnowledgeItem approval
- EvalRun startup
- automatic Task blocking, completion, cancellation, or progression
- shell commands
- Git operations
- file writes, patches, formatting, or deletes
- PR creation, merge, or push
- deploys, releases, or publishes
- external API calls
- MCP execution
- browser automation
- worker or queue execution

## Sprint 10 Production Hardening / Security Boundary

Sprint 10 `security.*`, `agent_profile.*`, `agent_permission_boundary.*`, `skill_io_contract.*`, `release_readiness.*`, `regression_gate.*`, `api_auth_boundary.*`, `redaction.*`, and `production_observability.*` events describe production readiness, policy, redaction, auth, release readiness, and regression records only.

Sprint 10 auth role actor mapping:

```text
owner -> Kelvin or the authenticated human owner
operator -> authenticated human operator
viewer -> authenticated read-only human
agent_record -> non-human local record producer attribution
```

These actor types and roles are audit attribution only. They do not grant permissions, execution capability, or policy bypass. Effective permissions must still be evaluated through ApiAuthBoundary, SecurityPolicy, AgentPermissionBoundary, CommandPolicy, and Human Confirmation.

Additional Sprint 10 event types:

```text
security.policy_created
security.policy_review_requested
security.policy_approved_record
security.policy_rejected
agent_profile.created
agent_profile.updated_record
agent_permission_boundary.created
agent_permission_boundary.reviewed
skill_io_contract.created
release_readiness.created
release_readiness.submitted_for_review
release_readiness.approved_record
release_readiness.rejected
release_readiness.blocked
regression_gate.created
regression_gate.evaluated_record
regression_gate.passed_record
regression_gate.failed_record
regression_gate.blocked_record
api_auth_boundary.created
redaction.blocked_payload
production_observability.policy_recorded
```

They do not imply:

- Agent execution
- Tool execution
- shell commands
- Git operations
- file writes, patches, formatting, or deletes
- PR creation, merge, or push
- deploys, releases, or publishes
- external API calls
- MCP execution
- browser automation
- worker or queue execution
- A2A dispatch
- autonomous loops
- Task completion
- MemoryEntry or KnowledgeItem approval
- Eval target mutation
- Resume execution
- permission bypass

## Sprint 11 Controlled Tool Runtime Boundary

Sprint 11 `tool.execution_*` events describe one controlled deterministic local ToolRun lifecycle.

Additional Sprint 11 event types:

```text
tool.execution_plan_created
tool.execution_plan_rejected
tool.execution_permission_requested
tool.execution_approved
tool.execution_rejected
tool.execution_started
tool.execution_succeeded
tool.execution_failed
tool.execution_cancelled
tool.execution_receipt_created
```

Sprint 11 audit events may describe:

- ToolExecutionPlan creation.
- RecoveryPoint creation before execution.
- Kelvin approval for one ToolRun.
- explicit `execute-approved` action.
- ToolExecutionReceipt creation.

They must not imply:

- shell commands
- Git operations
- real file reads
- file writes, patches, formatting, or deletes
- PR creation, merge, or push
- deploys, releases, or publishes
- database migrations
- external API calls
- MCP execution
- browser automation
- retry, replay, rollback, or resume execution
- future automatic approvals
- AgentRun startup or continuation
- Task completion
- MemoryEntry or KnowledgeItem approval
- A2A dispatch

## Sprint 12 File / Git / PR Proposal Boundary

Sprint 12 file, patch, Git plan, PR plan, and patch review events describe local proposal records only.

Additional Sprint 12 event types:

```text
file_change.proposal_created
file_change.submitted_for_review
file_change.approved_record
file_change.rejected
file_change.superseded
file_change.archived
patch_draft.created
patch_draft.submitted_for_review
patch_draft.approved_record
patch_draft.rejected
patch_draft.superseded
patch_draft.archived
git_change_plan.created
git_change_plan.submitted_for_review
git_change_plan.approved_record
git_change_plan.rejected
pull_request_plan.created
pull_request_plan.submitted_for_review
pull_request_plan.approved_record
pull_request_plan.rejected
review_patch_record.created
review_patch_record.approved_record
review_patch_record.rejected
review_patch_record.archived
```

They must not imply:

- real workspace file reads.
- file writes, patch application, formatting, or deletes.
- shell commands.
- Git commands.
- commit, push, merge, checkout, or rebase.
- PR creation or updates.
- deploys, releases, or publishes.
- external API calls.
- MCP execution.
- browser automation.
- retry, replay, rollback, or resume execution.
- AgentRun startup or continuation.
- ToolRun execution.
- Task completion.

## Sprint 13 External / MCP Governance Boundary

Sprint 13 external integration, MCP profile, external proposal, risk assessment, review, and integration audit policy events describe local governance records only.

Additional Sprint 13 event types:

```text
external_integration_profile.created
external_integration_profile.submitted_for_review
external_integration_profile.approved_record
external_integration_profile.rejected
external_integration_profile.archived
mcp_connection_profile.created
mcp_connection_profile.submitted_for_review
mcp_connection_profile.approved_record
mcp_connection_profile.rejected
mcp_connection_profile.archived
external_action.proposal_created
external_action.submitted_for_review
external_action.approved_record
external_action.rejected
external_action.superseded
external_action.archived
integration_risk.assessment_created
integration_risk.approved_record
integration_risk.rejected
external_action_review.created
external_action_review.approved_record
external_action_review.rejected
external_action_review.archived
integration_audit_policy.recorded
```

They must not imply:

- external API calls.
- MCP connections or MCP tool invocation.
- network requests.
- webhook creation or dispatch.
- worker, queue, or background job creation.
- email, chat, message, webhook, notification, or integration event sending.
- external system reads.
- external schema fetches.
- external system writes.
- shell commands.
- Git commands.
- file writes, patch application, formatting, or deletes.
- PR creation or updates.
- deploys, releases, or publishes.
- retry, replay, rollback, or resume execution.
- AgentRun startup or continuation.
- ToolRun execution.
- Task completion.
## Sprint 14 Workflow Orchestration Audit Boundary

Sprint 14 audit events describe local workflow records only.

Additional Sprint 14 event types may include:

- `workflow_proposal.created`
- `workflow_proposal.submitted_for_review`
- `workflow_proposal.approved_record`
- `workflow_proposal.rejected`
- `workflow_proposal.superseded`
- `workflow_proposal.archived`
- `workflow_step.created`
- `workflow_step.approved_record`
- `workflow_dependency_graph.created`
- `workflow_readiness.assessed`
- `workflow_review.created`

Audit events must not be consumed as workflow execution tokens.

## Sprint 15 MVP Closure Audit Boundary

Sprint 15 audit events describe local MVP closure records only.

Additional Sprint 15 event types may include:

- `mvp_readiness.created`
- `mvp_readiness.submitted_for_review`
- `mvp_readiness.approved_record`
- `mvp_readiness.rejected`
- `mvp_readiness.archived`
- `demo_scenario.created`
- `demo_scenario.approved_record`
- `demo_scenario.rejected`
- `demo_scenario.archived`
- `governance_summary.created`
- `governance_summary.approved_record`
- `governance_summary.rejected`
- `governance_summary.archived`
- `mvp_review.created`
- `mvp_review.approved_record`
- `mvp_review.rejected`
- `mvp_review.archived`

Audit events must not be consumed as execution, release, deploy, publish, task completion, retry, replay, rollback, or resume tokens.

## Sprint 16 MVP Demo Polish Audit Boundary

Sprint 16 audit events, if displayed or added later, describe read-only operator console presentation only.

Additional Sprint 16 event types may include:

- `mvp_operator_console.viewed`
- `mvp_record_chain.viewed`
- `mvp_safety_matrix.viewed`
- `mvp_readiness_summary.viewed`
- `mvp_audit_timeline.viewed`

Audit events must not be consumed as execution, release, deploy, publish, task completion, retry, replay, rollback, restore, resume, permission, or future approval tokens.

Sprint 16 audit display must not mutate source records.

## Sprint 17 Evidence Import Audit Boundary

Sprint 17 audit events describe local evidence import records only.

Additional Sprint 17 event types may include:

- `evidence_source_profile.created`
- `evidence_import.created`
- `evidence_import.submitted_for_review`
- `evidence_import.approved_record`
- `evidence_import.rejected`
- `evidence_import.archived`
- `sanitized_evidence_snapshot.created`
- `evidence_redaction_policy.recorded`
- `evidence_review.created`
- `evidence_review.approved_record`
- `evidence_review.rejected`
- `evidence_review.archived`

Audit events must not be consumed as file read, command execution, URL fetch, external API, MCP, execution, release, deploy, publish, task completion, retry, replay, rollback, restore, resume, permission, or future approval tokens.

Sprint 17 audit events must not mutate source records or dereference path, command, URL, endpoint, or MCP metadata.
## Sprint 18 Department Agent Profile Audit Boundary

Sprint 18 audit events describe local department organization records only.

Additional Sprint 18 event types may include:

- `department_profile.created`
- `department_profile.submitted_review`
- `department_profile.approved_record`
- `department_profile.rejected`
- `department_profile.superseded`
- `department_profile.archived`
- `department_agent_role.created`
- `department_responsibility_matrix.created`
- `department_escalation_policy.created`
- `department_permission_boundary.created`
- `department_review_record.created`
- `department_review_record.approved_record`
- `department_review_record.rejected`
- `department_review_record.archived`

Audit events must not be consumed as Agent execution, Agent continuation, ToolRun execution, workflow execution, automatic routing, runtime permission, file write, Git execution, external API call, MCP connection, PR creation, deploy, publish, release, task completion, retry, replay, rollback, restore, resume execution, or future approval tokens.

Sprint 18 audit events must not mutate source records.


## Sprint 19 Department Mapping Audit Events

AuditEvent may record local department mapping lifecycle events: mapping created, submitted for review, approved_record, rejected, superseded, archived, coverage recorded, gap recorded, and mapping review recorded.

Audit events are evidence only. They must not trigger routing, execution, permission, live import, release, deploy, retry, replay, rollback, restore, resume execution, or Task completion.

## Sprint 20 Human-Gated Execution Audit Events

AuditEvent may record local execution gateway lifecycle events: intent created, plan created, gate created, receipt created, submitted for review, approved_record, rejected, superseded, and archived.

Audit events are evidence only. They must not trigger Agent execution, ToolRun execution, workflow execution, routing, assignment, runtime permission, file/Git/PR action, external API call, MCP connection, deploy, release, Task completion, retry, replay, rollback, restore, or resume execution.

## Sprint 21 Department Assignment Boundary

Sprint 21 DepartmentTaskIntakeRecord, DepartmentAssignmentProposal, DepartmentRoleFitReview, DepartmentAssignmentApprovalRecord, and DepartmentAssignmentAuditRecord may reference this contract only as sanitized evidence or local review context.

Sprint 21 assignment records must not be consumed as execution tokens, routing tokens, runtime assignment tokens, runtime permission grants, release tokens, deploy tokens, Task completion tokens, retry/replay/rollback/restore tokens, resume execution tokens, or future approval tokens.

Kelvin approval in Sprint 21 approves only one local assignment record. It must not execute Agent, continue Agent, auto-route Task, assign Agent at runtime, start AgentRun, execute ToolRun, request or approve runtime permission, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, retry, replay, rollback, restore, resume execution, or approve future assignment behavior.
