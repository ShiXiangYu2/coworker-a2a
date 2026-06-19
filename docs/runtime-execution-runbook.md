# Sprint 22 Runtime Execution Runbook

## Purpose

Sprint 22 introduces a controlled runtime execution layer after the Sprint 1-21 governance-only baseline. Runtime execution is allowed only through scoped Sprint 22 runtime records, not through older governance evidence.

This runbook covers the current minimal loop:

1. Create or select an approved runtime job.
2. Run one job once in dry-run mode, or explicitly run the single Obsidian connector path.
3. Inspect attempts, receipt, and recovery points.

For the end-to-end Operator panel handoff flow, see `docs/runtime-panel-smoke-flow.md`.

For the phase acceptance gate, see `docs/sprint-22-acceptance-checklist.md`.

For the Sprint 22 phase freeze and handoff summary, see `specs/sprint-22-controlled-runtime-execution/closeout.md`.

## Safety Boundary

Runtime permission exists only through `RuntimeExecutionToken`.

The token must be:

- `active`
- not expired
- not consumed
- not revoked
- scoped to the same task, connector, action, and idempotency key as the job
- limited to `Inbox/AI Drafts` for the Obsidian connector

Replay protection also applies:

- a job with an existing `RuntimeExecutionReceipt` cannot complete again
- a consumed token cannot complete again
- an idempotency key with a live or succeeded job cannot be queued again
- an idempotency key with a succeeded job blocks later completion

## Current Real Connector

The only real connector in Sprint 22 phase 1 is:

```text
obsidian_local.write_local_markdown_draft
```

It writes Markdown drafts to the configured Obsidian vault under:

```text
Inbox/AI Drafts
```

## Dry-Run vs Obsidian Write

`dry_run`:

- uses the same runtime queue and token lifecycle
- does not call the Obsidian connector
- creates a `RuntimeExecutionReceipt` with `status = dry_run`
- consumes the runtime token
- creates a `post_execute` recovery point

`obsidian_write`:

- requires explicit `execute=true`
- validates token scope and replay guards before connector execution
- calls `executeObsidianDraftPlan`
- creates a `RuntimeExecutionReceipt` with `status = succeeded`
- consumes the runtime token
- records the created Markdown path in receipt result data

## Run-Once Runner

Dry-run example:

```bash
npx tsx scripts/runtime-run-once.ts --jobId=<job-id> --workerId=worker-dev-1 --mode=dry_run
```

Obsidian write example:

```bash
npx tsx scripts/runtime-run-once.ts --jobId=<job-id> --workerId=worker-dev-1 --mode=obsidian_write --execute=true --vaultPath=D:\AI-Vault
```

The runner processes exactly one explicit job and exits. It does not scan the queue.

## Seed a Sample Job

Use the seed helper when you need one reproducible Sprint 22 runtime job for local verification:

```bash
npx tsx scripts/runtime-seed-sample-job.ts --taskId=<task-id> --createdBy=operator-dev --workerHint=worker-dev-1 --vaultPath=D:\AI-Vault
```

The helper creates only:

- one `active` `RuntimeExecutionToken`
- one `queued` `RuntimeDispatchJob`
- `obsidian_local.write_local_markdown_draft`
- `Inbox/AI Drafts` scope and payload

It does not claim, start, complete, run a worker, or write to Obsidian. The JSON output includes `tokenId`, `jobId`, `correlationId`, `idempotencyKey`, and suggested next commands.

After seeding, verify the lifecycle without a real connector:

```bash
npx tsx scripts/runtime-verify-once.ts --jobId=<job-id> --workerId=worker-dev-1
```

Or run the explicit dry-run runner:

```bash
npx tsx scripts/runtime-run-once.ts --jobId=<job-id> --workerId=worker-dev-1 --mode=dry_run
```

For a controlled Obsidian write, create a fresh seeded job and pass `execute=true` explicitly:

```bash
npx tsx scripts/runtime-run-once.ts --jobId=<job-id> --workerId=worker-dev-1 --mode=obsidian_write --execute=true --vaultPath=D:\AI-Vault
```

Development API alternative:

```http
POST /api/runtime/seed-sample-job
Content-Type: application/json

{
  "taskId": "task-123",
  "createdBy": "operator-dev",
  "workerHint": "worker-dev-1",
  "vaultPath": "D:\\AI-Vault"
}
```

This API is for development and verification only. It creates one active token and one queued job, but it does not claim, start, complete, run a runner, or write to Obsidian.

## Dry-Run Verification Helper

Use this helper when you only want to verify the controlled lifecycle and audit records:

```bash
npx tsx scripts/runtime-verify-once.ts --jobId=<job-id> --workerId=worker-dev-1
```

It only runs:

```text
claim -> start -> complete-dry-run -> query attempts/receipt/recovery
```

It does not support `obsidian_write` or `execute=true`.

## Audit Query APIs

Timeline summary:

```http
GET /api/runtime/jobs/<job-id>/timeline
```

This is a read-only operator/developer summary API. It returns the job, token, attempts, receipt, recovery points, and derived status metadata such as `hasReceipt`, `receiptStatus`, `attemptCount`, `recoveryCount`, `isTerminal`, and `leaseActive`. It does not mutate runtime state or execute any connector.

Task runtime summary:

```http
GET /api/tasks/<task-id>/runtime-summary
```

This is a task-level read-only overview API for operator and developer inspection. It returns all runtime job timelines for the task, status counts, receipt counts, and derived metadata such as `hasAnyLiveJob`, `hasAnySucceededJob`, and `latestJobId`. Tasks without runtime jobs return an empty summary instead of an error.

The timeline and task runtime summary response shapes are Sprint 22 read model contracts defined in `src/lib/runtime-execution/read-models.ts`.

Operator view model:

```http
GET /api/tasks/<task-id>/runtime-operator-view
```

This endpoint is a read-only operator-facing adapter over the task runtime summary. It returns `summary`, `latestJob`, `latestReceipt`, `statusBands`, and `highlight` fields for future Operator Console consumption. It does not claim jobs, run workers, complete jobs, or execute connectors.

Operator Console runtime panel:

- component: `src/components/operator-console/runtime-execution-panel.tsx`
- input: `taskId`
- API: `GET /api/tasks/<task-id>/runtime-operator-view`
- mode: read-only

The panel displays Sprint 22 runtime status, counts, receipt summary, status bands, latest job, latest receipt, and the safety note. It does not provide execution, approval, worker, token issuance, or connector controls.

The Operator Console page now wires this panel through the URL query:

```text
/operator?runtimeTaskId=<task-id>
```

When `runtimeTaskId` is missing, the panel stays in a read-only empty state and does not auto-trigger runtime actions.

The TaskBoard now includes a read-only `View Runtime Status` link for each task. It navigates to `/operator?runtimeTaskId=<task-id>` and is for inspection only.

Attempts:

```http
GET /api/runtime/jobs/<job-id>/attempts
```

Receipt:

```http
GET /api/runtime/jobs/<job-id>/receipt
```

Recovery:

```http
GET /api/runtime/jobs/<job-id>/recovery
```

All query APIs return the Sprint 22 safety note and do not mutate job state.

## Common Failure Causes

`Runtime execution token must be active`:

- token is still `draft`
- token was already consumed
- token was revoked or expired

`Runtime execution token has expired`:

- issue a new approved runtime token and job

`scope ... does not match`:

- token scope does not match the job connector, action, task, or idempotency key

`scope must be limited to Inbox/AI Drafts`:

- Obsidian scope attempted to leave the approved draft directory

`receipt already exists`:

- the job has already completed and cannot be replayed

`idempotencyKey already has a live or succeeded job`:

- a queued, leased, running, or succeeded job already exists for the same logical execution

`leaseOwner mismatch`:

- a different worker owns the current lease

## Hard-Denied Capabilities

Sprint 22 still denies:

- shell
- Git / PR
- deploy
- MCP
- external API
- Tool Registry
- arbitrary file write
- multi connector / multi step

These capabilities must not be exposed through runtime APIs, scripts, or worker helpers.
