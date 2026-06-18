# Tasks: Sprint 7 - Eval / Verification / Quality Gate

Status: proposed

## TASK-001: EvalTarget Contract

Priority: high

Create the EvalTarget contract.

Acceptance criteria:

- Supports RouteDecision, Harmony Task, AgentRun, AgentResult, MemoryEntry, KnowledgeItem, A2AMessage, ToolCall, and ToolPermission.
- Supports ContextPacket as an EvalTarget for audit, reproducibility, and context selection quality only.
- Stores sanitized snapshots for audit and reproducibility.
- Supports idempotency and correlation IDs.
- Does not read external resources or mutate target records.
- ContextPacket eval does not attach, detach, supersede, or start AgentRun.

## TASK-002: EvalRun Contract

Priority: high

Create the EvalRun contract.

Acceptance criteria:

- Captures target, evaluator, mode, status, trigger, checks, findings, and gate decision.
- Is independent from AgentRun.
- Does not create a Turing AgentRun by default.
- Does not imply remediation, approval, or execution.

## TASK-003: EvalCheck and EvalFinding Contracts

Priority: high

Create EvalCheck and EvalFinding contracts.

Acceptance criteria:

- EvalCheck captures deterministic checklist results.
- EvalFinding captures severity, category, evidence, recommendation, and review state.
- Findings can request Kelvin review for high-risk issues.
- Findings must not contain secrets, full file contents, or raw private payloads.

## TASK-004: QualityGateDecision Contract

Priority: high

Create the QualityGateDecision contract.

Acceptance criteria:

- Supports `pass`, `warn`, `fail`, `needs_human_review`, and `blocked`.
- Includes confidence, reasons, requiredActions, and target status recommendation.
- Is recommendation-only in Sprint 7.
- Does not mutate target records automatically.

## TASK-005: Eval Target Mapping

Priority: high

Define how Sprint 1-6 records become EvalTargets.

Acceptance criteria:

- RouteDecision mapping checks routing type, target Agent, confidence, sideEffects, and confirmation need.
- Task mapping checks state machine status, confirmation, audit, and non-execution boundaries.
- AgentResult mapping checks schema, sideEffects, confidence, candidates, and prohibited claims.
- Memory / Knowledge mapping checks provenance, confidence, scope, status, and review requirements.
- A2A mapping checks local-only draft boundaries and no send / dispatch semantics.
- ToolCall / ToolPermission mapping checks policy, risk, sideEffects, confirmation, and default-deny decisions.

## TASK-006: Turing Verification Boundary

Priority: high

Define Turing Verification Agent behavior.

Acceptance criteria:

- Turing only performs verification, critique, checklist, and gate recommendation.
- Turing does not execute tools, modify files, create ToolCalls, write approved Memory, send A2A, or progress Tasks.
- Turing output is stored as Eval records, not as side-effect work.

## TASK-007: Human Confirmation Boundary

Priority: high

Extend ConfirmationArtifact usage for Eval review.

Acceptance criteria:

- `resourceType = eval_run` and `resourceType = eval_finding` are supported.
- Kelvin review can approve or reject local Eval / Finding review state.
- Approval does not execute tools, mutate target records, or approve Memory / Tool / A2A records.
- Review actions write eval-specific AuditEvent records.

## TASK-008: API Design

Priority: medium

Design APIs for EvalTarget, EvalRun, EvalCheck, EvalFinding, QualityGateDecision, and review flows.

Acceptance criteria:

- APIs cover local creation, query, cancellation, findings, gate decision, and Kelvin review.
- APIs use structured responses and errors.
- APIs support idempotency where records are created or transitioned.
- Mutation APIs return `auditEvents`.
- APIs do not expose execute, apply, auto-fix, send, approve-target, or task-progression endpoints.

## TASK-009: ChatHub / Task UI

Priority: medium

Design UI entry points.

Acceptance criteria:

- Task card supports `Run Verification`.
- AgentResult card supports `Run Verification`.
- ToolCall card supports `Run Verification`.
- Memory / Knowledge / A2A cards can show linked Eval results.
- UI shows the required Sprint 7 safety note.
- UI does not imply automatic execution, approval, or state progression.

## TASK-010: Tests and Regression

Priority: high

Plan tests after implementation.

Acceptance criteria:

- EvalTarget mapping tests pass.
- EvalRun state machine tests pass.
- EvalCheck and EvalFinding validation tests pass.
- QualityGateDecision recommendation-only tests pass.
- QualityGateDecision `blocked` does not change Task status tests pass.
- Turing boundary tests pass.
- EvalRun completed does not change target status tests pass.
- Kelvin review does not mutate target records tests pass.
- Eval does not create ToolCalls tests pass.
- Eval does not approve Memory / Knowledge / A2A / ToolCall tests pass.
- ContextPacket eval does not attach, detach, or start AgentRun tests pass.
- no Eval API route path contains execute-fix/apply/block-task/complete-task tests pass.
- forbidden imports and forbidden side-effect path tests pass.
- Sprint 1 `/api/chat` SSE regression passes.
- Sprint 2 `/api/agent-router/route` regression passes.
- Sprint 3 Harmony Task Engine regression passes.
- Sprint 4 Agent Runtime regression passes.
- Sprint 5 Memory / Knowledge / local A2A regression passes.
- Sprint 6 Tool Integration / Permission / CommandPolicy regression passes.

## Sprint 7 Non-goals

Do not implement:

- real Tool Runtime
- MCP or external API calls
- shell commands
- Git operations
- file modification, creation, deletion, patching, or formatting
- PR creation, merge, push, or review submission
- deploy, release, publish, or production mutation
- database migration or data deletion
- automatic fixes
- automatic ToolCall creation
- automatic ToolCall approval
- automatic MemoryEntry / KnowledgeItem approval
- A2A message sending
- autonomous A2A loops
- automatic Task blocking, completion, or progression
- Sprint 8 Observability / Recovery work
