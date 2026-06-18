# Contract: EvalRun

Status: proposed for Sprint 7

## Purpose

EvalRun records a local verification attempt for an EvalTarget.

Sprint 7 EvalRun is independent of AgentRun and does not execute tools or remediation.

## Schema

```ts
EvalRun {
  id: string
  evalTargetId: string
  targetType: EvalTarget['targetType']
  targetId: string

  evaluatorId: 'turing' | 'system_rules' | 'kelvin' | 'system_test'
  evaluatorMode: 'deterministic_local' | 'manual_review'
  status: 'created' | 'running' | 'completed' | 'blocked' | 'failed' | 'cancelled'
  trigger: 'manual' | 'task_ui' | 'agent_result_card' | 'tool_call_card' | 'api' | 'system_test'

  checksSummary: {
    total: number
    passed: number
    warned: number
    failed: number
    blocked: number
  }
  qualityGateDecision?: QualityGateDecision

  inputSnapshot: Json
  outputSnapshot?: Json
  error?: {
    code: string
    message: string
  }

  idempotencyKey?: string
  correlationId?: string
  startedAt?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}
```

## State Machine

```text
created
  -> running
created
  -> cancelled

running
  -> completed
  -> blocked
  -> failed
  -> cancelled
```

## Meaning

- `completed`: verification completed and produced a gate recommendation.
- `blocked`: evaluation cannot proceed safely or target snapshot is invalid.
- `failed`: evaluator failed to produce valid structured output.
- `cancelled`: user or system cancelled the local eval.

Terminal states:

- `completed`
- `blocked`
- `failed`
- `cancelled`

Terminal states must not transition to another EvalRun status in Sprint 7.

## Safety Invariants

- EvalRun is not AgentRun.
- EvalRun must not create a Turing AgentRun by default.
- EvalRun.completed means verification completed only.
- EvalRun.completed does not mean target work is complete.
- EvalRun.completed must not mutate Task, AgentRun, MemoryEntry, KnowledgeItem, A2AMessage, ToolCall, or ToolPermission status.
- EvalRun must not execute tools, shell, Git, file writes, PRs, deploys, deletes, external APIs, MCP, browser automation, or A2A sends.

## Sprint 8 Observability / Recovery / Resume Boundary

Sprint 8 may observe EvalRun records through ObservabilityEvent, RunJournal, RecoveryPoint, ResumeToken, and FailureClassification.

Allowed:

- show EvalRun timeline, checks, findings, and quality gate recommendation.
- create sanitized RecoveryPoint snapshots for EvalRun records.
- create view-only ResumeToken records for EvalRun inspection.
- classify EvalRun validation, producer, persistence, cancellation, and timeout failures.

Disallowed:

- ResumeToken must not start EvalRun.
- RecoveryPoint must not restore EvalRun status.
- RunJournal must not replay EvalRun checks.
- FailureClassification must not retry EvalRun.
- Sprint 8 must not mutate evaluated target status.

## Sprint 9 Collaboration Eval Boundary

Sprint 9 may evaluate CollaborationSession, A2AThread, A2ATurn, HandoffRequest, and CollaborationDecision records.

Allowed:

- verify local collaboration structure.
- critique handoff clarity.
- check role boundaries.
- check Kelvin confirmation requirements.
- check that no record claims execution, dispatch, or autonomous continuation.
- produce QualityGateDecision recommendations.

Disallowed:

- EvalRun must not create A2ATurn.
- EvalRun must not approve HandoffRequest or CollaborationDecision.
- EvalRun must not activate CollaborationSession.
- EvalRun must not send A2A messages.
- EvalRun must not start Agents.
- EvalRun must not execute Tool Runtime.
- EvalRun must not mutate Task status.

QualityGateDecision remains recommendation-only for Sprint 9 collaboration records.

## Sprint 10 Production Hardening Boundary

Sprint 10 may use EvalRun, EvalCheck, EvalFinding, and QualityGateDecision records as evidence for ReleaseReadinessChecklist and RegressionGate.

Allowed:

- reference EvalRun IDs in release readiness evidence.
- verify Sprint 7 recommendation-only behavior.
- verify Sprint 8 view-only resume behavior for EvalRun.
- verify Sprint 9 collaboration eval remains recommendation-only.

Disallowed:

- ReleaseReadinessChecklist must not start EvalRun.
- RegressionGate must not start EvalRun.
- QualityGateDecision must not mutate target status.
- Eval findings must not auto-fix security issues.
- Kelvin approval of eval-related records must not execute tools, start Agents, dispatch A2A, approve Memory / Knowledge, deploy, or mutate target records.

## Sprint 11 Tool Execution Eval Boundary

Sprint 11 EvalRun may evaluate ToolRun, ToolExecutionPlan, ToolExecutionReceipt, and ToolResult records.

Allowed:

- recommend pass, warn, fail, needs_human_review, or blocked.
- flag missing RecoveryPoint.
- flag missing confirmation.
- flag non-deterministic output.
- flag forbidden category or sandbox capability.

Disallowed:

- EvalRun must not approve ToolRun execution.
- EvalRun must not create ToolExecutionReceipt.
- EvalRun must not call `execute-approved`.
- EvalRun must not mutate ToolRun status.
- EvalRun must not retry, replay, rollback, or resume execution.
- EvalRun must not start AgentRun or complete Task.

QualityGateDecision remains recommendation-only.

## Sprint 12 File / Git / PR Eval Boundary

Sprint 12 EvalRun may evaluate FileChangeProposal, PatchDraft, GitChangePlan, PullRequestPlan, and ReviewPatchRecord.

Allowed:

- recommend pass, warn, fail, needs_human_review, or blocked.
- flag unsafe source snapshots.
- flag path dereference risk.
- flag forbidden execution wording.
- flag missing Kelvin review.
- flag PR / Git / file action ambiguity.

Disallowed:

- EvalRun must not apply PatchDraft.
- EvalRun must not write files.
- EvalRun must not run shell or Git.
- EvalRun must not create PRs.
- EvalRun must not deploy or delete.
- EvalRun must not mutate proposal status.
- EvalRun must not start AgentRun or execute ToolRun.
- EvalRun must not complete Task.

QualityGateDecision remains recommendation-only.

## Sprint 13 External / MCP Governance Eval Boundary

Sprint 13 EvalRun may evaluate ExternalIntegrationProfile, McpConnectionProfile, ExternalActionProposal, ExternalActionReviewRecord, IntegrationRiskAssessment, and IntegrationAuditPolicy.

Allowed:

- recommend pass, warn, fail, needs_human_review, or blocked.
- flag unsafe endpoint metadata.
- flag secret leakage risk.
- flag MCP profile connection ambiguity.
- flag forbidden external execution wording.
- flag missing Kelvin review.

Disallowed:

- EvalRun must not call external APIs.
- EvalRun must not connect MCP.
- EvalRun must not send network requests.
- EvalRun must not create webhooks.
- EvalRun must not create workers, queues, or background jobs.
- EvalRun must not send messages.
- EvalRun must not read or write external systems.
- EvalRun must not mutate governance record status.
- EvalRun must not start AgentRun or execute ToolRun.
- EvalRun must not complete Task.

QualityGateDecision remains recommendation-only.
## Sprint 14 Workflow Orchestration Eval Boundary

Sprint 14 EvalRun may evaluate WorkflowProposal, WorkflowStepRecord, WorkflowDependencyGraph, WorkflowReviewRecord, and WorkflowReadinessAssessment quality.

EvalRun output is recommendation-only evidence. It must not approve records automatically and must not be consumed as an execution token.
## Sprint 15 MVP Closure Eval Boundary

EvalRun may provide recommendation-only evidence for Sprint 15 MVP closure.

EvalRun must not:

- approve MVPReadinessRecord automatically.
- satisfy Kelvin confirmation.
- execute AgentRun, ToolRun, workflow, file, Git, external API, MCP, PR, deploy, publish, release, retry, replay, rollback, or resume behavior.
- complete Task.
- mutate source evidence records.

EvalRun results are evidence only.

## Sprint 17 Evidence Import Eval Boundary

EvalRun may provide recommendation-only evidence for Sprint 17 evidence import records.

EvalRun must not:

- approve EvidenceImportRecord automatically.
- satisfy Kelvin confirmation.
- read files, directories, or clipboard.
- execute shell or Git.
- fetch URLs.
- call external APIs.
- connect MCP.
- execute AgentRun, ToolRun, workflow, PR, deploy, publish, release, retry, replay, rollback, restore, or resume behavior.
- complete Task.
- mutate source evidence records.

EvalRun results are evidence only.
## Sprint 18 Department Agent Profile Boundary

Sprint 18 DepartmentProfile, DepartmentAgentRole, DepartmentResponsibilityMatrix, DepartmentEscalationPolicy, DepartmentPermissionBoundary, and DepartmentReviewRecord records may reference this contract only as sanitized local evidence or read-only governance context.

Sprint 18 department records must not be consumed as execution, routing, runtime permission, release, deploy, external access, MCP access, PR creation, task completion, retry, replay, rollback, restore, resume, or future approval tokens.

Kelvin approval in Sprint 18 approves only one local department record. It must not execute Agent, continue Agent, execute ToolRun, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, or approve future department behavior.


## Sprint 19 Department Mapping Eval Boundary

EvalRun may evaluate Sprint 19 mapping records for recommendation and evidence only.

EvalRun results must not approve mapping records automatically, route tasks, assign agents, grant runtime permission, import live evidence, execute tools or workflows, deploy, release, or complete tasks.

## Sprint 20 Human-Gated Execution Eval Boundary

EvalRun may evaluate Sprint 20 execution records for recommendation and evidence only.

EvalRun results must not approve execution records automatically, execute Agent, continue Agent, route Task, assign Agent, execute ToolRun, execute workflow, write files, run Git, call external API, connect MCP, create PR, deploy, release, complete Tasks, retry, replay, rollback, restore, or resume execution.

## Sprint 21 Department Assignment Boundary

Sprint 21 DepartmentTaskIntakeRecord, DepartmentAssignmentProposal, DepartmentRoleFitReview, DepartmentAssignmentApprovalRecord, and DepartmentAssignmentAuditRecord may reference this contract only as sanitized evidence or local review context.

Sprint 21 assignment records must not be consumed as execution tokens, routing tokens, runtime assignment tokens, runtime permission grants, release tokens, deploy tokens, Task completion tokens, retry/replay/rollback/restore tokens, resume execution tokens, or future approval tokens.

Kelvin approval in Sprint 21 approves only one local assignment record. It must not execute Agent, continue Agent, auto-route Task, assign Agent at runtime, start AgentRun, execute ToolRun, request or approve runtime permission, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, retry, replay, rollback, restore, resume execution, or approve future assignment behavior.
