# Contract: ResumePolicy

Status: proposed for Sprint 8

## Purpose

ResumePolicy defines the exact boundary for view-only resume.

Sprint 8 resume means restoring a local UI and audit inspection context. It does not mean replaying, retrying, continuing, or executing any workflow.

## Mode

```ts
ResumeMode = 'view_only'
```

No other ResumeMode is allowed in Sprint 8.

## Allowed Actions

- `view_timeline`
- `view_snapshot`
- `view_audit`
- `view_journal`
- `copy_context`

## Forbidden Actions

- `start_agent`
- `run_tool`
- `dispatch_a2a`
- `write_memory`
- `approve_record`
- `change_task_status`
- `call_external_api`
- `run_eval`
- `replay`
- `retry`
- `restore_state`
- `execute_command`
- `write_file`
- `create_pr`
- `deploy`
- `delete`

## API Rule

Any Sprint 8 resume API must reject request bodies that include execution intent, including:

- `execute`
- `run`
- `dispatch`
- `replay`
- `retry`
- `restore`
- `start`
- `autoFix`
- `completeTask`

## Safety Invariants

- ResumePolicy cannot override CommandPolicy.
- ResumePolicy cannot approve ConfirmationArtifact.
- ResumePolicy cannot authorize ToolPermission.
- ResumePolicy cannot continue AgentRun.
- ResumePolicy cannot start EvalRun.
- ResumePolicy cannot mutate Task status.

## Sprint 9 Collaboration Resume Boundary

ResumePolicy may open view-only context for:

- CollaborationSession
- A2AThread
- A2ATurn
- HandoffRequest
- CollaborationDecision

Allowed:

- view collaboration timeline.
- view local turn records.
- view handoff and decision records.
- view audit, journal, recovery, and eval links.

Forbidden:

- activate CollaborationSession.
- create next A2ATurn.
- approve HandoffRequest.
- approve CollaborationDecision.
- send or dispatch A2A messages.
- start Agents.
- execute tools.
- complete Task.

Sprint 9 must not introduce a non-view-only ResumeMode.

## Sprint 12 File / Git / PR Resume Boundary

ResumePolicy may open view-only context for:

- FileChangeProposal.
- PatchDraft.
- GitChangePlan.
- PullRequestPlan.
- ReviewPatchRecord.

Allowed:

- view proposal details.
- view patch draft text.
- view Git plan text.
- view PR plan text.
- view review records.
- view audit, timeline, and recovery links.

Forbidden:

- apply patches.
- write files.
- format files.
- run shell.
- run Git.
- commit, push, merge, checkout, or rebase.
- create PRs.
- deploy.
- delete.
- start Agents.
- execute ToolRuns.
- complete Tasks.

Sprint 12 must not introduce a non-view-only ResumeMode.

## Sprint 13 External / MCP Governance Resume Boundary

ResumePolicy may open view-only context for:

- ExternalIntegrationProfile.
- McpConnectionProfile.
- ExternalActionProposal.
- ExternalActionReviewRecord.
- IntegrationRiskAssessment.
- IntegrationAuditPolicy.

Allowed:

- view governance proposal details.
- view sanitized endpoint metadata.
- view disabled MCP profile metadata.
- view risk assessments and review records.
- view audit, timeline, and recovery links.

Forbidden:

- call external APIs.
- connect MCP.
- send network requests.
- create webhooks.
- create workers, queues, or background jobs.
- send messages.
- read or write external systems.
- fetch external schemas.
- start Agents.
- execute ToolRuns.
- complete Tasks.

Sprint 13 must not introduce a non-view-only ResumeMode.
## Sprint 14 Workflow Resume Boundary

Sprint 14 ResumePolicy remains view-only.

Resume may show prior WorkflowProposal, WorkflowStepRecord, WorkflowDependencyGraph, WorkflowReviewRecord, and WorkflowReadinessAssessment state. It must not resume workflow execution because Sprint 14 has no workflow execution capability.
## Sprint 15 MVP Closure Resume Boundary

Sprint 15 MVP closure records are not resumable executions.

ResumePolicy may be displayed as view-only evidence that no Sprint 15 readiness, demo, governance, or review record can resume AgentRun, ToolRun, workflow, file, Git, external API, MCP, PR, deploy, publish, release, retry, replay, rollback, or Task completion.

No Sprint 15 API or UI may expose Resume Execution for MVP closure records.

## Sprint 17 Evidence Import Resume Boundary

Sprint 17 evidence import records are not resumable executions.

ResumePolicy may be displayed as view-only evidence that no EvidenceSourceProfile, EvidenceImportRecord, SanitizedEvidenceSnapshot, EvidenceRedactionPolicy, or EvidenceReviewRecord can resume file reads, command execution, URL fetching, external API calls, MCP connections, AgentRun, ToolRun, workflow, PR, deploy, publish, release, retry, replay, rollback, restore, or Task completion.

No Sprint 17 API or UI may expose Resume Execution for evidence import records.
## Sprint 18 Department Agent Profile Boundary

Sprint 18 DepartmentProfile, DepartmentAgentRole, DepartmentResponsibilityMatrix, DepartmentEscalationPolicy, DepartmentPermissionBoundary, and DepartmentReviewRecord records may reference this contract only as sanitized local evidence or read-only governance context.

Sprint 18 department records must not be consumed as execution, routing, runtime permission, release, deploy, external access, MCP access, PR creation, task completion, retry, replay, rollback, restore, resume, or future approval tokens.

Kelvin approval in Sprint 18 approves only one local department record. It must not execute Agent, continue Agent, execute ToolRun, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, or approve future department behavior.


## Sprint 19 Department Mapping Resume Boundary

No Sprint 19 API or UI may expose Resume Execution for department evidence mapping records.

ResumePolicy may describe restoring local UI inspection context only. It must not resume Agent, ToolRun, workflow, file/Git, external API, MCP, live import, deploy, release, or Task completion.

## Sprint 20 Human-Gated Execution Resume Boundary

No Sprint 20 API or UI may expose Resume Execution for execution gateway records.

ResumePolicy may describe restoring local UI inspection context only. It must not resume Agent, ToolRun, workflow, file/Git, external API, MCP, deploy, release, or Task completion for execution gateway records.

## Sprint 21 Department Assignment Boundary

Sprint 21 DepartmentTaskIntakeRecord, DepartmentAssignmentProposal, DepartmentRoleFitReview, DepartmentAssignmentApprovalRecord, and DepartmentAssignmentAuditRecord may reference this contract only as sanitized evidence or local review context.

Sprint 21 assignment records must not be consumed as execution tokens, routing tokens, runtime assignment tokens, runtime permission grants, release tokens, deploy tokens, Task completion tokens, retry/replay/rollback/restore tokens, resume execution tokens, or future approval tokens.

Kelvin approval in Sprint 21 approves only one local assignment record. It must not execute Agent, continue Agent, auto-route Task, assign Agent at runtime, start AgentRun, execute ToolRun, request or approve runtime permission, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, retry, replay, rollback, restore, resume execution, or approve future assignment behavior.
