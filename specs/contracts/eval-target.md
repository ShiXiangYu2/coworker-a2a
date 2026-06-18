# Contract: EvalTarget

Status: proposed for Sprint 7

## Purpose

EvalTarget is the local, sanitized reference to an object that should be verified.

It lets the Eval layer evaluate Sprint 1-6 records without mutating them and without reading external resources.

## Schema

```ts
EvalTarget {
  id: string
  targetType:
    | 'route_decision'
    | 'harmony_task'
    | 'agent_run'
    | 'agent_result'
    | 'memory_entry'
    | 'knowledge_item'
    | 'context_packet'
    | 'a2a_message'
    | 'tool_call'
    | 'tool_permission'
    | 'tool_run'
    | 'tool_execution_plan'
    | 'tool_execution_receipt'
    | 'file_change_proposal'
    | 'patch_draft'
    | 'git_change_plan'
    | 'pull_request_plan'
    | 'review_patch_record'
    | 'collaboration_session'
    | 'a2a_thread'
    | 'a2a_turn'
    | 'handoff_request'
    | 'collaboration_decision'
  targetId: string

  routeDecisionId?: string
  taskId?: string
  agentRunId?: string
  agentResultId?: string
  toolCallId?: string
  toolPermissionId?: string
  toolRunId?: string
  toolExecutionPlanId?: string
  toolExecutionReceiptId?: string
  memoryEntryId?: string
  knowledgeItemId?: string
  contextPacketId?: string
  a2aMessageId?: string
  collaborationSessionId?: string
  a2aThreadId?: string
  a2aTurnId?: string
  handoffRequestId?: string
  collaborationDecisionId?: string
  fileChangeProposalId?: string
  patchDraftId?: string
  gitChangePlanId?: string
  pullRequestPlanId?: string
  reviewPatchRecordId?: string

  source: 'manual' | 'task_ui' | 'agent_result_card' | 'tool_call_card' | 'api' | 'system_test'
  snapshot: Json
  snapshotVersion: string
  snapshotHash?: string

  status: 'active' | 'superseded' | 'cancelled'
  idempotencyKey?: string
  correlationId?: string
  createdAt: string
  updatedAt: string
}
```

## Snapshot Rules

The snapshot must include enough sanitized data to reproduce the evaluation:

- target type and target id
- status and key fields
- confidence or risk level when available
- sideEffects summary when available
- confirmation status when available
- compact source references

ContextPacket may be an EvalTarget in Sprint 7, but only for audit, reproducibility, and deterministic context selection quality. ContextPacket eval must not attach, detach, supersede, or start AgentRun.

The snapshot must not include:

- secrets
- API keys
- environment variable dumps
- full file contents
- full command output
- private tokens
- raw external API payloads

## Safety Invariants

- Creating an EvalTarget must not mutate the target record.
- Creating an EvalTarget must not start EvalRun unless an explicit eval creation API is called.
- Creating an EvalTarget must not execute tools, commands, files, Git, PR, deploy, delete, external API, MCP, browser, or A2A behavior.
- Creating an EvalTarget for ContextPacket must not attach or detach the ContextPacket and must not start AgentRun.

## Sprint 9 Collaboration Targets

Sprint 9 may create EvalTarget records for:

- CollaborationSession
- A2AThread
- A2ATurn
- HandoffRequest
- CollaborationDecision

Eval snapshots should check:

- collaboration objective clarity.
- participant responsibility boundaries.
- handoff completeness.
- turn ordering and evidence references.
- Kelvin review requirements.
- forbidden execution claims.
- audit and observability coverage.

Creating an EvalTarget for collaboration records must not activate sessions, create turns, approve handoffs, send messages, start Agents, execute tools, or complete Tasks.

## Sprint 11 Tool Execution Targets

Sprint 11 may create EvalTarget records for:

- ToolRun
- ToolExecutionPlan
- ToolExecutionReceipt
- ToolResult

Eval may check:

- state machine validity.
- permission and confirmation linkage.
- RecoveryPoint presence before execution.
- ToolSandbox forbidden capability denial.
- ToolExecutionPolicy default-deny.
- sideEffects empty.
- deterministic output evidence.
- idempotencyKey presence.

Eval must not:

- approve execution.
- trigger `execute-approved`.
- mutate ToolRun status.
- retry, replay, rollback, or resume execution.
- start AgentRun.
- mark Task completed.

## Sprint 12 File / Git / PR Targets

Sprint 12 may create EvalTarget records for:

- FileChangeProposal.
- PatchDraft.
- GitChangePlan.
- PullRequestPlan.
- ReviewPatchRecord.

Eval snapshots should check:

- proposal source is allowed and sanitized.
- target paths are metadata only.
- PatchDraft does not claim it was applied.
- GitChangePlan does not claim Git was run.
- PullRequestPlan does not claim a PR was created.
- Kelvin review requirements.
- forbidden execution claims.

Creating an EvalTarget for Sprint 12 records must not read files, apply patches, run Git, create PRs, deploy, execute ToolRuns, start Agents, or complete Tasks.

## Sprint 13 External / MCP Governance Targets

Sprint 13 may create EvalTarget records for:

- ExternalIntegrationProfile.
- McpConnectionProfile.
- ExternalActionProposal.
- ExternalActionReviewRecord.
- IntegrationRiskAssessment.
- IntegrationAuditPolicy.

Eval snapshots should check:

- source evidence is allowed and sanitized.
- endpoint metadata is secret-free.
- McpConnectionProfile is disabled local record only.
- proposal does not claim external execution.
- Kelvin review requirements.
- forbidden external/MCP execution wording.

Creating an EvalTarget for Sprint 13 records must not call external APIs, connect MCP, send network requests, create webhooks, create workers or queues, send messages, read or write external systems, fetch external schemas, execute ToolRuns, start Agents, or complete Tasks.
## Sprint 14 Workflow Orchestration Targets

Sprint 14 may create EvalTarget records for:

- WorkflowProposal.
- WorkflowStepRecord.
- WorkflowDependencyGraph.
- WorkflowReviewRecord.
- WorkflowReadinessAssessment.

EvalTarget creation must not execute workflows, execute steps, continue Agents, execute ToolRuns, write files, run Git, call external APIs, connect MCP, create PRs, deploy, complete Tasks, retry, replay, rollback, or resume execution.
## Sprint 15 MVP Closure Eval Target Boundary

EvalTarget may target MVPReadinessRecord, DemoScenarioRecord, GovernanceSummaryRecord, or MVPReviewRecord for recommendation-only evaluation.

EvalTarget must not authorize execution, release, deploy, publish, task completion, retry, replay, rollback, or resume behavior.

Sprint 15 EvalTarget definitions must cover Sprint 1-14 regression evidence without mutating source records.

## Sprint 17 Evidence Import Eval Target Boundary

EvalTarget may target EvidenceSourceProfile, EvidenceImportRecord, SanitizedEvidenceSnapshot, EvidenceRedactionPolicy, or EvidenceReviewRecord for recommendation-only evaluation.

Eval snapshots should check:

- evidence source is user-explicit only.
- path, command, URL, endpoint, and MCP metadata are not dereferenced.
- raw input is not stored by default.
- secrets, tokens, cookies, credentials, private keys, raw headers, and raw payloads are rejected or redacted.
- approved records and snapshots are evidence only.
- forbidden live import or execution wording is absent.

Creating an EvalTarget for Sprint 17 records must not read files, read directories, read clipboard, run shell, run Git, fetch URLs, call external APIs, connect MCP, execute ToolRuns, start Agents, execute workflows, create PRs, deploy, publish, release, retry, replay, rollback, restore, resume execution, or complete Tasks.
## Sprint 18 Department Agent Profile Boundary

Sprint 18 DepartmentProfile, DepartmentAgentRole, DepartmentResponsibilityMatrix, DepartmentEscalationPolicy, DepartmentPermissionBoundary, and DepartmentReviewRecord records may reference this contract only as sanitized local evidence or read-only governance context.

Sprint 18 department records must not be consumed as execution, routing, runtime permission, release, deploy, external access, MCP access, PR creation, task completion, retry, replay, rollback, restore, resume, or future approval tokens.

Kelvin approval in Sprint 18 approves only one local department record. It must not execute Agent, continue Agent, execute ToolRun, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, or approve future department behavior.


## Sprint 19 Department Mapping Eval Target

EvalTarget may reference Sprint 19 mapping records to verify safety, coverage consistency, and forbidden semantics.

EvalTarget must not execute mapping, route tasks, grant permission, import live evidence, mutate source records, deploy, release, or complete tasks.

## Sprint 20 Human-Gated Execution Eval Target

EvalTarget may target ExecutionIntentRecord, ExecutionPlanRecord, ExecutionGateRecord, ExecutionApprovalRecord, and ExecutionReceiptRecord for recommendation-only evaluation.

EvalTarget creation must not execute Agent, continue Agent, route Task, assign Agent, execute ToolRun, execute workflow, write files, run Git, call external API, connect MCP, create PR, deploy, release, complete Tasks, retry, replay, rollback, restore, or resume execution.

## Sprint 21 Department Assignment Boundary

Sprint 21 DepartmentTaskIntakeRecord, DepartmentAssignmentProposal, DepartmentRoleFitReview, DepartmentAssignmentApprovalRecord, and DepartmentAssignmentAuditRecord may reference this contract only as sanitized evidence or local review context.

Sprint 21 assignment records must not be consumed as execution tokens, routing tokens, runtime assignment tokens, runtime permission grants, release tokens, deploy tokens, Task completion tokens, retry/replay/rollback/restore tokens, resume execution tokens, or future approval tokens.

Kelvin approval in Sprint 21 approves only one local assignment record. It must not execute Agent, continue Agent, auto-route Task, assign Agent at runtime, start AgentRun, execute ToolRun, request or approve runtime permission, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, retry, replay, rollback, restore, resume execution, or approve future assignment behavior.
