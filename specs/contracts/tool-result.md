# Contract: ToolResult

Status: proposed for Sprint 6

## Purpose

ToolResult is the structured output shape for future tool activity.

Sprint 6 ToolResult can only describe validation, skipped, blocked, or mock-only results. It must not claim real-world execution.

## Schema

```ts
ToolResult {
  status: 'success' | 'skipped' | 'failed' | 'requires_human'
  confidence: number
  summary: string
  data?: Json
  next: {
    recommendedAction: 'continue' | 'retry' | 'stop' | 'escalate'
    reason?: string
  }
  sideEffects: []
  warnings?: string[]
  auditRefs?: string[]
}
```

## Field Rules

- `confidence` must be between 0 and 1.
- `summary` must not claim real execution.
- `data` must not include secrets, full command output, environment dumps, or full file contents.
- `sideEffects` must be an empty array.
- Non-empty `sideEffects` invalidates the ToolResult in Sprint 6.

## Prohibited Claims

ToolResult must not say:

- commands were run
- files were changed
- Git operations completed
- a PR was created
- code was deployed
- data was deleted
- an external API was called
- an MCP tool was invoked
- browser automation was executed

## Safety Invariants

- ToolResult is a local structured record only in Sprint 6.
- ToolResult must not be used to mark Task completed.
- ToolResult must not trigger AgentRun continuation.

## Sprint 11 Controlled Execution Result

Sprint 11 ToolResult may describe controlled deterministic local execution.

Additional Sprint 11 fields:

```ts
ToolResult {
  sideEffectClass: 'none' | 'simulated_read'
  reversibility: 'not_required' | 'inspect_only'
  idempotencyKey: string
  inputHash: string
  outputHash?: string
  recoveryPointId: string
  auditRefs: string[]
  observabilityRefs: string[]
}
```

Sprint 11 rules:

- `sideEffects` must be an empty array.
- `sideEffectClass` can only be `none` or `simulated_read`.
- `simulated_read` must not read real files, network, database, MCP, browser, environment variables, secrets, or external APIs.
- same toolId + normalized input + policyVersion + executorVersion must produce deterministic output.
- non-deterministic output must fail.
- ToolResult must not claim shell, Git, file write, PR, deploy, delete, external API, MCP, browser, database migration, or Agent continuation.

## Sprint 12 File / Git / PR Proposal Boundary

Sprint 12 may use ToolResult and its linked ToolExecutionReceipt as evidence for FileChangeProposal creation only when the ToolResult came from allowed Sprint 11 deterministic local `internal_noop` or `read_simulated` execution.

Allowed:

- reference ToolResult summary, hashes, receipt id, and sanitized data.
- reference linked ToolExecutionReceipt id, executor id, sandbox id, policy version, receipt hash, and sanitized output summary.
- create FileChangeProposal through explicit user action.
- create PatchDraft text from sanitized ToolResult content.

Disallowed:

- ToolResult must not be treated as permission to write files.
- ToolResult must not be treated as permission to run Git.
- ToolExecutionReceipt must not be treated as permission to write files, apply patches, run Git, create PRs, deploy, delete, execute ToolRuns, or complete Tasks.
- ToolResult must not create PRs, deploy, delete, or complete Tasks.
- ToolResult must not include real workspace file contents.
- ToolResult must not trigger FileChangeProposal creation automatically.
- ToolExecutionReceipt must not trigger FileChangeProposal creation automatically.

## Sprint 13 External / MCP Governance Boundary

Sprint 13 may use ToolResult and its linked ToolExecutionReceipt as sanitized evidence for ExternalActionProposal creation only.

Allowed:

- reference ToolResult summary, hashes, receipt id, and sanitized data.
- reference linked ToolExecutionReceipt id, executor id, sandbox id, policy version, receipt hash, and sanitized output summary.
- create ExternalActionProposal through explicit user action.

Disallowed:

- ToolResult must not be treated as permission to call external APIs.
- ToolResult must not be treated as permission to connect MCP.
- ToolExecutionReceipt must not be treated as permission to call external APIs, connect MCP, create webhooks, send messages, create workers or queues, execute ToolRuns, execute Agents, or complete Tasks.
- ToolResult must not include raw external API payloads, external secrets, tokens, headers, cookies, credentials, or live external system data.
- ToolResult must not trigger ExternalActionProposal creation automatically.
- ToolExecutionReceipt must not trigger ExternalActionProposal creation automatically.
## Sprint 14 Human-Gated Workflow Orchestration Boundary

ToolResult may be referenced by WorkflowProposal and WorkflowStepRecord as sanitized evidence only.

ToolResult and any linked ToolExecutionReceipt are not workflow execution tokens. Sprint 14 must not reinterpret deterministic ToolResult output as permission to execute workflow steps, continue Agents, execute ToolRuns, write files, run Git, call external APIs, connect MCP, create PRs, deploy, complete Tasks, retry, replay, rollback, or resume execution.
## Sprint 15 MVP Closure Evidence Boundary

ToolResult may be referenced by MVPReadinessRecord, DemoScenarioRecord, and GovernanceSummaryRecord as sanitized evidence only.

ToolResult must not become:

- a ToolRun execution token.
- a release token.
- a deploy token.
- a Task completion token.
- Kelvin confirmation.

Sprint 15 record creation from ToolResult must not request permission, approve execution, call execute-approved, execute ToolRun, mutate ToolResult, or mutate ToolRun.
