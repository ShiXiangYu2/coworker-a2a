# Plan: Sprint 13 - External Integrations / MCP Governance

Status: proposed

## Current Baseline

Sprint 13 starts after Sprint 1-12 are complete. Sprint 13 must preserve Sprint 1-12 behavior and remain governance-only for External Integration / MCP workflows.

## Implementation Order

1. Add Sprint 13 contracts for ExternalIntegrationProfile, McpConnectionProfile, ExternalActionProposal, ExternalActionReviewRecord, IntegrationRiskAssessment, IntegrationAuditPolicy, state machine, and safety.
2. Extend AgentResult, ToolResult, ToolExecutionReceipt evidence handling, CollaborationDecision, FileChangeProposal, PullRequestPlan, confirmation, audit, observability, recovery, resume, eval, regression, readiness, security, and safety contracts.
3. Add TypeScript types after specs review.
4. Add pure validation for governance payloads, source evidence snapshots, endpoint metadata, forbidden state names, forbidden action terms, and secret-free metadata.
5. Add persistence after schema review.
6. Add local governance proposal/profile/review APIs.
7. Add ChatHub / Task UI governance display.
8. Add tests proving Sprint 13 cannot call external APIs, connect MCP, create webhooks, create workers or queues, send messages, read/write external systems, execute ToolRuns or Agents, or complete Tasks.
9. Add regression tests proving Sprint 1-12 behavior does not regress.

## Recommended Persistence

Sprint 13 may add tables during implementation:

- `ExternalIntegrationProfile`
- `McpConnectionProfile`
- `ExternalActionProposal`
- `ExternalActionReviewRecord`
- `IntegrationRiskAssessment`
- `IntegrationAuditPolicy`

Do not add:

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

## Design Decisions

- `ExternalActionProposal` should be independent from `ToolRun`.
- `McpConnectionProfile` must be a disabled local record profile only.
- `ExternalIntegrationProfile` may store sanitized endpoint metadata, but no secrets, tokens, headers, cookies, credentials, raw payloads, or embedded secret URLs.
- `ExternalIntegrationProfile.endpointMetadata.methodHints` are human review metadata only and must not be consumed as executable action types.
- `ExternalActionProposal.proposedPayloadSummary` is summary-only and must not contain raw request bodies, headers, tokens, cookies, credentials, or raw external payloads.
- External system schema reads are not allowed in Sprint 13.
- Source content must come only from AgentResult, ToolResult, ToolExecutionReceipt, CollaborationDecision, FileChangeProposal, PullRequestPlan, user-provided snippet, or sanitized context snapshot.
- Sprint 11 ToolResult / ToolExecutionReceipt and Sprint 12 FileChangeProposal / PullRequestPlan may be used as sanitized evidence only and must not authorize external API calls, MCP connections, webhook creation, message sending, ToolRun execution, Agent execution, or Task completion.
- Sprint 13 has no webhook dispatch mode, including audit-only dispatch.

## API Groups

External integration profiles:

- `POST /api/external-integration-profiles`
- `GET /api/external-integration-profiles`
- `GET /api/external-integration-profiles/:id`
- `POST /api/external-integration-profiles/:id/submit-review`
- `POST /api/external-integration-profiles/:id/approve-record`
- `POST /api/external-integration-profiles/:id/reject`
- `POST /api/external-integration-profiles/:id/archive`

MCP connection profiles:

- `POST /api/mcp-connection-profiles`
- `GET /api/mcp-connection-profiles`
- `GET /api/mcp-connection-profiles/:id`
- `POST /api/mcp-connection-profiles/:id/submit-review`
- `POST /api/mcp-connection-profiles/:id/approve-record`
- `POST /api/mcp-connection-profiles/:id/reject`
- `POST /api/mcp-connection-profiles/:id/archive`

External action proposals:

- `POST /api/external-action-proposals/from-agent-result`
- `POST /api/external-action-proposals/from-tool-result`
- `POST /api/external-action-proposals/from-tool-execution-receipt`
- `POST /api/external-action-proposals/from-collaboration-decision`
- `POST /api/external-action-proposals/from-file-change-proposal`
- `POST /api/external-action-proposals/from-pull-request-plan`
- `POST /api/external-action-proposals/from-user-snippet`
- `GET /api/external-action-proposals`
- `GET /api/external-action-proposals/:id`
- `POST /api/external-action-proposals/:id/submit-review`
- `POST /api/external-action-proposals/:id/approve-record`
- `POST /api/external-action-proposals/:id/reject`
- `POST /api/external-action-proposals/:id/supersede`
- `POST /api/external-action-proposals/:id/archive`

Risk and review records:

- `POST /api/integration-risk-assessments`
- `GET /api/integration-risk-assessments`
- `GET /api/integration-risk-assessments/:id`
- `POST /api/external-action-review-records`
- `GET /api/external-action-review-records`
- `GET /api/external-action-review-records/:id`
- `POST /api/external-action-review-records/:id/approve-record`
- `POST /api/external-action-review-records/:id/reject`
- `POST /api/external-action-review-records/:id/archive`
- `GET /api/integration-audit-policy`

Linked queries:

- `GET /api/harmony/tasks/:id/external-action-proposals`
- `GET /api/agent-runtime/runs/:id/external-action-proposals`
- `GET /api/tool-runs/:id/external-action-proposals`
- `GET /api/tool-execution-receipts/:id/external-action-proposals`
- `GET /api/collaboration-decisions/:id/external-action-proposals`
- `GET /api/file-change-proposals/:id/external-action-proposals`
- `GET /api/pull-request-plans/:id/external-action-proposals`
- `GET /api/external-action-proposals/:id/risk-assessments`
- `GET /api/external-action-proposals/:id/reviews`

## Forbidden API Semantics

Do not add Sprint 13 API routes with these semantics:

- `/connect`
- `/connect-mcp`
- `/call-api`
- `/send`
- `/send-message`
- `/sync`
- `/sync-now`
- `/invoke`
- `/invoke-mcp`
- `/create-webhook`
- `/dispatch`
- `/execute`
- `/run-integration`
- `/external-call`
- `/webhook-dispatch`
- `/create-worker`
- `/enqueue`
- `/retry`
- `/replay`
- `/rollback`
- `/resume-execution`

Existing historical route names such as `/api/tool-runs/:id` are not violations when they remain record queries.

## Sprint 13 POST API Boundary

Every Sprint 13 `POST` route must create, submit, approve, reject, supersede, or archive local governance records only.

All Sprint 13 `POST /from-*` routes must not dereference endpoint metadata, validate endpoint reachability, discover external schemas, fetch external data, or infer executable actions from `methodHints`.

Sprint 13 `POST` routes must not:

- call external APIs.
- connect MCP.
- send network requests.
- create webhooks.
- create workers, queues, or background jobs.
- send email, chat, messages, webhooks, or notifications.
- read external system data or schemas.
- write external systems.
- execute ToolRuns.
- start or continue AgentRuns.
- complete Tasks.

## UI Entry Points

AgentResult / ToolResult / ToolExecutionReceipt / CollaborationDecision cards:

- `Create External Proposal`
- `View External Proposals`
- `View Source Evidence`

FileChangeProposal / PullRequestPlan cards:

- `Create External Proposal`
- `View Linked External Proposals`

Task detail:

- `External Proposals`
- `Integration Profiles`
- `MCP Profiles`
- `Risk Assessments`
- `External Reviews`
- `Integration Audit Policy`
- `Audit`
- `Timeline`

## Safety Gates

- ExternalActionProposal cannot call external APIs.
- McpConnectionProfile cannot connect MCP or create MCP sessions.
- Endpoint metadata cannot contain secrets.
- Endpoint method hints are metadata only.
- Proposed payload summaries cannot contain raw payloads or credentials.
- Source evidence cannot grant external execution permission.
- ExternalActionReviewRecord approval cannot call external APIs, connect MCP, send messages, create webhooks, create workers or queues, execute Agents or ToolRuns, or complete Tasks.
- No webhook dispatch exists, including audit-only dispatch.
- Eval, RegressionGate, and ReleaseReadiness are evidence only and not execution tokens.
- RecoveryPoint and ResumeToken remain view-only and cannot restore, retry, replay, rollback, or resume execution.

## Validation Commands

When implemented:

```bash
npm run test
npm run lint
npm run build
```

If Sprint 13 later adds persistence:

```bash
npx prisma validate
npx prisma db push --skip-generate
npx prisma generate
```
