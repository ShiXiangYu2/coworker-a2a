# Contract: FileChangeProposal

Status: proposed for Sprint 12

## Purpose

FileChangeProposal records a local, auditable suggestion for a future file change.

It is independent from ToolRun and is not a file write, patch application, formatter run, Git operation, PR, or deploy.

## Schema

```ts
FileChangeProposal {
  id: string
  schemaVersion: string
  correlationId: string

  taskId?: string
  agentRunId?: string
  agentResultId?: string
  toolRunId?: string
  toolResultId?: string
  toolExecutionReceiptId?: string
  collaborationDecisionId?: string

  status:
    | 'proposal'
    | 'draft'
    | 'review'
    | 'approved_record'
    | 'rejected'
    | 'superseded'
    | 'archived'

  sourceType:
    | 'agent_result'
    | 'tool_result'
    | 'tool_execution_receipt'
    | 'collaboration_decision'
    | 'user_provided_snippet'
    | 'sanitized_context_snapshot'

  sourceId?: string
  sourceEvidenceRefs?: string[]
  sourceSnapshot?: Json
  sourceRedactionStatus: 'not_required' | 'redacted' | 'blocked'

  title: string
  summary: string
  rationale: string
  targetFiles: {
    path: string
    pathKind: 'metadata_only'
    changeIntent: 'create' | 'modify' | 'delete_proposal' | 'rename_proposal' | 'test' | 'docs' | 'config' | 'other'
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
  }[]

  proposedChangeKind:
    | 'code'
    | 'test'
    | 'docs'
    | 'config'
    | 'refactor'
    | 'migration_plan'
    | 'other'

  patchDraftIds?: string[]
  gitChangePlanId?: string
  pullRequestPlanId?: string
  reviewPatchRecordIds?: string[]

  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  requiresHumanConfirmation: boolean
  confirmationArtifactId?: string

  createdBy: 'human' | 'system' | 'agent_record'
  reviewedBy?: string
  reviewedAt?: string
  rejectionReason?: string
  supersedesProposalId?: string

  canWriteFile: false
  canRunGit: false
  canCreatePr: false
  canDeploy: false

  createdAt: string
  updatedAt: string
}
```

## Source Rules

Allowed sources:

- AgentResult recommendation.
- ToolResult deterministic local record.
- ToolExecutionReceipt deterministic local execution receipt.
- CollaborationDecision approved local record.
- user-provided snippet.
- sanitized context snapshot.

Disallowed sources:

- real workspace file reads in Sprint 12.
- shell command output.
- Git command output.
- raw external API payloads.
- secrets, environment dumps, or private tokens.

ToolResult and ToolExecutionReceipt records are sanitized evidence only. They must not be interpreted as permission to write files, apply patches, run Git, create PRs, deploy, delete, execute ToolRuns, or complete Tasks.

## Safety Invariants

- FileChangeProposal is a local proposal record only.
- FileChangeProposal is independent from ToolRun and ToolExecutionReceipt execution state.
- FileChangeProposal must not dereference `targetFiles.path`.
- FileChangeProposal must not write, patch, format, rename, or delete files.
- FileChangeProposal approval must not run Git.
- FileChangeProposal approval must not create PRs.
- FileChangeProposal approval must not deploy.
- FileChangeProposal approval must not mark Task completed.

## Sprint 13 External / MCP Governance Boundary

FileChangeProposal may be referenced as sanitized evidence for ExternalActionProposal only.

Allowed:

- reference proposal id, title, summary, riskLevel, source evidence refs, and approved local record status.
- describe why a future external governance proposal may be useful.

Disallowed:

- FileChangeProposal must not authorize external API calls.
- FileChangeProposal must not authorize MCP connections.
- FileChangeProposal must not authorize webhook creation, message sending, worker or queue creation, external reads, external writes, ToolRun execution, Agent execution, or Task completion.
- FileChangeProposal must not trigger ExternalActionProposal creation automatically.
## Sprint 14 Human-Gated Workflow Orchestration Boundary

FileChangeProposal may be referenced by WorkflowProposal and WorkflowStepRecord as sanitized evidence only.

Sprint 14 must not reinterpret FileChangeProposal, PatchDraft, GitChangePlan, PullRequestPlan, or ReviewPatchRecord approval as permission to write files, apply patches, format, run Git, create PRs, execute workflow steps, or complete Tasks.
## Sprint 15 MVP Closure Evidence Boundary

FileChangeProposal may be referenced by MVPReadinessRecord, DemoScenarioRecord, and GovernanceSummaryRecord as sanitized evidence only.

FileChangeProposal must not become:

- a file write token.
- a patch apply token.
- a format token.
- a Git token.
- a PR token.
- a release or deploy token.

Sprint 15 record creation from FileChangeProposal must not write files, apply patches, format files, run Git, create PRs, mutate FileChangeProposal, or mutate linked PatchDraft / GitChangePlan / PullRequestPlan records.
