# Tasks: Sprint 4 - Agent Runtime

Status: proposed

## TASK-001: Agent Runtime Contracts

Priority: high

Create contracts for:

- AgentRuntime
- AgentRun
- AgentStep
- AgentResult

Acceptance criteria:

- Contracts define fields, enums, and relationships.
- Contracts explicitly state `runtimeMode = analysis_only`.
- Contracts explicitly prohibit tools, shell, Git, file changes, PRs, deploys, deletes, Memory, A2A, and external APIs.
- AgentResult.sideEffects is always empty.

## TASK-002: AgentRun State Machine

Priority: high

Define pure transition rules for AgentRun.

Required states:

- `created`
- `running`
- `completed`
- `blocked`
- `failed`
- `cancelled`

Acceptance criteria:

- Valid transitions are documented and tested.
- Invalid transitions are rejected.
- `completed` means analysis completed only.
- State transitions do not mutate Task completion automatically.

## TASK-003: Task to AgentRun Conversion

Priority: high

Define how a Harmony Task starts an Agent analysis run.

Acceptance criteria:

- Only `queued` tasks can start.
- `pending_confirmation`, `blocked`, `cancelled`, `failed`, and `completed` cannot start.
- Task must have a non-Kelvin target Agent by default.
- Task sideEffects must be empty.
- Pending ConfirmationArtifact blocks start.
- Conversion preserves a task input snapshot.

## TASK-004: Agent Prompt Design

Priority: high

Define system prompt and agent role prompt.

Acceptance criteria:

- Prompt says analysis only.
- Prompt says no tools, commands, file edits, Git, PR, deploy, delete, Memory, or external APIs.
- Prompt requires valid AgentResult JSON.
- Prompt prohibits claiming side effects happened.

## TASK-005: Persistence Boundary

Priority: high

Design minimal persistence.

Acceptance criteria:

- Add `AgentRun` and `AgentStep` only.
- Do not reuse Sprint 3 `TaskRun` as AgentRun.
- Do not add ToolCall, ToolRun, Memory, Artifact, AgentMessage, or A2ASession tables.
- TaskStep stores only AgentResult summary for Harmony visibility.

## TASK-006: Agent Runtime APIs

Priority: high

Design:

- `POST /api/agent-runtime/runs/from-task`
- `GET /api/agent-runtime/runs/:id`
- `GET /api/harmony/tasks/:id/agent-runs`
- optional `POST /api/agent-runtime/runs/:id/cancel`

Acceptance criteria:

- APIs validate Task eligibility.
- APIs return structured errors.
- APIs never execute tools, commands, file edits, PRs, deploys, deletes, Memory writes, or external APIs.
- APIs write AgentRun, AgentStep, TaskStep summary, and AuditEvent.

## TASK-007: ChatHub / Task UI

Priority: medium

Add analysis-only UI.

Acceptance criteria:

- Button text is `Run Agent Analysis`.
- UI never uses `Execute Agent`.
- Result card shows AgentResult fields.
- UI shows required safety note.
- Sprint 1 ChatHub SSE remains unchanged.

## TASK-008: Human Confirmation Boundary

Priority: high

Define confirmation behavior before and after Agent analysis.

Acceptance criteria:

- `pending_confirmation` blocks AgentRun start.
- AgentResult with `needsHumanConfirmation = true` creates or requests ConfirmationArtifact.
- Approval only permits state progression for analysis/planning.
- Approval never authorizes tool or side-effect execution.

## TASK-009: Tests and Regression

Priority: high

Add tests after implementation.

Acceptance criteria:

- AgentRun state machine tests pass.
- Task eligibility tests pass.
- AgentResult schema tests pass.
- API validation tests pass.
- Sprint 1 `/api/chat` SSE regression passes.
- Sprint 2 `/api/agent-router/route` regression passes.
- Sprint 3 Harmony Task Engine regression passes.
- `npm run lint`, `npm run test`, and `npm run build` pass.

## Sprint 4 Non-goals

Do not implement:

- Tool Runtime.
- shell commands.
- Git operations.
- file modification, creation, deletion, or patching.
- PR creation, merge, push, deploy, publish, or release.
- Memory, Obsidian, RAG, or knowledge base writes.
- A2A autonomous loop.
- multi-agent autonomous execution.
- automatic task completion.
- automatic retries that perform real work.
- external side effects or external API calls.
