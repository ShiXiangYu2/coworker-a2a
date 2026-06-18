export type FileGitPrStatus =
  | 'proposal'
  | 'draft'
  | 'review'
  | 'approved_record'
  | 'rejected'
  | 'superseded'
  | 'archived'

export type FileGitPrEvent =
  | 'DRAFT'
  | 'SUBMIT_REVIEW'
  | 'APPROVE_RECORD'
  | 'REJECT'
  | 'SUPERSEDE'
  | 'ARCHIVE'

export type FileGitPrRiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type SourceRedactionStatus = 'not_required' | 'redacted' | 'blocked'

export type FileChangeProposalSourceType =
  | 'agent_result'
  | 'tool_result'
  | 'tool_execution_receipt'
  | 'collaboration_decision'
  | 'user_provided_snippet'
  | 'sanitized_context_snapshot'

export interface FileTargetMetadata {
  path: string
  pathKind: 'metadata_only'
  changeIntent:
    | 'create'
    | 'modify'
    | 'delete_proposal'
    | 'rename_proposal'
    | 'test'
    | 'docs'
    | 'config'
    | 'other'
  riskLevel: FileGitPrRiskLevel
}

export interface FileChangeProposal {
  id: string
  idempotencyKey?: string
  schemaVersion: string
  correlationId: string
  taskId?: string
  agentRunId?: string
  agentResultId?: string
  toolRunId?: string
  toolResultId?: string
  toolExecutionReceiptId?: string
  collaborationDecisionId?: string
  status: FileGitPrStatus
  sourceType: FileChangeProposalSourceType
  sourceId?: string
  sourceEvidenceRefs: string[]
  sourceSnapshot?: unknown
  sourceRedactionStatus: SourceRedactionStatus
  title: string
  summary: string
  rationale: string
  targetFiles: FileTargetMetadata[]
  proposedChangeKind: 'code' | 'test' | 'docs' | 'config' | 'refactor' | 'migration_plan' | 'other'
  patchDraftIds?: string[]
  gitChangePlanId?: string
  pullRequestPlanId?: string
  reviewPatchRecordIds?: string[]
  riskLevel: FileGitPrRiskLevel
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

export interface PatchDraft {
  id: string
  schemaVersion: string
  correlationId: string
  fileChangeProposalId: string
  status: FileGitPrStatus
  draftType:
    | 'unified_diff_proposal'
    | 'text_replacement_proposal'
    | 'new_file_proposal'
    | 'delete_file_proposal'
    | 'rename_file_proposal'
  targetPath: string
  targetPathKind: 'metadata_only'
  language?: string
  summary: string
  rationale: string
  proposedPatch: string
  patchHash: string
  sourceSnippet?: string
  sourceSnippetHash?: string
  sourceRedactionStatus: SourceRedactionStatus
  redactedFields?: string[]
  riskLevel: FileGitPrRiskLevel
  requiresHumanConfirmation: boolean
  confirmationArtifactId?: string
  canApply: false
  canWriteFile: false
  canFormat: false
  createdBy: 'human' | 'system' | 'agent_record'
  reviewedBy?: string
  reviewedAt?: string
  rejectionReason?: string
  createdAt: string
  updatedAt: string
}

export interface GitChangePlan {
  id: string
  schemaVersion: string
  correlationId: string
  fileChangeProposalId?: string
  patchDraftIds?: string[]
  sourceEvidenceRefs: string[]
  sourceRedactionStatus: SourceRedactionStatus
  status: FileGitPrStatus
  planType: 'branch_plan' | 'commit_plan' | 'review_plan' | 'release_note_plan' | 'other'
  title: string
  summary: string
  rationale: string
  proposedBranchName?: string
  proposedCommitMessage?: string
  proposedChangedPaths: string[]
  proposedCommandsText?: string
  riskLevel: FileGitPrRiskLevel
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

export interface PullRequestPlan {
  id: string
  schemaVersion: string
  correlationId: string
  fileChangeProposalId?: string
  gitChangePlanId?: string
  patchDraftIds?: string[]
  sourceEvidenceRefs: string[]
  sourceRedactionStatus: SourceRedactionStatus
  status: FileGitPrStatus
  title: string
  summary: string
  bodyDraft: string
  checklist: string[]
  riskNotes: string[]
  testPlan: string[]
  reviewerNotes?: string[]
  riskLevel: FileGitPrRiskLevel
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

export interface ReviewPatchRecord {
  id: string
  schemaVersion: string
  correlationId: string
  resourceType: 'file_change_proposal' | 'patch_draft' | 'git_change_plan' | 'pull_request_plan'
  resourceId: string
  taskId?: string
  status: FileGitPrStatus
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

export type FileGitPrResourceType =
  | 'file_change_proposal'
  | 'patch_draft'
  | 'git_change_plan'
  | 'pull_request_plan'
  | 'review_patch_record'

export interface FileGitPrBundle {
  fileChangeProposal: FileChangeProposal
  patchDrafts: PatchDraft[]
  gitChangePlans: GitChangePlan[]
  pullRequestPlans: PullRequestPlan[]
  reviewPatchRecords: ReviewPatchRecord[]
}

export const sprint12SafetyNote =
  'Sprint 12 records File / Git / PR proposals only. It does not read real workspace files, write files, apply patches, format files, run shell or Git, commit, push, merge, create PRs, deploy, delete, call external APIs or MCP, automate browsers, execute Agents, execute ToolRuns, complete Tasks, retry, replay, rollback, or resume execution.'
