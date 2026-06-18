# Plan: Sprint 8 - Observability / Audit Log / Recovery / Resume

Status: proposed

## Implementation Order

1. Add contracts for correlationId, ObservabilityEvent, AuditLogQuery, RunJournal, RecoveryPoint, ResumeToken, FailureClassification, RedactionPolicy, ResumePolicy, and observability safety.
2. Extend existing Sprint 1-7 contracts with Sprint 8 observability and view-only resume boundaries.
3. Add type definitions only after specs are reviewed.
4. Add persistence only after schema design review.
5. Add read-only APIs for timeline, audit, journal, recovery, resume, and failures.
6. Add ChatHub / Task UI timeline and inspection views.
7. Add regression tests that prove Sprint 8 cannot trigger execution or status progression.

## Recommended Persistence

Sprint 8 likely needs new tables:

- `ObservabilityEvent`
- `RunJournal`
- `RecoveryPoint`
- `ResumeToken`
- `FailureClassification`

AuditEvent may remain the historical business audit table. ObservabilityEvent should become the cross-module observability read model. Implementations may mirror AuditEvent into ObservabilityEvent but must not rewrite AuditEvent.

Do not add:

- Worker
- Queue
- ReplayJob
- RetryJob
- AgentExecutionResume
- ToolExecutionResume
- AutoRecoveryRun
- ExternalTelemetrySink

## API Groups

Observability:

- `GET /api/observability/events`
- `GET /api/observability/events/:id`
- `GET /api/observability/timeline/:correlationId`
- `GET /api/observability/resources/:resourceType/:resourceId/timeline`

Audit:

- `GET /api/audit/events`
- `GET /api/audit/summary`
- `GET /api/audit/correlation/:correlationId`
- `GET /api/audit/tasks/:id`
- `GET /api/audit/agent-runs/:id`
- `GET /api/audit/tool-calls/:id`
- `GET /api/audit/eval-runs/:id`

Run Journal:

- `GET /api/run-journals`
- `GET /api/run-journals/:id`
- `GET /api/run-journals/by-run/:runType/:runId`

Recovery:

- `POST /api/recovery-points`
- `GET /api/recovery-points/:id`
- `GET /api/recovery-points/by-resource/:resourceType/:resourceId`

Resume:

- `POST /api/resume-tokens`
- `GET /api/resume-tokens/:id`
- `POST /api/resume-tokens/:id/use`

Failures:

- `GET /api/failures`
- `GET /api/failures/:id`
- `GET /api/failures/by-correlation/:correlationId`

## Forbidden API Semantics

Do not add API routes containing execution semantics:

- `/execute`
- `/run`
- `/dispatch`
- `/replay`
- `/retry`
- `/restore-and-run`
- `/resume-execution`
- `/start-agent`
- `/run-tool`
- `/send-a2a`
- `/auto-fix`
- `/complete-task`

The check is semantic, not a blind substring scan. Existing record-query route names such as `/api/agent-runtime/runs` and `/api/eval-runs` must not be flagged merely because they contain `runs`.

Forbidden additions are execution-oriented routes such as replay, retry, restore-and-run, resume-execution, start-agent, run-tool, dispatch-a2a, execute, or auto-fix. Sprint 8 must not introduce execution behavior behind any route name.

## UI Entry Points

ChatHub:

- show correlationId for routed messages.
- show `View Timeline` on Router cards.
- show `View Audit` on Task and AgentResult cards.
- show Sprint 8 safety note.

Task detail:

- `Timeline` tab.
- `Audit` tab.
- `Run Journal` tab.
- `Recovery Points` tab.
- `Failures` tab.
- `Resume` tab.

Cards:

- Task card links RecoveryPoints and Failures.
- AgentRun card links RunJournal and ObservabilityEvents.
- ToolCall card links Permission, Eval, Audit, and RecoveryPoints.
- EvalRun card links QualityGateDecision, Findings, Audit, and RecoveryPoints.

## Safety Gates

- Every mutation API in Sprint 8 must return audit or observability event IDs.
- `POST /api/resume-tokens/:id/use` must restore view context only.
- RecoveryPoint creation must sanitize snapshots before persistence.
- RunJournal entries must not be replayable.
- RecoveryPoint records must not restore database state.
- ResumeToken use must not invoke AgentRun, ToolRun, EvalRun, Memory writes, or A2A dispatch.
- FailureClassification `retryable` must not trigger retry.
- blocked redaction payloads must not be persisted into snapshots or resume context.
- Audit and timeline queries must not mutate target records.
- No Sprint 8 code path may import or call Agent Runtime start, Tool Runtime execution, Memory approval, A2A dispatch, Eval run creation, shell, Git, file write, external API, MCP, browser automation, worker, queue, or deploy modules.

## Validation Commands

When implemented:

```bash
npx prisma validate
npx prisma db push --skip-generate
npx prisma generate
npm run test
npm run lint
npm run build
```
