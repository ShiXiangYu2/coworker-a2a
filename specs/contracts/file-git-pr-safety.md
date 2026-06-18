# Contract: File / Git / PR Safety

Status: proposed for Sprint 12

## Purpose

This contract defines the safety boundary for Sprint 12 File / Git / PR Proposal Workflow.

Sprint 12 introduces local proposal records only. It must not become a file writer, Git executor, PR creator, deployment tool, or autonomous change applier.

## Hard Prohibitions

Sprint 12 must not:

- read real workspace files.
- write, create, patch, format, rename, or delete files.
- execute shell commands.
- execute Git operations.
- create branches.
- commit, push, merge, checkout, or rebase.
- create, update, merge, or close PRs.
- deploy, publish, or release.
- run database migrations.
- call external APIs.
- invoke MCP tools.
- automate browsers.
- enqueue apply jobs.
- run background apply workers.
- retry, replay, rollback, or resume execution.
- start or continue AgentRun.
- mark Task completed.
- approve future File / Git / PR workflows automatically.

## Safe Local Actions

Sprint 12 may:

- create FileChangeProposal records.
- create PatchDraft records.
- create GitChangePlan records.
- create PullRequestPlan records.
- create ReviewPatchRecord records.
- create ConfirmationArtifact records for review.
- approve or reject local proposal records.
- create AuditEvent records.
- create ObservabilityEvent records.
- create RecoveryPoint view-only snapshots.
- render ChatHub / Task UI cards.

## Source Safety

Allowed source content:

- AgentResult recommendations.
- ToolResult deterministic local records.
- ToolExecutionReceipt deterministic local execution receipts.
- CollaborationDecision approved local records.
- user-provided snippets.
- sanitized context snapshots.

Sprint 11 ToolResult and ToolExecutionReceipt records are sanitized evidence only. They must not authorize File / Git / PR execution.

Disallowed source content:

- real workspace file reads.
- shell or Git command output.
- raw external API payloads.
- environment dumps.
- secrets or private tokens.
- blocked redaction payloads.

## Kelvin Boundary

Kelvin approval means local record status progression only.

Approval does not authorize:

- file reads.
- file writes.
- patch application.
- formatting.
- shell commands.
- Git operations.
- commit, push, merge, checkout, or rebase.
- PR creation.
- deploy.
- delete.
- external API or MCP calls.
- browser automation.
- Task completion.
- future automatic approval.

## UI Safety Copy

Required copy:

```text
Sprint 12 records File / Git / PR proposals only. It does not read real workspace files, write files, apply patches, format files, run shell or Git, commit, push, merge, create PRs, deploy, delete, call external APIs or MCP, automate browsers, execute Agents, complete Tasks, retry, replay, rollback, or resume execution.
```

## Required Safety Acceptance Tests

Sprint 12 acceptance must include tests or static checks proving:

- proposal approval does not write files.
- proposal approval does not run Git.
- proposal approval does not create PRs.
- proposal approval does not deploy or delete.
- proposal approval does not mark Task completed.
- path metadata is not dereferenced.
- PatchDraft cannot be applied.
- GitChangePlan cannot run Git.
- PullRequestPlan cannot create PR.
- Eval, RegressionGate, and ReleaseReadiness are not execution tokens.
- ToolResult and ToolExecutionReceipt are not File / Git / PR execution tokens.
- RecoveryPoint and ResumeToken cannot restore, retry, replay, rollback, or resume execution.
- UI does not show forbidden execution labels.
- no Sprint 12 state is named `applied`, `written`, `formatted`, `committed`, `pushed`, `merged`, `pr_created`, `deployed`, `deleted`, or `executed`.
- no FileWrite, FilePatchApply, GitOperation, PullRequestRun, DeployRun, DeleteOperation, worker, queue, retry, replay, rollback, or resume execution model is introduced.

## Sprint 13 External / MCP Governance Boundary

Sprint 13 may reference Sprint 12 FileChangeProposal and PullRequestPlan records as sanitized evidence for ExternalActionProposal creation.

File / Git / PR records must not become:

- external API execution tokens.
- MCP connection tokens.
- webhook creation tokens.
- message sending tokens.
- worker or queue creation tokens.
- external read or write tokens.
- ToolRun execution tokens.
- Agent execution tokens.
- Task completion tokens.

Sprint 13 must not reinterpret FileChangeProposal, PatchDraft, GitChangePlan, PullRequestPlan, or ReviewPatchRecord approval as permission to call external systems.
## Sprint 14 Workflow Orchestration Boundary

Sprint 14 may reference Sprint 12 File / Git / PR records as sanitized evidence for WorkflowProposal and WorkflowStepRecord creation.

Sprint 14 must not reinterpret any FileChangeProposal, PatchDraft, GitChangePlan, PullRequestPlan, ReviewPatchRecord, or workflow approval as permission to write files, apply patches, format, run Git, create PRs, merge, deploy, delete, retry, replay, rollback, or resume execution.

## Sprint 16 MVP Demo Polish Boundary

Sprint 16 may display File / Git / PR records in MVPRecordChainView and MVPOperatorConsole as sanitized evidence only.

File / Git / PR records must not grant Sprint 16 console views any ability to read real workspace files, write files, apply patches, format, run shell, run Git, commit, push, merge, checkout, rebase, create PRs, deploy, delete, retry, replay, rollback, restore, or resume execution.

Sprint 16 console display must not mutate FileChangeProposal, PatchDraft, GitChangePlan, PullRequestPlan, or ReviewPatchRecord.

## Sprint 17 Evidence Import Boundary

Sprint 17 may reference File / Git / PR records as sanitized evidence only.

File / Git / PR records and user-provided file summaries must not grant Sprint 17 any ability to read real workspace files, open paths, write files, apply patches, format, run shell, run Git, commit, push, merge, checkout, rebase, create PRs, deploy, delete, retry, replay, rollback, restore, or resume execution.

Path metadata in evidence imports is metadata only and must not be dereferenced.
