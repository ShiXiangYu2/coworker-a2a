# Contract: PullRequestPlan

Status: proposed for Sprint 12

## Purpose

PullRequestPlan records a proposed PR shape for future human use.

It is not a PR and must not call GitHub, GitLab, external APIs, MCP, browser automation, or repository hosting APIs.

## Schema

```ts
PullRequestPlan {
  id: string
  schemaVersion: string
  correlationId: string
  fileChangeProposalId?: string
  gitChangePlanId?: string
  patchDraftIds?: string[]
  sourceEvidenceRefs?: string[]
  sourceRedactionStatus: 'not_required' | 'redacted' | 'blocked'

  status:
    | 'proposal'
    | 'draft'
    | 'review'
    | 'approved_record'
    | 'rejected'
    | 'superseded'
    | 'archived'

  title: string
  summary: string
  bodyDraft: string
  checklist: string[]
  riskNotes: string[]
  testPlan: string[]
  reviewerNotes?: string[]

  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  requiresHumanConfirmation: boolean
  confirmationArtifactId?: string

  canCreatePr: false
  canPush: false
  canMerge: false
  canCallExternalApi: false

  createdBy: 'human' | 'system' | 'agent_record'
  reviewedBy?: string
  reviewedAt?: string
  rejectionReason?: string
  createdAt: string
  updatedAt: string
}
```

## Field Rules

- `sourceEvidenceRefs` may reference AgentResult, ToolResult, ToolExecutionReceipt, CollaborationDecision, user-provided snippet, or sanitized context snapshot records.
- Source evidence is informational only and must not authorize PR creation, Git, file writes, deploy, delete, ToolRun execution, external API calls, MCP calls, or Task completion.
- If `sourceRedactionStatus = 'blocked'`, blocked payload content must not be persisted in this record.

## Safety Invariants

- PullRequestPlan is a plan record only.
- PullRequestPlan must not create or update a PR.
- PullRequestPlan must not call external APIs, MCP, or browsers.
- PullRequestPlan approval must not push, merge, deploy, or complete a Task.
- PullRequestPlan must not consume ToolResult, ToolExecutionReceipt, RegressionGate, or ReleaseReadiness evidence as an execution token.

## Sprint 13 External / MCP Governance Boundary

PullRequestPlan may be referenced as sanitized evidence for ExternalActionProposal only.

Allowed:

- reference plan id, title, summary, checklist, risk notes, test plan, and approved local record status.
- describe a future external governance action as a local proposal.

Disallowed:

- PullRequestPlan must not authorize external API calls, repository hosting API calls, MCP connections, webhook creation, message sending, worker or queue creation, external reads, external writes, ToolRun execution, Agent execution, or Task completion.
- PullRequestPlan approval must not create ExternalActionProposal automatically.
- PullRequestPlan must not become a PR creation, external API, or MCP execution token.
## Sprint 14 Human-Gated Workflow Orchestration Boundary

PullRequestPlan may be referenced by WorkflowProposal and WorkflowStepRecord as sanitized evidence only.

PullRequestPlan remains a plan record. Sprint 14 must not create PRs, push branches, merge, deploy, execute workflows, or execute steps from PullRequestPlan evidence.
