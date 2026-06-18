# PRD: Sprint 4 - Agent Runtime

Created: 2026-06-15
Status: proposed

## Problem

Sprint 1 delivered ChatHub streaming chat. Sprint 2 delivered CEO Agent Router. Sprint 3 delivered Harmony Task Engine, so a `RouteDecision` can become a traceable task with state, audit, and confirmation records.

The system can now track work, but it still cannot let a target Agent safely analyze a Harmony Task and produce a structured result.

Sprint 4 introduces an analysis-only Agent Runtime. It lets a queued Harmony Task be handled by a target Agent and records the Agent's structured analysis as `AgentResult`, `TaskStep`, and `AuditEvent`.

## Product Goal

Implement this slice:

```text
Harmony Task -> Agent Runtime -> Agent analysis-only run -> AgentResult -> TaskStep / AuditEvent -> UI
```

Do not implement this later slice:

```text
AgentResult -> Tool Runtime -> file/Git/PR/deploy/delete/memory/external side effects
```

## Users

- ChatHub user: wants to ask the target Agent to analyze a created Harmony Task.
- Human Chairman / Kelvin: owns confirmation and high-risk review boundaries.
- Future Tool Runtime: needs a clean, structured AgentResult contract before any tool execution is designed.

## Scope

Sprint 4 includes:

- AgentRuntime, AgentRun, AgentStep, and AgentResult specs.
- Harmony Task to AgentRun conversion rules.
- Analysis-only Agent Runtime state machine.
- Structured AgentResult output contract.
- TaskStep and AuditEvent write design for Agent analysis.
- ChatHub / Task UI entry design.
- Eval and acceptance criteria.

Sprint 4 does not include:

- Tool Runtime.
- Shell commands.
- Git operations.
- File modification, creation, deletion, or patching.
- Pull request creation, merge, push, deploy, publish, or release.
- Memory, Obsidian, RAG, or knowledge base writes.
- A2A autonomous loop.
- Automatic task completion.
- External side effects or external API calls.

## Core User Stories

1. As a user, I can run analysis for a queued Jobs task and receive a structured product result.
2. As a user, I can run analysis for Linus, Turing, Bezos, or Elon tasks and receive role-specific findings.
3. As Kelvin, I remain the owner of human confirmation; approval never authorizes tools or side effects.
4. As a developer, I can audit every AgentRun and see the linked TaskStep and AuditEvent.
5. As a developer, I can verify that Sprint 4 does not execute tools, commands, file edits, PRs, deploys, deletes, memory writes, or external APIs.

## Data Objects

### AgentRuntime

```ts
AgentRuntime {
  id: string
  name: 'controlled_agent_runtime'
  version: string
  mode: 'analysis_only'
  enabledAgentIds: ('elon' | 'jobs' | 'linus' | 'turing' | 'bezos')[]
  forbiddenActions: string[]
  createdAt: string
}
```

AgentRuntime may remain a code-level configuration in Sprint 4. It does not need a database table unless implementation review finds a concrete need.

### AgentRun

```ts
AgentRun {
  id: string
  taskId: string
  taskRunId?: string
  agentId: 'elon' | 'jobs' | 'linus' | 'turing' | 'bezos' | 'kelvin'
  status: 'created' | 'running' | 'completed' | 'blocked' | 'failed' | 'cancelled'
  trigger: 'manual' | 'task_ui' | 'api'
  runtimeMode: 'analysis_only'
  attempt: number
  idempotencyKey?: string

  inputSnapshot: Json
  result?: AgentResult
  error?: {
    code: string
    message: string
  }

  startedAt?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}
```

### AgentStep

```ts
AgentStep {
  id: string
  agentRunId: string
  taskId: string
  agentId: 'elon' | 'jobs' | 'linus' | 'turing' | 'bezos' | 'kelvin'
  index: number
  kind:
    | 'load_task_context'
    | 'build_agent_prompt'
    | 'llm_analysis'
    | 'validate_agent_result'
    | 'write_task_step'
    | 'write_audit_event'
  status: 'pending' | 'running' | 'completed' | 'blocked' | 'failed' | 'skipped'
  summary: string
  input?: Json
  output?: Json
  createdAt: string
  updatedAt: string
}
```

### AgentResult

```ts
AgentResult {
  status: 'completed' | 'blocked' | 'needs_human_confirmation' | 'failed'
  confidence: number
  summary: string
  findings: string[]
  proposedChanges: {
    type: 'requirement' | 'design' | 'test' | 'customer_insight' | 'coordination' | 'other'
    title: string
    description: string
    riskLevel: 'low' | 'medium' | 'high'
  }[]
  next: {
    recommendedAction:
      | 'show_result'
      | 'ask_human_confirmation'
      | 'request_more_context'
      | 'handoff_to_agent'
      | 'stop'
    reason: string
    suggestedNextAgentId?: 'elon' | 'jobs' | 'linus' | 'turing' | 'bezos' | 'kelvin'
  }
  sideEffects: {
    filesChanged: []
    branchesCreated: []
    prsCreated: []
    issuesUpdated: []
  }
  needsHumanConfirmation: boolean
  safetyNotes: string[]
}
```

## Task Eligibility

Only `queued` Harmony Tasks can start an Agent analysis run.

Blocked states:

- `draft`
- `pending_confirmation`
- `blocked`
- `completed`
- `failed`
- `cancelled`

Additional blockers:

- missing `targetAgentId`
- `targetAgentId = kelvin` unless explicitly running an owner review flow
- non-empty Task sideEffects
- pending ConfirmationArtifact
- `routeDecisionType = chat_only`
- `routeDecisionType = unsupported`

## State Semantics

`AgentRun.completed` means analysis completed.

It does not mean:

- Task completed.
- Tool completed.
- File changed.
- PR created.
- Deployment happened.
- Memory was written.

Sprint 4 must not automatically set `Task.status = completed`.

## UI Copy

Buttons must use:

```text
Run Agent Analysis
```

Buttons must not use:

```text
Execute Agent
```

Required safety note:

```text
Sprint 4 only produces structured analysis and does not execute tools, commands, file edits, PRs, deploys, deletes, or memory writes.
```

## Acceptance Criteria

- A queued Jobs task can produce a valid AgentResult.
- A queued Linus task can produce a valid AgentResult.
- A queued Turing task can produce a valid AgentResult.
- A queued Bezos task can produce a valid AgentResult.
- A queued Elon task can produce a valid AgentResult.
- Kelvin is reserved for human confirmation / owner review and is not auto-run by default.
- `pending_confirmation`, `blocked`, `cancelled`, `failed`, and `completed` tasks cannot start Agent analysis.
- AgentResult.sideEffects is always empty.
- AgentRun writes TaskStep and AuditEvent records.
- Approval after confirmation still cannot execute tools or side effects.
- `/api/chat` SSE does not regress.
- `/api/agent-router/route` does not regress.
- Sprint 3 Harmony Task Engine does not regress.
- `npm run lint`, `npm run test`, and `npm run build` pass when implemented.
