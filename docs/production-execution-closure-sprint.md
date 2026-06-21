# Production Execution Closure Sprint

## Goal

Turn the existing governance prototype plus runtime execution primitives into the smallest real execution closure:

```text
HarmonyTask -> approved RuntimeExecutionToken -> queued RuntimeDispatchJob -> TaskQueueJob worker envelope -> RuntimeExecutionReceipt -> HarmonyTask status observation
```

This sprint does not introduce a new execution engine. It reuses Sprint 22 runtime execution as the single runtime permission and receipt boundary.

## Current Breakpoints

- `RuntimeExecutionToken` is already the only scoped runtime permission record.
- `RuntimeExecutionReceipt` is already the only receipt that may represent Sprint 22 real execution.
- `ExecutionWorker` previously claimed `TaskQueueJob` records but completed them through a mock executor.
- `TaskQueueJob` and `RuntimeDispatchJob` were parallel queues with no execution handoff.
- HarmonyTask did not observe runtime receipts, so runtime success could not safely influence task state.

## Minimal Design

- `TaskQueueJob` remains the asynchronous worker envelope.
- The real work remains in `RuntimeDispatchJob`.
- A worker-owned `TaskQueueJob` finds one queued `RuntimeDispatchJob` for the same `taskId`.
- The worker calls `runRuntimeDispatchJobOnce`.
- Default worker mode is `dry_run`.
- Real Obsidian write requires both `WORKER_RUNTIME_MODE=obsidian_write` and `WORKER_EXECUTE_REAL=true`.
- Shell, Git, PR, deploy, MCP, arbitrary file write, browser automation, and external API remain outside this closure.

## Status Mapping

- `RuntimeExecutionReceipt.status = succeeded`: mark HarmonyTask completed only when the current Harmony state can validly transition with `MARK_COMPLETED`.
- `RuntimeExecutionReceipt.status = dry_run`: record observation in HarmonyTask `statusReason`; do not mark completed.
- Runtime token/scope/approval mismatch: mark `TaskQueueJob.status = blocked` and block the HarmonyTask when its state machine allows it.
- Transient execution failure: keep the existing retry/dead-letter behavior.

## Operator Visibility

Operator Console continues to read runtime jobs, attempts, receipts, recovery points, worker events, and Harmony audit events. This sprint does not add UI mutation controls.

## Remaining Production Gaps

- Runtime job issuance still depends on an approved-plan input, not full ChatHub automatic plan emission.
- Worker queue and runtime queue are associated by `taskId`; a later sprint should add an explicit `runtimeDispatchJobId` field or metadata envelope.
- Idempotency and lease guards are repository-level; production concurrency still needs stronger DB constraints or transactional locking.
- Real connector support remains limited to `obsidian_local.write_local_markdown_draft`.
