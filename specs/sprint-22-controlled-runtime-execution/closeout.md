# Sprint 22 Closeout / Phase Freeze

## Executive Summary

Sprint 22 has moved `coworker-a2a` from a governance-only prototype toward a controlled runtime execution system without weakening the Sprint 1-21 safety baseline.

The current phase is frozen as a minimum controlled execution loop:

```text
seed or create scoped runtime records -> claim -> start -> complete dry-run or explicit Obsidian write -> receipt / recovery / read-only operator view
```

The default validation path remains `dry_run`. The only real connector currently allowed is:

```text
obsidian_local.write_local_markdown_draft
```

The Operator Console is a read-only observation layer for Sprint 22 runtime state. It does not expose execution, approval, worker, token issuance, connector, or retry controls.

## Completed Scope

- Sprint 22 specs exist under `specs/sprint-22-controlled-runtime-execution/`.
- Prisma runtime records exist for tokens, dispatch jobs, attempts, receipts, and recovery points.
- `src/lib/runtime-execution/` contains the runtime domain module, state machine, validators, repository, runner, seed helper, verify helper, read models, timeline summary, task summary, and operator view model.
- Runtime APIs support token/job creation and query, worker-facing claim/start/heartbeat/fail/block, dry-run completion, controlled Obsidian completion, run-once, audit queries, timeline, task summary, operator view, and sample seed.
- Completion paths pass through token execution gate checks.
- Completion paths pass through replay and idempotency guards.
- The dry-run lifecycle writes a `dry_run` receipt, a `post_execute` recovery point, and consumes the runtime token.
- The controlled Obsidian lifecycle requires explicit `execute=true` and writes a real `succeeded` receipt only after the scoped connector succeeds.
- Developer helpers exist for sample seed, dry-run verification, and single-job run-once execution.
- Operator read models are explicit contracts in `src/lib/runtime-execution/read-models.ts`.
- `RuntimeExecutionPanel` is available in the Operator Console as a read-only panel.
- TaskBoard links to `/operator?runtimeTaskId=<task-id>` with read-only runtime status wording.
- Handoff documentation exists in:
  - `docs/runtime-execution-runbook.md`
  - `docs/runtime-panel-smoke-flow.md`
  - `docs/sprint-22-acceptance-checklist.md`

## Controlled Execution Boundary

Runtime permission exists only through `RuntimeExecutionToken`. A completion path must confirm:

- token exists
- token status is `active`
- token is not expired
- token is not consumed or revoked
- token connector, action, task, idempotency key, and scope match the job
- Obsidian scope is limited to `Inbox/AI Drafts`
- no receipt already exists for the job
- the job has not already succeeded
- the idempotency key has not already produced a succeeded runtime job or receipt

The current real execution boundary is intentionally narrow:

- connector: `obsidian_local`
- action: `write_local_markdown_draft`
- target label: `Inbox/AI Drafts`
- execution mode: explicit `obsidian_write` with `execute=true`
- default verification mode: `dry_run`

## What Was Verified

- Runtime state machine and validators.
- Runtime repository skeleton and lifecycle behavior.
- Token gate behavior for active, consumed, expired, mismatched, and scope-invalid tokens.
- Replay and idempotency protection before dry-run and Obsidian completion.
- Dry-run completion path from running job to terminal receipt.
- Controlled Obsidian completion path with filesystem writes mocked in tests.
- One-shot runner behavior for `dry_run` and explicit `obsidian_write`.
- Verify-once helper behavior for dry-run only.
- Sample seed helper and sample seed API behavior.
- Audit query APIs for attempts, receipt, recovery, and timeline.
- Task-level runtime summary and operator view read models.
- Operator Console read-only runtime panel and TaskBoard read-only navigation.
- Runtime panel smoke flow and Sprint 22 acceptance checklist docs.
- `npx prisma validate`.
- Project lint and targeted runtime/operator/obsidian test suites in the latest validation pass.

## What Remains Deferred

- Structured execution plan emission from ChatHub / Agent Runtime into the runtime queue.
- Runtime token issuance from a real operator approval workflow.
- Long-running worker daemon.
- Queue scanning service.
- Production-grade retry scheduler.
- DB-level uniqueness and locking hardening beyond the current repository-level guards.
- Lease expiry recovery automation.
- Operator-side mutation controls.
- Feishu Doc draft connector.
- Multi-connector execution.
- Multi-step execution.
- General rollback.
- Automatic HarmonyTask completion from runtime success.

## Operator / Developer Entry Points

Developer seed helper:

```bash
npx tsx scripts/runtime-seed-sample-job.ts --taskId=<task-id> --createdBy=operator-dev --workerHint=worker-dev-1 --vaultPath=D:\AI-Vault
```

Dry-run verification helper:

```bash
npx tsx scripts/runtime-verify-once.ts --jobId=<job-id> --workerId=worker-dev-1
```

One-shot dry-run runner:

```bash
npx tsx scripts/runtime-run-once.ts --jobId=<job-id> --workerId=worker-dev-1 --mode=dry_run
```

Explicit controlled Obsidian runner:

```bash
npx tsx scripts/runtime-run-once.ts --jobId=<job-id> --workerId=worker-dev-1 --mode=obsidian_write --execute=true --vaultPath=D:\AI-Vault
```

Read-only Operator Console view:

```text
/operator?runtimeTaskId=<task-id>
```

Core read-only APIs:

- `GET /api/runtime/jobs/<job-id>/timeline`
- `GET /api/runtime/jobs/<job-id>/attempts`
- `GET /api/runtime/jobs/<job-id>/receipt`
- `GET /api/runtime/jobs/<job-id>/recovery`
- `GET /api/tasks/<task-id>/runtime-summary`
- `GET /api/tasks/<task-id>/runtime-operator-view`

## Known Risks / Non-goals

- Repository-level idempotency checks are useful for the current local loop, but production concurrency will need DB-level uniqueness or transactional locking hardening.
- The current one-shot runner is a development and validation helper, not a worker daemon.
- The current seed API is for development and verification only, not production permission issuance.
- The Operator Console observes runtime state but does not issue approvals or execute work.
- The Obsidian connector is low-risk but still a real local write when `execute=true`; default validation must remain dry-run.
- Recovery points are forensic snapshots and replay guards, not generalized rollback.
- Sprint 22 does not reinterpret Sprint 20 Execution Gateway or Sprint 21 assignment review records as runtime permission.

Hard-denied capabilities remain outside this phase:

- shell
- Git / PR
- deploy
- MCP
- external API
- Tool Registry
- arbitrary file write
- browser automation
- long-running worker daemon
- queue scanning service
- multi connector / multi step execution
- UI-side execution controls

## Recommended Next P0 / P1

### P0

- Polish the read-only Operator Runtime panel for denser operator scanning without adding mutation controls.
- Add a real runtime approval issuance path that converts an approved execution plan into one `RuntimeExecutionToken` and one queued `RuntimeDispatchJob`.
- Harden idempotency and token/job invariants with database constraints or transaction-level guards where Prisma and the current database allow it.
- Add lease-expiry inspection and manual recovery documentation before building an automated daemon.
- Add close-range tests around API error shapes for token gate and replay guard failures.

### P1

- Design a long-running worker daemon, but keep implementation gated behind explicit approval and a separate phase.
- Define the structured execution plan bridge from ChatHub / Agent Runtime to runtime job creation.
- Add operator approval UI for token issuance after the API contract is stable.
- Add observability export for runtime lifecycle events.
- Evaluate Feishu Doc draft creation as the second connector only after Obsidian write remains stable.

## Suggested Handoff Prompt

```text
Please continue from the frozen Sprint 22 closeout state in `D:\AI编程\产品自研\AI 生产系统\coworker-a2a`.

Context:
- Sprint 22 has a controlled runtime execution lifecycle with token gate, replay/idempotency guard, dry-run completion, explicit `complete-obsidian-write`, run-once runner, verify-once helper, seed helper/API, audit/timeline/task summary/operator view APIs, and a read-only Operator Console Runtime Execution panel.
- The only real connector is `obsidian_local.write_local_markdown_draft`.
- The default validation path remains dry-run.
- Operator Console is read-only and must not expose runtime mutation controls.
- Hard-denied capabilities remain shell, Git/PR, deploy, MCP, external API, Tool Registry, arbitrary file write, long-running daemon, queue scanning, multi-connector, and multi-step execution.

Task:
Implement the next P0 increment: runtime approval issuance path.

Scope:
1. Read `specs/sprint-22-controlled-runtime-execution/closeout.md`, `docs/runtime-execution-runbook.md`, `docs/sprint-22-acceptance-checklist.md`, and `src/lib/runtime-execution/*`.
2. Add the smallest API/domain helper that converts one already-approved low-risk execution plan record into:
   - one active `RuntimeExecutionToken`
   - one queued `RuntimeDispatchJob`
3. Reuse existing runtime validators, repository functions, token gate conventions, safety note style, and idempotency guard.
4. Keep the connector limited to `obsidian_local.write_local_markdown_draft`.
5. Do not add UI mutation controls, worker daemon, queue scanning, new connectors, shell/Git/PR/deploy/MCP/external API, Tool Registry, or arbitrary file writes.
6. Add focused tests for approved-plan input validation, token/job scope matching, duplicate idempotency rejection, and hard-denied connector/action rejection.
7. Run runtime-execution tests, runtime API tests, obsidian-draft tests, `npx prisma validate`, and `npm run lint`.

Output:
- New/modified files
- Issuance path behavior
- Safety boundaries preserved
- Validation results
- Next recommended P0/P1
```
