# Sprint 22 Tasks

## Specs Tasks

- [ ] Add Sprint 22 PRD.
- [ ] Add Sprint 22 plan.
- [ ] Add Sprint 22 tasks.
- [ ] Add structured runtime execution-plan contract.
- [ ] Add RuntimeExecutionToken contract.
- [ ] Add RuntimeDispatchJob contract.
- [ ] Add RuntimeDispatchAttempt contract.
- [ ] Add RuntimeExecutionReceipt contract.
- [ ] Add RuntimeRecoveryPoint contract.
- [ ] Add runtime execution state machine contract.
- [ ] Add controlled runtime execution safety contract.
- [ ] Update Task, Agent Runtime, Execution Gateway, Tool Governance, Observability, Recovery, Resume, Eval, Release Readiness, Security, and Operator Console contracts with Sprint 22 boundary notes.

## Runtime Design Tasks

- [ ] Define how `src/app/api/chat/route.ts` or downstream orchestration emits a structured execution plan.
- [ ] Define how Execution Gateway approval feeds runtime token issuance without reusing Sprint 20 approval semantics directly.
- [ ] Define DB-backed runtime queue model for SQLite + Prisma.
- [ ] Define worker lease / heartbeat / completion semantics.
- [ ] Define scoped permission payload for `obsidian_local.write_local_markdown_draft`.
- [ ] Define runtime receipt linkage back to HarmonyTask, AgentRun, and ExecutionPlanRecord.
- [ ] Define recovery-point capture before and after connector execution.

## Connector Scope Tasks

- [ ] Reuse `src/lib/tools/obsidian-draft.ts` as the phase-1 real connector path.
- [ ] Verify all writes remain inside configured Obsidian Inbox/AI Drafts directory.
- [ ] Verify no arbitrary workspace file write semantics are introduced.
- [ ] Verify Feishu Doc draft creation is explicitly deferred.

## API Tasks

- [ ] Add runtime token issue/query API spec.
- [ ] Add runtime job create/query API spec.
- [ ] Add runtime job claim/heartbeat/complete/fail/block API spec.
- [ ] Add task-linked runtime job query API spec.
- [ ] Verify no runtime API exposes shell/Git/PR/deploy/MCP/external API semantics.

## Review Tasks

- [ ] Verify Sprint 22 starts after Sprint 1-21 and does not mutate their meaning.
- [ ] Verify Sprint 1-21 records remain governance evidence only.
- [ ] Verify runtime token is the only runtime permission artifact.
- [ ] Verify runtime token is single-use, scoped, auditable, and expiring.
- [ ] Verify job idempotency blocks duplicate execution.
- [ ] Verify retry count is bounded.
- [ ] Verify timeout handling is explicit.
- [ ] Verify runtime receipt is distinct from local execution receipt records.
- [ ] Verify recovery records do not imply generalized rollback.
- [ ] Verify shell/Git/PR/deploy/MCP/external API remain denied.
- [ ] Verify Operator Console exposes runtime visibility without unrestricted controls.

## Later Implementation Acceptance Tasks

- [ ] approved structured execution plan can issue exactly one runtime token.
- [ ] approved runtime token can queue exactly one runtime job.
- [ ] worker can claim a queued job only once per lease window.
- [ ] worker heartbeat extends lease without duplicating attempts.
- [ ] successful Obsidian draft write creates one runtime execution receipt.
- [ ] successful receipt prevents duplicate replay under the same idempotency key.
- [ ] blocked path mismatch fails before connector execution.
- [ ] expired token blocks job start.
- [ ] exhausted retry budget leaves the job failed or blocked without looping forever.
- [ ] runtime recovery records exist for operator inspection.
- [ ] Sprint 1-21 regression passes.
