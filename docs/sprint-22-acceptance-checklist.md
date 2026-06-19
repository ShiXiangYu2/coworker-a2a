# Sprint 22 Acceptance Checklist

This checklist freezes the current Sprint 22 minimum controlled runtime execution loop for handoff review.

## Scope / Baseline

- [x] Sprint 22 is treated as a new runtime execution layer after Sprint 1-21.
- [x] Sprint 1-21 governance records remain evidence/review records, not runtime permission.
- [x] Runtime permission exists only through `RuntimeExecutionToken`.
- [x] The current real connector scope is limited to `obsidian_local.write_local_markdown_draft`.
- [x] Feishu Doc draft creation is deferred.
- [x] Multi-connector and multi-step execution are deferred.

## Data Model Readiness

- [x] `RuntimeExecutionToken` exists in Prisma.
- [x] `RuntimeDispatchJob` exists in Prisma.
- [x] `RuntimeDispatchAttempt` exists in Prisma.
- [x] `RuntimeExecutionReceipt` exists in Prisma.
- [x] `RuntimeRecoveryPoint` exists in Prisma.
- [x] Runtime records remain separate from Sprint 20 local execution gateway records.

## Token Gate Readiness

- [x] Completion paths require an active runtime token.
- [x] Expired, consumed, revoked, or non-active tokens block completion.
- [x] Token connector/action/task/idempotency must match the job.
- [x] Token scope connector/action/task/idempotency must match token and job.
- [x] Obsidian scope must remain limited to `Inbox/AI Drafts`.
- [x] Dry-run completion also passes through token gate.

## Replay / Idempotency Guard Readiness

- [x] Completion blocks jobs that already succeeded.
- [x] Completion blocks jobs with an existing `RuntimeExecutionReceipt`.
- [x] Completion blocks same-idempotency succeeded jobs.
- [x] Consumed tokens block repeat completion.
- [x] New job creation blocks duplicate live or succeeded idempotency keys.
- [x] Failed, blocked, and cancelled follow-up policy remains intentionally conservative and documented by tests.

## Dry-Run Lifecycle Readiness

- [x] `completeRuntimeDispatchJobDryRun` only completes a running job.
- [x] Dry-run completion requires matching lease owner.
- [x] Dry-run completion creates `RuntimeExecutionReceipt.status = dry_run`.
- [x] Dry-run completion creates a `post_execute` recovery point.
- [x] Dry-run completion consumes the runtime token.
- [x] Dry-run does not call the Obsidian connector.

## Controlled Obsidian Write Readiness

- [x] `completeRuntimeDispatchJobObsidianWrite` only supports `obsidian_local.write_local_markdown_draft`.
- [x] Real Obsidian write requires `execute === true`.
- [x] Default or missing `execute` rejects real execution.
- [x] Connector/action mismatch blocks before connector execution.
- [x] Token gate and replay guard run before the Obsidian connector.
- [x] Successful controlled write creates `RuntimeExecutionReceipt.status = succeeded`.
- [x] Successful controlled write consumes the runtime token.
- [x] Tests mock filesystem writes and do not write real files.

## Run-Once / Verify Helper Readiness

- [x] `runRuntimeDispatchJobOnce` processes one explicit job and exits.
- [x] Run-once does not scan the queue.
- [x] Run-once supports `dry_run`.
- [x] Run-once supports `obsidian_write` only with explicit `execute=true`.
- [x] `scripts/runtime-run-once.ts` wraps the one-shot runner.
- [x] `verifyRuntimeDispatchJobOnce` is dry-run only.
- [x] `scripts/runtime-verify-once.ts` prints attempts, receipt, and recovery summary.

## Audit / Query API Readiness

- [x] Runtime token create/query APIs exist.
- [x] Runtime job create/query APIs exist.
- [x] Approved-plan issuance API exists for one low-risk Obsidian token + queued job.
- [x] Worker-facing lease/start/fail/block APIs exist.
- [x] Dry-run and controlled Obsidian completion APIs exist.
- [x] Attempts query API exists.
- [x] Receipt query API exists.
- [x] Recovery query API exists.
- [x] Runtime job timeline API exists.
- [x] Task runtime summary API exists.
- [x] Task runtime operator view API exists.
- [x] Query APIs return `safetyNote`.

## Operator Console Read-Only Readiness

- [x] Runtime read models are defined in `src/lib/runtime-execution/read-models.ts`.
- [x] `RuntimeExecutionPanel` renders task runtime status, counts, latest job, latest receipt, status bands, and safety note.
- [x] Operator Console supports `/operator?runtimeTaskId=<task-id>`.
- [x] TaskBoard includes a read-only `View Runtime Status` link.
- [x] UI-side runtime execution controls are not exposed.
- [x] Operator UI tests assert no unrestricted execution panel wiring.

## Smoke Flow Readiness

- [x] Smoke flow handoff document is `docs/runtime-panel-smoke-flow.md`.
- [x] `docs/runtime-panel-smoke-flow.md` exists.
- [x] Smoke flow covers sample seed.
- [x] Smoke flow covers `/operator?runtimeTaskId=<task-id>`.
- [x] Smoke flow covers dry-run verification.
- [x] Smoke flow covers timeline, receipt, recovery, task summary, and operator view APIs.
- [x] Smoke flow states the default path is dry-run only.

## Hard-Denied Capability Checklist

- [x] shell remains denied.
- [x] Git / PR remains denied.
- [x] deploy remains denied.
- [x] MCP remains denied.
- [x] external API remains denied.
- [x] Tool Registry remains denied.
- [x] arbitrary file write remains denied.
- [x] long-running worker daemon is deferred.
- [x] queue scanning service is deferred.
- [x] multi connector / multi step execution is deferred.
- [x] UI-side execution controls are deferred.

## Open Follow-Ups / Explicitly Deferred Items

- [ ] Deferred: production long-running worker daemon.
- [ ] Deferred: queue scanning service.
- [ ] Deferred: DB-level uniqueness/index hardening beyond current repository guard.
- [ ] Deferred: operator approval workflow that issues runtime tokens from reviewed execution plans.
- [ ] Deferred: structured execution plan emission from ChatHub / Agent Runtime into runtime queue.
- [ ] Deferred: Feishu Doc draft connector.
- [ ] Deferred: multi-step or multi-connector execution.
- [ ] Deferred: UI mutation controls for runtime execution.

## Minimum Acceptance Standard

- [x] Sample seed can create one active token and one queued job.
- [x] Dry-run verify can complete the job with `RuntimeExecutionReceipt.status = dry_run`.
- [x] Operator panel can view the task runtime status through `/operator?runtimeTaskId=<task-id>`.
- [x] Timeline, receipt, recovery, task summary, and operator view APIs are queryable.
- [x] No default smoke flow triggers Obsidian write.
- [x] No shell/Git/PR/deploy/MCP/external API/Tool Registry/arbitrary file write path is exposed.
- [x] No UI-side execution controls are exposed.
