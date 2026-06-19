# Sprint 22 PRD: Controlled Runtime Execution

## Baseline

Sprint 22 starts after Sprint 1-21 complete:

- Sprint 1-15 sealed the v1 governance MVP.
- Sprint 16 completed Operator Console UX.
- Sprint 17 completed read-only Evidence Import Sandbox.
- Sprint 18 completed Department Agent Profiles.
- Sprint 19 completed Department-Aware Operator Review / Evidence-to-Department Mapping.
- Sprint 20 completed local Execution Gateway / Human-Gated Execution records.
- Sprint 21 completed local Department Task Intake / Assignment Review records.

Sprint 22 is the first post-v1 execution-phase sprint. It does not weaken Sprint 1-21 governance boundaries retroactively. Instead, it introduces a separately reviewed runtime execution layer with explicit runtime-only records, scoped permissions, and one low-risk real connector.

## Goal

Sprint 22 introduces the smallest real execution loop that can turn a reviewed plan into one controlled runtime action.

The first supported end-to-end loop is:

1. User submits a task in ChatHub.
2. CEO / Router selects or decomposes work.
3. Agent produces a structured execution plan.
4. Runtime Dispatcher converts the approved plan into a queued runtime job.
5. Worker executes exactly one approved low-risk connector action.
6. Runtime receipt, audit, and recovery records are persisted.

Sprint 22 must support only one real connector in phase 1:

- `write_local_markdown_draft` via the existing Obsidian Inbox draft path.

Feishu Doc draft creation is a later follow-up and is out of Sprint 22 implementation scope.

## Why Obsidian First

Sprint 22 should prefer the existing local Obsidian draft path because:

- the repo already contains `src/lib/tools/obsidian-draft.ts`;
- the action is low-risk compared with email, deploy, Git, or external API writes;
- the filesystem boundary can stay inside a configured vault subdirectory;
- receipt validation is straightforward;
- it proves real execution without requiring network credentials or external availability.

## Scope

Sprint 22 introduces a new runtime execution phase with explicit runtime-only records, APIs, worker flow, and one connector.

### In Scope

- reuse ChatHub, Agent Router, Harmony Task, Agent Runtime, Tool Governance, Execution Gateway, and Operator Console structures;
- define a structured execution-plan artifact produced by Agent runtime;
- define runtime dispatch, runtime token, worker attempt, runtime receipt, and recovery-point records;
- allow one real connector action only:
  - `write_local_markdown_draft`;
- require explicit scoped permission before runtime execution;
- persist audit trail from request to receipt;
- support timeout, retry, idempotency, and bounded recovery;
- add operator-visible runtime status views;
- keep high-risk actions human-gated or hard-denied.

### Out of Scope

Sprint 22 must not:

- execute shell commands;
- run Git;
- create PRs;
- deploy, publish, or release;
- connect MCP;
- call arbitrary external APIs;
- execute more than one real connector family;
- execute browser automation;
- mutate arbitrary workspace files;
- perform unrestricted filesystem writes;
- auto-approve future executions;
- reinterpret Sprint 20 or Sprint 21 approvals as runtime permission;
- remove or rewrite Sprint 1-21 safety contracts.

## Runtime Boundary

Sprint 22 creates a new boundary:

- Sprint 1-21 governance records remain local review evidence.
- Runtime permission exists only through Sprint 22 runtime records.
- No pre-Sprint-22 approval record is a runtime token.
- Runtime execution is allowed only when all of the following exist:
  - approved execution-plan review;
  - approved runtime token with scoped permission;
  - allowed connector action;
  - matching idempotency key;
  - active job lease held by a worker;
  - unresolved deny conditions absent.

## User Story

As an operator, I can let the system execute one low-risk, reviewed Obsidian draft write after Agent planning is complete, and I can inspect the queue, attempts, receipts, and recovery metadata in the same governance stack.

## Minimal End-to-End Flow

### Happy Path

1. User sends a task in ChatHub.
2. `src/app/api/chat/route.ts` creates or routes the conversation and task.
3. Agent runtime produces normal analysis output plus a structured execution plan.
4. Execution Gateway review records are created from the plan.
5. Kelvin or allowed operator approves the single execution plan for runtime issuance.
6. Runtime Dispatcher issues a scoped runtime token and creates a queued runtime job.
7. Worker claims the job lease.
8. Worker executes `write_local_markdown_draft` through `src/lib/tools/obsidian-draft.ts`.
9. Worker writes a runtime execution receipt and runtime recovery point.
10. Harmony task, audit timeline, and Operator Console show completion details.

### Blocked Path

Execution must not start when:

- the plan contains any action other than `write_local_markdown_draft`;
- the target path escapes the configured Obsidian Inbox/AI Drafts directory;
- the token is expired, superseded, revoked, or scope-mismatched;
- the job is already completed under the same idempotency key;
- retry budget is exhausted;
- the task still requires human confirmation at analysis level;
- the plan references denied runtime categories.

## Structured Execution Plan

Sprint 22 adds an Agent-produced structured artifact, separate from freeform summary text.

### Required Shape

```ts
type RuntimeActionType = 'write_local_markdown_draft'

interface StructuredExecutionPlan {
  id: string
  taskId: string
  agentRunId: string
  summary: string
  actionType: RuntimeActionType
  connectorId: 'obsidian_local'
  riskLevel: 'low'
  requiresHumanApproval: boolean
  idempotencyKey: string
  timeoutMs: number
  maxAttempts: number
  payload: {
    draftTitle: string
    filename: string
    content: string
    targetDirectoryLabel: 'Inbox/AI Drafts'
  }
}
```

### Rules

- Only one action per plan in Sprint 22.
- `connectorId` must be `obsidian_local`.
- `riskLevel` must be `low`.
- `requiresHumanApproval` defaults to `true` for Sprint 22 phase 1.
- `content` must be complete at planning time; worker does not call LLM.

## Data Model Additions

Sprint 22 should add the following Prisma-backed records.

### 1. RuntimeExecutionToken

Purpose:

- the only record that grants runtime permission for one scoped execution.

Required fields:

- `id`
- `taskId`
- `agentRunId`
- `executionPlanRecordId`
- `executionApprovalRecordId`
- `status`: `draft | active | consumed | expired | revoked | archived`
- `connectorId`
- `actionType`
- `scopeJson`
- `issuedBy`
- `approvedBy`
- `idempotencyKey`
- `expiresAt`
- `consumedAt?`
- `revokedAt?`
- `correlationId`
- `createdAt`
- `updatedAt`

Rules:

- one token grants one action only;
- token approval is not reusable;
- token cannot be refreshed automatically;
- token status change must be audited.

### 2. RuntimeDispatchJob

Purpose:

- queue record for worker execution.

Required fields:

- `id`
- `taskId`
- `runtimeTokenId`
- `status`: `queued | leased | running | succeeded | failed | blocked | cancelled`
- `connectorId`
- `actionType`
- `payloadJson`
- `priority`
- `attemptCount`
- `maxAttempts`
- `leaseOwner?`
- `leaseExpiresAt?`
- `scheduledAt`
- `startedAt?`
- `completedAt?`
- `lastErrorJson?`
- `idempotencyKey`
- `correlationId`
- `createdAt`
- `updatedAt`

Rules:

- unique `idempotencyKey` per live job;
- only one active lease at a time;
- worker must renew or release lease explicitly.

### 3. RuntimeDispatchAttempt

Purpose:

- append-only execution attempt log.

Required fields:

- `id`
- `jobId`
- `attempt`
- `status`: `leased | running | succeeded | failed | timed_out | blocked`
- `workerId`
- `startedAt`
- `endedAt?`
- `errorJson?`
- `receiptId?`
- `createdAt`

Rules:

- append-only;
- one record per attempt number;
- retains timeout vs failure distinction.

### 4. RuntimeExecutionReceipt

Purpose:

- real execution receipt, distinct from Sprint 20 local `ExecutionReceiptRecord`.

Required fields:

- `id`
- `jobId`
- `runtimeTokenId`
- `taskId`
- `connectorId`
- `actionType`
- `status`: `succeeded | failed | blocked | dry_run`
- `targetRef`
- `summary`
- `resultJson`
- `startedAt`
- `completedAt`
- `correlationId`
- `createdAt`

Rules:

- this is the first receipt type that may claim real execution;
- must never be confused with Sprint 20 local receipts;
- must point to exactly one runtime token and one job.

### 5. RuntimeRecoveryPoint

Purpose:

- bounded recovery metadata for retry and operator inspection.

Required fields:

- `id`
- `jobId`
- `attemptId`
- `recoveryKind`: `pre_execute | post_execute | failure_snapshot`
- `snapshotJson`
- `createdAt`

Rules:

- recovery is bounded to inspection and replay of the queued runtime job only;
- no arbitrary rollback of repository or system state.

## API Additions

Sprint 22 adds new runtime APIs. They are separate from Sprint 20 local record APIs.

### Create / Issue

- `POST /api/runtime/tokens`
- `POST /api/runtime/jobs`
- `POST /api/runtime/jobs/from-execution-plan`

### Query / Audit

- `GET /api/runtime/jobs`
- `GET /api/runtime/jobs/[id]`
- `GET /api/runtime/jobs/[id]/attempts`
- `GET /api/runtime/jobs/[id]/receipt`
- `GET /api/runtime/jobs/[id]/recovery`
- `GET /api/runtime/tokens/[id]`
- `GET /api/tasks/[id]/runtime-jobs`

### Worker Actions

- `POST /api/runtime/jobs/claim`
- `POST /api/runtime/jobs/[id]/heartbeat`
- `POST /api/runtime/jobs/[id]/complete`
- `POST /api/runtime/jobs/[id]/fail`
- `POST /api/runtime/jobs/[id]/block`

### API Rules

- worker endpoints require a worker identity and lease validation;
- user-facing APIs must not execute connector logic directly;
- `from-execution-plan` must validate governance approval before issuing a token;
- no runtime endpoint may allow shell, Git, deploy, PR, MCP, or arbitrary API semantics.

## Worker / Queue Design

Sprint 22 should use a DB-backed queue first because the current repo already uses Prisma + SQLite.

### Worker Model

- one separate worker process, started outside request/response flow;
- polling loop with bounded concurrency;
- claims queued jobs by lease;
- executes connector locally;
- writes attempt + receipt + recovery metadata;
- updates Harmony / observability timeline after completion.

### Why DB Queue First

- minimal dependency footprint;
- easier repo-local adoption;
- enough for one connector and one operator;
- can later migrate to Redis or external queue without changing the execution contract.

### Lease Rules

- claim requires `status = queued`;
- claim writes `leaseOwner`, `leaseExpiresAt`, `status = leased`;
- heartbeat extends lease;
- expired lease returns job to `queued` only if no success receipt exists.

## Execution Token / Scoped Permission

Sprint 22 runtime permission comes only from `RuntimeExecutionToken`.

### Scope

Token scope must include:

- `connectorId = obsidian_local`
- `actionType = write_local_markdown_draft`
- allowed vault root
- allowed subdirectory label: `Inbox/AI Drafts`
- exact filename or deterministic filename policy
- exact task / plan / job correlation
- expiry timestamp

### Denies

Token must be denied when:

- connector mismatch;
- action mismatch;
- path mismatch;
- expired token;
- consumed token;
- revoked token;
- missing execution approval;
- payload drift after approval.

## Retry / Idempotency / Timeout / Rollback

### Retry

- default `maxAttempts = 2`;
- retry only for transient filesystem errors or lease loss;
- no retry for scope violations or approval mismatch;
- retries must create new `RuntimeDispatchAttempt` records.

### Idempotency

- `idempotencyKey` derived from task + plan + connector + payload hash;
- duplicate live job creation with the same key is forbidden;
- worker complete endpoint must be idempotent;
- if a success receipt already exists, the job cannot re-run.

### Timeout

- default `timeoutMs = 15000` for Obsidian write;
- timed-out attempt moves to `timed_out`;
- job remains retryable only if attempt budget remains and no write receipt succeeded.

### Rollback

Sprint 22 does not support generalized rollback.

Allowed rollback strategy:

- none for successful Obsidian writes;
- instead, record the created path in `RuntimeExecutionReceipt`;
- operator may manually archive or revise the note later;
- recovery focuses on replay protection and forensic visibility, not destructive undo.

## Approval Policy

### Requires Human Approval in Sprint 22 Phase 1

- all runtime token issuance;
- all jobs targeting real connector execution;
- any content that leaves the repo-local process boundary in future phases;
- any future connector other than local Obsidian draft write.

### Still Hard-Denied

- shell execution;
- Git operations;
- PR creation;
- deploy / release;
- external API calls;
- MCP connection;
- arbitrary file writes outside configured Obsidian draft path;
- multi-step mixed connector execution;
- autonomous task completion without receipt.

## UI Surface

Sprint 22 may add Operator Console and task views with these labels:

- View Runtime Plan
- Issue Runtime Token
- Queue Runtime Job
- View Runtime Job
- View Runtime Attempt
- View Runtime Receipt
- View Runtime Recovery
- Requeue Runtime Job
- Revoke Runtime Token

Forbidden labels:

- Run Shell
- Run Git
- Deploy Now
- Connect MCP
- Execute Any File Write
- Bypass Approval
- Auto Approve Future Runs

## Success Criteria

- one reviewed ChatHub task can produce one structured runtime execution plan;
- one approved runtime token can issue one queued runtime job;
- worker can execute one real Obsidian draft write successfully;
- runtime receipt and recovery records are persisted;
- duplicate execution is blocked by idempotency;
- out-of-scope paths are blocked by scoped permission;
- Operator Console can inspect runtime queue, attempts, receipt, and recovery state;
- Sprint 1-21 governance boundaries remain intact and are not silently reinterpreted.
