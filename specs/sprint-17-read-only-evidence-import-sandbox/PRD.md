# PRD: Sprint 17 - Read-only Evidence Import Sandbox

Created: 2026-06-17
Status: proposed

## Current Baseline

Sprint 17 starts from:

- Sprint 1-15 complete and sealed as MVP.
- Sprint 16 MVP Demo Polish / Operator Console UX specs ready.

Sprint 17 is a read-only evidence import sandbox sprint. It must not add real execution capability, external connectivity, file reading, shell / Git execution, MCP connectivity, web fetching, workflow execution, Agent execution, ToolRun execution, PR creation, deployment, publishing, release, task completion, retry, replay, rollback, restore, or resume execution.

## Problem

The sealed MVP can govern local records and display record chains, but it still lacks a safe way to ingest user-provided external context into local evidence records. Future Department Agent Profiles and Human-Gated Execution reviews will need reliable evidence, but the system must not start reading files, running commands, fetching URLs, calling external APIs, or connecting MCP.

Sprint 17 introduces a sandbox where users explicitly provide summaries, snippets, screenshots descriptions, or sanitized context snapshots. The system records only sanitized summaries and redacted excerpts as local evidence.

## Product Goal

Introduce local, auditable read-only evidence import records:

```text
manual user-provided content
  -> EvidenceSourceProfile
  -> EvidenceRedactionPolicy
  -> EvidenceImportRecord
  -> SanitizedEvidenceSnapshot
  -> EvidenceReviewRecord
  -> approved_record / rejected / archived
  -> AuditEvent / ObservabilityEvent
  -> ChatHub / Task / Operator Console display
```

Sprint 17 explicitly does not implement this chain:

```text
metadata path / command / URL / endpoint / MCP profile
  -> read file
  -> read directory
  -> read clipboard
  -> execute shell / Git
  -> fetch URL
  -> call external API
  -> connect MCP
  -> run Agent / ToolRun / workflow
  -> create PR
  -> deploy / publish / release
  -> complete Task
  -> retry / replay / rollback / restore / resume execution
```

## Scope

Sprint 17 includes local specs for:

- EvidenceImportRecord.
- SanitizedEvidenceSnapshot.
- EvidenceSourceProfile.
- EvidenceRedactionPolicy.
- EvidenceReviewRecord.
- Evidence import state machine.
- Evidence import safety contract.
- API design for local evidence record creation, query, review, approve-record, reject, archive, and linked query.
- ChatHub / Task / Operator Console evidence display design.
- AuditEvent and ObservabilityEvent integration.
- Recovery / Resume view-only integration.
- Eval / RegressionGate / ReleaseReadiness evidence-only checks.

## Allowed Sources

Evidence may come only from user-explicit input:

- manually pasted text snippets.
- user-provided file summaries.
- user-provided command output summaries.
- external system screenshot descriptions.
- manually pasted sanitized context snapshots.
- manual notes.

## Non-Goals

Sprint 17 must not:

- actively read real files.
- read directories.
- read clipboard.
- execute shell.
- execute Git.
- fetch URLs.
- scrape webpages.
- call external APIs.
- connect MCP.
- invoke MCP tools.
- connect external systems.
- create webhook, worker, queue, or background job.
- execute AgentRun, ToolRun, workflow, or workflow step.
- write files, apply patches, or format product target files.
- create PR.
- deploy, publish, release, or delete.
- complete Task.
- retry, replay, rollback, restore, or resume execution.
- approve future records automatically.
- enter Sprint 17 implementation or Sprint 18.

## Evidence Boundary

Path, command, URL, endpoint, and MCP metadata may be saved only as metadata. They must not be dereferenced.

Raw input is not stored by default. Sprint 17 stores only:

- sanitized summary.
- redacted excerpt, when needed.
- normalized facts.
- source limitations.
- audit references.

Secrets, tokens, cookies, credentials, private keys, raw headers, raw payloads, and blocked sensitive content must be rejected or redacted.

## Kelvin Human Confirmation Boundary

Kelvin approval in Sprint 17 only changes one local evidence record status to `approved_record`.

Kelvin approval must not:

- read files.
- read directories.
- read clipboard.
- execute shell or Git.
- fetch URLs.
- call external APIs.
- connect MCP.
- connect external systems.
- execute AgentRun.
- execute ToolRun.
- execute workflow or workflow step.
- write files.
- create PR.
- deploy, publish, release, or delete.
- complete Task.
- retry, replay, rollback, restore, or resume execution.
- approve future evidence imports automatically.

## API Design

Sprint 17 APIs may create, query, review, approve-record, reject, and archive local evidence records only.

Recommended route groups:

- `GET /api/evidence-source-profiles`
- `POST /api/evidence-source-profiles`
- `GET /api/evidence-source-profiles/:id`
- `GET /api/evidence-redaction-policy`
- `POST /api/evidence-import-records`
- `GET /api/evidence-import-records`
- `GET /api/evidence-import-records/:id`
- `POST /api/evidence-import-records/:id/submit-review`
- `POST /api/evidence-import-records/:id/approve-record`
- `POST /api/evidence-import-records/:id/reject`
- `POST /api/evidence-import-records/:id/archive`
- `GET /api/sanitized-evidence-snapshots`
- `GET /api/sanitized-evidence-snapshots/:id`
- `POST /api/evidence-review-records`
- `GET /api/evidence-review-records`
- `GET /api/evidence-review-records/:id`

All POST routes must consume only request body content explicitly submitted by the user. They must not dereference paths, commands, URLs, endpoints, MCP metadata, or source record links.

## UI Design

ChatHub, Task UI, and Operator Console may expose:

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

Required Sprint 17 safety note:

```text
Sprint 17 evidence import records use only user-provided summaries and sanitized snippets. They do not read files, run commands, fetch URLs, call APIs, connect MCP, execute workflows, or complete tasks.
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

## Observability / Audit / Recovery / Resume

Sprint 17 may add audit and observability events for local evidence record lifecycle changes.

Recovery and Resume integrations remain view-only and audit-only:

- RecoveryPoint can be linked as evidence.
- ResumePolicy can state that evidence import records are not resumable execution.
- No rollback, restore, retry, replay, or resume execution may be triggered.

## Eval / RegressionGate / ReleaseReadiness

EvalRun, RegressionGate, and ReleaseReadinessChecklist may provide recommendation or evidence only.

They must not:

- read files.
- run commands.
- fetch URLs.
- call external APIs.
- connect MCP.
- execute anything.
- approve evidence automatically.
- satisfy Kelvin confirmation.
- complete Task.
- mutate source records.

Sprint 17 readiness must cover Sprint 1-16 regression.

## Acceptance Criteria

- Sprint 17 specs define local evidence import records.
- Evidence sources are limited to user-explicit input.
- Path, command, URL, endpoint, and MCP metadata are never dereferenced.
- Raw input is not stored by default.
- secrets, tokens, cookies, credentials, private keys, raw headers, and raw payloads are rejected or redacted.
- No real file read, shell, Git, external API, MCP, URL fetch, Agent, ToolRun, workflow, PR, deploy, publish, release, task completion, retry, replay, rollback, restore, or resume capability is introduced.
- Kelvin approval only changes one local evidence record.
- UI includes safety note and avoids forbidden labels.
- Sprint 1-16 behavior does not regress.
