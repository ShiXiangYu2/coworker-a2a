# Tasks: Sprint 13 - External Integrations / MCP Governance

Status: proposed

## Specs

- [ ] Add ExternalIntegrationProfile contract.
- [ ] Add McpConnectionProfile contract.
- [ ] Add ExternalActionProposal contract.
- [ ] Add ExternalActionReviewRecord contract.
- [ ] Add IntegrationRiskAssessment contract.
- [ ] Add IntegrationAuditPolicy contract.
- [ ] Add External / MCP governance state machine contract.
- [ ] Add External / MCP governance safety contract.
- [ ] Update existing evidence, audit, observability, recovery, eval, readiness, regression, security, and safety contracts.

## Implementation Tasks

- [ ] Add Sprint 13 TypeScript types.
- [ ] Add pure governance validation helpers.
- [ ] Add endpoint metadata sanitizer and secret-free validator.
- [ ] Add methodHints metadata-only validator.
- [ ] Add proposedPayloadSummary raw payload and credential blocker.
- [ ] Add source evidence validator for AgentResult, ToolResult, ToolExecutionReceipt, CollaborationDecision, FileChangeProposal, PullRequestPlan, user snippets, and sanitized context snapshots.
- [ ] Add forbidden state and forbidden action validation.
- [ ] Add `POST /from-*` guard tests proving endpoints are not dereferenced and schemas are not discovered.
- [ ] Add persistence models only after schema review.
- [ ] Add local governance record APIs.
- [ ] Add linked query APIs.
- [ ] Add ChatHub / Task UI governance cards.
- [ ] Add tests for state machine transitions.
- [ ] Add tests for external/MCP hard prohibitions.
- [ ] Add Sprint 1-12 regression tests.

## Acceptance Criteria

- ExternalActionProposal is independent from ToolRun.
- McpConnectionProfile is disabled/local-record-only.
- No external API call can be triggered by Sprint 13 APIs.
- No MCP connection or MCP session can be created.
- No webhook, worker, queue, or background job can be created.
- No email, chat, message, notification, or webhook can be sent.
- No external system schema or data is read.
- No external system is written.
- Endpoint metadata stores no secrets, tokens, Authorization headers, cookies, credentials, raw payloads, or embedded secret URLs.
- `methodHints` are metadata only and cannot be consumed as executable action types.
- `proposedPayloadSummary` contains no raw payload, headers, tokens, cookies, credentials, or raw external payload.
- Sprint 13 `POST /from-*` APIs do not dereference endpoints, validate endpoint reachability, fetch external data, or discover external schemas.
- No webhook dispatch exists, including audit-only dispatch.
- ToolResult / ToolExecutionReceipt are sanitized evidence only.
- FileChangeProposal / PullRequestPlan are sanitized evidence only.
- Kelvin approval only changes local external governance record status.
- Kelvin approval does not call external systems, connect MCP, create webhook, send messages, execute ToolRuns or Agents, or complete Tasks.
- External / MCP states do not include `connected`, `called`, `sent`, `synced`, `webhook_created`, `mcp_invoked`, `external_updated`, or `executed`.
- RegressionGate `targetSprint = 'sprint_13'` covers Sprint 1-12 regression.
- ReleaseReadinessChecklist `targetSprint = 'sprint_13'` covers Sprint 1-12 regression.
- RegressionGate `passed` is not an external execution token.
- ReleaseReadiness `approved_record` is not an external execution token.
- UI does not show forbidden execution labels.
- Sprint 1-12 behavior does not regress.

## Non-goals

- No external API calls.
- No MCP connections.
- No network requests.
- No webhook creation or dispatch.
- No worker, queue, or background job.
- No email, chat, message, webhook, or notification sending.
- No external system reads or writes.
- No shell, Git, file write, patch apply, PR creation, deploy, or delete.
- No Agent execution.
- No ToolRun execution.
- No Task completion.
- No retry, replay, rollback, or resume execution.
- No future automatic approval.
