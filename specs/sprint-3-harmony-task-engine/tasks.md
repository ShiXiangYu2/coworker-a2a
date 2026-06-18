# Tasks: Sprint 3 - Harmony Task Engine

Status: proposed

## TASK-001: Harmony Contracts

Priority: high

Create shared contract specs and later type definitions for:

- Task
- TaskRun
- TaskStep
- AuditEvent
- ConfirmationArtifact

Acceptance criteria:

- Contracts include required fields, enums, and relationships.
- Contracts explicitly state Sprint 3 does not execute agents or tools.
- Contracts preserve `status`, `confidence`, `next`, and `sideEffects` vocabulary from Sprint 2 and auto-dev-framework.
- Task includes `routeDecisionSnapshot`, optional `idempotencyKey`, and optional `statusReason`.
- AuditEvent includes optional `correlationId`.

## TASK-002: Harmony State Machine

Priority: high

Define and later implement pure transition rules.

Required states:

- `draft`
- `pending_confirmation`
- `queued`
- `assigned`
- `blocked`
- `completed`
- `failed`
- `cancelled`

Acceptance criteria:

- Valid transitions are documented and tested.
- Invalid transitions are rejected.
- Every accepted transition creates an AuditEvent.
- `assigned` remains a placeholder and does not execute an Agent.
- Normal routable tasks start as `queued`, not `assigned`.
- `completed` is not used as proof of Agent execution.

## TASK-003: RouteDecision to Task Conversion

Priority: high

Define and later implement conversion from Sprint 2 Router output.

Acceptance criteria:

- Jobs decisions become product tasks.
- Linus decisions become engineering tasks.
- Turing decisions become verification tasks.
- Bezos decisions become customer tasks.
- Elon decisions become coordination tasks.
- Kelvin / `needs_human_confirmation` decisions become `pending_confirmation` tasks.
- `chat_only` does not create a task by default.
- `unsupported` does not enter an executable queue.
- Non-empty side effects force confirmation or blocking.
- Conversion is deterministic and does not use "or depending on reason" rules.
- Duplicate creation can be prevented with an idempotency key.

## TASK-004: Persistence Boundary

Priority: high

Design a minimal persistence model for Harmony records.

Acceptance criteria:

- Schema design covers Task, TaskRun, TaskStep, AuditEvent, and ConfirmationArtifact.
- No Agent Runtime, Tool Runtime, or Memory tables are introduced.
- Schema changes are reviewed separately before implementation.

## TASK-005: Harmony APIs

Priority: high

Design and later implement:

- `POST /api/harmony/tasks/from-route`
- `GET /api/harmony/tasks`
- `GET /api/harmony/tasks/:id`
- `POST /api/harmony/tasks/:id/cancel`
- `POST /api/harmony/confirmations/:id/approve`
- `POST /api/harmony/confirmations/:id/reject`

Acceptance criteria:

- APIs validate input.
- APIs return structured errors.
- APIs never execute agents, tools, commands, file edits, PRs, deploys, deletes, or external APIs.
- APIs write AuditEvents for state changes.

## TASK-006: ChatHub Task UI

Priority: medium

Add a lightweight task creation and status UI to ChatHub.

Acceptance criteria:

- Router card can offer `Create Harmony Task` for routable decisions.
- Task card shows title, status, target agent, confidence, reason, and next action.
- Confirmation card shows Kelvin approval boundary.
- UI explicitly states that Sprint 3 does not execute agents, tools, commands, file edits, PRs, deploys, or deletes.
- Sprint 1 SSE streaming remains unchanged.

## TASK-007: Audit Trail

Priority: high

Design append-only audit event behavior.

Acceptance criteria:

- Task creation writes `task.created`.
- Task status changes write `task.status_changed`.
- Confirmation requirement writes `task.confirmation_required`.
- Approval writes `task.confirmation_approved`.
- Rejection writes `task.confirmation_rejected`.
- Cancellation writes `task.cancelled`.
- Audit events do not store secrets, environment variables, full command output, or sensitive payloads.

## TASK-008: Confirmation Artifact

Priority: high

Design confirmation artifact creation and decision flow.

Acceptance criteria:

- High-risk RouteDecision creates a pending ConfirmationArtifact.
- Artifact includes `mustReview` and `forbiddenRuntimeActions`.
- Approval changes only task state; it does not execute side effects.
- Approval does not grant future automatic Tool Runtime permission.
- Rejection moves task to `blocked`.

## TASK-009: Tests and Regression

Priority: high

Add tests after implementation.

Acceptance criteria:

- State machine unit tests pass.
- RouteDecision to Task tests pass.
- API validation tests pass.
- Confirmation approve/reject tests pass.
- Sprint 1 ChatHub SSE regression passes.
- Sprint 2 Router regression passes.
- `npm run lint`, `npm run test`, and `npm run build` pass.

## Sprint 3 Non-goals

Do not implement:

- Agent Runtime.
- Tool Runtime.
- Memory / Obsidian / RAG.
- A2A communication.
- Multi-agent execution.
- Automatic retries that execute work.
- Filesystem writes beyond application persistence.
- Shell commands.
- Git operations.
- PR creation.
- Deploys.
- Deletes.
- External API calls.
- Production observability dashboard.
