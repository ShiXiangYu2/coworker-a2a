# Contract: Agent Runtime State Machine

Status: proposed for Sprint 4

## Purpose

This contract defines AgentRun states and transitions for analysis-only Agent Runtime.

State transitions track analysis lifecycle only. They do not execute tools or external side effects.

## AgentRun States

| State | Meaning |
| --- | --- |
| `created` | AgentRun record exists and is ready to start analysis. |
| `running` | Agent analysis is in progress. |
| `completed` | Structured AgentResult was produced and validated. |
| `blocked` | AgentRun cannot continue safely, often due to human confirmation or invalid context. |
| `failed` | Runtime failed unexpectedly. |
| `cancelled` | User or system cancelled the run. |

## Events

| Event | Description |
| --- | --- |
| `CREATE_FROM_TASK` | Create an AgentRun from eligible Harmony Task. |
| `START_ANALYSIS` | Start analysis-only run. |
| `COMPLETE_WITH_RESULT` | Persist valid AgentResult and complete AgentRun. |
| `REQUIRE_CONFIRMATION` | Block run and request human confirmation. |
| `BLOCK` | Block run without confirmation flow. |
| `FAIL` | Mark run failed due to runtime error. |
| `CANCEL` | Cancel run. |

## Allowed Transitions

| From | Event | To |
| --- | --- | --- |
| none | `CREATE_FROM_TASK` | `created` |
| `created` | `START_ANALYSIS` | `running` |
| `created` | `BLOCK` | `blocked` |
| `created` | `CANCEL` | `cancelled` |
| `running` | `COMPLETE_WITH_RESULT` | `completed` |
| `running` | `REQUIRE_CONFIRMATION` | `blocked` |
| `running` | `BLOCK` | `blocked` |
| `running` | `FAIL` | `failed` |
| `running` | `CANCEL` | `cancelled` |
| `created` | `FAIL` | `failed` |
| `blocked` | `FAIL` | `failed` |

## Invalid Transitions

Implementations must reject invalid transitions, including:

- `completed -> running`
- `cancelled -> running`
- `failed -> running`
- `blocked -> running` without a future explicit recovery event
- `completed -> completed`
- `completed -> cancelled`

## Harmony Task Interaction

AgentRun start may write:

```text
Task.status: queued -> assigned
```

`assigned` means assigned to analysis-only Agent Runtime.

AgentRun completion must not automatically set:

```text
Task.status = completed
```

## Audit Requirement

Every accepted transition must write an AuditEvent.

Recommended event types:

- `agent.run_created`
- `agent.run_started`
- `agent.run_completed`
- `agent.run_blocked`
- `agent.run_failed`
- `agent.run_cancelled`

If the current AuditEvent enum is not extended in implementation, these can be stored as payload event names under existing task audit records, but Sprint 4 specs recommend extending the event type list.

## Safety Invariants

- `completed` means analysis completed only.
- no transition starts Tool Runtime.
- no transition executes shell, Git, file mutation, PR, deploy, delete, Memory write, A2A loop, or external API.
- approval after confirmation does not execute AgentResult.proposedChanges.
