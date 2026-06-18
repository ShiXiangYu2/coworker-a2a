# PRD: Sprint 12 - File / Git / PR Proposal Workflow

Created: 2026-06-16
Status: proposed

## Current Baseline

Sprint 12 starts from this real project baseline:

- Sprint 1-9 completed development.
- Sprint 10 Production Hardening / Security / Deployment Readiness completed and passed validation.
- Sprint 11 Controlled Real Tool Runtime completed and passed validation.

Sprint 12 implementation must preserve the Sprint 1-11 baseline and must not introduce execution beyond local File / Git / PR proposal records.

## Problem

Sprint 11 introduced a controlled real Tool Runtime, but only for approved deterministic local `internal_noop` and optional `read_simulated` tools.

The next product need is to let Agents and collaboration records propose code or repository changes in a structured, reviewable way without turning the system into a file writer, Git executor, PR creator, or deployment tool.

## Product Goal

Implement this slice:

```text
AgentResult / ToolResult / ToolExecutionReceipt / CollaborationDecision
  -> FileChangeProposal
  -> PatchDraft
  -> GitChangePlan
  -> PullRequestPlan
  -> ReviewPatchRecord
  -> Kelvin review
  -> approved_record / rejected / superseded / archived
  -> AuditEvent / ObservabilityEvent
  -> ChatHub / Task UI display
```

Do not implement this later slice:

```text
FileChangeProposal / PatchDraft
  -> read real workspace files
  -> write files
  -> apply patches
  -> format files
  -> run shell
  -> run Git
  -> commit / push / merge
  -> create PR
  -> deploy / delete
  -> external API / MCP / browser automation
  -> Task completion
```

## Scope

Sprint 12 includes:

- FileChangeProposal contract.
- PatchDraft contract.
- GitChangePlan contract.
- PullRequestPlan contract.
- ReviewPatchRecord contract.
- File / Git / PR state machine contract.
- File / Git / PR safety contract.
- API design for local proposal record creation, review, and linked queries.
- ChatHub / Task UI entry design.
- AuditEvent and ObservabilityEvent integration.
- Recovery / Resume view-only integration.
- Eval / RegressionGate / ReleaseReadiness recommendation-only integration.

Sprint 12 does not include:

- real workspace file reads.
- file writes, patch application, formatting, or deletes.
- shell commands.
- Git commands.
- commit, push, merge, checkout, rebase, or branch creation.
- PR creation or PR updates.
- deploy, release, or publish.
- database migration.
- external API calls.
- MCP calls.
- browser automation.
- Agent execution or continuation.
- automatic Task completion.
- retry, replay, rollback, or resume execution.
- future automatic approval.

## Persistence Decision

Sprint 12 should eventually add database tables during implementation because the workflow requires auditable local records:

- `FileChangeProposal`
- `PatchDraft`
- `GitChangePlan`
- `PullRequestPlan`
- `ReviewPatchRecord`

However, this specs task must not modify Prisma schema.

## Source Boundaries

Sprint 12 may create proposal records from:

- AgentResult recommendations.
- ToolResult deterministic local records.
- ToolExecutionReceipt deterministic local execution receipts.
- CollaborationDecision approved local records.
- user-provided snippets.
- sanitized context snapshots.

Sprint 12 must not read real workspace file contents. File path references are metadata only unless the user provided the snippet or the snippet came from a sanitized existing record.

Sprint 11 ToolResult and ToolExecutionReceipt records may be used only as sanitized evidence. They must not be treated as permission to write files, apply patches, run Git, create PRs, deploy, delete, or complete Tasks.

## Required Safety Note

```text
Sprint 12 records File / Git / PR proposals only. It does not read real workspace files, write files, apply patches, format files, run shell or Git, commit, push, merge, create PRs, deploy, delete, call external APIs or MCP, automate browsers, execute Agents, complete Tasks, retry, replay, rollback, or resume execution.
```

## Allowed UI Labels

- `Create Change Proposal`
- `View Change Proposal`
- `Draft Patch Record`
- `View Patch Draft`
- `Plan Git Change`
- `View Git Plan`
- `Plan Pull Request`
- `View PR Plan`
- `Submit Proposal Review`
- `Approve Proposal Record`
- `Reject Proposal Record`
- `Supersede Proposal`
- `Archive Proposal`
- `View Audit`
- `View Timeline`

## Disallowed UI Labels

- `Apply Patch`
- `Write File`
- `Format`
- `Run Git`
- `Commit`
- `Push`
- `Create PR`
- `Deploy`
- `Delete`
- `Merge`
- `Auto Apply`
- `Checkout`
- `Rebase`
- `Rollback`
- `Replay`
- `Retry Automatically`
- `Resume Execution`

## Acceptance Criteria

- FileChangeProposal is independent from ToolRun.
- PatchDraft is persisted as a proposal record and cannot be applied.
- PullRequestPlan is a plan record only and cannot create a PR.
- Kelvin approval only approves a local record.
- Kelvin approval does not write files, run Git, create PRs, deploy, delete, or complete Tasks.
- No Sprint 12 state is named `applied`, `written`, `formatted`, `committed`, `pushed`, `merged`, `pr_created`, `deployed`, `deleted`, or `executed`.
- APIs support proposal creation, review, approval record, rejection, supersede, archive, and linked queries only.
- APIs do not include apply, write, format, Git, commit, push, PR creation, deploy, delete, merge, checkout, rebase, retry, replay, rollback, or resume execution semantics.
- Sprint 12 `POST` APIs only create or review local records and must not read real workspace files, write files, execute Git, create PRs, call external APIs, or trigger ToolRun execution.
- Observability / Audit / Recovery / Resume remain view-only and audit-only.
- Eval / RegressionGate / ReleaseReadiness remain recommendation-only and are not execution tokens.
- Sprint 1-11 behavior does not regress.
- Sprint 11 ToolResult and ToolExecutionReceipt evidence cannot become a File / Git / PR execution token.
- No Sprint 12 model or table is named or behaves like FileWrite, FilePatchApply, GitOperation, PullRequestRun, DeployRun, DeleteOperation, worker, queue, retry, replay, rollback, or resume execution.
