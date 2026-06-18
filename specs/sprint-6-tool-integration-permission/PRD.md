# PRD: Sprint 6 - Tool Integration / Permission / Command Policy

Created: 2026-06-15
Status: proposed

## Problem

Sprint 1 delivered ChatHub streaming chat. Sprint 2 delivered CEO Agent Router. Sprint 3 delivered Harmony Task Engine. Sprint 4 delivered analysis-only Agent Runtime. Sprint 5 delivered controlled Memory / Knowledge / local A2A draft records.

The system can now route work, create auditable tasks, run controlled Agent analysis, and build explicit context. It still lacks a safe way for Agents to propose tool usage without executing real-world side effects.

Sprint 6 introduces a controlled Tool Integration framework.

## Product Goal

Implement this slice:

```text
AgentResult
  -> ToolCall proposal
  -> ToolRegistry lookup
  -> Permission evaluation
  -> CommandPolicy default-deny decision
  -> Human Confirmation when required
  -> AuditEvent
  -> UI display
```

Do not implement this later slice:

```text
ToolCall approval
  -> real Tool Runtime
  -> shell / Git / file write / PR / deploy / delete
  -> external API call
  -> irreversible side effect
```

## Scope

Sprint 6 includes:

- ToolDefinition contract.
- ToolRegistry contract.
- ToolCall proposal contract.
- ToolPermission contract.
- CommandPolicy and PermissionProfile contract.
- ToolRun placeholder contract.
- ToolResult contract.
- AgentResult -> ToolCall proposal rules.
- Human confirmation boundary for tool proposals.
- ToolCall and ToolRun state machines.
- API design for proposal, query, permission evaluation, confirmation, and audit.
- ChatHub / Task UI entry design.
- Eval and acceptance criteria.

Sprint 6 does not include:

- Real Tool Runtime.
- Shell command execution.
- Git operations.
- File modification, creation, deletion, patching, or formatting.
- Pull request creation, merge, push, or review submission.
- Deploy, release, publish, or production mutation.
- Database migration or data deletion.
- External API calls.
- MCP execution.
- Browser automation.
- Queue workers or background execution.
- Automatic Agent continuation after approval.
- Automatic Task completion from tool approval.

## Product Boundaries

Tool Integration means registered tool metadata, proposal records, policy decisions, confirmation records, audit events, and UI display. It does not mean execution.

Permission must be default-deny. Unregistered, disabled, unknown, destructive, open-world, command, Git, file-write, deploy, database, PR, delete, MCP, browser, and external API tools must not execute in Sprint 6.

Human Confirmation approval means local record status progression only. Approval must not start ToolRun execution or trigger any side effect.

ToolRun is a placeholder or mock-only record in Sprint 6. It must not expose `running`, `executed`, or `side_effect_completed` semantics.

## UI Copy

Required safety note:

```text
Sprint 6 records tool proposals, permission decisions, and approvals only. It does not execute tools, shell commands, Git operations, file edits, PRs, deploys, deletes, database changes, external APIs, MCP calls, or browser automation.
```

Allowed labels:

- `Propose Tool Call`
- `Review Tool Request`
- `View Policy Decision`
- `Approve Record`
- `Reject`
- `Cancel`

Disallowed labels:

- `Execute Tool`
- `Run Command`
- `Apply File Edit`
- `Create PR`
- `Deploy`
- `Dispatch`
- `Send External Request`
- `Start Tool Runtime`

## Acceptance Criteria

- ToolRegistry can describe registered tools and disabled tools.
- ToolCall proposals can be created from valid AgentResult records.
- ToolCall proposals preserve source AgentRun / AgentResult snapshots.
- ToolPermission records explain policy decisions.
- CommandPolicy default is deny.
- Unregistered tools are rejected or blocked.
- Disabled tools are rejected or blocked.
- shell / Git / file write / PR / deploy / delete / database / external API / MCP / browser capabilities are denied or require confirmation, but never execute.
- High-risk ToolCall proposals create or reference ConfirmationArtifact.
- Kelvin approval changes local record status only.
- Approval does not create a real execution path.
- ToolResult.sideEffects must be empty.
- Non-empty sideEffects invalidate persistence or mark the record blocked.
- AuditEvent records exist for proposal, permission, confirmation, cancellation, block, and mock-only completion paths.
- `/api/chat` SSE does not regress.
- `/api/agent-router/route` does not regress.
- Sprint 3 Harmony Task Engine does not regress.
- Sprint 4 Agent Runtime does not regress.
- Sprint 5 Memory / Knowledge / local A2A draft does not regress.
- `npm run lint`, `npm run test`, and `npm run build` pass when implemented.
