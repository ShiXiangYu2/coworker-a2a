# Contract: ExternalActionReviewRecord

Status: proposed for Sprint 13

## Purpose

ExternalActionReviewRecord records a human or system review of an ExternalActionProposal.

It is a review record only. It must not execute the proposed action.

## Schema

```ts
ExternalActionReviewRecord {
  id: string
  schemaVersion: string
  correlationId: string
  externalActionProposalId: string
  riskAssessmentId?: string
  confirmationArtifactId?: string

  status:
    | 'proposal'
    | 'draft'
    | 'review'
    | 'approved_record'
    | 'rejected'
    | 'superseded'
    | 'archived'

  reviewer: 'kelvin' | 'owner' | 'operator' | 'turing' | 'system'
  verdict: 'approve_record' | 'reject' | 'request_changes' | 'archive'
  rationale: string
  requiredFollowUps?: string[]
  evidenceRefs?: string[]

  canExecute: false
  canCallExternalApi: false
  canConnectMcp: false
  canSendMessage: false
  canCreateWebhook: false
  canCreateWorker: false
  canCreateQueue: false
  canCompleteTask: false

  createdAt: string
  updatedAt: string
}
```

## Kelvin Boundary

Kelvin approval changes only the local proposal or review record status.

Kelvin approval does not:

- call external APIs.
- connect MCP.
- create webhooks.
- create workers, queues, or background jobs.
- send email, chat, messages, webhooks, or notifications.
- read or write external systems.
- execute ToolRuns.
- start or continue Agents.
- complete Tasks.
- approve future External / MCP workflows automatically.

## Safety Invariants

- `approved_record` is not an execution token.
- Review records must not be consumed by an execution path.
- Review records must be auditable and append-only by event history.
