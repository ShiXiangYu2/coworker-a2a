# Contract: Harmony Task to AgentRun

Status: proposed for Sprint 4

## Purpose

This contract defines how a Sprint 3 Harmony Task becomes a Sprint 4 analysis-only AgentRun.

The conversion creates Agent runtime records and audit records only. It does not execute tools or side effects.

## Input

```ts
{
  taskId: string
  idempotencyKey?: string
  trigger: 'manual' | 'task_ui' | 'api'
}
```

Loaded Task must include:

- id
- status
- title
- description
- targetAgentId
- sourceMessageText
- routeDecisionSnapshot
- requiresHumanConfirmation
- sideEffects
- confirmation artifacts
- audit summary

## Eligibility Rules

Allowed:

| Task status | Behavior |
| --- | --- |
| `queued` | May start analysis-only AgentRun. |

Blocked:

| Task status | Behavior |
| --- | --- |
| `draft` | Reject. |
| `pending_confirmation` | Reject until human confirmation is resolved. |
| `blocked` | Reject. |
| `completed` | Reject. |
| `failed` | Reject. |
| `cancelled` | Reject. |

Additional blockers:

- missing `targetAgentId`
- `targetAgentId = kelvin` unless explicitly starting owner review
- non-empty Task sideEffects
- pending ConfirmationArtifact
- `routeDecisionType = chat_only`
- `routeDecisionType = unsupported`

## Conversion Output

```ts
{
  agentRun: AgentRun
  agentSteps: AgentStep[]
  harmonyTaskStep: TaskStep
  auditEvents: AuditEvent[]
}
```

## Created Records

On start:

```text
AgentRun(status = created, runtimeMode = analysis_only)
Task.status = assigned
AgentStep(kind = load_task_context, status = completed)
AuditEvent(eventType = agent.run_created)
AuditEvent(eventType = task.status_changed)
```

During analysis:

```text
AgentRun(status = running)
AgentStep(kind = build_agent_prompt)
AgentStep(kind = llm_analysis)
AgentStep(kind = validate_agent_result)
```

On valid result:

```text
AgentRun(status = completed)
AgentStep(kind = write_task_step, status = completed)
Harmony TaskStep(kind = agent_runtime_analysis, status = completed)
AuditEvent(eventType = agent.run_completed)
AuditEvent(eventType = task.step_created)
```

If result needs human confirmation:

```text
AgentRun(status = blocked)
ConfirmationArtifact(status = pending)
Task.status = pending_confirmation
Task transition = REQUEST_CONFIRMATION_FROM_ANALYSIS
AuditEvent(eventType = task.confirmation_required)
```

Approval still does not execute tools or side effects.

## Task Status Rules

Starting analysis must move:

```text
queued -> assigned
```

In Sprint 4, `assigned` means assigned to analysis-only Agent Runtime.

AgentRun completion must not automatically move Task to `completed`.

AgentResult with `needsHumanConfirmation = true` must move:

```text
assigned -> pending_confirmation
```

using `REQUEST_CONFIRMATION_FROM_ANALYSIS`.

Approval after that confirmation may move the Task back to `queued` only. It still does not execute tools or side effects.

## Idempotency

If `idempotencyKey` is supplied, duplicate requests should return the existing AgentRun bundle instead of creating another run.

## Safety Invariants

- Conversion must not call tools.
- Conversion must not execute shell, Git, file mutations, deploys, deletes, PRs, Memory writes, A2A loops, or external APIs.
- Conversion must preserve inputSnapshot for audit.
- Conversion must validate AgentResult.sideEffects is empty before persistence.
- AgentResult with non-empty sideEffects must be rejected before persistence.
- AgentRun.completed must not change Task.status to completed.
## Sprint 18 Department Agent Profile Boundary

Sprint 18 DepartmentProfile, DepartmentAgentRole, DepartmentResponsibilityMatrix, DepartmentEscalationPolicy, DepartmentPermissionBoundary, and DepartmentReviewRecord records may reference this contract only as sanitized local evidence or read-only governance context.

Sprint 18 department records must not be consumed as execution, routing, runtime permission, release, deploy, external access, MCP access, PR creation, task completion, retry, replay, rollback, restore, resume, or future approval tokens.

Kelvin approval in Sprint 18 approves only one local department record. It must not execute Agent, continue Agent, execute ToolRun, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, or approve future department behavior.


## Sprint 21 Department Assignment Boundary

Sprint 21 DepartmentTaskIntakeRecord, DepartmentAssignmentProposal, DepartmentRoleFitReview, DepartmentAssignmentApprovalRecord, and DepartmentAssignmentAuditRecord may reference this contract only as sanitized evidence or local review context.

Sprint 21 assignment records must not be consumed as execution tokens, routing tokens, runtime assignment tokens, runtime permission grants, release tokens, deploy tokens, Task completion tokens, retry/replay/rollback/restore tokens, resume execution tokens, or future approval tokens.

Kelvin approval in Sprint 21 approves only one local assignment record. It must not execute Agent, continue Agent, auto-route Task, assign Agent at runtime, start AgentRun, execute ToolRun, request or approve runtime permission, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, retry, replay, rollback, restore, resume execution, or approve future assignment behavior.
