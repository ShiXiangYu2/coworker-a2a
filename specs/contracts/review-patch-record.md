# Contract: ReviewPatchRecord

Status: proposed for Sprint 12

## Purpose

ReviewPatchRecord captures local human or agent-record review of FileChangeProposal, PatchDraft, GitChangePlan, or PullRequestPlan.

It is not permission to apply changes.

## Schema

```ts
ReviewPatchRecord {
  id: string
  schemaVersion: string
  correlationId: string

  resourceType: 'file_change_proposal' | 'patch_draft' | 'git_change_plan' | 'pull_request_plan'
  resourceId: string
  taskId?: string

  status:
    | 'proposal'
    | 'draft'
    | 'review'
    | 'approved_record'
    | 'rejected'
    | 'superseded'
    | 'archived'

  reviewerType: 'human' | 'kelvin' | 'agent_record' | 'system'
  reviewerId?: string
  verdict: 'needs_changes' | 'approved_record' | 'rejected' | 'informational'
  summary: string
  findings: {
    severity: 'info' | 'warning' | 'error' | 'critical'
    title: string
    detail: string
    suggestedChange?: string
  }[]

  requiresHumanConfirmation: boolean
  confirmationArtifactId?: string

  canApply: false
  canWriteFile: false
  canRunGit: false
  canCreatePr: false
  canDeploy: false

  createdAt: string
  updatedAt: string
}
```

## Safety Invariants

- ReviewPatchRecord approval is local record approval only.
- ReviewPatchRecord must not apply patches.
- ReviewPatchRecord must not write files.
- ReviewPatchRecord must not run Git.
- ReviewPatchRecord must not create PRs.
- ReviewPatchRecord must not deploy, delete, or complete Tasks.

