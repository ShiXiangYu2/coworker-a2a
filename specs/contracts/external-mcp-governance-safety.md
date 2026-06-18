# Contract: External / MCP Governance Safety

Status: proposed for Sprint 13

## Purpose

This contract defines the safety boundary for Sprint 13 External Integrations / MCP Governance.

Sprint 13 introduces local governance records only. It must not become an external API caller, MCP connector, webhook dispatcher, message sender, worker, queue, or autonomous integration runner.

## Hard Prohibitions

Sprint 13 must not:

- call external APIs.
- connect MCP.
- invoke MCP tools.
- list MCP tools from a live server.
- read MCP resources from a live server.
- send network requests.
- create webhooks.
- dispatch webhooks.
- create workers, queues, or background jobs.
- send email, chat, messages, webhooks, notifications, or integration events.
- read external system data.
- fetch external system schemas.
- write external systems.
- sync external data.
- execute shell commands.
- execute Git operations.
- write, create, patch, format, rename, or delete files.
- create PRs.
- deploy, publish, or release.
- run database migrations.
- execute ToolRuns.
- start or continue AgentRuns.
- mark Task completed.
- retry, replay, rollback, or resume execution.
- approve future External / MCP workflows automatically.

## Safe Local Actions

Sprint 13 may:

- create ExternalIntegrationProfile records.
- create disabled McpConnectionProfile records.
- create ExternalActionProposal records.
- create IntegrationRiskAssessment records.
- create ExternalActionReviewRecord records.
- create IntegrationAuditPolicy records.
- create ConfirmationArtifact records for review.
- approve or reject local governance records.
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
- FileChangeProposal approved local records.
- PullRequestPlan approved local records.
- user-provided snippets.
- sanitized context snapshots.

All source content is sanitized evidence only. It must not authorize external execution.

Disallowed source content:

- raw external API payloads.
- live external system reads.
- live MCP tool/resource discovery.
- environment dumps.
- secrets, API keys, tokens, cookies, credentials, private keys, or Authorization headers.
- blocked redaction payloads.

## Kelvin Boundary

Kelvin approval means local record status progression only.

Approval does not authorize:

- external API calls.
- MCP connections.
- network requests.
- webhook creation or dispatch.
- workers, queues, or background jobs.
- message sending.
- external reads or writes.
- ToolRun execution.
- AgentRun startup or continuation.
- Task completion.
- future automatic approval.

## UI Safety Copy

Required copy:

```text
Sprint 13 records External Integration / MCP governance proposals only. It does not call external APIs, connect MCP, send network requests, create webhooks, create workers or queues, send messages, read or write external systems, execute Agents or ToolRuns, complete Tasks, retry, replay, rollback, or resume execution.
```

## Required Safety Acceptance Tests

Sprint 13 acceptance must include tests or static checks proving:

- approval does not call external APIs.
- approval does not connect MCP.
- approval does not create webhooks.
- approval does not create workers, queues, or background jobs.
- approval does not send messages.
- approval does not read or write external systems.
- approval does not execute ToolRuns or Agents.
- approval does not mark Task completed.
- endpoint metadata does not persist secrets.
- external schemas are not fetched.
- ToolResult and ToolExecutionReceipt are not external execution tokens.
- FileChangeProposal and PullRequestPlan are not external execution tokens.
- Eval, RegressionGate, and ReleaseReadiness are not execution tokens.
- RecoveryPoint and ResumeToken cannot restore, retry, replay, rollback, or resume execution.
- UI does not show forbidden execution labels.
- no Sprint 13 state is named `connected`, `called`, `sent`, `synced`, `webhook_created`, `mcp_invoked`, `external_updated`, or `executed`.
- no ExternalApiCall, McpSession, WebhookDispatch, IntegrationRun, ExternalSyncRun, MessageSendRun, worker, queue, retry, replay, rollback, or resume execution model is introduced.
## Sprint 14 Workflow Orchestration Boundary

Sprint 14 may reference Sprint 13 External / MCP governance records as sanitized evidence for WorkflowProposal and WorkflowStepRecord creation.

Sprint 14 must not reinterpret ExternalIntegrationProfile, McpConnectionProfile, ExternalActionProposal, ExternalActionReviewRecord, IntegrationRiskAssessment, IntegrationAuditPolicy, or workflow approval as permission to call external APIs, connect MCP, create webhooks, send messages, create workers or queues, read or write external systems, retry, replay, rollback, or resume execution.

## Sprint 16 MVP Demo Polish Boundary

Sprint 16 may display External / MCP governance records in MVPRecordChainView and MVPOperatorConsole as sanitized evidence only.

External / MCP governance records must not grant Sprint 16 console views any ability to call external APIs, connect MCP, create webhooks, send messages, create workers or queues, read or write external systems, execute ToolRuns or Agents, complete Tasks, retry, replay, rollback, restore, or resume execution.

Sprint 16 console display must not mutate ExternalIntegrationProfile, McpConnectionProfile, ExternalActionProposal, ExternalActionReviewRecord, IntegrationRiskAssessment, or IntegrationAuditPolicy.

## Sprint 17 Evidence Import Boundary

Sprint 17 may reference External / MCP governance records and user-provided external screenshot descriptions as sanitized evidence only.

External / MCP governance records, endpoint metadata, and MCP metadata must not grant Sprint 17 any ability to call external APIs, connect MCP, fetch external schemas, create webhooks, send messages, create workers or queues, read or write external systems, execute ToolRuns or Agents, complete Tasks, retry, replay, rollback, restore, or resume execution.

Endpoint and MCP metadata in evidence imports is metadata only and must not be dereferenced.
## Sprint 18 Department Agent Profile Boundary

Sprint 18 DepartmentProfile, DepartmentAgentRole, DepartmentResponsibilityMatrix, DepartmentEscalationPolicy, DepartmentPermissionBoundary, and DepartmentReviewRecord records may reference this contract only as sanitized local evidence or read-only governance context.

Sprint 18 department records must not be consumed as execution, routing, runtime permission, release, deploy, external access, MCP access, PR creation, task completion, retry, replay, rollback, restore, resume, or future approval tokens.

Kelvin approval in Sprint 18 approves only one local department record. It must not execute Agent, continue Agent, execute ToolRun, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, or approve future department behavior.

## Sprint 20 Human-Gated Execution Boundary

Sprint 20 execution records may reference ExternalIntegrationProfile, McpConnectionProfile, ExternalActionProposal, ExternalActionReviewRecord, IntegrationRiskAssessment, and IntegrationAuditPolicy only as sanitized evidence or local review context.

Execution records must not call external APIs, connect MCP, create webhooks, create workers, create queues, read external systems, write external systems, send messages, deploy, release, complete Tasks, retry, replay, rollback, restore, or resume execution.

