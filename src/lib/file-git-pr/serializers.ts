import { decodeJson } from '@/lib/harmony/serializers'
import type {
  FileChangeProposal,
  GitChangePlan,
  PatchDraft,
  PullRequestPlan,
  ReviewPatchRecord,
} from './types'

function dateToString(value: Date | null | undefined): string | undefined {
  return value ? value.toISOString() : undefined
}

export function serializeFileChangeProposal(record: {
  id: string
  idempotencyKey: string | null
  schemaVersion: string
  correlationId: string
  taskId: string | null
  agentRunId: string | null
  agentResultId: string | null
  toolRunId: string | null
  toolResultId: string | null
  toolExecutionReceiptId: string | null
  collaborationDecisionId: string | null
  status: string
  sourceType: string
  sourceId: string | null
  sourceEvidenceRefsJson: string
  sourceSnapshotJson: string | null
  sourceRedactionStatus: string
  title: string
  summary: string
  rationale: string
  targetFilesJson: string
  proposedChangeKind: string
  patchDraftIdsJson: string | null
  gitChangePlanId: string | null
  pullRequestPlanId: string | null
  reviewPatchRecordIdsJson: string | null
  riskLevel: string
  requiresHumanConfirmation: boolean
  confirmationArtifactId: string | null
  createdBy: string
  reviewedBy: string | null
  reviewedAt: Date | null
  rejectionReason: string | null
  supersedesProposalId: string | null
  canWriteFile: boolean
  canRunGit: boolean
  canCreatePr: boolean
  canDeploy: boolean
  createdAt: Date
  updatedAt: Date
}): FileChangeProposal {
  return {
    id: record.id,
    idempotencyKey: record.idempotencyKey ?? undefined,
    schemaVersion: record.schemaVersion,
    correlationId: record.correlationId,
    taskId: record.taskId ?? undefined,
    agentRunId: record.agentRunId ?? undefined,
    agentResultId: record.agentResultId ?? undefined,
    toolRunId: record.toolRunId ?? undefined,
    toolResultId: record.toolResultId ?? undefined,
    toolExecutionReceiptId: record.toolExecutionReceiptId ?? undefined,
    collaborationDecisionId: record.collaborationDecisionId ?? undefined,
    status: record.status as FileChangeProposal['status'],
    sourceType: record.sourceType as FileChangeProposal['sourceType'],
    sourceId: record.sourceId ?? undefined,
    sourceEvidenceRefs: decodeJson(record.sourceEvidenceRefsJson, []),
    sourceSnapshot: decodeJson(record.sourceSnapshotJson, undefined),
    sourceRedactionStatus: record.sourceRedactionStatus as FileChangeProposal['sourceRedactionStatus'],
    title: record.title,
    summary: record.summary,
    rationale: record.rationale,
    targetFiles: decodeJson(record.targetFilesJson, []),
    proposedChangeKind: record.proposedChangeKind as FileChangeProposal['proposedChangeKind'],
    patchDraftIds: decodeJson(record.patchDraftIdsJson, undefined),
    gitChangePlanId: record.gitChangePlanId ?? undefined,
    pullRequestPlanId: record.pullRequestPlanId ?? undefined,
    reviewPatchRecordIds: decodeJson(record.reviewPatchRecordIdsJson, undefined),
    riskLevel: record.riskLevel as FileChangeProposal['riskLevel'],
    requiresHumanConfirmation: record.requiresHumanConfirmation,
    confirmationArtifactId: record.confirmationArtifactId ?? undefined,
    createdBy: record.createdBy as FileChangeProposal['createdBy'],
    reviewedBy: record.reviewedBy ?? undefined,
    reviewedAt: dateToString(record.reviewedAt),
    rejectionReason: record.rejectionReason ?? undefined,
    supersedesProposalId: record.supersedesProposalId ?? undefined,
    canWriteFile: false,
    canRunGit: false,
    canCreatePr: false,
    canDeploy: false,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export function serializePatchDraft(record: {
  id: string
  schemaVersion: string
  correlationId: string
  fileChangeProposalId: string
  status: string
  draftType: string
  targetPath: string
  targetPathKind: string
  language: string | null
  summary: string
  rationale: string
  proposedPatch: string
  patchHash: string
  sourceSnippet: string | null
  sourceSnippetHash: string | null
  sourceRedactionStatus: string
  redactedFieldsJson: string | null
  riskLevel: string
  requiresHumanConfirmation: boolean
  confirmationArtifactId: string | null
  canApply: boolean
  canWriteFile: boolean
  canFormat: boolean
  createdBy: string
  reviewedBy: string | null
  reviewedAt: Date | null
  rejectionReason: string | null
  createdAt: Date
  updatedAt: Date
}): PatchDraft {
  return {
    id: record.id,
    schemaVersion: record.schemaVersion,
    correlationId: record.correlationId,
    fileChangeProposalId: record.fileChangeProposalId,
    status: record.status as PatchDraft['status'],
    draftType: record.draftType as PatchDraft['draftType'],
    targetPath: record.targetPath,
    targetPathKind: 'metadata_only',
    language: record.language ?? undefined,
    summary: record.summary,
    rationale: record.rationale,
    proposedPatch: record.proposedPatch,
    patchHash: record.patchHash,
    sourceSnippet: record.sourceSnippet ?? undefined,
    sourceSnippetHash: record.sourceSnippetHash ?? undefined,
    sourceRedactionStatus: record.sourceRedactionStatus as PatchDraft['sourceRedactionStatus'],
    redactedFields: decodeJson(record.redactedFieldsJson, undefined),
    riskLevel: record.riskLevel as PatchDraft['riskLevel'],
    requiresHumanConfirmation: record.requiresHumanConfirmation,
    confirmationArtifactId: record.confirmationArtifactId ?? undefined,
    canApply: false,
    canWriteFile: false,
    canFormat: false,
    createdBy: record.createdBy as PatchDraft['createdBy'],
    reviewedBy: record.reviewedBy ?? undefined,
    reviewedAt: dateToString(record.reviewedAt),
    rejectionReason: record.rejectionReason ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export function serializeGitChangePlan(record: {
  id: string
  schemaVersion: string
  correlationId: string
  fileChangeProposalId: string | null
  patchDraftIdsJson: string | null
  sourceEvidenceRefsJson: string
  sourceRedactionStatus: string
  status: string
  planType: string
  title: string
  summary: string
  rationale: string
  proposedBranchName: string | null
  proposedCommitMessage: string | null
  proposedChangedPathsJson: string
  proposedCommandsText: string | null
  riskLevel: string
  requiresHumanConfirmation: boolean
  confirmationArtifactId: string | null
  canRunGit: boolean
  canCommit: boolean
  canPush: boolean
  canMerge: boolean
  createdBy: string
  reviewedBy: string | null
  reviewedAt: Date | null
  rejectionReason: string | null
  createdAt: Date
  updatedAt: Date
}): GitChangePlan {
  return {
    id: record.id,
    schemaVersion: record.schemaVersion,
    correlationId: record.correlationId,
    fileChangeProposalId: record.fileChangeProposalId ?? undefined,
    patchDraftIds: decodeJson(record.patchDraftIdsJson, undefined),
    sourceEvidenceRefs: decodeJson(record.sourceEvidenceRefsJson, []),
    sourceRedactionStatus: record.sourceRedactionStatus as GitChangePlan['sourceRedactionStatus'],
    status: record.status as GitChangePlan['status'],
    planType: record.planType as GitChangePlan['planType'],
    title: record.title,
    summary: record.summary,
    rationale: record.rationale,
    proposedBranchName: record.proposedBranchName ?? undefined,
    proposedCommitMessage: record.proposedCommitMessage ?? undefined,
    proposedChangedPaths: decodeJson(record.proposedChangedPathsJson, []),
    proposedCommandsText: record.proposedCommandsText ?? undefined,
    riskLevel: record.riskLevel as GitChangePlan['riskLevel'],
    requiresHumanConfirmation: record.requiresHumanConfirmation,
    confirmationArtifactId: record.confirmationArtifactId ?? undefined,
    canRunGit: false,
    canCommit: false,
    canPush: false,
    canMerge: false,
    createdBy: record.createdBy as GitChangePlan['createdBy'],
    reviewedBy: record.reviewedBy ?? undefined,
    reviewedAt: dateToString(record.reviewedAt),
    rejectionReason: record.rejectionReason ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export function serializePullRequestPlan(record: {
  id: string
  schemaVersion: string
  correlationId: string
  fileChangeProposalId: string | null
  gitChangePlanId: string | null
  patchDraftIdsJson: string | null
  sourceEvidenceRefsJson: string
  sourceRedactionStatus: string
  status: string
  title: string
  summary: string
  bodyDraft: string
  checklistJson: string
  riskNotesJson: string
  testPlanJson: string
  reviewerNotesJson: string | null
  riskLevel: string
  requiresHumanConfirmation: boolean
  confirmationArtifactId: string | null
  canCreatePr: boolean
  canPush: boolean
  canMerge: boolean
  canCallExternalApi: boolean
  createdBy: string
  reviewedBy: string | null
  reviewedAt: Date | null
  rejectionReason: string | null
  createdAt: Date
  updatedAt: Date
}): PullRequestPlan {
  return {
    id: record.id,
    schemaVersion: record.schemaVersion,
    correlationId: record.correlationId,
    fileChangeProposalId: record.fileChangeProposalId ?? undefined,
    gitChangePlanId: record.gitChangePlanId ?? undefined,
    patchDraftIds: decodeJson(record.patchDraftIdsJson, undefined),
    sourceEvidenceRefs: decodeJson(record.sourceEvidenceRefsJson, []),
    sourceRedactionStatus: record.sourceRedactionStatus as PullRequestPlan['sourceRedactionStatus'],
    status: record.status as PullRequestPlan['status'],
    title: record.title,
    summary: record.summary,
    bodyDraft: record.bodyDraft,
    checklist: decodeJson(record.checklistJson, []),
    riskNotes: decodeJson(record.riskNotesJson, []),
    testPlan: decodeJson(record.testPlanJson, []),
    reviewerNotes: decodeJson(record.reviewerNotesJson, undefined),
    riskLevel: record.riskLevel as PullRequestPlan['riskLevel'],
    requiresHumanConfirmation: record.requiresHumanConfirmation,
    confirmationArtifactId: record.confirmationArtifactId ?? undefined,
    canCreatePr: false,
    canPush: false,
    canMerge: false,
    canCallExternalApi: false,
    createdBy: record.createdBy as PullRequestPlan['createdBy'],
    reviewedBy: record.reviewedBy ?? undefined,
    reviewedAt: dateToString(record.reviewedAt),
    rejectionReason: record.rejectionReason ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export function serializeReviewPatchRecord(record: {
  id: string
  schemaVersion: string
  correlationId: string
  resourceType: string
  resourceId: string
  taskId: string | null
  status: string
  reviewerType: string
  reviewerId: string | null
  verdict: string
  summary: string
  findingsJson: string
  requiresHumanConfirmation: boolean
  confirmationArtifactId: string | null
  canApply: boolean
  canWriteFile: boolean
  canRunGit: boolean
  canCreatePr: boolean
  canDeploy: boolean
  createdAt: Date
  updatedAt: Date
}): ReviewPatchRecord {
  return {
    id: record.id,
    schemaVersion: record.schemaVersion,
    correlationId: record.correlationId,
    resourceType: record.resourceType as ReviewPatchRecord['resourceType'],
    resourceId: record.resourceId,
    taskId: record.taskId ?? undefined,
    status: record.status as ReviewPatchRecord['status'],
    reviewerType: record.reviewerType as ReviewPatchRecord['reviewerType'],
    reviewerId: record.reviewerId ?? undefined,
    verdict: record.verdict as ReviewPatchRecord['verdict'],
    summary: record.summary,
    findings: decodeJson(record.findingsJson, []),
    requiresHumanConfirmation: record.requiresHumanConfirmation,
    confirmationArtifactId: record.confirmationArtifactId ?? undefined,
    canApply: false,
    canWriteFile: false,
    canRunGit: false,
    canCreatePr: false,
    canDeploy: false,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}
