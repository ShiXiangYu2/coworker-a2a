# Contract: AgentResult -> ToolCall Proposal

Status: proposed for Sprint 6

## Purpose

This contract defines how an analysis-only AgentResult may become one or more ToolCall proposals.

Sprint 6 mapping creates proposals only. It must not execute tools.

## Input Requirements

AgentResult may be considered for ToolCall proposal mapping when:

- `status` is `completed` or `needs_human_confirmation`.
- `confidence` is between 0 and 1.
- `sideEffects` arrays are empty.
- proposed tool intent is derived from findings, proposedChanges, next action, or explicit `toolCallCandidates`.

AgentResult must be rejected for mapping when:

- required fields are missing.
- `sideEffects` are non-empty.
- it claims tools, commands, file edits, PRs, deploys, deletes, or external APIs were already executed.
- it asks to bypass human confirmation.

## Optional AgentResult Field

Sprint 6 may extend AgentResult with:

```ts
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
```

Absent `toolCallCandidates` remains valid for Sprint 4, Sprint 5, and Sprint 6.

Sprint 6 does not require the deterministic AgentResult producer to generate tool candidates.

## Mapping Rules

1. Normalize candidate `toolName`.
2. Look up ToolDefinition in ToolRegistry.
3. If no matching tool exists, create a blocked or permission-denied ToolCall record.
4. If the tool is disabled, create a blocked or permission-denied ToolCall record.
5. Copy intent, rationale, input summary, source IDs, and risk fields.
6. Save a source AgentResult snapshot sufficient for audit.
7. Generate idempotency key from `agentRunId + toolName + normalizedInput + intent`.
8. Evaluate CommandPolicy.
9. If policy allows local record only, keep status `proposed` or create a permission record with `decision = allow_record_only`.
10. If policy requires human review, create or link ConfirmationArtifact and set `pending_confirmation`.
11. If policy denies or blocks, set `permission_denied` or `blocked`.

Policy evaluation must not directly move a ToolCall to `approved_record`.

Only explicit user / Kelvin approval may move a ToolCall to `approved_record`.

## High-risk Mapping

Candidates involving these topics must require Kelvin review or be blocked:

- shell command
- Git operation
- file write, patch, format, or delete
- PR creation, merge, or push
- deploy, release, publish
- database migration or deletion
- secrets, permissions, production configuration
- external API, MCP, browser automation
- external communication
- non-empty sideEffects

## Safety Invariants

- Mapping must not execute tools.
- Mapping must not start ToolRun execution.
- Mapping must not start AgentRun.
- Mapping must not change Task status to completed.
- Mapping must not persist ToolResult with non-empty sideEffects.
- Mapping must not create executable ToolRun records.
- Mapping may create ToolCall proposal records only.
