# Plan: Sprint 3 - Harmony Task Engine

Status: proposed

## Architecture Decision

Sprint 3 adds the smallest useful Harmony layer:

```text
ChatHub message
  -> CEO Router
  -> RouteDecision
  -> Harmony Task
  -> State Machine
  -> Audit Events
  -> ChatHub / Task UI
```

It stops before:

```text
Task
  -> Agent Runtime
  -> Tool Runtime
  -> Memory
  -> External side effects
```

This keeps the sprint focused on state, auditability, and recoverability.

## Source Mapping

| Source | Sprint 3 use |
| --- | --- |
| `auto-dev-framework/docs/contracts/skill-io.md` | Shape of structured outputs: `status`, `confidence`, `next`, `sideEffects`. |
| `auto-dev-framework/docs/contracts/confirmation-artifact.md` | Human confirmation object and resume boundary. |
| `auto-dev-framework/docs/contracts/command-policy.json` | Default-deny safety posture; no tool execution in Sprint 3. |
| `auto-dev-framework/docs/workflows/loop-engineering.md` | Loop state, retry/escalate vocabulary, audit-first runtime. |
| `CoWorker-A2A-Production-System.md` | Harmony as the task/state manager under CEO Agent. |
| `claude-code` docs | Work item task vs runtime task distinction; permission and recovery ideas for future sprints. |

## Module Design

Planned modules for implementation:

| Module | Responsibility |
| --- | --- |
| Harmony types | Shared Task, TaskRun, TaskStep, AuditEvent, ConfirmationArtifact types. |
| Harmony state machine | Pure transition rules and validation. |
| Route-to-task converter | Converts Sprint 2 `RouteDecision` into a Task draft. |
| Harmony repository | Persistence boundary for tasks, runs, steps, audits, confirmations. |
| Harmony API | Task creation, list, detail, cancel, approve, reject. |
| ChatHub task UI | Create/view task and confirmation cards. |
| Tests | State machine, route conversion, API validation, regression checks. |

## Data Boundary

Sprint 3 may introduce database schema for task records. It must not introduce:

- Agent execution tables that imply active runtime.
- Tool execution tables.
- Memory tables.
- External integration tables.

If implemented with Prisma, schema changes must be narrow and reviewed separately.

`TaskRun` in Sprint 3 is a Harmony planning run placeholder. It is not an Agent Runtime run and must not start an Agent, Tool, shell command, Memory write, or external integration.

## State Machine

The state machine is a pure function:

```text
transitionTask(currentStatus, event) -> nextStatus | error
```

Allowed events:

- `CREATE_FROM_ROUTE`
- `REQUIRE_CONFIRMATION`
- `APPROVE_CONFIRMATION`
- `REJECT_CONFIRMATION`
- `QUEUE`
- `ASSIGN_PLACEHOLDER`
- `MARK_COMPLETED`
- `BLOCK`
- `CANCEL`
- `FAIL`

Sprint 3 expected transitions:

```text
CREATE_FROM_ROUTE -> draft
draft -> queued
draft -> pending_confirmation
draft -> blocked
pending_confirmation -> queued
pending_confirmation -> blocked
pending_confirmation -> cancelled
queued -> assigned
queued -> blocked
queued -> cancelled
assigned -> blocked
assigned -> cancelled
any -> failed
```

Implementation must reject invalid transitions and write an AuditEvent for every accepted transition.

`completed` is reserved for a future or manually closed record state. Sprint 3 implementation should not automatically mark tasks as completed because no Agent Runtime exists.

## RouteDecision to Task Flow

```text
POST /api/harmony/tasks/from-route
  -> validate message and routeDecision
  -> apply idempotency key if provided
  -> convert routeDecision to task draft
  -> create Task
  -> create TaskRun(runtimeKind = harmony_planning)
  -> create initial TaskStep(kind = route_decision)
  -> if confirmation needed, create ConfirmationArtifact and TaskStep(kind = human_confirmation)
  -> write AuditEvents
  -> return task bundle
```

## Human Confirmation Flow

High-risk route:

```text
needs_human_confirmation
  -> Task.status = pending_confirmation
  -> ConfirmationArtifact.status = pending
  -> AuditEvent(task.confirmation_required)
```

Approval:

```text
approve
  -> ConfirmationArtifact.status = approved
  -> Task.status = queued
  -> AuditEvent(task.confirmation_approved)
```

Rejection:

```text
reject
  -> ConfirmationArtifact.status = rejected
  -> Task.status = blocked
  -> AuditEvent(task.confirmation_rejected)
```

Approval does not execute the task in Sprint 3.
Approval also does not authorize any future Tool Runtime to execute automatically. It only moves the current Harmony task record from `pending_confirmation` to `queued`.

## API Plan

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/harmony/tasks/from-route` | POST | Create a task from a RouteDecision. |
| `/api/harmony/tasks` | GET | List tasks. |
| `/api/harmony/tasks/:id` | GET | Read task bundle. |
| `/api/harmony/tasks/:id/cancel` | POST | Cancel a task. |
| `/api/harmony/confirmations/:id/approve` | POST | Approve confirmation. |
| `/api/harmony/confirmations/:id/reject` | POST | Reject confirmation. |

## UI Plan

Add to ChatHub:

- Router card remains unchanged as a preview.
- For routable decisions, show `Create Harmony Task`.
- After creation, show a Task card.
- For `pending_confirmation`, show a Kelvin confirmation card.
- Show explicit safety copy: no agent/tool/command/file/PR/deploy/delete execution.

Optional lightweight task list:

- Current conversation tasks.
- Filter by status.
- Open task detail panel.

No Kanban dashboard in Sprint 3.

## Test Plan

Unit tests:

- State machine valid transitions.
- State machine invalid transitions.
- RouteDecision to Task mapping.
- Confirmation approve/reject transitions.
- Empty side effects invariant.
- Idempotency behavior for duplicate task creation requests.

API tests:

- Create task from Jobs route.
- Create pending confirmation task from Kelvin route.
- Reject chat-only auto creation by default.
- Cancel task.
- Approve confirmation.
- Reject confirmation.

Regression:

- Sprint 1 `/api/chat` SSE still works.
- Sprint 2 `/api/agent-router/route` still works.
- Router failure remains non-blocking.

Safety tests:

- No command execution.
- No file mutation.
- No Tool Runtime import.
- No Agent Runtime execution.
- Confirmation approval does not execute side effects.

## Delivery Order

1. Add specs and contracts.
2. Design schema in a separate reviewed change.
3. Add type definitions and pure state machine.
4. Add route-to-task converter.
5. Add repository and API routes.
6. Add ChatHub task UI.
7. Add tests and README update.

## Acceptance Gate

Sprint 3 can be marked complete only when:

- Task creation from RouteDecision works.
- State transitions are validated.
- Audit events are written for creation and status changes.
- Confirmation artifacts are created and can be approved/rejected.
- ChatHub displays task status without breaking streaming chat.
- No Agent Runtime, Tool Runtime, Memory, command execution, file mutation, PR, deploy, or delete is introduced.
- `npm run lint`, `npm run test`, and `npm run build` pass.
