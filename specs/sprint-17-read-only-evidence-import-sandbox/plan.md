# Plan: Sprint 17 - Read-only Evidence Import Sandbox

Status: proposed

## Baseline

Sprint 17 assumes Sprint 1-15 are complete and sealed, and Sprint 16 specs are ready.

Sprint 17 is a read-only evidence import sandbox. It records user-provided summaries and sanitized snippets as local evidence only. It does not add real execution capability.

## Implementation Shape

1. Add Sprint 17 specs.
2. Add evidence contracts:
   - EvidenceImportRecord.
   - SanitizedEvidenceSnapshot.
   - EvidenceSourceProfile.
   - EvidenceRedactionPolicy.
   - EvidenceReviewRecord.
   - Evidence import state machine.
   - Evidence import safety.
3. Add pure validation rules later if implementation starts:
   - user-explicit source validation.
   - path / command / URL / endpoint / MCP metadata no-dereference validation.
   - raw input storage blocker.
   - secret / credential / raw payload blocker.
   - evidence-only token blocker.
4. Add local record persistence only if implementation specs permit.
5. Add local record APIs only:
   - create.
   - query.
   - submit-review.
   - approve-record.
   - reject.
   - archive.
   - linked query.
6. Add ChatHub / Task UI / Operator Console display entries.
7. Add AuditEvent and ObservabilityEvent lifecycle entries.
8. Extend Eval / RegressionGate / ReleaseReadiness with Sprint 17 evidence-only checks.

## Record Flow

```text
user-provided explicit content
  -> EvidenceSourceProfile
  -> EvidenceRedactionPolicy
  -> EvidenceImportRecord
  -> SanitizedEvidenceSnapshot
  -> EvidenceReviewRecord
  -> approved_record / rejected / archived
```

The flow is local evidence governance only. It must not read files, execute shell, execute Git, fetch URLs, call external APIs, connect MCP, execute Agent, execute ToolRun, execute workflow, create PR, deploy, publish, release, complete Task, retry, replay, rollback, restore, or resume execution.

## API Boundary

Sprint 17 APIs may:

- create local EvidenceSourceProfile records.
- read EvidenceSourceProfile records.
- read EvidenceRedactionPolicy.
- create EvidenceImportRecord records from user-submitted request body content.
- create SanitizedEvidenceSnapshot records from local sanitized summaries.
- create EvidenceReviewRecord records.
- read records.
- submit records for review.
- approve a local record as `approved_record`.
- reject a local record.
- archive a local record.
- list linked local evidence.

Sprint 17 APIs must not:

- dereference path metadata.
- run command metadata.
- fetch URL metadata.
- call endpoint metadata.
- connect MCP metadata.
- read files.
- read directories.
- read clipboard.
- execute AgentRun.
- execute ToolRun.
- execute workflow or step.
- write files.
- run Git or shell.
- create PR.
- call external APIs.
- connect MCP.
- create webhook, worker, queue, or background job.
- deploy, publish, release, or delete.
- complete Task.
- retry, replay, rollback, restore, or resume execution.
- mutate source evidence records.

## UI Boundary

Allowed labels:

- Import Evidence Summary.
- View Sanitized Snapshot.
- View Source Profile.
- View Redaction Policy.
- Submit Evidence Review.
- Approve Evidence Record.
- Reject Evidence Record.
- Archive Evidence Record.
- View Evidence Audit.
- View Timeline.

Forbidden labels:

- Read File.
- Open Path.
- Run Command.
- Run Git.
- Fetch URL.
- Call API.
- Connect MCP.
- Import Live.
- Sync Now.
- Execute.
- Deploy.
- Release.
- Create PR.
- Retry.
- Replay.
- Rollback.
- Resume Execution.

## Data Model Guidance

If Sprint 17 implementation uses Prisma, it may add only local record models matching:

- EvidenceImportRecord.
- SanitizedEvidenceSnapshot.
- EvidenceSourceProfile.
- EvidenceRedactionPolicy.
- EvidenceReviewRecord.

It must not add:

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

## Test Plan

Sprint 17 implementation should test:

- evidence import state machine valid and invalid transitions.
- evidence sources are user-explicit only.
- path metadata is not dereferenced.
- command metadata is not executed.
- URL metadata is not fetched.
- endpoint metadata is not called.
- MCP metadata is not connected.
- raw input is not stored by default.
- secrets, tokens, cookies, credentials, private keys, raw headers, and raw payloads are rejected or redacted.
- SanitizedEvidenceSnapshot is not an execution, release, deploy, external access, or task completion token.
- EvidenceReviewRecord approval only changes local record status.
- no source record mutation.
- forbidden API semantics are absent.
- forbidden UI labels are absent.
- Sprint 1-16 regression remains covered.

## Reference Adaptation

Sprint 17 borrows these reference ideas safely:

- auto-dev-framework `loop-state` / `loop-memory`: machine-readable normalized facts plus human-readable summaries.
- auto-dev-framework `command-policy`: deny-by-default source policy without command execution.
- auto-dev-framework `confirmation-artifact`: local review evidence only.
- claude-code external dependency inventory: metadata display only.
- claude-code permission UI: evidence import review copy only.
- claude-code tool discovery: source metadata discovery only, no tool execution.

All borrowed concepts remain local, read-only, and non-executing.
