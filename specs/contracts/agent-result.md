# Contract: AgentResult

Status: proposed for Sprint 4

## Purpose

AgentResult is the structured output of an analysis-only AgentRun.

It captures what the Agent thinks, recommends, and flags. It does not describe executed changes.

## Schema

```ts
AgentResult {
  status: 'completed' | 'blocked' | 'needs_human_confirmation' | 'failed'
  confidence: number
  summary: string
  findings: string[]
  proposedChanges: {
    type: 'requirement' | 'design' | 'test' | 'customer_insight' | 'coordination' | 'other'
    title: string
    description: string
    riskLevel: 'low' | 'medium' | 'high'
  }[]
  next: {
    recommendedAction:
      | 'show_result'
      | 'ask_human_confirmation'
      | 'request_more_context'
      | 'handoff_to_agent'
      | 'stop'
    reason: string
    suggestedNextAgentId?: 'elon' | 'jobs' | 'linus' | 'turing' | 'bezos' | 'kelvin'
  }
  sideEffects: {
    filesChanged: []
    branchesCreated: []
    prsCreated: []
    issuesUpdated: []
  }
  needsHumanConfirmation: boolean
  safetyNotes: string[]
  memoryCandidates?: {
    title: string
    content: string
    kind:
      | 'project_decision'
      | 'agent_finding'
      | 'user_preference'
      | 'safety_rule'
      | 'workflow_note'
      | 'technical_context'
      | 'other'
    scope: 'global' | 'project' | 'task' | 'agent'
    confidence: number
    tags: string[]
    requiresHumanReview: boolean
  }[]
  a2aDraftCandidates?: {
    toAgentId: 'elon' | 'jobs' | 'linus' | 'turing' | 'bezos' | 'kelvin'
    intent:
      | 'handoff'
      | 'request_review'
      | 'request_clarification'
      | 'share_finding'
      | 'propose_next_step'
      | 'escalate_to_kelvin'
    subject: string
    body: string
    requiresHumanConfirmation: boolean
  }[]
  toolCallCandidates?: {
    toolName: string
    intent: string
    rationale: string
    input: Json
    inputSummary: string
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
    requiresHumanConfirmation: boolean
    sideEffects: string[]
  }[]
}
```

## Field Rules

`status`:

- `completed`: analysis completed successfully.
- `blocked`: Agent cannot proceed safely.
- `needs_human_confirmation`: result requires Kelvin / Human Owner review.
- `failed`: runtime failed to produce a valid result.

`confidence`:

- number from 0 to 1.
- below 0.5 should normally recommend more context or human review.

`proposedChanges`:

- suggestions only.
- must not be worded as completed file, Git, deploy, PR, or external actions.

`sideEffects`:

- must always contain empty arrays.
- non-empty arrays invalidate the result in Sprint 4.

`needsHumanConfirmation`:

- true when proposed work touches risk areas such as deletion, deploy, secrets, permissions, production, migrations, external messages, or future side effects.

`memoryCandidates`:

- optional in Sprint 5.
- absent `memoryCandidates` remains valid for Sprint 4 and Sprint 5.
- Sprint 5 does not require the AgentResult producer to generate memory candidates.
- candidates only, never approved MemoryEntry records.
- must be derived from analysis, findings, safety notes, or stable decisions.
- must preserve human review boundaries before becoming approved memory.
- must be persisted only through an explicit MemoryEntry candidate API or user action.
- must not be automatically persisted when AgentRun reaches `completed`.

`a2aDraftCandidates`:

- optional in Sprint 5.
- absent `a2aDraftCandidates` remains valid for Sprint 4 and Sprint 5.
- Sprint 5 does not require the AgentResult producer to generate A2A draft candidates.
- local draft candidates only.
- must not be interpreted as sent messages.
- must not start target Agents or autonomous loops.
- must be persisted only through an explicit A2AMessage draft API or user action.
- must not be automatically persisted when AgentRun reaches `completed`.

`toolCallCandidates`:

- optional in Sprint 6.
- absent `toolCallCandidates` remains valid for Sprint 4, Sprint 5, and Sprint 6.
- Sprint 6 does not require the AgentResult producer to generate tool candidates.
- candidates only, never approved or executed ToolCall records.
- must preserve the Sprint 6 default-deny and human confirmation boundaries.
- must be persisted only through an explicit ToolCall proposal API or user action.
- must not be automatically persisted when AgentRun reaches `completed`.
- must not imply that a tool was executed.
- `sideEffects` must be empty for low-risk proposal flows; non-empty values require confirmation or blocking.

## Prohibited Claims

AgentResult must not say:

- files were changed
- commands were run
- a branch was created
- a PR was created
- code was deployed
- memory was written
- an external API was called
- a task was fully completed by tools
- an A2A message was sent
- another Agent was started from a message
- a tool was executed
- a command was run
- a file edit was applied
- an external request was sent

## Safety Notes

Every valid result should include a safety note equivalent to:

```text
Sprint 4 only produced structured analysis. No tools, commands, file edits, PRs, deploys, deletes, or memory writes were executed.
```

## Validation Requirements

Implementations must reject AgentResult when:

- required fields are missing.
- confidence is outside 0 to 1.
- sideEffects contains any non-empty array.
- proposedChanges claim executed side effects.
- result asks to execute tools directly.
- result claims Task completion from tool work.
- memoryCandidates claim external side effects.
- a2aDraftCandidates claim messages were sent or target Agents started.
- toolCallCandidates claim tools were executed.
- toolCallCandidates claim shell, Git, file, PR, deploy, delete, database, external API, MCP, or browser actions already happened.

## Sprint 5 Candidate Boundary

AgentResult may propose MemoryEntry candidates and local A2AMessage draft candidates.

It must not directly:

- approve MemoryEntry
- approve KnowledgeItem
- persist MemoryEntry
- persist A2AMessage
- send A2AMessage
- dispatch A2AMessage
- queue A2AMessage
- start another AgentRun
- call external APIs
- sync external knowledge
- execute tools or side effects

Sprint 5 candidate persistence must happen through explicit APIs or user operations after AgentResult validation.

## Sprint 6 Tool Proposal Boundary

AgentResult may propose ToolCall candidates.

It must not directly:

- approve ToolCall
- create approved ToolCall records
- execute Tool Runtime
- start ToolRun execution
- call shell, Git, file, PR, deploy, delete, database, external API, MCP, or browser capabilities
- continue AgentRun after tool approval
- mark Task completed

Sprint 6 ToolCall persistence must happen through explicit APIs or user operations after AgentResult validation and policy evaluation.

## Sprint 7 Eval Boundary

AgentResult may be evaluated by Sprint 7 Eval / Verification / Quality Gate.

Allowed:

- AgentResult may be referenced by EvalTarget.
- AgentResult may be checked for schema validity, confidence, sideEffects, proposedChanges, memoryCandidates, a2aDraftCandidates, and toolCallCandidates.
- Eval may produce EvalCheck, EvalFinding, and QualityGateDecision records.

Disallowed:

- Eval must not mutate AgentResult.
- Eval must not create ToolCall records automatically from AgentResult.
- Eval must not approve MemoryEntry, KnowledgeItem, A2AMessage, or ToolCall records.
- Eval must not start AgentRun continuation.
- Eval must not mark Task completed.
- Eval must not execute tools, shell, Git, file writes, PRs, deploys, deletes, external APIs, MCP, browser automation, or A2A sends.

## Sprint 12 File / Git / PR Proposal Boundary

AgentResult may propose FileChangeProposal candidates in Sprint 12.

Allowed:

- recommend a future file change as local proposal text.
- reference proposed target paths as metadata only.
- include user-provided snippets or sanitized context snapshots.
- link proposed changes to FileChangeProposal records through explicit user action.

Disallowed:

- AgentResult must not read real workspace files.
- AgentResult must not claim files were written, patched, formatted, deleted, committed, pushed, merged, or deployed.
- AgentResult must not create FileChangeProposal automatically when AgentRun completes.
- AgentResult must not apply PatchDraft.
- AgentResult must not run shell or Git.
- AgentResult must not create PRs.
- AgentResult must not complete Tasks from proposal work.

## Sprint 13 External / MCP Governance Boundary

AgentResult may propose ExternalActionProposal candidates in Sprint 13.

Allowed:

- recommend a future external integration action as local proposal text.
- reference sanitized endpoint metadata as display-only evidence.
- reference user-provided external schema snippets or sanitized context snapshots.
- link recommendations to ExternalActionProposal records through explicit user action.

Disallowed:

- AgentResult must not call external APIs.
- AgentResult must not connect MCP.
- AgentResult must not send network requests, messages, webhooks, emails, or notifications.
- AgentResult must not create webhooks, workers, queues, or background jobs.
- AgentResult must not read external system data or fetch external schemas.
- AgentResult must not write external systems.
- AgentResult must not create ExternalActionProposal automatically when AgentRun completes.
- AgentResult must not execute ToolRuns or complete Tasks from governance proposal work.
## Sprint 14 Human-Gated Workflow Orchestration Boundary

AgentResult may be referenced by WorkflowProposal and WorkflowStepRecord as sanitized evidence only.

AgentResult must not be treated as permission to execute a workflow, execute a workflow step, continue an AgentRun, execute a ToolRun, write files, run Git, call external APIs, connect MCP, create PRs, deploy, complete Tasks, retry, replay, rollback, or resume execution.
## Sprint 15 MVP Closure Evidence Boundary

AgentResult may be referenced by MVPReadinessRecord, DemoScenarioRecord, and GovernanceSummaryRecord as sanitized evidence only.

AgentResult must not become:

- an execution token.
- a release token.
- a deploy token.
- a Task completion token.
- Kelvin confirmation.

Sprint 15 record creation from AgentResult must not continue AgentRun, resume AgentRun, create a new Agent execution, mutate AgentResult, or mutate AgentRun.
