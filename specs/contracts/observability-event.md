# Contract: ObservabilityEvent

Status: proposed for Sprint 8

## Purpose

ObservabilityEvent is the cross-module event record for timeline, debugging, recovery inspection, and operator visibility.

It complements AuditEvent. AuditEvent records domain decisions. ObservabilityEvent records the broader operational timeline across ChatHub, Router, Harmony, Agent Runtime, Memory, Tool proposals, Eval, Recovery, and Resume.

## Schema

```ts
ObservabilityEvent {
  id: string
  schemaVersion: string

  eventType: string
  severity: 'debug' | 'info' | 'warn' | 'error' | 'critical'
  category:
    | 'chat'
    | 'router'
    | 'harmony'
    | 'agent_runtime'
    | 'memory'
    | 'knowledge'
    | 'a2a'
    | 'tool'
    | 'eval'
    | 'confirmation'
    | 'recovery'
    | 'resume'
    | 'security'
    | 'release_readiness'
    | 'regression'
    | 'file_change'
    | 'patch_draft'
    | 'git_change'
    | 'pull_request'
    | 'system'

  correlationId: string
  causationId?: string
  parentEventId?: string

  taskId?: string
  routeDecisionId?: string
  agentRunId?: string
  agentResultId?: string
  toolCallId?: string
  toolPermissionId?: string
  toolRunId?: string
  toolExecutionPlanId?: string
  toolExecutionReceiptId?: string
  toolExecutorId?: string
  toolSandboxId?: string
  evalRunId?: string
  memoryEntryId?: string
  knowledgeItemId?: string
  a2aMessageId?: string
  contextPacketId?: string
  confirmationArtifactId?: string
  recoveryPointId?: string
  resumeTokenId?: string
  collaborationSessionId?: string
  releaseReadinessChecklistId?: string
  regressionGateId?: string
  securityPolicyId?: string
  agentProfileId?: string
  agentPermissionBoundaryId?: string
  fileChangeProposalId?: string
  patchDraftId?: string
  gitChangePlanId?: string
  pullRequestPlanId?: string
  reviewPatchRecordId?: string

  actorType: 'user' | 'system' | 'router' | 'agent_runtime' | 'eval_runtime' | 'kelvin' | 'api'
  actorId?: string

  statusBefore?: string
  statusAfter?: string
  action: string
  summary: string

  inputSnapshot?: Json
  outputSnapshot?: Json
  metadata?: Json

  redactionStatus: 'not_required' | 'redacted' | 'blocked'
  createdAt: string
}
```

## Event Type Names

Sprint 8 may mirror existing AuditEvent event names and add observability-specific names:

- `observability.event_recorded`
- `observability.timeline_viewed`
- `journal.entry_recorded`
- `recovery.point_created`
- `resume.token_created`
- `resume.token_used`
- `resume.view_restored`
- `resume.execution_blocked`
- `failure.classified`

## Required Rules

- `correlationId` is required.
- Payloads must be sanitized before persistence.
- `inputSnapshot`, `outputSnapshot`, and `metadata` must not contain secrets, raw environment dumps, full file contents, full command output, or raw external API payloads.
- ObservabilityEvent must not trigger business behavior.
- ObservabilityEvent handlers must be read-model writers only.

## Safety Invariants

- ObservabilityEvent is not a command.
- ObservabilityEvent must not execute Agent Runtime.
- ObservabilityEvent must not execute Tool Runtime.
- ObservabilityEvent must not call external APIs.
- ObservabilityEvent must not mutate files, Git, PRs, deployments, Memory approval, A2A dispatch, Eval targets, or Task progression.

## Sprint 10 Production Observability Boundary

Sprint 10 may record security, auth, redaction, release readiness, and regression timeline entries.

Allowed:

- record policy view and review timeline entries.
- record AgentProfile and AgentPermissionBoundary inspection events.
- record ReleaseReadinessChecklist local review lifecycle.
- record RegressionGate local evaluation lifecycle.
- record redaction blocked payload summaries.

Disallowed:

- ObservabilityEvent must not deploy.
- ObservabilityEvent must not start AgentRun.
- ObservabilityEvent must not execute ToolRun.
- ObservabilityEvent must not bypass permissions.
- ObservabilityEvent must not auto-fix security findings.
- ObservabilityEvent must not mutate Sprint 1-9 target records.
- ObservabilityEvent must not persist blocked payloads.

## Sprint 11 Controlled Tool Runtime Observability

Sprint 11 may record observability events for:

- ToolExecutionPlan creation.
- RecoveryPoint creation before execution.
- permission request.
- Kelvin confirmation.
- explicit `execute-approved`.
- ToolExecutor start and completion.
- ToolExecutionReceipt creation.

ObservabilityEvent must not:

- execute tools by itself.
- retry failed ToolRuns.
- replay ToolRuns.
- rollback ToolRuns.
- resume ToolRuns.
- start AgentRun.
- complete Task.
- call shell, Git, file, PR, deploy, external API, MCP, browser, database migration, queue, or worker paths.

## Sprint 12 File / Git / PR Proposal Observability

Sprint 12 may record observability events for:

- FileChangeProposal creation and review.
- PatchDraft creation and review.
- GitChangePlan creation and review.
- PullRequestPlan creation and review.
- ReviewPatchRecord creation and review.

ObservabilityEvent must not:

- read real workspace files.
- write files.
- apply patches.
- format files.
- run shell or Git.
- commit, push, merge, checkout, or rebase.
- create PRs.
- deploy or delete.
- retry, replay, rollback, or resume execution.
- start AgentRun.
- execute ToolRun.
- complete Task.

## Sprint 13 External / MCP Governance Observability

Sprint 13 may record observability events for:

- ExternalIntegrationProfile creation and review.
- McpConnectionProfile creation and review.
- ExternalActionProposal creation and review.
- IntegrationRiskAssessment creation and review.
- ExternalActionReviewRecord creation and review.
- IntegrationAuditPolicy inspection.

ObservabilityEvent must not:

- call external APIs.
- connect MCP.
- send network requests.
- create webhooks.
- create workers, queues, or background jobs.
- send email, chat, messages, webhooks, or notifications.
- read or write external systems.
- fetch external schemas.
- retry, replay, rollback, or resume execution.
- start AgentRun.
- execute ToolRun.
- complete Task.
## Sprint 14 Workflow Orchestration Observability

Sprint 14 may record observability events for local WorkflowProposal, WorkflowStepRecord, WorkflowDependencyGraph, WorkflowReviewRecord, and WorkflowReadinessAssessment lifecycle changes.

Observability events must not represent workflow execution spans, step execution spans, Agent continuation spans, ToolRun execution spans, file write spans, Git spans, external API spans, MCP spans, PR creation spans, deploy spans, retry spans, replay spans, rollback spans, or resume execution spans.
## Sprint 15 MVP Closure Observability Boundary

Sprint 15 observability events may report local MVP readiness, demo scenario, governance summary, and review lifecycle changes only.

ObservabilityEvent must not trigger AgentRun, ToolRun, workflow, file write, Git, external API, MCP, PR, deploy, publish, release, Task completion, retry, replay, rollback, restore, or resume execution.

Sprint 15 observability signals are evidence for review and governance only.

## Sprint 16 MVP Demo Polish Observability Boundary

Sprint 16 observability events may report read-only operator console view activity only:

- MVP demo path viewed.
- record chain viewed.
- safety matrix viewed.
- readiness summary viewed.
- audit timeline viewed.

ObservabilityEvent must not trigger AgentRun, ToolRun, workflow, file write, Git, external API, MCP, PR, deploy, publish, release, Task completion, retry, replay, rollback, restore, or resume execution.

Sprint 16 observability signals are display evidence only and must not mutate source records.

## Sprint 17 Evidence Import Observability Boundary

Sprint 17 observability events may report local evidence import lifecycle activity only:

- source profile created.
- evidence import created.
- sanitized evidence snapshot created.
- evidence review created.
- evidence record reviewed, approved-record, rejected, or archived.

ObservabilityEvent must not trigger file reads, directory reads, clipboard reads, shell, Git, URL fetches, external API calls, MCP connections, AgentRun, ToolRun, workflow, PR, deploy, publish, release, Task completion, retry, replay, rollback, restore, or resume execution.

Sprint 17 observability signals are evidence only and must not mutate source records.
## Sprint 18 Department Agent Profile Boundary

Sprint 18 DepartmentProfile, DepartmentAgentRole, DepartmentResponsibilityMatrix, DepartmentEscalationPolicy, DepartmentPermissionBoundary, and DepartmentReviewRecord records may reference this contract only as sanitized local evidence or read-only governance context.

Sprint 18 department records must not be consumed as execution, routing, runtime permission, release, deploy, external access, MCP access, PR creation, task completion, retry, replay, rollback, restore, resume, or future approval tokens.

Kelvin approval in Sprint 18 approves only one local department record. It must not execute Agent, continue Agent, execute ToolRun, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, or approve future department behavior.


## Sprint 19 Department Mapping Observability Events

ObservabilityEvent may record local mapping lifecycle and coverage/gap visibility for Operator Console.

Observability remains view-only. It must not trigger Agent, ToolRun, workflow, file/Git, external API, MCP, live import, deploy, release, Task completion, retry, replay, rollback, restore, or resume execution.

## Sprint 20 Human-Gated Execution Observability Events

ObservabilityEvent may record local execution intent, plan, gate, approval, receipt, audit, and timeline visibility.

Observability remains view-only. It must not trigger Agent, ToolRun, workflow, file/Git, external API, MCP, deploy, release, Task completion, retry, replay, rollback, restore, or resume execution.

## Sprint 21 Department Assignment Boundary

Sprint 21 DepartmentTaskIntakeRecord, DepartmentAssignmentProposal, DepartmentRoleFitReview, DepartmentAssignmentApprovalRecord, and DepartmentAssignmentAuditRecord may reference this contract only as sanitized evidence or local review context.

Sprint 21 assignment records must not be consumed as execution tokens, routing tokens, runtime assignment tokens, runtime permission grants, release tokens, deploy tokens, Task completion tokens, retry/replay/rollback/restore tokens, resume execution tokens, or future approval tokens.

Kelvin approval in Sprint 21 approves only one local assignment record. It must not execute Agent, continue Agent, auto-route Task, assign Agent at runtime, start AgentRun, execute ToolRun, request or approve runtime permission, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, retry, replay, rollback, restore, resume execution, or approve future assignment behavior.
