# Tasks: Sprint 8 - Observability / Audit Log / Recovery / Resume

Status: proposed

## Specs

- [ ] Add Sprint 8 PRD.
- [ ] Add Sprint 8 implementation plan.
- [ ] Add Sprint 8 task list.
- [ ] Add ObservabilityEvent contract.
- [ ] Add AuditLogQuery contract.
- [ ] Add RunJournal contract.
- [ ] Add RecoveryPoint contract.
- [ ] Add ResumeToken contract.
- [ ] Add FailureClassification contract.
- [ ] Add correlationId contract.
- [ ] Add RedactionPolicy contract.
- [ ] Add ResumePolicy contract.
- [ ] Add observability recovery safety contract.
- [ ] Update Sprint 1-7 contracts with Sprint 8 boundaries.

## Implementation Tasks

- [ ] Add TypeScript types for Sprint 8 contracts.
- [ ] Add deterministic correlationId helper.
- [ ] Add redaction helper.
- [ ] Add ObservabilityEvent persistence.
- [ ] Add RunJournal persistence.
- [ ] Add RecoveryPoint persistence.
- [ ] Add ResumeToken persistence.
- [ ] Add FailureClassification persistence.
- [ ] Add timeline query service.
- [ ] Add audit summary query service.
- [ ] Add view-only resume service.
- [ ] Add recovery snapshot service.

## API Tasks

- [ ] Implement Observability APIs.
- [ ] Implement Audit query APIs.
- [ ] Implement RunJournal APIs.
- [ ] Implement RecoveryPoint APIs.
- [ ] Implement ResumeToken APIs.
- [ ] Implement Failure APIs.
- [ ] Ensure mutation APIs return `auditEvents` or `observabilityEvents`.
- [ ] Ensure no Sprint 8 API route introduces execute, replay, retry, dispatch, restore-and-run, or resume-execution semantics.
- [ ] Ensure API route safety tests check execution semantics, not a blind `run` substring.
- [ ] Ensure existing record-query names such as `/api/agent-runtime/runs` and `/api/eval-runs` are not false positives.

## UI Tasks

- [ ] Add ChatHub timeline links.
- [ ] Add Task timeline tab.
- [ ] Add Audit tab.
- [ ] Add Run Journal tab.
- [ ] Add Recovery Points tab.
- [ ] Add Failures tab.
- [ ] Add Resume tab.
- [ ] Add Sprint 8 safety note.
- [ ] Remove or block misleading execution wording.

## Tests

- [ ] correlationId propagation tests.
- [ ] ObservabilityEvent validation tests.
- [ ] AuditLogQuery read-only tests.
- [ ] RunJournal sequence ordering tests.
- [ ] RunJournal cannot be replayed.
- [ ] RecoveryPoint snapshot sanitization tests.
- [ ] RecoveryPoint cannot restore database state.
- [ ] ResumeToken view-only tests.
- [ ] FailureClassification tests.
- [ ] FailureClassification `retryable` does not trigger retry.
- [ ] RedactionPolicy tests.
- [ ] blocked redaction payload is not persisted into RecoveryPoint, RunJournal, or ResumeToken context.
- [ ] API route forbidden semantics tests.
- [ ] RecoveryPoint does not mutate target status.
- [ ] ResumeToken does not start AgentRun.
- [ ] ResumeToken does not create ToolCall or ToolRun.
- [ ] ResumeToken does not invoke ToolRun.
- [ ] ResumeToken does not write Memory / Knowledge.
- [ ] ResumeToken does not send A2A.
- [ ] ResumeToken does not dispatch A2A.
- [ ] ResumeToken does not start EvalRun.
- [ ] Sprint 1 `/api/chat` SSE regression.
- [ ] Sprint 2 `/api/agent-router/route` regression.
- [ ] Sprint 3 Harmony Task Engine regression.
- [ ] Sprint 4 Agent Runtime regression.
- [ ] Sprint 5 Memory / Knowledge / local A2A regression.
- [ ] Sprint 6 Tool Integration / Permission / CommandPolicy regression.
- [ ] Sprint 7 Eval / Verification / Quality Gate regression.

## Non-goals

- [ ] Do not implement Agent execution.
- [ ] Do not implement Tool execution.
- [ ] Do not call external APIs.
- [ ] Do not execute shell, Git, file write, PR, deploy, delete, or database migration behavior.
- [ ] Do not implement automatic replay, retry, rollback, or restore.
- [ ] Do not auto-progress Task, AgentRun, ToolCall, Memory, Knowledge, A2A, or Eval states.
- [ ] Do not enter Sprint 9 Multi-Agent Collaboration / A2A Runtime.
