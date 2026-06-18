# Contract: ToolCall

Status: proposed for Sprint 6

## Purpose

ToolCall records an Agent or user proposal to use a tool.

Sprint 6 ToolCall is a proposal and review artifact only. It is not an execution request.

## Schema

```ts
ToolCall {
  id: string
  taskId?: string
  agentRunId?: string
  agentResultId?: string
  source: 'agent_result' | 'user_request' | 'system_test'

  toolId: string
  toolName: string
  proposedByAgentId?: 'elon' | 'jobs' | 'linus' | 'turing' | 'bezos' | 'kelvin'

  intent: string
  rationale: string
  input: Json
  inputSummary: string

  status:
    | 'proposed'
    | 'permission_denied'
    | 'pending_confirmation'
    | 'approved_record'
    | 'rejected'
    | 'cancelled'
    | 'blocked'

  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  sideEffects: string[]
  permissionDecisionId?: string
  confirmationArtifactId?: string
  sourceSnapshot?: Json
  policyInputSnapshot?: Json

  idempotencyKey?: string
  correlationId?: string
  createdAt: string
  updatedAt: string
}
```

## Status Meaning

- `proposed`: local proposal exists and awaits policy evaluation.
- `permission_denied`: policy denied the proposal.
- `pending_confirmation`: human review is required.
- `approved_record`: human approved the local record only.
- `rejected`: human rejected the proposal.
- `cancelled`: user or system cancelled the proposal.
- `blocked`: proposal cannot proceed safely.

## Required Rules

- Non-empty `sideEffects` requires confirmation or blocking.
- Unknown tools must become `blocked` or `permission_denied`.
- Disabled tools must become `blocked` or `permission_denied`.
- `approved_record` does not mean execution.
- ToolCall must retain source snapshots sufficient for audit.
- `sourceSnapshot` should contain a compact AgentResult, user request, or system test snapshot.
- `policyInputSnapshot` should contain the normalized input used for ToolRegistry and CommandPolicy evaluation.
- Snapshots must not include secrets, full file contents, full stdout/stderr, raw environment dumps, or private tokens.

## Safety Invariants

- ToolCall must not run tools.
- ToolCall must not start ToolRun execution.
- ToolCall must not modify Task status to completed.
- ToolCall approval must not trigger AgentRun, ToolRun, shell, Git, file write, PR, deploy, delete, database change, external API, MCP, or browser automation.
- Policy evaluation must not directly set `status = approved_record`.
- Only explicit user / Kelvin approval may move a ToolCall to `approved_record`.

## Sprint 7 Eval Boundary

ToolCall may be evaluated by Sprint 7 Eval / Verification / Quality Gate.

Allowed:

- EvalTarget may reference a ToolCall proposal.
- EvalRun may check ToolCall status, riskLevel, sideEffects, ToolPermission linkage, and ConfirmationArtifact linkage.
- QualityGateDecision may recommend pass, warn, fail, needs_human_review, or blocked.

Disallowed:

- Eval must not mutate ToolCall status.
- Eval must not approve ToolCall records.
- Eval must not create executable ToolRun records.
- Eval must not execute tools.
- Eval must not trigger shell, Git, file write, PR, deploy, delete, database, external API, MCP, browser, AgentRun, or Task completion behavior.

## Sprint 8 Observability / Recovery / Resume Boundary

Sprint 8 may observe ToolCall records through ObservabilityEvent, RunJournal, RecoveryPoint, ResumeToken, and FailureClassification.

Allowed:

- show ToolCall proposal timeline.
- show latest ToolPermission and audit history.
- create sanitized RecoveryPoint snapshots for ToolCall records.
- create view-only ResumeToken records for ToolCall inspection.

Disallowed:

- ResumeToken must not approve ToolCall.
- ResumeToken must not create ToolRun.
- ResumeToken must not execute tools.
- RecoveryPoint must not restore ToolCall status.
- RunJournal must not replay ToolCall proposal or permission evaluation.
- FailureClassification must not retry ToolPermission evaluation automatically.

## Sprint 11 Controlled Tool Runtime Boundary

Sprint 11 may allow a ToolCall to be linked to one or more controlled ToolRuns.

Allowed:

- ToolCall can be source of a ToolRun.
- ToolCall can be source for ToolExecutionPlan.
- ToolCall can link ToolExecutionReceipt records.
- ToolCall UI may show execution policy, sandbox, plan, receipt, audit, timeline, and recovery links.

Disallowed:

- ToolCall approval alone must not execute a ToolRun.
- ToolCall `approved_record` is not execution approval.
- ToolCall must not approve future ToolRuns.
- ToolCall must not start AgentRun.
- ToolCall must not complete Task.
- ToolCall must not bypass ToolExecutionPolicy or ToolSandbox.

Sprint 11 execution approval applies to a specific ToolRun, not the parent ToolCall as a general authorization.
