# Tasks: Sprint 6 - Tool Integration / Permission / Command Policy

Status: proposed

## TASK-001: ToolDefinition and ToolRegistry Contracts

Priority: high

Create the ToolDefinition and ToolRegistry contracts.

Acceptance criteria:

- Defines tool identity, category, schema, risk, safety flags, enabled status, and Sprint 6 mode.
- ToolRegistry defaults to `default_deny`.
- Unregistered and disabled tools cannot produce executable behavior.
- ToolRegistry supports future Tool Runtime without introducing execution in Sprint 6.

## TASK-002: ToolCall Contract

Priority: high

Create the ToolCall proposal contract.

Acceptance criteria:

- Captures source AgentResult / AgentRun / Task metadata.
- Captures tool intent, rationale, input snapshot, risk, side effects, and status.
- Captures compact `sourceSnapshot` and `policyInputSnapshot` for audit.
- Supports idempotency and correlation IDs.
- Does not represent executed work.

## TASK-003: ToolPermission and CommandPolicy Contracts

Priority: high

Create ToolPermission, CommandPolicy, and PermissionProfile contracts.

Acceptance criteria:

- Default decision is deny.
- shell, Git, file write, PR, deploy, delete, database migration, external API, MCP, and browser automation are denied in Sprint 6.
- Permission records include matched and denied policy rules.
- Permission records include input validation status and sanitized schema validation errors.
- `read` category remains proposal-only or mock-only and cannot read files, network, MCP, browser, or external APIs in Sprint 6.
- Approval cannot bypass CommandPolicy into execution.

## TASK-004: ToolRun and ToolResult Contracts

Priority: high

Create placeholder ToolRun and ToolResult contracts.

Acceptance criteria:

- ToolRun supports only non-execution statuses such as `not_started`, `blocked`, `cancelled`, `skipped`, `mock_completed`, and `failed_validation`.
- ToolRun does not include `running`, `executed`, or `side_effect_completed`.
- Sprint 6 implementations must not write `ToolRun.startedAt`.
- `mock_only` means deterministic local mock only and cannot access filesystem, network, shell, Git, MCP, browser, or external APIs.
- ToolResult includes status, confidence, summary, data, next, warnings, and empty sideEffects.
- Non-empty ToolResult.sideEffects is invalid.

## TASK-005: AgentResult to ToolCall Proposal Rules

Priority: high

Define how AgentResult can propose tool usage.

Acceptance criteria:

- AgentResult can create ToolCall proposals only.
- AgentResult must not directly approve, execute, or start tools.
- AgentResult with non-empty sideEffects cannot create executable records.
- High-risk proposals require Kelvin / human review.
- Unknown or disabled tools become blocked or denied records.

## TASK-006: Tool Runtime State Machine

Priority: high

Create ToolCall and ToolRun state machine contracts.

Acceptance criteria:

- Legal transitions are explicit.
- Illegal execution-like transitions are rejected.
- Approval moves ToolCall to local approved record only.
- Policy evaluation cannot directly move ToolCall to `approved_record`.
- ToolRun cannot enter execution states.

## TASK-007: Human Confirmation Boundary

Priority: high

Extend ConfirmationArtifact for tool proposal review.

Acceptance criteria:

- `resourceType = tool_call` is supported.
- Approval changes local ToolCall status only.
- Approval does not execute shell, Git, file write, PR, deploy, delete, database changes, external APIs, MCP, or browser automation.
- ToolCall approval writes `tool.approved_record`, rejection writes `tool.rejected`, and cancellation writes `tool.cancelled`.
- ToolCall approval does not create executable ToolRun.
- Rejection and cancellation are auditable.

## TASK-008: API Design

Priority: medium

Design APIs for tool registry, tool calls, permissions, confirmations, and query flows.

Acceptance criteria:

- APIs cover local proposal and review flows.
- APIs use structured responses and errors.
- APIs support idempotency.
- ToolCall detail includes latest ToolPermission or provides `GET /api/tool-calls/:id/permission`.
- `POST /api/tool-calls/:id/evaluate-permission` is idempotent.
- all mutation APIs return `auditEvents`.
- APIs do not expose execute, run, dispatch, file write, Git, deploy, or external request endpoints.
- no tool API route path contains `execute`, `run`, `dispatch`, or `start` for execution semantics.

## TASK-009: ChatHub / Task UI

Priority: medium

Design UI entry points.

Acceptance criteria:

- AgentResult card supports `Propose Tool Call`.
- Task card shows linked ToolCall records.
- Kelvin review UI displays policy decision and risk.
- UI shows the required Sprint 6 safety note.
- UI never says `Execute Tool`, `Run Command`, `Apply File Edit`, `Create PR`, `Deploy`, `Dispatch`, `Send External Request`, or `Start Tool Runtime`.

## TASK-010: Tests and Regression

Priority: high

Plan tests after implementation.

Acceptance criteria:

- ToolCall state machine tests pass.
- ToolRun state machine tests pass.
- CommandPolicy default-deny tests pass.
- AgentResult -> ToolCall proposal tests pass.
- ToolResult.sideEffects non-empty rejection tests pass.
- Confirmation approval does not execute tool tests pass.
- approval does not create executable ToolRun tests pass.
- read tools do not read files, network, MCP, browser, or external APIs in Sprint 6 tests pass.
- no API route path contains execute/run/dispatch/start for tool execution semantics tests pass.
- forbidden imports and forbidden side-effect path tests pass.
- Sprint 1 `/api/chat` SSE regression passes.
- Sprint 2 `/api/agent-router/route` regression passes.
- Sprint 3 Harmony Task Engine regression passes.
- Sprint 4 Agent Runtime regression passes.
- Sprint 5 Memory / Knowledge / local A2A regression passes.

## Sprint 6 Non-goals

Do not implement:

- real Tool Runtime
- shell commands
- Git operations
- file modification, creation, deletion, patching, or formatting
- PR creation, merge, push, or review submission
- deploy, release, publish, or production mutation
- database migration or data deletion
- external API calls
- MCP execution
- browser automation
- queue workers or background execution
- automatic Agent continuation after approval
- automatic Task completion from tool approval
- Sprint 7 Eval / Verification work
