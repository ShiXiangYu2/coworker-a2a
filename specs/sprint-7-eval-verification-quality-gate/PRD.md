# PRD: Sprint 7 - Eval / Verification / Quality Gate

Created: 2026-06-16
Status: proposed

## Problem

Sprint 1 delivered ChatHub streaming chat. Sprint 2 delivered CEO Agent Router. Sprint 3 delivered Harmony Task Engine. Sprint 4 delivered analysis-only Agent Runtime. Sprint 5 delivered controlled Memory / Knowledge / local A2A drafts. Sprint 6 delivered ToolCall proposals, Permission evaluation, CommandPolicy, Human Confirmation, and Audit.

The system can now route, plan, analyze, create local memory/context records, and propose tools without execution. It still lacks a structured way to verify the quality and safety of those records before humans rely on them.

Sprint 7 introduces an Eval / Verification / Quality Gate layer.

## Product Goal

Implement this slice:

```text
RouteDecision / Task / AgentResult / Memory candidate / KnowledgeItem / A2A draft / ToolCall / ToolPermission
  -> EvalTarget
  -> EvalRun
  -> EvalCheck
  -> EvalFinding
  -> QualityGateDecision
  -> AuditEvent
  -> UI display
```

Do not implement this later slice:

```text
QualityGateDecision
  -> automatic Task blocking or progression
  -> automatic ToolCall creation or approval
  -> automatic Memory / Knowledge approval
  -> tool execution
  -> file mutation / PR / deploy / delete
  -> A2A sending or autonomous loops
```

## Scope

Sprint 7 includes:

- EvalTarget contract.
- EvalRun contract.
- EvalCheck contract.
- EvalFinding contract.
- QualityGateDecision contract.
- Eval target mapping for Sprint 1-6 records.
- Turing Verification Agent boundary.
- Human confirmation boundary for high-risk eval findings.
- API design for local eval creation, query, cancellation, and review.
- ChatHub / Task UI entry design.
- Eval and acceptance criteria.

Sprint 7 does not include:

- Real Tool Runtime.
- MCP or external API calls.
- Shell, Git, file write, PR, deploy, delete, or database mutation.
- Automatic code fixes.
- Automatic ToolCall creation.
- Automatic ToolCall approval.
- Automatic MemoryEntry or KnowledgeItem approval.
- A2A message sending.
- Autonomous A2A loops.
- Automatic Task blocking, completion, or progression from QualityGateDecision.
- External benchmark runners or background eval workers.

## Product Boundaries

Eval means structured local verification records, checklist results, findings, gate recommendations, audit events, and UI display. It does not mean execution.

Turing Verification Agent is a verification persona and deterministic local evaluator in Sprint 7. It may critique, score, check schemas, identify risks, and recommend a gate decision. It must not run as a tool executor, mutate files, create ToolCalls, write approved Memory, send A2A messages, or progress Tasks.

QualityGateDecision is recommendation-only in Sprint 7. It may say `pass`, `warn`, `fail`, `needs_human_review`, or `blocked`, but it must not automatically mutate the evaluated target except the Eval records themselves.

Kelvin remains the high-risk human review boundary. Kelvin approval changes only Eval / Finding review state in Sprint 7.

## UI Copy

Required safety note:

```text
Sprint 7 records verification checks, findings, and quality gate recommendations only. It does not execute tools, call external APIs, modify files, create PRs, deploy, delete, send A2A messages, approve memory, or automatically change task state.
```

Allowed labels:

- `Run Verification`
- `Review Quality Gate`
- `View Eval Findings`
- `Request Kelvin Review`
- `Mark Finding Reviewed`
- `Cancel Eval`

Disallowed labels:

- `Execute Fix`
- `Auto Fix`
- `Run Tool`
- `Apply Change`
- `Approve Memory Automatically`
- `Send A2A Message`
- `Block Task Automatically`
- `Complete Task`
- `Deploy`

## Acceptance Criteria

- EvalTarget can reference RouteDecision, Harmony Task, AgentRun / AgentResult, MemoryEntry candidate, KnowledgeItem, A2AMessage draft, ToolCall proposal, and ToolPermission.
- EvalRun can be started manually from API, Task UI, AgentResult card, ToolCall card, or other local UI entry points.
- EvalRun is independent of AgentRun; it does not create a Turing AgentRun by default.
- Turing verification produces local EvalCheck, EvalFinding, and QualityGateDecision records only.
- QualityGateDecision is recommendation-only.
- High-risk findings can request Kelvin review through ConfirmationArtifact.
- Kelvin approval or rejection changes Eval / Finding local review state only.
- Eval does not auto-block, auto-complete, or auto-progress Tasks.
- Eval does not create ToolCalls automatically.
- Eval does not approve MemoryEntry, KnowledgeItem, A2AMessage, ToolCall, or ToolPermission records.
- Eval does not execute shell, Git, file write, PR, deploy, delete, database mutation, external API, MCP, browser, or Tool Runtime behavior.
- AuditEvent records exist for EvalRun lifecycle, findings, gate recommendation, and Kelvin review.
- `/api/chat` SSE does not regress.
- `/api/agent-router/route` does not regress.
- Sprint 3 Harmony Task Engine does not regress.
- Sprint 4 Agent Runtime does not regress.
- Sprint 5 Memory / Knowledge / local A2A does not regress.
- Sprint 6 Tool Integration / Permission / CommandPolicy does not regress.
- `npm run lint`, `npm run test`, and `npm run build` pass when implemented.
