# Sprint 22 Runtime Panel Smoke Flow

This smoke flow verifies the current controlled runtime loop without adding new execution capabilities:

```text
seed sample job -> open Operator Runtime panel -> dry-run verify -> inspect timeline / receipt / recovery -> reopen panel
```

## Preconditions

- The dev server is running.
- Prisma client is generated and the database schema has the Sprint 22 models.
- The database has been migrated or otherwise prepared for:
  - `RuntimeExecutionToken`
  - `RuntimeDispatchJob`
  - `RuntimeDispatchAttempt`
  - `RuntimeExecutionReceipt`
  - `RuntimeRecoveryPoint`
- Use this flow for development or handoff verification only.

## Step 1: Seed a Sample Runtime Job

Create one active token and one queued job:

```bash
npx tsx scripts/runtime-seed-sample-job.ts --taskId=smoke-task-1 --createdBy=operator-smoke --workerHint=worker-smoke-1 --vaultPath=D:\AI-Vault
```

Keep these fields from the JSON output:

- `taskId`: use it to open the Operator Runtime panel.
- `jobId`: use it for dry-run verification and audit APIs.
- `tokenId`: confirms the scoped runtime token was issued and activated.

The seed step only creates records. It does not claim a job, run a worker, complete a job, or write to Obsidian.

## Step 2: Open the Read-Only Runtime Panel

Open:

```text
/operator?runtimeTaskId=<task-id>
```

The Operator Console reads:

```http
GET /api/tasks/<task-id>/runtime-operator-view
```

Expected before dry-run:

- the panel renders for the selected task
- the task has a queued runtime job
- no receipt exists yet
- no execution control is shown

## Step 3: Run Dry-Run Verification

Run the controlled dry-run verification helper:

```bash
npx tsx scripts/runtime-verify-once.ts --jobId=<job-id> --workerId=worker-smoke-1
```

This dry-run path validates the controlled lifecycle and audit records. It does not trigger Obsidian Markdown writing.

Expected output:

- claim status is `leased`
- start status is `running`
- completion status is `succeeded`
- receipt status is `dry_run`
- attempts, receipt, and recovery summary are printed

## Step 4: Inspect Query APIs

Use the same `jobId` and `taskId` from the seed output.

Timeline:

```http
GET /api/runtime/jobs/<job-id>/timeline
```

Receipt:

```http
GET /api/runtime/jobs/<job-id>/receipt
```

Recovery:

```http
GET /api/runtime/jobs/<job-id>/recovery
```

Task runtime summary:

```http
GET /api/tasks/<task-id>/runtime-summary
```

Operator view model:

```http
GET /api/tasks/<task-id>/runtime-operator-view
```

Expected after dry-run:

- timeline has attempts and a `dry_run` receipt
- receipt endpoint returns `status = dry_run`
- recovery includes a `post_execute` recovery point
- task summary reports one terminal runtime job
- operator view model updates `latestReceiptStatus`

## Step 5: Reopen the Runtime Panel

Open again:

```text
/operator?runtimeTaskId=<task-id>
```

Confirm:

- the panel still renders as read-only
- the latest receipt status reflects `dry_run`
- counts and status bands reflect the completed dry-run job
- no execution controls are shown

## Hard-Denied Capabilities

This smoke flow does not allow:

- no worker daemon
- no queue scanning
- no shell/Git/PR/deploy/MCP/external API
- no Tool Registry
- no arbitrary file write
- no Obsidian write unless explicitly running the separate controlled `obsidian_write` path

The default smoke path is dry-run only. Do not use `obsidian_write` as the default smoke verification path.
