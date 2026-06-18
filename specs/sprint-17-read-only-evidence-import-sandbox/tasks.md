# Tasks: Sprint 17 - Read-only Evidence Import Sandbox

Status: proposed

## Specs

- [ ] Add Sprint 17 PRD.
- [ ] Add Sprint 17 plan.
- [ ] Add Sprint 17 tasks.
- [ ] Add EvidenceImportRecord contract.
- [ ] Add SanitizedEvidenceSnapshot contract.
- [ ] Add EvidenceSourceProfile contract.
- [ ] Add EvidenceRedactionPolicy contract.
- [ ] Add EvidenceReviewRecord contract.
- [ ] Add evidence import state machine contract.
- [ ] Add evidence import safety contract.
- [ ] Update AuditEvent and ObservabilityEvent with Sprint 17 local lifecycle events.
- [ ] Update RecoveryPoint and ResumePolicy with view-only / no-resume Sprint 17 boundary.
- [ ] Update EvalRun, EvalTarget, RegressionGate, and ReleaseReadinessChecklist with Sprint 17 evidence-only checks.
- [ ] Update SecurityPolicy and safety contracts with Sprint 17 read-only import boundary.
- [ ] Update Sprint 16 Operator Console contracts to display sanitized evidence snapshots.

## Implementation Tasks

- [ ] Add Sprint 17 type definitions only if implementation starts later.
- [ ] Add pure evidence source validation.
- [ ] Add pure redaction policy validation.
- [ ] Add pure no-dereference validator for path / command / URL / endpoint / MCP metadata.
- [ ] Add raw input storage blocker.
- [ ] Add secret / credential / raw payload blocker.
- [ ] Add evidence-only token blocker.
- [ ] Add local record persistence only if specs permit.
- [ ] Add local record APIs for EvidenceSourceProfile.
- [ ] Add local record APIs for EvidenceImportRecord.
- [ ] Add local record APIs for SanitizedEvidenceSnapshot.
- [ ] Add local record APIs for EvidenceReviewRecord.
- [ ] Add linked query APIs.
- [ ] Add ChatHub / Task UI / Operator Console display entries.
- [ ] Add Sprint 17 safety note to relevant UI surfaces.

## Required API Acceptance

- [ ] `POST /api/evidence-source-profiles` creates local source profile records only.
- [ ] `POST /api/evidence-import-records` creates local evidence import records only.
- [ ] `POST /api/evidence-review-records` creates local review records only.
- [ ] `approve-record` only changes one local record to `approved_record`.
- [ ] `reject` only changes one local record to `rejected`.
- [ ] `archive` only changes one local record to `archived`.
- [ ] POST routes do not mutate source evidence records.
- [ ] POST routes do not dereference path, command, URL, endpoint, or MCP metadata.
- [ ] POST routes do not execute AgentRun, ToolRun, workflow, file, Git, external, MCP, PR, deploy, release, publish, retry, replay, rollback, restore, or resume behavior.

## Required UI Acceptance

- [ ] UI shows Sprint 17 safety note.
- [ ] UI supports Import Evidence Summary.
- [ ] UI supports View Sanitized Snapshot.
- [ ] UI supports View Source Profile.
- [ ] UI supports View Redaction Policy.
- [ ] UI supports Submit Evidence Review.
- [ ] UI supports Approve Evidence Record.
- [ ] UI supports Reject Evidence Record.
- [ ] UI supports Archive Evidence Record.
- [ ] UI supports View Evidence Audit.
- [ ] UI supports View Timeline.
- [ ] UI does not show forbidden labels: Read File, Open Path, Run Command, Run Git, Fetch URL, Call API, Connect MCP, Import Live, Sync Now, Execute, Deploy, Release, Create PR, Retry, Replay, Rollback, Resume Execution.

## Required Test Acceptance

- [ ] Evidence import state machine accepts only `draft`, `review`, `approved_record`, `rejected`, and `archived`.
- [ ] Forbidden states are rejected: `reading`, `fetched`, `called`, `connected`, `executed`, `synced`, `imported_live`, `deployed`, `released`, `completed`, `retried`, `replayed`, `rolled_back`, `restored`, `resumed`.
- [ ] Evidence sources are user-explicit only.
- [ ] Path metadata is not dereferenced.
- [ ] Command metadata is not executed.
- [ ] URL metadata is not fetched.
- [ ] Endpoint metadata is not called.
- [ ] MCP metadata is not connected.
- [ ] Raw input is not stored by default.
- [ ] Secrets, tokens, cookies, credentials, private keys, raw headers, and raw payloads are rejected or redacted.
- [ ] EvidenceImportRecord is not an execution token.
- [ ] SanitizedEvidenceSnapshot is not an execution token.
- [ ] EvidenceReviewRecord approval only changes local record status.
- [ ] Kelvin approval does not read files, run commands, call external APIs, connect MCP, execute AgentRun, execute ToolRun, execute workflow, create PR, deploy, release, publish, or complete Task.
- [ ] EvalRun recommendation is evidence only.
- [ ] RegressionGate `passed` is evidence only.
- [ ] ReleaseReadinessChecklist `approved_record` is evidence only.
- [ ] RecoveryPoint does not enable rollback or restore.
- [ ] ResumePolicy does not enable resume execution.
- [ ] Forbidden API semantics are absent.
- [ ] Forbidden UI labels are absent.
- [ ] No Task completed mutation.
- [ ] Sprint 1-16 regression remains covered.

## Forbidden Models

Sprint 17 implementation must not add:

- FileReadRun.
- DirectoryReadRun.
- ClipboardReadRun.
- ShellCommand.
- GitOperation.
- UrlFetchRun.
- ExternalApiCall.
- McpSession.
- WebhookDispatch.
- Worker.
- Queue.
- AgentContinuationRun.
- ToolRunExecution.
- WorkflowRun.
- WorkflowExecution.
- WorkflowStepExecution.
- PullRequestRun.
- DeployRun.
- PublishRun.
- ReleaseRun.
- RetryJob.
- ReplayJob.
- RollbackJob.
- RestoreJob.
- ResumeExecutionJob.

## Stage Acceptance

- [ ] Sprint 17 is documented as read-only evidence import sandbox only.
- [ ] Sprint 17 does not expand execution capability.
- [ ] Sprint 17 keeps Sprint 1-16 behavior intact.
- [ ] Sprint 17 provides evidence foundations for future Department Agent Profiles and Human-Gated Execution review without granting execution authority.
