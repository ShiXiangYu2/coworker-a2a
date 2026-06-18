# Contract: RouteDecision to Harmony Task

Status: proposed for Sprint 3

## Purpose

This contract defines how a Sprint 2 `RouteDecision` becomes a Sprint 3 Harmony Task.

The conversion creates traceable state and audit records only. It does not execute Agents or Tools.

## Input

```ts
RouteDecision {
  status: 'ready' | 'blocked' | 'unsupported'
  decisionType: 'chat_only' | 'create_task' | 'delegate_to_agent' | 'needs_human_confirmation' | 'unsupported'
  targetAgentId?: 'kelvin' | 'elon' | 'jobs' | 'linus' | 'turing' | 'bezos'
  confidence: number
  reason: string
  matchedSignals: string[]
  suggestedTaskTitle?: string
  requiresHumanConfirmation: boolean
  next: {
    recommendedAction: string
    reason: string
  }
  sideEffects: {
    filesChanged: string[]
    branchesCreated: string[]
    prsCreated: string[]
    issuesUpdated: string[]
  }
}
```

Additional input:

```ts
{
  idempotencyKey?: string
  conversationId?: string
  sourceMessageId?: string
  sourceMessageText: string
}
```

## Output

```ts
{
  task?: Task
  taskRun?: TaskRun
  steps: TaskStep[]
  auditEvents: AuditEvent[]
  confirmationArtifact?: ConfirmationArtifact
  skippedReason?: string
}
```

## Decision Rules

| Decision | Behavior |
| --- | --- |
| `chat_only` | Skip task creation by default. Return `skippedReason: chat_only`. |
| `delegate_to_agent` | Create Task with `queued` status, TaskRun, and route decision step. |
| `create_task` | Create Task with `queued` status, TaskRun, and route decision step. |
| `needs_human_confirmation` | Create Task with `pending_confirmation`, TaskRun with `blocked`, route decision step, human confirmation step, and ConfirmationArtifact. |
| `unsupported` | Skip executable task creation. Return `skippedReason: unsupported`. |

## Agent to Task Type Mapping

| Agent | Task type |
| --- | --- |
| `jobs` | `product` |
| `linus` | `engineering` |
| `turing` | `verification` |
| `bezos` | `customer` |
| `elon` | `coordination` |
| `kelvin` | `coordination` |
| missing target | `unsupported` |

## Initial Status Rules

| Condition | Task status |
| --- | --- |
| `requiresHumanConfirmation === true` | `pending_confirmation` |
| `decisionType === needs_human_confirmation` | `pending_confirmation` |
| `status === blocked` and confirmation is possible | `pending_confirmation` |
| `status === blocked` and no confirmation path exists | `blocked` |
| `status === unsupported` | no executable task |
| routable normal decision | `queued` |

Deterministic precedence:

1. `decisionType === unsupported` or `status === unsupported` -> skip executable task.
2. Non-empty `sideEffects` -> `pending_confirmation`.
3. `requiresHumanConfirmation === true` -> `pending_confirmation`.
4. `decisionType === needs_human_confirmation` -> `pending_confirmation`.
5. `status === blocked` -> `blocked`.
6. Routable `delegate_to_agent` or `create_task` -> `queued`.
7. `chat_only` -> skip task creation.

## Title Rules

Task title priority:

1. `routeDecision.suggestedTaskTitle`
2. compact summary of `sourceMessageText`
3. `Untitled Harmony Task`

## Side Effect Rules

Sprint 3 must not create side effects. If incoming `sideEffects` are non-empty:

- The task must not enter `queued`.
- The task must become `pending_confirmation` or `blocked`.
- A ConfirmationArtifact must be created if future continuation is possible.

## Created Records

Normal routable task:

```text
Task(status = queued)
TaskRun(status = waiting, runtimeKind = harmony_planning)
TaskStep(kind = route_decision, status = completed)
AuditEvent(task.created)
AuditEvent(task.run_created)
AuditEvent(task.step_created)
```

Confirmation task:

```text
Task(status = pending_confirmation)
TaskRun(status = blocked, runtimeKind = harmony_planning)
TaskStep(kind = route_decision, status = completed)
TaskStep(kind = human_confirmation, status = blocked)
ConfirmationArtifact(status = pending)
AuditEvent(task.created)
AuditEvent(task.confirmation_required)
```

## Safety Invariants

- Conversion must be deterministic.
- Conversion must persist a `routeDecisionSnapshot` on the Task.
- Conversion must be idempotent at API boundary when a caller supplies an idempotency key.
- Conversion must not call LLMs.
- Conversion must not execute Agents.
- Conversion must not invoke Tools.
- Conversion must not write Memory.
- Conversion must not execute shell, Git, file mutations, deploys, deletes, PRs, or external APIs.
