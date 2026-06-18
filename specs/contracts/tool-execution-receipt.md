# Contract: ToolExecutionReceipt

Status: proposed for Sprint 11

## Purpose

ToolExecutionReceipt is the immutable record of one controlled ToolRun execution attempt.

It records deterministic output, timing, hashes, audit refs, observability refs, recovery refs, and side-effect classification.

## Schema

```ts
ToolExecutionReceipt {
  id: string
  toolRunId: string
  toolCallId: string
  taskId?: string
  agentRunId?: string
  toolId: string
  executorId: string
  executionPlanId: string

  status: 'succeeded' | 'failed' | 'cancelled'
  startedAt: string
  completedAt: string
  durationMs: number

  idempotencyKey: string
  inputHash: string
  outputHash?: string
  policyVersion: string
  executorVersion: string

  resultSummary: string
  resultSnapshot?: Json
  sideEffects: []
  sideEffectClass: 'none' | 'simulated_read'
  reversibility: 'not_required' | 'inspect_only'

  simulatedReads?: {
    source: 'static_fixture' | 'local_in_memory'
    key: string
    hash: string
  }[]

  auditEventIds: string[]
  observabilityEventIds: string[]
  recoveryPointId: string

  createdAt: string
}
```

## Receipt Rules

1. One execution attempt must create one receipt.
2. Receipt must be immutable.
3. Receipt must not contain secrets.
4. Receipt must not include full command output, full file content, or raw external payload.
5. Receipt must not include sideEffects.
6. Receipt must reference the pre-execution RecoveryPoint.

## Safety Invariants

- Receipt status does not complete Task.
- Receipt status does not start AgentRun.
- Receipt status does not approve Memory / Knowledge / A2A.
- Receipt status does not authorize retry, replay, rollback, or resume execution.

## Sprint 13 External / MCP Governance Boundary

ToolExecutionReceipt may be referenced as sanitized evidence for ExternalActionProposal records.

Allowed:

- reference receipt id, toolRunId, policyVersion, executorVersion, inputHash, outputHash, sideEffectClass, and sanitized result summary.
- prove that Sprint 11 output was deterministic local evidence.

Disallowed:

- Receipt status must not authorize external API calls.
- Receipt status must not authorize MCP connections or MCP tool invocation.
- Receipt status must not authorize webhook creation, message sending, worker or queue creation, external reads, external writes, Agent execution, ToolRun execution, or Task completion.
- Receipt payloads must not contain raw external payloads, tokens, headers, cookies, credentials, or secrets.
## Sprint 14 Human-Gated Workflow Orchestration Boundary

ToolExecutionReceipt may be referenced by WorkflowProposal and WorkflowStepRecord as sanitized evidence only.

An approved or completed ToolExecutionReceipt remains evidence of a prior controlled local deterministic ToolRun only. It must not grant WorkflowProposal or WorkflowStepRecord execution authority.
## Sprint 15 MVP Closure Evidence Boundary

ToolExecutionReceipt may be referenced by MVPReadinessRecord, DemoScenarioRecord, and GovernanceSummaryRecord as sanitized evidence only.

ToolExecutionReceipt must not become:

- a new ToolRun execution token.
- a File / Git / PR execution token.
- an External / MCP execution token.
- a workflow execution token.
- a release or deploy token.
- Kelvin confirmation.

Sprint 15 record creation from ToolExecutionReceipt must not replay, retry, rollback, resume, or execute any ToolRun.
