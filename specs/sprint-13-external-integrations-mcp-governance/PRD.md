# PRD: Sprint 13 - External Integrations / MCP Governance

Created: 2026-06-16
Status: proposed

## Current Baseline

Sprint 13 starts from this real project baseline:

- Sprint 1-9 completed development.
- Sprint 10 Production Hardening / Security / Deployment Readiness completed and passed validation.
- Sprint 11 Controlled Real Tool Runtime completed and passed validation.
- Sprint 12 File / Git / PR Workflow completed and passed validation.

Sprint 13 must preserve the Sprint 1-12 baseline and must not introduce real external integration execution.

## Problem

Sprint 12 lets the system create local File / Git / PR proposal records without applying changes. The next product need is to model external integrations and MCP governance in a structured, auditable way without turning the system into an external API caller, MCP connector, webhook dispatcher, or background worker.

## Product Goal

Implement this slice:

```text
AgentResult / ToolResult / ToolExecutionReceipt / CollaborationDecision / FileChangeProposal / PullRequestPlan
  -> ExternalActionProposal
  -> IntegrationRiskAssessment
  -> ExternalActionReviewRecord
  -> Kelvin review
  -> approved_record / rejected / superseded / archived
  -> AuditEvent / ObservabilityEvent
  -> ChatHub / Task UI display
```

Do not implement this later slice:

```text
ExternalActionProposal / McpConnectionProfile
  -> connect MCP
  -> call external API
  -> send messages
  -> create webhook
  -> create worker / queue / background job
  -> read external system data
  -> write external system data
  -> sync external data
  -> execute Agent / ToolRun
  -> complete Task
```

## Scope

Sprint 13 includes local governance records only:

- ExternalIntegrationProfile contract.
- McpConnectionProfile contract.
- ExternalActionProposal contract.
- ExternalActionReviewRecord contract.
- IntegrationRiskAssessment contract.
- IntegrationAuditPolicy contract.
- External / MCP governance state machine contract.
- External / MCP governance safety contract.
- API design for local governance record creation, review, and linked queries.
- ChatHub / Task UI entry design.
- AuditEvent and ObservabilityEvent integration.
- Recovery / Resume view-only integration.
- Eval / RegressionGate / ReleaseReadiness recommendation-only integration.

Sprint 13 does not include:

- external API calls.
- MCP connections or MCP tool invocation.
- network requests.
- webhook creation or dispatch.
- worker, queue, or background job creation.
- email, chat, message, webhook, or notification sending.
- external schema reads.
- external system reads or writes.
- shell commands.
- Git commands.
- file writes, patch application, formatting, or deletes.
- PR creation.
- deploy, release, or publish.
- database migration.
- Agent execution or continuation.
- ToolRun execution.
- automatic Task completion.
- retry, replay, rollback, or resume execution.
- future automatic approval.

## Persistence Decision

Sprint 13 should eventually add database tables during implementation because the workflow requires auditable local records:

- `ExternalIntegrationProfile`
- `McpConnectionProfile`
- `ExternalActionProposal`
- `ExternalActionReviewRecord`
- `IntegrationRiskAssessment`
- `IntegrationAuditPolicy`

However, this specs task must not modify Prisma schema.

Do not add execution-oriented models:

- ExternalApiCall
- McpSession
- WebhookDispatch
- WebhookSubscription
- IntegrationRun
- ExternalSyncRun
- MessageSendRun
- Worker
- Queue
- BackgroundJob
- RetryJob
- ReplayJob
- RollbackJob
- ResumeExecutionJob

## Source Boundaries

Sprint 13 may create proposal records from:

- AgentResult recommendations.
- ToolResult deterministic local records.
- ToolExecutionReceipt deterministic local execution receipts.
- CollaborationDecision approved local records.
- FileChangeProposal approved local records.
- PullRequestPlan approved local records.
- user-provided snippets.
- sanitized context snapshots.

All source records are sanitized evidence only. They must not be treated as permission to call external APIs, connect MCP, create webhooks, send messages, write external systems, execute ToolRuns, execute Agents, or complete Tasks.

Sprint 13 must not read external system schemas or external system data. External schema snippets are allowed only when explicitly user-provided or already present in a sanitized context snapshot.

Endpoint metadata may be stored only when sanitized and secret-free. It must not include tokens, API keys, Authorization headers, cookies, raw payloads, credentials, private URLs with embedded secrets, or unredacted request bodies.

## Required Safety Note

```text
Sprint 13 records External Integration / MCP governance proposals only. It does not call external APIs, connect MCP, send network requests, create webhooks, create workers or queues, send messages, read or write external systems, execute Agents or ToolRuns, complete Tasks, retry, replay, rollback, or resume execution.
```

## Allowed UI Labels

- `Create External Proposal`
- `View External Proposal`
- `View Integration Profile`
- `View MCP Profile`
- `Assess Integration Risk`
- `View Risk Assessment`
- `Submit External Review`
- `Approve External Record`
- `Reject External Record`
- `Supersede External Proposal`
- `Archive External Proposal`
- `View Integration Audit Policy`
- `View Audit`
- `View Timeline`

## Disallowed UI Labels

- `Connect MCP`
- `Call API`
- `Send Message`
- `Sync Now`
- `Invoke Tool`
- `Create Webhook`
- `Dispatch`
- `Execute`
- `Run Integration`
- `Auto Send`
- `Auto Sync`
- `Retry`
- `Replay`
- `Rollback`
- `Resume Execution`

## Acceptance Criteria

- ExternalActionProposal is independent from ToolRun.
- McpConnectionProfile is a disabled local record profile only.
- Endpoint metadata is sanitized and secret-free.
- No external schema is fetched; only user-provided snippets and sanitized snapshots are allowed.
- Kelvin approval only approves a local record.
- Kelvin approval does not call external APIs, connect MCP, create webhooks, send messages, write external systems, execute Agents or ToolRuns, or complete Tasks.
- No Sprint 13 state is named `connected`, `called`, `sent`, `synced`, `webhook_created`, `mcp_invoked`, `external_updated`, or `executed`.
- APIs support local proposal/profile creation, review, approval record, rejection, supersede, archive, and linked queries only.
- APIs do not include connect, call, send, sync, invoke, webhook creation, dispatch, execute, retry, replay, rollback, or resume execution semantics.
- Observability / Audit / Recovery / Resume remain view-only and audit-only.
- Eval / RegressionGate / ReleaseReadiness remain recommendation-only and are not execution tokens.
- Sprint 1-12 behavior does not regress.
