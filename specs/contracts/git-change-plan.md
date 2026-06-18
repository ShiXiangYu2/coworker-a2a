# Contract: GitChangePlan

Status: proposed for Sprint 12

## Purpose

GitChangePlan records a proposed Git workflow for human review.

It is not a Git operation and must not run Git commands.

## Schema

```ts
GitChangePlan {
  id: string
  schemaVersion: string
  correlationId: string
  fileChangeProposalId?: string
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

  planType: 'branch_plan' | 'commit_plan' | 'review_plan' | 'release_note_plan' | 'other'
  title: string
  summary: string
  rationale: string

  proposedBranchName?: string
  proposedCommitMessage?: string
  proposedChangedPaths: string[]
  proposedCommandsText?: string

  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  requiresHumanConfirmation: boolean
  confirmationArtifactId?: string

  canRunGit: false
  canCommit: false
  canPush: false
  canMerge: false

  createdBy: 'human' | 'system' | 'agent_record'
  reviewedBy?: string
  reviewedAt?: string
  rejectionReason?: string
  createdAt: string
  updatedAt: string
}
```

## Field Rules

- `proposedCommandsText` is explanatory text only.
- `proposedChangedPaths` are metadata and must not be read or modified.
- `proposedBranchName` and `proposedCommitMessage` must not create branches or commits.
- `sourceEvidenceRefs` may reference AgentResult, ToolResult, ToolExecutionReceipt, CollaborationDecision, user-provided snippet, or sanitized context snapshot records.
- Source evidence is informational only and must not authorize Git, file, PR, deploy, delete, ToolRun execution, or Task completion.
- If `sourceRedactionStatus = 'blocked'`, blocked payload content must not be persisted in this record.

## Safety Invariants

- GitChangePlan must not execute Git.
- GitChangePlan must not create branches.
- GitChangePlan must not commit, push, merge, checkout, or rebase.
- GitChangePlan approval is a local record approval only.
- GitChangePlan must not consume ToolResult, ToolExecutionReceipt, RegressionGate, or ReleaseReadiness evidence as an execution token.
