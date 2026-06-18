# Plan: Sprint 4 - Agent Runtime

Status: proposed

## Architecture Decision

Sprint 4 adds an analysis-only Agent Runtime:

```text
Harmony Task
  -> AgentRun
  -> AgentStep
  -> AgentResult
  -> Harmony TaskStep summary
  -> AuditEvent
  -> ChatHub / Task UI
```

It stops before:

```text
AgentResult
  -> Tool Runtime
  -> Memory
  -> A2A loop
  -> external side effects
```

## Database Recommendation

Add narrow tables:

- `AgentRun`
- `AgentStep`

Do not add:

- `ToolCall`
- `ToolRun`
- `MemoryEntry`
- `Artifact`
- `AgentMessage`
- `A2ASession`

Do not reuse Sprint 3 `TaskRun` as `AgentRun`.

Reason:

- Sprint 3 `TaskRun.runtimeKind = harmony_planning` is not Agent Runtime.
- Reusing it would blur planning state with Agent analysis state.
- `TaskStep` should store a concise AgentResult summary for Harmony visibility, while `AgentRun` / `AgentStep` stores Agent runtime details.

## Module Design

Planned modules:

| Module | Responsibility |
| --- | --- |
| Agent Runtime types | AgentRuntime, AgentRun, AgentStep, AgentResult contracts. |
| Agent Runtime state machine | Pure status transitions for AgentRun. |
| Task to AgentRun converter | Validates queued Task eligibility and creates analysis run input. |
| Agent prompt builder | Builds system prompt and role prompt for analysis-only runs. |
| Analysis result producer | Produces structured AgentResult. Sprint 4 first implementation may use a mock / deterministic producer. |
| Agent result validator | Enforces structured result and empty sideEffects. |
| Agent repository | Persists AgentRun, AgentStep, TaskStep summary, and AuditEvent. |
| Agent Runtime API | Starts and reads analysis runs. |
| ChatHub / Task UI | Adds `Run Agent Analysis` and result display. |
| Tests | Eligibility, safety, result schema, API, and regressions. |

## Task to AgentRun Flow

```text
POST /api/agent-runtime/runs/from-task
  -> load Harmony Task
  -> validate Task.status = queued
  -> validate targetAgentId
  -> reject pending confirmations
  -> create AgentRun(status = created, runtimeMode = analysis_only)
  -> move Task.status queued -> assigned
  -> mark AgentRun running
  -> build analysis-only prompts
  -> call analysis result producer for structured AgentResult
  -> validate AgentResult and empty sideEffects
  -> write AgentStep records
  -> write Harmony TaskStep summary
  -> write AuditEvent records
  -> mark AgentRun completed or blocked/failed
```

Sprint 4 first implementation may use a mock / deterministic AgentResult producer. A real LLM Runtime is not required for this sprint and must be explicitly enabled in a later reviewed change if introduced.

Implementation must not introduce Tool Runtime, command execution, file mutation, Memory, Git, deploy, delete, PR, or external integration.

AgentRun completion must not automatically set `Task.status = completed`; completed means the analysis run produced a validated AgentResult only.

## Prompt Boundary

System prompt must say:

```text
You are a controlled CoWorker-A2A Agent Runtime.
You may analyze, reason, and produce structured AgentResult JSON.
You must not execute tools, commands, file edits, Git operations, PRs, deployments, deletes, external APIs, or memory writes.
You must not claim any side effect has happened.
All sideEffects arrays must be empty.
```

Agent prompt includes:

- agent identity
- role responsibilities
- skillRefs
- Task title and description
- sourceMessageText
- routeDecisionSnapshot
- current Task status
- relevant audit summary
- AgentResult schema

## Agent Role Behavior

| Agent | Sprint 4 analysis |
| --- | --- |
| Elon | coordination, decomposition, next agent suggestion, risk framing |
| Jobs | requirements, PRD, UX, acceptance criteria |
| Linus | architecture, API, data model, implementation plan, engineering risk |
| Turing | tests, evals, regressions, quality gates |
| Bezos | customer value, feedback, market signal, business framing |
| Kelvin | human confirmation / owner review only, not default auto-run |

## UI Plan

Task card adds:

- `Run Agent Analysis`
- Agent target label
- runtime mode: `analysis_only`
- safety note

Agent result card shows:

- Agent
- status
- confidence
- summary
- findings
- proposedChanges
- next recommended action
- safetyNotes

Do not show `Execute Agent`.

## Test Plan

Unit tests:

- AgentRun state machine valid transitions.
- AgentRun state machine invalid transitions.
- Task eligibility rules.
- AgentResult schema validation.
- sideEffects empty invariant.
- AgentRun completed does not mark Task completed.

API tests:

- start AgentRun from queued Jobs task.
- reject pending_confirmation task.
- reject blocked/cancelled/failed/completed tasks.
- write TaskStep summary and AuditEvent.

Regression tests:

- `/api/chat` SSE still works.
- `/api/agent-router/route` still works.
- Sprint 3 task creation, cancel, approve, reject still works.

Safety tests:

- no Tool Runtime import.
- no filesystem, shell, Git, deploy, PR, delete, Memory write path.
- approval does not execute tools or side effects.
- Agent Runtime modules do not import `child_process`, filesystem write helpers, Tool Runtime modules, or Memory modules.

## Delivery Order

1. Add Sprint 4 specs and contracts.
2. Review specs before implementation.
3. Add Agent Runtime types and schemas.
4. Add AgentRun state machine.
5. Add Task to AgentRun converter.
6. Add AgentResult validator.
7. Add repository and API.
8. Add ChatHub / Task UI.
9. Add tests and acceptance report.

## Acceptance Gate

Sprint 4 can be marked complete only when:

- queued tasks can run analysis-only AgentRun.
- AgentResult validates and sideEffects is empty.
- AgentResult with non-empty sideEffects is rejected before persistence.
- AgentRun writes TaskStep and AuditEvent.
- AgentRun completed never changes Task status to completed.
- unsafe task states cannot start Agent analysis.
- Kelvin remains a human confirmation / owner review boundary.
- no Tool Runtime, Memory, A2A, or external side effects are introduced.
- `npm run lint`, `npm run test`, and `npm run build` pass.
