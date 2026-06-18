# Contract: Evidence Import Safety

Status: proposed for Sprint 17

## Purpose

This contract defines the safety boundary for Sprint 17 Read-only Evidence Import Sandbox.

Sprint 17 introduces local evidence import records only. It must not become a file reader, command runner, Git executor, URL fetcher, external API caller, MCP connector, live importer, workflow runner, Agent continuation engine, ToolRun executor, PR creator, deployer, publisher, releaser, Task completion engine, retry engine, replay engine, rollback engine, restore engine, or resume engine.

## Hard Denies

Sprint 17 must not:

- actively read real files.
- read directories.
- read clipboard.
- execute shell commands.
- execute Git operations.
- fetch URLs.
- scrape webpages.
- call external APIs.
- connect MCP.
- invoke MCP tools.
- connect external systems.
- create webhooks.
- create workers, queues, or background jobs.
- execute AgentRun.
- execute ToolRun.
- execute workflow.
- execute workflow steps.
- write files, apply patches, or format product target files.
- create PRs.
- deploy, publish, release, or delete.
- complete Tasks.
- retry, replay, rollback, restore, or resume execution.
- auto-approve future evidence imports.
- mutate source records through evidence import.

## Safe Local Actions

Sprint 17 may:

- create EvidenceSourceProfile records.
- create EvidenceImportRecord records from user-explicit request body content.
- create SanitizedEvidenceSnapshot records from local sanitized summaries.
- create EvidenceRedactionPolicy records.
- create EvidenceReviewRecord records.
- submit local evidence records for review.
- approve local evidence records as `approved_record`.
- reject local evidence records.
- archive local evidence records.
- query linked local evidence.
- display records in ChatHub, Task UI, and Operator Console.
- create AuditEvent and ObservabilityEvent records for local lifecycle changes.

## No-Dereference Boundary

The following metadata is allowed only as metadata:

- path hints.
- command hints.
- URL hints.
- endpoint hints.
- MCP server hints.
- external system names.
- screenshot descriptions.

Sprint 17 must not dereference this metadata.

## Raw Input Boundary

Raw input must not be stored by default.

Allowed stored content:

- sanitized summary.
- redacted excerpt.
- normalized facts.
- source limitations.
- audit references.

Forbidden stored content:

- secrets.
- API keys.
- tokens.
- cookies.
- credentials.
- private keys.
- raw Authorization headers.
- raw request bodies.
- raw external payloads.
- blocked sensitive data.

## Kelvin Boundary

Kelvin approval means local record status progression only.

Approval does not authorize:

- file reads.
- directory reads.
- clipboard reads.
- shell commands.
- Git operations.
- URL fetches.
- external API calls.
- MCP connections.
- external system reads or writes.
- ToolRun execution.
- AgentRun startup or continuation.
- workflow execution.
- PR creation.
- deploy, publish, or release.
- Task completion.
- retry, replay, rollback, restore, or resume execution.
- future automatic approval.

## UI Safety Copy

Required copy:

```text
Sprint 17 imports user-provided evidence summaries only. It does not read files, open paths, run commands, run Git, fetch URLs, call APIs, connect MCP, import live data, sync systems, execute workflows, deploy, release, create PRs, retry, replay, rollback, or resume execution.
```

Forbidden UI labels:

- `Read File`
- `Open Path`
- `Run Command`
- `Run Git`
- `Fetch URL`
- `Call API`
- `Connect MCP`
- `Import Live`
- `Sync Now`
- `Execute`
- `Deploy`
- `Release`
- `Create PR`
- `Retry`
- `Replay`
- `Rollback`
- `Resume Execution`

## Required Safety Acceptance Tests

Sprint 17 acceptance must include tests or static checks proving:

- path metadata is not dereferenced.
- command metadata is not executed.
- URL metadata is not fetched.
- endpoint metadata is not called.
- MCP metadata is not connected.
- raw input is not stored by default.
- secrets and credentials are rejected or redacted.
- evidence snapshots are not execution tokens.
- evidence reviews are not permission grants.
- approval does not execute ToolRuns or Agents.
- approval does not mark Task completed.
- Eval, RegressionGate, and ReleaseReadiness are evidence only.
- RecoveryPoint and ResumePolicy cannot restore, retry, replay, rollback, or resume execution.
- UI does not show forbidden execution labels.
- no Sprint 17 state is named `reading`, `fetched`, `called`, `connected`, `executed`, `synced`, `imported_live`, `deployed`, `released`, `completed`, `retried`, `replayed`, `rolled_back`, `restored`, or `resumed`.
- no FileReadRun, DirectoryReadRun, ClipboardReadRun, ShellCommand, GitOperation, UrlFetchRun, ExternalApiCall, McpSession, WebhookDispatch, worker, queue, retry, replay, rollback, restore, or resume execution model is introduced.
## Sprint 18 Department Agent Profile Boundary

Sprint 18 DepartmentProfile, DepartmentAgentRole, DepartmentResponsibilityMatrix, DepartmentEscalationPolicy, DepartmentPermissionBoundary, and DepartmentReviewRecord records may reference this contract only as sanitized local evidence or read-only governance context.

Sprint 18 department records must not be consumed as execution, routing, runtime permission, release, deploy, external access, MCP access, PR creation, task completion, retry, replay, rollback, restore, resume, or future approval tokens.

Kelvin approval in Sprint 18 approves only one local department record. It must not execute Agent, continue Agent, execute ToolRun, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, or approve future department behavior.


## Sprint 19 Department Mapping Boundary

Department evidence mapping may use Sprint 17 evidence records as local review references only.

Sprint 19 must not introduce live evidence import, sync evidence, file read, directory read, clipboard read, shell/Git execution, URL fetch, external API call, MCP connection, Agent execution, ToolRun execution, workflow execution, deploy, release, retry, replay, rollback, restore, or resume execution.

## Sprint 20 Human-Gated Execution Boundary

Sprint 20 execution records may reference EvidenceImportRecord, SanitizedEvidenceSnapshot, EvidenceSourceProfile, EvidenceRedactionPolicy, and EvidenceReviewRecord only as sanitized evidence or local review context.

Evidence records must not become execution, routing, permission, release, deploy, external access, MCP access, PR creation, task completion, retry, replay, rollback, restore, resume, or future approval tokens for Sprint 20.
