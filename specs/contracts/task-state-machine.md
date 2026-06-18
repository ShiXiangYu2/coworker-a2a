# Contract: Harmony Task State Machine

Status: proposed for Sprint 3

## Purpose

This contract defines the allowed Task states and transitions for Harmony Task Engine.

Sprint 3 state transitions track planning and approval only. They do not execute agents, tools, commands, file edits, PRs, deploys, deletes, or external APIs.

## Task States

| State | Meaning |
| --- | --- |
| `draft` | Task object is being created or validated. |
| `pending_confirmation` | Task is blocked on Kelvin / Human Owner approval. |
| `queued` | Task is accepted into Harmony but no runtime execution happens in Sprint 3. |
| `assigned` | Task is assigned to a target Agent as a placeholder only. |
| `blocked` | Task cannot safely continue. |
| `completed` | Reserved for a manually closed record. Sprint 3 must not use this as proof of Agent execution. |
| `failed` | System failed to process the task. |
| `cancelled` | User or system cancelled the task. |

## Events

| Event | Description |
| --- | --- |
| `CREATE_FROM_ROUTE` | Create a draft task from RouteDecision. |
| `REQUIRE_CONFIRMATION` | Move task to human confirmation. |
| `APPROVE_CONFIRMATION` | Approve confirmation and allow queueing. |
| `REJECT_CONFIRMATION` | Reject confirmation and block task. |
| `REQUEST_CONFIRMATION_FROM_ANALYSIS` | Sprint 4: analysis-only AgentRun requires human confirmation. |
| `QUEUE` | Put task into Harmony queue. |
| `ASSIGN_PLACEHOLDER` | Assign target Agent placeholder. |
| `MARK_COMPLETED` | Reserved/manual close event. Do not use for automatic Sprint 3 flow. |
| `BLOCK` | Mark task as blocked. |
| `CANCEL` | Cancel task. |
| `FAIL` | Mark task as failed due to system error. |

## Allowed Transitions

| From | Event | To |
| --- | --- | --- |
| none | `CREATE_FROM_ROUTE` | `draft` |
| `draft` | `QUEUE` | `queued` |
| `draft` | `REQUIRE_CONFIRMATION` | `pending_confirmation` |
| `draft` | `BLOCK` | `blocked` |
| `pending_confirmation` | `APPROVE_CONFIRMATION` | `queued` |
| `pending_confirmation` | `REJECT_CONFIRMATION` | `blocked` |
| `pending_confirmation` | `CANCEL` | `cancelled` |
| `queued` | `ASSIGN_PLACEHOLDER` | `assigned` |
| `queued` | `BLOCK` | `blocked` |
| `queued` | `CANCEL` | `cancelled` |
| `assigned` | `BLOCK` | `blocked` |
| `assigned` | `CANCEL` | `cancelled` |
| `assigned` | `REQUEST_CONFIRMATION_FROM_ANALYSIS` | `pending_confirmation` |
| `assigned` | `MARK_COMPLETED` | `completed` |
| `draft` | `FAIL` | `failed` |
| `pending_confirmation` | `FAIL` | `failed` |
| `queued` | `FAIL` | `failed` |
| `assigned` | `FAIL` | `failed` |
| `blocked` | `FAIL` | `failed` |

## Invalid Transitions

Implementations must reject invalid transitions, including:

- `completed -> assigned`
- `cancelled -> queued`
- `blocked -> queued` without a new explicit future recovery event
- `pending_confirmation -> assigned`
- `queued -> completed` without passing through `assigned`
- automatic `assigned -> completed` without explicit manual close semantics
- `assigned -> completed` as a result of AgentRun completion

## Audit Requirement

Every accepted transition must create an append-only AuditEvent:

```json
{
  "eventType": "task.status_changed",
  "beforeStatus": "queued",
  "afterStatus": "assigned",
  "reason": "Assigned to target Agent placeholder. Sprint 3 does not execute agents."
}
```

Rejected transitions should return a structured error. They may create a diagnostic audit event only if useful, but must not mutate the task status.

## Safety Invariants

- In Sprint 3, `assigned` is a placeholder only.
- In Sprint 4, `assigned` means assigned to analysis-only Agent Runtime. It still does not imply tool execution.
- `completed` must not be presented as Agent execution completion in Sprint 3.
- AgentRun completion must not automatically move Task to `completed`.
- `APPROVE_CONFIRMATION` never executes side effects.
- `sideEffects` must remain empty in Sprint 3.
- No transition is allowed to invoke Agent Runtime, Tool Runtime, Memory, shell, filesystem mutation, Git, deploy, delete, or external APIs.

## Sprint 4 Extension

Sprint 4 starts an AgentRun only from `queued` tasks and must move the Task through:

```text
queued -> assigned
```

In this context, `assigned` means the Task is assigned to an analysis-only AgentRun. It does not mean that an Agent executed tools, commands, file edits, PRs, deploys, deletes, Memory writes, or external APIs.

If AgentResult returns `needs_human_confirmation`, Sprint 4 may move:

```text
assigned -> pending_confirmation
```

using `REQUEST_CONFIRMATION_FROM_ANALYSIS`.

AgentRun completion must leave the Task in `assigned` unless a separate future manual close or recovery event is introduced.

## Sprint 8 Observability / Recovery / Resume Boundary

Sprint 8 may create ObservabilityEvent, RunJournal, RecoveryPoint, ResumeToken, and FailureClassification records that reference Tasks.

These records must not introduce new Task transitions in Sprint 8.

Specifically:

- RecoveryPoint creation must not change Task status.
- ResumeToken creation or use must not change Task status.
- AuditLogQuery and timeline views must not change Task status.
- FailureClassification must not change Task status.
- ResumeToken use must not trigger `ASSIGN_PLACEHOLDER`, `MARK_COMPLETED`, `BLOCK`, `CANCEL`, `FAIL`, or any future execution event.

Sprint 8 resume is view-only and must not be presented as Task execution recovery.
## Sprint 18 Department Agent Profile Boundary

Sprint 18 DepartmentProfile, DepartmentAgentRole, DepartmentResponsibilityMatrix, DepartmentEscalationPolicy, DepartmentPermissionBoundary, and DepartmentReviewRecord records may reference this contract only as sanitized local evidence or read-only governance context.

Sprint 18 department records must not be consumed as execution, routing, runtime permission, release, deploy, external access, MCP access, PR creation, task completion, retry, replay, rollback, restore, resume, or future approval tokens.

Kelvin approval in Sprint 18 approves only one local department record. It must not execute Agent, continue Agent, execute ToolRun, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, or approve future department behavior.

## Sprint 20 Human-Gated Execution Boundary

Sprint 20 ExecutionIntentRecord, ExecutionPlanRecord, ExecutionGateRecord, ExecutionApprovalRecord, and ExecutionReceiptRecord may reference Task records only as sanitized evidence or local review context.

Sprint 20 execution records must not mutate Task state, auto-route Task, assign Agent, mark Task completed, or become task completion tokens.

Kelvin approval in Sprint 20 approves only one local execution record. It must not execute Agent, continue Agent, execute ToolRun, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, retry, replay, rollback, restore, resume execution, or approve future execution behavior.


## Sprint 21 Department Assignment Boundary

Sprint 21 DepartmentTaskIntakeRecord, DepartmentAssignmentProposal, DepartmentRoleFitReview, DepartmentAssignmentApprovalRecord, and DepartmentAssignmentAuditRecord may reference this contract only as sanitized evidence or local review context.

Sprint 21 assignment records must not be consumed as execution tokens, routing tokens, runtime assignment tokens, runtime permission grants, release tokens, deploy tokens, Task completion tokens, retry/replay/rollback/restore tokens, resume execution tokens, or future approval tokens.

Kelvin approval in Sprint 21 approves only one local assignment record. It must not execute Agent, continue Agent, auto-route Task, assign Agent at runtime, start AgentRun, execute ToolRun, request or approve runtime permission, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, retry, replay, rollback, restore, resume execution, or approve future assignment behavior.
