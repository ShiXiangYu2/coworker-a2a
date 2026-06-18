# PRD: Sprint 3 - Harmony Task Engine

Created: 2026-06-15
Status: proposed

## Problem

Sprint 1 delivered ChatHub and SSE streaming. Sprint 2 delivered CEO Agent Router and a structured `RouteDecision`.

The system can now answer: "Who should handle this message?" It still cannot answer: "Has this production request entered the system, what state is it in, why is it blocked, and what is the next safe step?"

Sprint 3 introduces Harmony Task Engine as the minimal task/state/audit layer between Router and future Agent Runtime.

## Product Goal

Implement this slice:

```text
RouteDecision -> Task -> State -> Audit -> UI
```

Do not implement this later slice:

```text
Task -> Agent Runtime -> Tool Runtime -> Memory -> Artifacts
```

## Sources Used

- `auto-dev-framework`: Skill I/O, Loop Engineering, confirmation artifacts, command policy, audit log thinking.
- `CoWorker-A2A-Production-System.md`: Harmony / Clockless Engine role in the Agent company architecture.
- `claude-code`: distinction between work item tasks and runtime tasks, permission boundaries, Agentic Loop as future reference.

## Users

- Human Chairman / Kelvin: needs to approve or reject high-risk tasks.
- ChatHub user: needs to see task creation and status without losing normal chat.
- Future CEO / Agent Runtime: needs stable task records and audit history.

## Scope

Sprint 3 includes:

- Task, TaskRun, TaskStep, AuditEvent, and ConfirmationArtifact specs.
- `RouteDecision -> Task` conversion.
- Harmony state machine.
- API design for creating, reading, cancelling, approving, and rejecting tasks.
- ChatHub task preview and task status UI design.
- Acceptance criteria and guardrails.

Sprint 3 does not include:

- Agent execution.
- Tool execution.
- Memory / Obsidian / RAG.
- A2A runtime.
- Shell, file, Git, PR, deploy, delete, or external API actions.

## Core User Stories

1. As a user, when a product request is routed to Jobs, I can create a Harmony Task from that route decision.
2. As a user, when a high-risk request is routed to Kelvin, the system creates a `pending_confirmation` task and a confirmation artifact.
3. As Kelvin, I can approve or reject a confirmation artifact.
4. As a user, I can view a task's current status and audit trail.
5. As a developer, I can verify that Sprint 3 does not execute agents, tools, commands, file edits, PRs, deploys, or deletes.

## Data Objects

### Task

```ts
Task {
  id: string
  idempotencyKey?: string
  conversationId?: string
  sourceMessageId?: string
  sourceMessageText: string

  title: string
  description: string
  type: 'product' | 'engineering' | 'verification' | 'customer' | 'coordination' | 'chat' | 'unsupported'
  status: 'draft' | 'pending_confirmation' | 'queued' | 'assigned' | 'blocked' | 'completed' | 'failed' | 'cancelled'

  routeDecisionType: 'chat_only' | 'create_task' | 'delegate_to_agent' | 'needs_human_confirmation' | 'unsupported'
  routeStatus: 'ready' | 'blocked' | 'unsupported'
  targetAgentId?: 'kelvin' | 'elon' | 'jobs' | 'linus' | 'turing' | 'bezos'
  confidence: number
  reason: string
  statusReason?: string
  matchedSignals: string[]
  routeDecisionSnapshot: Json

  requiresHumanConfirmation: boolean
  sideEffects: {
    filesChanged: string[]
    branchesCreated: string[]
    prsCreated: string[]
    issuesUpdated: string[]
  }

  createdBy: 'user' | 'router' | 'system'
  createdAt: string
  updatedAt: string
}
```

### TaskRun

```ts
TaskRun {
  id: string
  taskId: string
  status: 'created' | 'waiting' | 'blocked' | 'completed' | 'failed' | 'cancelled'
  trigger: 'route_decision' | 'manual'
  attempt: number
  runtimeKind: 'harmony_planning'
  startedAt?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}
```

### TaskStep

```ts
TaskStep {
  id: string
  taskId: string
  taskRunId: string
  index: number
  kind: 'route_decision' | 'human_confirmation' | 'agent_assignment_placeholder' | 'final_state'
  status: 'pending' | 'blocked' | 'skipped' | 'completed' | 'failed'
  agentId?: 'kelvin' | 'elon' | 'jobs' | 'linus' | 'turing' | 'bezos'
  summary: string
  input: Json
  output?: Json
  confidence?: number
  nextRecommendedAction?: 'continue' | 'retry' | 'stop' | 'escalate' | 'show_task' | 'ask_human_confirmation'
  sideEffects: {
    filesChanged: string[]
    branchesCreated: string[]
    prsCreated: string[]
    issuesUpdated: string[]
  }
  createdAt: string
  updatedAt: string
}
```

### AuditEvent

```ts
AuditEvent {
  id: string
  correlationId?: string
  taskId?: string
  taskRunId?: string
  taskStepId?: string
  eventType:
    | 'task.created'
    | 'task.status_changed'
    | 'task.cancelled'
    | 'task.confirmation_required'
    | 'task.confirmation_approved'
    | 'task.confirmation_rejected'
    | 'task.run_created'
    | 'task.step_created'
    | 'task.step_completed'
    | 'task.blocked'
    | 'task.failed'
  actorType: 'user' | 'system' | 'router' | 'agent_placeholder'
  actorId?: string
  beforeStatus?: string
  afterStatus?: string
  reason: string
  payload?: Json
  createdAt: string
}
```

### ConfirmationArtifact

```ts
ConfirmationArtifact {
  id: string
  taskId: string
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  action: 'create_task' | 'high_risk_task' | 'future_tool_execution' | 'future_external_side_effect'
  reason: string
  requiresHumanOwner: true
  mustReview: string[]
  forbiddenRuntimeActions: string[]
  approvedBy?: string
  approvedAt?: string
  decisionReason?: string
  expiresAt?: string
  payload: Json
  createdAt: string
  updatedAt: string
}
```

## RouteDecision to Task Rules

| RouteDecision | Sprint 3 behavior |
| --- | --- |
| `chat_only` | Do not create a task by default. Keep normal ChatHub flow. |
| `delegate_to_agent` | Create a Task with `queued` status. Assignment is a later placeholder transition. |
| `create_task` | Create a Task with `queued` status. |
| `needs_human_confirmation` | Create a Task with `pending_confirmation` and a ConfirmationArtifact. |
| `unsupported` | Do not create an executable task. Optionally create an audit-only unsupported record later. |

Task type mapping:

- `jobs` -> `product`
- `linus` -> `engineering`
- `turing` -> `verification`
- `bezos` -> `customer`
- `elon` -> `coordination`
- `kelvin` -> `coordination` with `pending_confirmation`

## Harmony State Machine

```text
draft -> queued -> assigned
draft -> pending_confirmation -> queued -> assigned
draft -> blocked
pending_confirmation -> blocked
pending_confirmation -> cancelled
queued -> cancelled
queued -> blocked
assigned -> cancelled
assigned -> blocked
any -> failed
```

In Sprint 3, `assigned` means "assigned as a placeholder to a target Agent." It does not mean the Agent executed.

`completed` is reserved for a manually closed task record in Sprint 3. The system must not automatically mark a task as completed because no Agent Runtime exists yet.

## API Design

### `POST /api/harmony/tasks/from-route`

Creates a Harmony Task from a Sprint 2 RouteDecision.

### `GET /api/harmony/tasks`

Lists tasks. Filters may include `conversationId`, `status`, and `agentId`.

### `GET /api/harmony/tasks/:id`

Returns task detail, runs, steps, audit events, and confirmation artifacts.

### `POST /api/harmony/tasks/:id/cancel`

Cancels a task.

### `POST /api/harmony/confirmations/:id/approve`

Approves a confirmation artifact. In Sprint 3, approval only moves the task to `queued`; it does not execute anything.

### `POST /api/harmony/confirmations/:id/reject`

Rejects a confirmation artifact and moves the task to `blocked`.

## UI Design

ChatHub remains the primary entry point.

Add a task preview flow below the Sprint 2 Router card:

- `Create Harmony Task`
- `View Task`
- `Requires Kelvin Confirmation`

Task card fields:

- title
- status
- target agent
- confidence
- reason
- next recommended action
- safety note: `Sprint 3 does not execute agents, tools, commands, file edits, PRs, deploys, or deletes.`

## Acceptance Criteria

- A Jobs route decision can create a product task.
- A Linus route decision can create an engineering task.
- A Turing route decision can create a verification task.
- A Bezos route decision can create a customer task.
- An Elon route decision can create a coordination task.
- `chat_only` does not automatically create a task.
- `unsupported` does not enter an executable queue.
- `needs_human_confirmation` creates a `pending_confirmation` task.
- High-risk tasks create a ConfirmationArtifact.
- Approving a confirmation moves the task to `queued` only.
- Rejecting a confirmation moves the task to `blocked`.
- Cancelling a task moves it to `cancelled`.
- Normal routable tasks are initially created as `queued`, not `assigned`.
- `completed` is not used as proof of Agent execution in Sprint 3.
- Every task creation and status change writes an AuditEvent.
- `/api/chat` SSE behavior does not regress.
- `/api/agent-router/route` behavior does not regress.
- No Agent Runtime, Tool Runtime, Memory, command execution, file mutation, PR, deploy, or delete is introduced.
- `npm run lint`, `npm run test`, and `npm run build` pass when implemented.
