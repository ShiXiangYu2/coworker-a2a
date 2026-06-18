# Contract: CollaborationDecision

Status: proposed for Sprint 9

## Purpose

CollaborationDecision records a local decision, recommendation, or conclusion from a CollaborationSession.

It is not execution approval.

## Schema

```ts
CollaborationDecision {
  id: string
  idempotencyKey?: string
  correlationId: string
  collaborationSessionId: string
  threadId?: string
  taskId?: string

  status:
    | 'draft'
    | 'queued_for_review'
    | 'approved_record'
    | 'rejected'
    | 'superseded'
    | 'archived'

  decisionType:
    | 'recommend_next_step'
    | 'confirm_scope'
    | 'request_human_input'
    | 'record_risk'
    | 'defer'
    | 'block_record'
    | 'handoff_summary'

  title: string
  rationale: string
  recommendation: string
  decisionInputs: {
    turnIds?: string[]
    handoffRequestIds?: string[]
    evalRunIds?: string[]
    contextPacketIds?: string[]
    toolCallIds?: string[]
  }

  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  requiresHumanConfirmation: boolean
  confirmationArtifactId?: string

  createdBy: 'human' | 'system' | 'agent_record'
  reviewedBy?: string
  reviewedAt?: string
  rejectionReason?: string
  createdAt: string
  updatedAt: string
}
```

## Safety Invariants

- `approved_record` means the decision record is approved for local display and audit only.
- CollaborationDecision approval must not execute tools.
- CollaborationDecision approval must not create ToolCall.
- CollaborationDecision approval must not approve Memory / Knowledge.
- CollaborationDecision approval must not dispatch A2A.
- CollaborationDecision approval must not mark Task completed.

## Sprint 12 File / Git / PR Proposal Boundary

CollaborationDecision may be used as a source for FileChangeProposal only through explicit user action.

Allowed:

- summarize agreed local collaboration recommendations.
- link to FileChangeProposal, PatchDraft, GitChangePlan, or PullRequestPlan records.
- provide rationale and risk notes for future human review.

Disallowed:

- CollaborationDecision approval must not write files.
- CollaborationDecision approval must not apply patches.
- CollaborationDecision approval must not run Git.
- CollaborationDecision approval must not create PRs.
- CollaborationDecision approval must not deploy or delete.
- CollaborationDecision approval must not start Agents, dispatch A2A, execute ToolRun, or complete Tasks.

## Sprint 13 External / MCP Governance Boundary

CollaborationDecision may be used as a source for ExternalActionProposal only through explicit user action.

Allowed:

- summarize agreed local collaboration recommendations.
- link to ExternalActionProposal, IntegrationRiskAssessment, or ExternalActionReviewRecord records.
- provide rationale and risk notes for future human review.

Disallowed:

- CollaborationDecision approval must not call external APIs.
- CollaborationDecision approval must not connect MCP.
- CollaborationDecision approval must not create webhooks, workers, queues, or background jobs.
- CollaborationDecision approval must not send messages, webhooks, emails, or notifications.
- CollaborationDecision approval must not read or write external systems.
- CollaborationDecision approval must not start Agents, dispatch A2A, execute ToolRun, or complete Tasks.
