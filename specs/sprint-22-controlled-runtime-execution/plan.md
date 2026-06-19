# Sprint 22 Plan

## Phase 1: Baseline Review

- Verify Sprint 22 starts after Sprint 1-21 completion.
- Verify Sprint 1-21 records remain governance-only evidence.
- Verify no existing approval record is reinterpreted as runtime permission.
- Verify `src/lib/tools/obsidian-draft.ts` is the only real connector candidate for phase 1.

## Phase 2: Runtime Contract Specs

- Define structured execution-plan artifact requirements.
- Define runtime token lifecycle and scope rules.
- Define runtime job lifecycle and lease rules.
- Define runtime attempt, runtime receipt, and runtime recovery-point semantics.
- Define hard-deny runtime categories.

## Phase 3: API + Worker Specs

- Define runtime token issue/query APIs.
- Define runtime job queue/query APIs.
- Define worker claim/heartbeat/complete/fail/block APIs.
- Define DB-backed queue and worker lease model.
- Define observability and audit linkage back to Harmony Task and AgentRun.

## Phase 4: Connector Phase-1 Spec

- Constrain runtime connector scope to Obsidian local draft write only.
- Reuse existing `obsidian-draft` plan/receipt semantics where possible.
- Require configured vault root + Inbox/AI Drafts path enforcement.
- Define receipt fields for created path and content summary.

## Phase 5: Safety Review

- Verify runtime token is the only permission artifact for real execution.
- Verify runtime token is single-use and scope-bound.
- Verify idempotency blocks duplicate execution.
- Verify retries are bounded and non-destructive.
- Verify rollback is not generalized.
- Verify shell/Git/PR/deploy/MCP/external API remain denied.

## Phase 6: Implementation Order Gate

Implementation should begin in this order:

1. Prisma models for runtime token/job/attempt/receipt/recovery.
2. Runtime types/state machine modules under `src/lib/runtime-execution/`.
3. Token issue + queue APIs.
4. Worker lease + job claim flow.
5. Obsidian connector wrapper reusing `src/lib/tools/obsidian-draft.ts`.
6. Operator Console runtime views.
7. End-to-end tests for one approved Obsidian draft write.

## Review Checklist

- Verify Sprint 22 is explicitly a new execution phase.
- Verify exactly one connector family is in scope.
- Verify structured execution plan is separate from freeform LLM text.
- Verify runtime token lifecycle is explicit and auditable.
- Verify job lifecycle supports queued / leased / running / succeeded / failed / blocked / cancelled only.
- Verify worker APIs cannot bypass token checks.
- Verify runtime receipt is distinct from Sprint 20 local receipt records.
- Verify recovery records do not imply arbitrary rollback.
- Verify Operator Console labels do not imply unrestricted execution.
