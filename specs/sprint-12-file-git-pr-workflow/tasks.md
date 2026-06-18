# Tasks: Sprint 12 - File / Git / PR Proposal Workflow

Status: proposed

## Phase 1 - Specs

- [ ] Confirm Sprint 12 baseline is Sprint 1-11 complete.
- [ ] Add Sprint 12 PRD, plan, and tasks.
- [ ] Add `file-change-proposal.md`.
- [ ] Add `patch-draft.md`.
- [ ] Add `git-change-plan.md`.
- [ ] Add `pull-request-plan.md`.
- [ ] Add `review-patch-record.md`.
- [ ] Add `file-git-pr-state-machine.md`.
- [ ] Add `file-git-pr-safety.md`.
- [ ] Update Sprint 4-11 related contracts with Sprint 12 proposal-only boundaries.
- [ ] Confirm Sprint 11 ToolResult and ToolExecutionReceipt are evidence only, not execution tokens.

## Phase 2 - Types and Pure Rules

- [ ] Add FileChangeProposal type.
- [ ] Add PatchDraft type.
- [ ] Add GitChangePlan type.
- [ ] Add PullRequestPlan type.
- [ ] Add ReviewPatchRecord type.
- [ ] Add state machine validation.
- [ ] Add source snapshot sanitization.
- [ ] Add path metadata validation.
- [ ] Add forbidden state and forbidden action validation.

## Phase 3 - Persistence Review

- [ ] Decide table shapes for FileChangeProposal, PatchDraft, GitChangePlan, PullRequestPlan, and ReviewPatchRecord.
- [ ] Confirm FileChangeProposal is independent from ToolRun.
- [ ] Confirm PatchDraft is persisted but cannot be applied.
- [ ] Confirm PullRequestPlan is a plan record only.
- [ ] Confirm no FileWrite, FilePatchApply, GitOperation, PullRequestRun, DeployRun, DeleteOperation, worker, queue, retry, replay, rollback, or resume execution tables are added.

## Phase 4 - API Design

- [ ] Add proposal creation APIs from AgentResult.
- [ ] Add proposal creation APIs from ToolResult.
- [ ] Add proposal creation APIs from ToolExecutionReceipt.
- [ ] Add proposal creation APIs from CollaborationDecision.
- [ ] Add proposal review APIs.
- [ ] Add patch draft record APIs.
- [ ] Add Git plan record APIs.
- [ ] Add PR plan record APIs.
- [ ] Add review patch record APIs.
- [ ] Add linked query APIs.
- [ ] Ensure every mutation returns `auditEvents` and/or `observabilityEvents`.
- [ ] Ensure no API route has apply, write, format, Git execution, commit, push, PR creation, deploy, delete, retry, replay, rollback, or resume execution semantics.
- [ ] Ensure every Sprint 12 `POST` route creates or reviews local records only and does not read real files, write files, run Git, create PRs, call external APIs, execute ToolRuns, start AgentRuns, or complete Tasks.

## Phase 5 - UI Design

- [ ] Add AgentResult `Create Change Proposal`.
- [ ] Add ToolResult `Create Change Proposal`.
- [ ] Add CollaborationDecision `Create Change Proposal`.
- [ ] Add Task detail `Change Proposals`.
- [ ] Add Task detail `Patch Drafts`.
- [ ] Add Task detail `Git Plans`.
- [ ] Add Task detail `PR Plans`.
- [ ] Add Task detail `Patch Reviews`.
- [ ] Display Sprint 12 safety note.
- [ ] Reject forbidden labels: `Apply Patch`, `Write File`, `Format`, `Run Git`, `Commit`, `Push`, `Create PR`, `Deploy`, `Delete`, `Merge`, `Auto Apply`, `Rollback`, `Replay`, `Retry Automatically`, `Resume Execution`.

## Phase 6 - Tests

- [ ] FileChangeProposal state machine valid transitions.
- [ ] PatchDraft state machine valid transitions.
- [ ] GitChangePlan state machine valid transitions.
- [ ] PullRequestPlan state machine valid transitions.
- [ ] ReviewPatchRecord state machine valid transitions.
- [ ] Proposal creation from AgentResult does not execute Agent.
- [ ] Proposal creation from ToolResult does not execute ToolRun.
- [ ] Proposal creation from ToolExecutionReceipt does not execute ToolRun.
- [ ] Proposal creation from CollaborationDecision does not start A2A or AgentRun.
- [ ] Sprint 11 ToolResult cannot become a File / Git / PR execution token.
- [ ] Sprint 11 ToolExecutionReceipt cannot become a File / Git / PR execution token.
- [ ] File path metadata is not dereferenced.
- [ ] User-provided snippets are sanitized.
- [ ] PatchDraft cannot be applied.
- [ ] GitChangePlan cannot run Git.
- [ ] PullRequestPlan cannot create PR.
- [ ] Kelvin approval only changes local record status.
- [ ] Kelvin approval does not write files.
- [ ] Kelvin approval does not run Git.
- [ ] Kelvin approval does not create PR.
- [ ] Kelvin approval does not deploy or delete.
- [ ] Kelvin approval does not complete Task.
- [ ] Eval pass is not an execution token.
- [ ] RegressionGate passed is not an execution token.
- [ ] ReleaseReadiness approved_record is not an execution token.
- [ ] RecoveryPoint cannot rollback / restore / retry / replay / resume execution.
- [ ] Forbidden API route semantics are absent.
- [ ] Forbidden UI labels are absent.
- [ ] No Sprint 12 state is named `applied`, `written`, `formatted`, `committed`, `pushed`, `merged`, `pr_created`, `deployed`, `deleted`, or `executed`.
- [ ] No FileWrite, FilePatchApply, GitOperation, PullRequestRun, DeployRun, DeleteOperation, worker, queue, retry, replay, rollback, or resume execution model is introduced.
- [ ] Sprint 1-11 regression.

## Non-goals

- [ ] Do not read real workspace files.
- [ ] Do not write files.
- [ ] Do not apply patches.
- [ ] Do not format files.
- [ ] Do not run shell.
- [ ] Do not run Git.
- [ ] Do not commit, push, merge, checkout, or rebase.
- [ ] Do not create PRs.
- [ ] Do not deploy.
- [ ] Do not delete.
- [ ] Do not call external API or MCP.
- [ ] Do not automate browsers.
- [ ] Do not run database migrations.
- [ ] Do not execute or continue Agents.
- [ ] Do not automatically complete Tasks.
- [ ] Do not retry, replay, rollback, or resume execution.
- [ ] Do not auto-approve future File / Git / PR workflows.
- [ ] Do not enter Sprint 13.
