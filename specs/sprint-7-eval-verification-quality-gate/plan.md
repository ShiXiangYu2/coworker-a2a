# Plan: Sprint 7 - Eval / Verification / Quality Gate

Status: proposed

## Architecture Decision

Sprint 7 adds a local verification layer:

```text
Target record
  -> EvalTarget mapping
  -> EvalRun
  -> EvalCheck
  -> EvalFinding
  -> QualityGateDecision
  -> AuditEvent
  -> ChatHub / Task UI
```

It stops before:

```text
automatic remediation
automatic approval
automatic task progression
tool execution
external API / MCP / browser automation
file / Git / PR / deploy side effects
```

## Database Recommendation

Add narrow tables during implementation:

- `EvalTarget`
- `EvalRun`
- `EvalCheck`
- `EvalFinding`

`QualityGateDecision` may be embedded in `EvalRun` for the first implementation or split into a table if the team wants independent gate history. The first implementation should prefer embedding unless multiple gate decisions per EvalRun are required.

Do not add:

- `EvalWorker`
- `EvalQueue`
- `ExternalEvalProvider`
- `BenchmarkSuite`
- `AutoFixRun`
- `ToolEvalExecution`
- `TuringAgentRun`

## Module Design

| Module | Responsibility |
| --- | --- |
| Eval contracts | Defines EvalTarget, EvalRun, EvalCheck, EvalFinding, and QualityGateDecision. |
| Target mapper | Creates sanitized EvalTarget snapshots from Sprint 1-6 records. |
| Verification runner | Runs deterministic local checks and Turing-style critique without external calls. |
| Gate evaluator | Aggregates checks and findings into recommendation-only QualityGateDecision. |
| Review boundary | Creates or links ConfirmationArtifact for high-risk findings. |
| Audit writer | Records Eval lifecycle, findings, gate decisions, and review actions. |
| API | Local eval creation, query, cancellation, finding review, and gate display endpoints only. |
| UI | Verification buttons, Eval cards, finding list, gate summary, Kelvin review card, and safety note. |
| Tests | Mapping, checks, gate decisions, safety, API, UI copy, and regression coverage. |

## API Plan

All POST APIs should accept optional `idempotencyKey` for creating or transitioning local records.

All mutation APIs should return related `auditEvents`.

First implementation Eval target API:

```text
POST /api/eval-targets
GET  /api/eval-targets/:id
```

`POST /api/eval-targets` body must include:

```ts
{
  targetType: EvalTarget['targetType']
  targetId: string
  idempotencyKey?: string
}
```

Convenience Eval target APIs may be added later after the generic endpoint is stable:

```text
POST /api/eval-targets/from-route-decision
POST /api/eval-targets/from-task
POST /api/eval-targets/from-agent-run
POST /api/eval-targets/from-agent-result
POST /api/eval-targets/from-memory
POST /api/eval-targets/from-knowledge
POST /api/eval-targets/from-a2a-message
POST /api/eval-targets/from-tool-call
POST /api/eval-targets/from-tool-permission
```

Eval runs:

```text
POST /api/eval-runs/from-target
GET  /api/eval-runs
GET  /api/eval-runs/:id
POST /api/eval-runs/:id/cancel
GET  /api/eval-runs/:id/checks
GET  /api/eval-runs/:id/findings
GET  /api/eval-runs/:id/quality-gate
```

Finding review:

```text
POST /api/eval-findings/:id/mark-reviewed
POST /api/eval-findings/:id/request-kelvin-review
POST /api/eval-confirmations/:id/approve
POST /api/eval-confirmations/:id/reject
```

Linked queries:

```text
GET /api/harmony/tasks/:id/eval-runs
GET /api/agent-runtime/runs/:id/eval-runs
GET /api/tool-calls/:id/eval-runs
GET /api/memory/:id/eval-runs
GET /api/knowledge/:id/eval-runs
GET /api/a2a/messages/:id/eval-runs
```

Do not add:

```text
POST /api/eval-runs/:id/execute-fix
POST /api/eval-runs/:id/apply
POST /api/eval-runs/:id/block-task
POST /api/eval-runs/:id/complete-task
POST /api/eval-runs/:id/create-tool-call
POST /api/eval-runs/:id/approve-memory
POST /api/eval-runs/:id/send-a2a
```

No Sprint 7 API route path may contain `execute-fix`, `apply`, `block-task`, or `complete-task`.

## ChatHub / Task UI Plan

Task card adds:

- `Run Verification`
- latest quality gate summary
- linked EvalRun list
- high-risk findings count

AgentResult card adds:

- `Run Verification`
- result schema and safety findings
- gate recommendation

ToolCall card adds:

- `Run Verification`
- policy, side-effect, and confirmation findings

Memory / Knowledge / A2A cards add:

- `Run Verification`
- provenance, confidence, and review findings

UI must show the required Sprint 7 safety note and must not imply that verification executes fixes or changes target record states.

## Delivery Order

1. Add Sprint 7 specs and contracts.
2. Review specs before implementation.
3. Add EvalTarget, EvalRun, EvalCheck, and EvalFinding data models.
4. Add pure target mapping.
5. Add deterministic local verification checks.
6. Add QualityGateDecision aggregator.
7. Add ConfirmationArtifact integration for high-risk findings.
8. Add API routes.
9. Add ChatHub / Task UI.
10. Add tests and acceptance report.

## Acceptance Gate

Sprint 7 can be marked complete only when:

- EvalRun is local, auditable, and idempotent.
- Turing verification is recommendation-only.
- QualityGateDecision does not mutate Task / AgentRun / Memory / Knowledge / A2A / Tool records automatically.
- EvalRun completed does not change target status.
- QualityGateDecision `blocked` does not change Task status.
- Kelvin approval changes only Eval / Finding local review state.
- Kelvin approval does not change target status.
- Eval does not create ToolCall records.
- Eval does not approve Memory, Knowledge, A2A, or ToolCall records.
- ContextPacket eval does not attach, detach, supersede, or start AgentRun.
- Eval API route paths do not contain `execute-fix`, `apply`, `block-task`, or `complete-task`.
- No real Tool Runtime, external API, MCP, shell, Git, file write, PR, deploy, delete, browser automation, queue, or worker path exists.
- UI copy avoids auto-fix, execute, apply, deploy, send, and automatic state-change language.
- forbidden imports and forbidden side-effect paths are covered by tests.
- Sprint 1-6 regression tests pass.
