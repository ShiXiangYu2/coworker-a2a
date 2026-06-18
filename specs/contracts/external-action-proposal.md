# Contract: ExternalActionProposal

Status: proposed for Sprint 13

## Purpose

ExternalActionProposal records a proposed external integration action for human review.

It is independent from ToolRun and must not execute external actions.

## Schema

```ts
ExternalActionProposal {
  id: string
  schemaVersion: string
  correlationId: string
  taskId?: string
  agentRunId?: string
  toolRunId?: string
  toolExecutionReceiptId?: string
  collaborationDecisionId?: string
  fileChangeProposalId?: string
  pullRequestPlanId?: string
  externalIntegrationProfileId?: string
  mcpConnectionProfileId?: string

  sourceKind:
    | 'agent_result'
    | 'tool_result'
    | 'tool_execution_receipt'
    | 'collaboration_decision'
    | 'file_change_proposal'
    | 'pull_request_plan'
    | 'user_provided_snippet'
    | 'sanitized_context_snapshot'

  sourceEvidenceRefs: string[]
  sourceRedactionStatus: 'not_required' | 'redacted' | 'blocked'

  status:
    | 'proposal'
    | 'draft'
    | 'review'
    | 'approved_record'
    | 'rejected'
    | 'superseded'
    | 'archived'

  actionCategory:
    | 'external_api_proposal'
    | 'mcp_governance_proposal'
    | 'webhook_governance_proposal'
    | 'message_governance_proposal'
    | 'sync_governance_proposal'
    | 'schema_review_proposal'
    | 'other'

  title: string
  summary: string
  proposedIntent: string
  proposedPayloadSummary?: string
  endpointMetadataRef?: string
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted' | 'unknown'
  riskAssessmentId?: string

  canCallExternalApi: false
  canConnectMcp: false
  canSendNetworkRequest: false
  canCreateWebhook: false
  canCreateWorker: false
  canCreateQueue: false
  canSendMessage: false
  canReadExternalData: false
  canWriteExternalData: false
  canExecuteToolRun: false
  canStartAgent: false
  canCompleteTask: false

  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  requiresHumanConfirmation: boolean
  confirmationArtifactId?: string

  createdBy: 'human' | 'system' | 'agent_record'
  reviewedBy?: string
  reviewedAt?: string
  rejectionReason?: string
  supersededById?: string
  createdAt: string
  updatedAt: string
}
```

## Source Rules

- Source evidence is informational only.
- ToolResult and ToolExecutionReceipt can be used only when sanitized.
- FileChangeProposal and PullRequestPlan can be used only as local proposal evidence.
- If `sourceRedactionStatus = 'blocked'`, blocked payload content must not be persisted in the proposal.
- ExternalActionProposal must not fetch source data from external systems.
- `proposedPayloadSummary` is a human-readable summary only.
- `proposedPayloadSummary` must not include raw request body, raw response body, headers, Authorization values, tokens, cookies, credentials, API keys, private keys, raw external payloads, full webhook payloads, or unredacted personal data.
- `endpointMetadataRef` must not be dereferenced by ExternalActionProposal creation or review logic.

## Safety Invariants

- Approval is not an execution token.
- ExternalActionProposal must not call external APIs.
- ExternalActionProposal must not connect MCP.
- ExternalActionProposal must not create webhooks, workers, queues, or background jobs.
- ExternalActionProposal must not send messages.
- ExternalActionProposal must not execute ToolRuns or Agents.
- ExternalActionProposal must not complete Tasks.
- ExternalActionProposal must not validate endpoint reachability or discover external schemas.
## Sprint 14 Human-Gated Workflow Orchestration Boundary

ExternalActionProposal may be referenced by WorkflowProposal and WorkflowStepRecord as sanitized evidence only.

ExternalActionProposal approval must not be treated as permission for Sprint 14 to call external APIs, connect MCP, create webhooks, send messages, write external systems, execute workflow steps, continue Agents, execute ToolRuns, or complete Tasks.
## Sprint 15 MVP Closure Evidence Boundary

ExternalActionProposal may be referenced by MVPReadinessRecord, DemoScenarioRecord, and GovernanceSummaryRecord as sanitized evidence only.

ExternalActionProposal must not become:

- an external API call token.
- an MCP connection token.
- a webhook dispatch token.
- a message send token.
- a release or deploy token.

Sprint 15 record creation from ExternalActionProposal must not call external APIs, connect MCP, send messages, create webhooks, dispatch jobs, mutate ExternalActionProposal, or mutate linked integration records.
