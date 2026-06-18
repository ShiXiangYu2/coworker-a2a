# Plan: Sprint 12 - File / Git / PR Proposal Workflow

Status: proposed

## Current Baseline

Sprint 12 starts after Sprint 1-11 are complete. Sprint 10 production hardening and Sprint 11 controlled local Tool Runtime are already part of the baseline.

Sprint 12 must preserve Sprint 1-11 behavior and remain proposal-only for File / Git / PR workflows.

## Implementation Order

1. Add Sprint 12 contracts for FileChangeProposal, PatchDraft, GitChangePlan, PullRequestPlan, ReviewPatchRecord, state machine, and safety.
2. Extend AgentResult, ToolResult, ToolExecutionReceipt evidence handling, CollaborationDecision, confirmation, audit, observability, recovery, resume, eval, regression, readiness, security, and tool safety contracts.
3. Add TypeScript types after specs review.
4. Add pure validation for proposal payloads, source snapshots, path metadata, forbidden state names, and forbidden action terms.
5. Add persistence after schema review.
6. Add local proposal/review APIs.
7. Add ChatHub / Task UI proposal display.
8. Add tests proving Sprint 12 cannot write files, run Git, create PRs, deploy, delete, or complete Tasks.
9. Add regression tests proving Sprint 1-11 behavior does not regress.

## Recommended Persistence

Sprint 12 may add tables during implementation:

- `FileChangeProposal`
- `PatchDraft`
- `GitChangePlan`
- `PullRequestPlan`
- `ReviewPatchRecord`

Do not add:

- FileWrite
- FilePatchApply
- FormatRun
- ShellCommand
- GitOperation
- GitCommit
- GitPush
- GitMerge
- GitCheckout
- PullRequestRun
- PullRequestCreate
- DeployRun
- DeleteOperation
- ExternalApiCall
- McpSession
- BrowserSession
- AutoApplyJob
- RetryJob
- ReplayJob
- RollbackJob
- ResumeExecutionJob

## Design Decisions

- `FileChangeProposal` should be independent from `ToolRun`.
- `PatchDraft` should be persisted because it is review evidence.
- `PullRequestPlan` must be a plan record only.
- Sprint 12 must not read real workspace files.
- Source content must come only from AgentResult, ToolResult, ToolExecutionReceipt, CollaborationDecision, user-provided snippet, or sanitized context snapshot.
- Sprint 11 ToolResult and ToolExecutionReceipt may be used as sanitized evidence only and must not authorize file writes, patch application, Git, PR, deploy, delete, ToolRun execution, or Task completion.
- File path values are metadata and must not be dereferenced by Sprint 12.

## API Groups

File change proposals:

- `POST /api/file-change-proposals/from-agent-result`
- `POST /api/file-change-proposals/from-tool-result`
- `POST /api/file-change-proposals/from-tool-execution-receipt`
- `POST /api/file-change-proposals/from-collaboration-decision`
- `GET /api/file-change-proposals`
- `GET /api/file-change-proposals/:id`
- `POST /api/file-change-proposals/:id/submit-review`
- `POST /api/file-change-proposals/:id/approve-record`
- `POST /api/file-change-proposals/:id/reject`
- `POST /api/file-change-proposals/:id/supersede`
- `POST /api/file-change-proposals/:id/archive`

Patch drafts:

- `POST /api/patch-drafts`
- `GET /api/patch-drafts`
- `GET /api/patch-drafts/:id`
- `POST /api/patch-drafts/:id/submit-review`
- `POST /api/patch-drafts/:id/approve-record`
- `POST /api/patch-drafts/:id/reject`
- `POST /api/patch-drafts/:id/supersede`
- `POST /api/patch-drafts/:id/archive`

Git and PR plans:

- `POST /api/git-change-plans`
- `GET /api/git-change-plans`
- `GET /api/git-change-plans/:id`
- `POST /api/git-change-plans/:id/submit-review`
- `POST /api/git-change-plans/:id/approve-record`
- `POST /api/git-change-plans/:id/reject`
- `POST /api/pull-request-plans`
- `GET /api/pull-request-plans`
- `GET /api/pull-request-plans/:id`
- `POST /api/pull-request-plans/:id/submit-review`
- `POST /api/pull-request-plans/:id/approve-record`
- `POST /api/pull-request-plans/:id/reject`

Review records:

- `POST /api/review-patch-records`
- `GET /api/review-patch-records`
- `GET /api/review-patch-records/:id`
- `POST /api/review-patch-records/:id/approve-record`
- `POST /api/review-patch-records/:id/reject`
- `POST /api/review-patch-records/:id/archive`

Linked queries:

- `GET /api/harmony/tasks/:id/file-change-proposals`
- `GET /api/agent-runtime/runs/:id/file-change-proposals`
- `GET /api/tool-runs/:id/file-change-proposals`
- `GET /api/tool-execution-receipts/:id/file-change-proposals`
- `GET /api/collaboration-decisions/:id/file-change-proposals`
- `GET /api/file-change-proposals/:id/patch-drafts`
- `GET /api/file-change-proposals/:id/git-change-plans`
- `GET /api/file-change-proposals/:id/pull-request-plans`
- `GET /api/file-change-proposals/:id/reviews`

## Forbidden API Semantics

Do not add Sprint 12 API routes with these semantics:

- `/apply`
- `/apply-patch`
- `/write-file`
- `/format`
- `/run-shell`
- `/run-command`
- `/run-git`
- `/git-commit`
- `/git-push`
- `/git-merge`
- `/git-checkout`
- `/git-rebase`
- `/create-pr`
- `/open-pr`
- `/merge-pr`
- `/deploy`
- `/delete`
- `/external`
- `/mcp`
- `/browser`
- `/retry`
- `/replay`
- `/rollback`
- `/resume-execution`
- `/auto-apply`

Existing historical route names such as `/api/agent-runtime/runs` or `/api/tool-runs/:id` are not violations when they remain record queries.

## Sprint 12 POST API Boundary

Every Sprint 12 `POST` route must create, submit, approve, reject, supersede, or archive local records only.

Sprint 12 `POST` routes must not:

- read real workspace files.
- write files.
- apply patches.
- format files.
- run shell or Git.
- commit, push, merge, checkout, or rebase.
- create PRs.
- deploy or delete.
- call external APIs or MCP.
- execute ToolRuns.
- start or continue AgentRuns.
- complete Tasks.

## UI Entry Points

AgentResult card:

- `Create Change Proposal`
- `View Change Proposals`

ToolResult card:

- `Create Change Proposal`
- `View Source Evidence`

CollaborationDecision card:

- `Create Change Proposal`
- `View Linked Proposals`

Task detail:

- `Change Proposals`
- `Patch Drafts`
- `Git Plans`
- `PR Plans`
- `Patch Reviews`
- `Audit`
- `Timeline`

## Safety Gates

- Proposal records cannot dereference file paths.
- Proposal records cannot include full raw file contents unless explicitly provided by the user as a snippet and sanitized.
- ToolResult and ToolExecutionReceipt evidence cannot grant File / Git / PR execution permission.
- PatchDraft cannot be applied.
- GitChangePlan cannot run Git.
- PullRequestPlan cannot create PRs.
- ReviewPatchRecord approval cannot write files, run Git, create PRs, deploy, delete, or complete Tasks.
- Eval, RegressionGate, and ReleaseReadiness are evidence only and not execution tokens.
- RecoveryPoint and ResumeToken remain view-only and cannot restore, retry, replay, rollback, or resume execution.

## Validation Commands

When implemented:

```bash
npm run test
npm run lint
npm run build
```

If Sprint 12 later adds persistence:

```bash
npx prisma validate
npx prisma db push --skip-generate
npx prisma generate
```
