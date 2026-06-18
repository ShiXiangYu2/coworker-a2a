import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { encodeJson } from '@/lib/harmony/serializers'
import { createObservabilityEvent } from '@/lib/observability/repository'
import { getToolExecutionReceiptForRun } from '@/lib/tools/repository'
import type { ToolResult } from '@/lib/tools/types'
import {
  assertLocalProposalOnly,
  eventTypeForResource,
  sanitizeSourceSnapshot,
  stableHash,
  validateFileChangeProposalDraft,
  validateGitChangePlanDraft,
  validatePatchDraftDraft,
  validatePullRequestPlanDraft,
} from './rules'
import {
  serializeFileChangeProposal,
  serializeGitChangePlan,
  serializePatchDraft,
  serializePullRequestPlan,
  serializeReviewPatchRecord,
} from './serializers'
import { transitionFileGitPrRecord } from './state-machine'
import type {
  FileChangeProposal,
  FileChangeProposalSourceType,
  FileGitPrEvent,
  FileGitPrRiskLevel,
  FileTargetMetadata,
  GitChangePlan,
  PatchDraft,
  PullRequestPlan,
  ReviewPatchRecord,
  SourceRedactionStatus,
} from './types'

type RawFileChangeProposal = Parameters<typeof serializeFileChangeProposal>[0]
type RawPatchDraft = Parameters<typeof serializePatchDraft>[0]
type RawGitChangePlan = Parameters<typeof serializeGitChangePlan>[0]
type RawPullRequestPlan = Parameters<typeof serializePullRequestPlan>[0]
type RawReviewPatchRecord = Parameters<typeof serializeReviewPatchRecord>[0]

const schemaVersion = 'sprint-12.0'

export class FileGitPrRepositoryError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message)
    this.name = 'FileGitPrRepositoryError'
  }
}

export async function createFileChangeProposal(input: {
  sourceType: FileChangeProposalSourceType
  sourceId?: string
  sourceSnapshot?: unknown
  sourceEvidenceRefs?: string[]
  taskId?: string
  agentRunId?: string
  agentResultId?: string
  toolRunId?: string
  toolResultId?: string
  toolExecutionReceiptId?: string
  collaborationDecisionId?: string
  title: string
  summary: string
  rationale: string
  targetFiles: FileTargetMetadata[]
  proposedChangeKind?: FileChangeProposal['proposedChangeKind']
  riskLevel?: FileGitPrRiskLevel
  idempotencyKey?: string
  createdBy?: FileChangeProposal['createdBy']
  sourceRedactionStatus?: SourceRedactionStatus
}) {
  if (input.idempotencyKey) {
    const existing = await findFileChangeProposalByIdempotencyKey(input.idempotencyKey)
    if (existing) return { fileChangeProposal: existing, auditEvents: [], observabilityEvents: [] }
  }
  const sourceSnapshot = input.sourceRedactionStatus === 'blocked'
    ? undefined
    : input.sourceSnapshot === undefined
      ? undefined
      : sanitizeSourceSnapshot(input.sourceSnapshot)
  const draft = {
    sourceType: input.sourceType,
    sourceSnapshot,
    sourceRedactionStatus: input.sourceRedactionStatus ?? 'not_required',
    targetFiles: input.targetFiles,
    title: input.title,
    summary: input.summary,
    rationale: input.rationale,
  }
  validateFileChangeProposalDraft(draft)
  assertLocalProposalOnly({ canWriteFile: false, canRunGit: false, canCreatePr: false, canDeploy: false })

  const id = randomUUID()
  const correlationId = `sprint12:${id}`
  await prisma.$executeRaw`
    INSERT INTO file_change_proposals (
      id, idempotencyKey, schemaVersion, correlationId, taskId, agentRunId, agentResultId,
      toolRunId, toolResultId, toolExecutionReceiptId, collaborationDecisionId, status,
      sourceType, sourceId, sourceEvidenceRefsJson, sourceSnapshotJson, sourceRedactionStatus,
      title, summary, rationale, targetFilesJson, proposedChangeKind, patchDraftIdsJson,
      gitChangePlanId, pullRequestPlanId, reviewPatchRecordIdsJson, riskLevel,
      requiresHumanConfirmation, confirmationArtifactId, createdBy, reviewedBy, reviewedAt,
      rejectionReason, supersedesProposalId, canWriteFile, canRunGit, canCreatePr, canDeploy,
      createdAt, updatedAt
    ) VALUES (
      ${id}, ${input.idempotencyKey ?? null}, ${schemaVersion}, ${correlationId},
      ${input.taskId ?? null}, ${input.agentRunId ?? null}, ${input.agentResultId ?? null},
      ${input.toolRunId ?? null}, ${input.toolResultId ?? null}, ${input.toolExecutionReceiptId ?? null},
      ${input.collaborationDecisionId ?? null}, ${'proposal'}, ${input.sourceType},
      ${input.sourceId ?? null}, ${encodeJson(input.sourceEvidenceRefs ?? [])},
      ${sourceSnapshot === undefined ? null : encodeJson(sourceSnapshot)},
      ${input.sourceRedactionStatus ?? 'not_required'}, ${input.title}, ${input.summary},
      ${input.rationale}, ${encodeJson(input.targetFiles)}, ${input.proposedChangeKind ?? 'other'},
      ${encodeJson([])}, ${null}, ${null}, ${encodeJson([])}, ${input.riskLevel ?? 'medium'},
      ${true}, ${null}, ${input.createdBy ?? 'human'}, ${null}, ${null}, ${null}, ${null},
      ${false}, ${false}, ${false}, ${false}, ${new Date()}, ${new Date()}
    )
  `
  const auditEvents = await audit({
    correlationId,
    taskId: input.taskId,
    eventType: 'file_change.proposal_created',
    actorType: actorType(input.createdBy),
    afterStatus: 'proposal',
    reason: 'FileChangeProposal local record created. No file was read or written.',
    payload: { fileChangeProposalId: id, sourceType: input.sourceType, localRecordOnly: true },
  })
  const observabilityEvents = [await observe(correlationId, 'file_change_proposal', id, 'file_change.proposal_created', 'FileChangeProposal local record created.')]
  const fileChangeProposal = await mustGetFileChangeProposal(id)
  return { fileChangeProposal, auditEvents, observabilityEvents }
}

export async function createFileChangeProposalFromAgentResult(agentRunId: string, input: Partial<Parameters<typeof createFileChangeProposal>[0]>) {
  const run = await findAgentRun(agentRunId)
  if (!run) throw new FileGitPrRepositoryError('AgentRun not found.', 404)
  return createFileChangeProposal({
    sourceType: 'agent_result',
    sourceId: agentRunId,
    sourceEvidenceRefs: [`agent_run:${agentRunId}`],
    sourceSnapshot: safeJson(run.resultJson, { agentRunId }),
    taskId: run.taskId,
    agentRunId,
    agentResultId: agentRunId,
    title: input.title ?? 'Change proposal from AgentResult',
    summary: input.summary ?? 'Local proposal created from sanitized AgentResult evidence.',
    rationale: input.rationale ?? 'AgentResult can recommend future changes but cannot write files.',
    targetFiles: input.targetFiles ?? [{ path: 'metadata-only', pathKind: 'metadata_only', changeIntent: 'other', riskLevel: 'medium' }],
    proposedChangeKind: input.proposedChangeKind,
    riskLevel: input.riskLevel,
    idempotencyKey: input.idempotencyKey,
    createdBy: input.createdBy ?? 'human',
  })
}

export async function createFileChangeProposalFromToolResult(toolRunId: string, input: Partial<Parameters<typeof createFileChangeProposal>[0]>) {
  const run = await findToolRun(toolRunId)
  if (!run) throw new FileGitPrRepositoryError('ToolRun not found.', 404)
  const result = safeJson<ToolResult | undefined>(run.resultJson, undefined)
  const receipt = await getToolExecutionReceiptForRun(toolRunId)
  return createFileChangeProposal({
    sourceType: 'tool_result',
    sourceId: toolRunId,
    sourceEvidenceRefs: [`tool_run:${toolRunId}`, ...(receipt ? [`tool_execution_receipt:${receipt.id}`] : [])],
    sourceSnapshot: {
      toolRunId,
      status: run.status,
      mode: run.mode,
      resultSummary: result?.summary,
      sideEffects: result?.sideEffects ?? [],
      receiptId: receipt?.id,
    },
    taskId: run.taskId ?? undefined,
    agentRunId: run.agentRunId ?? undefined,
    toolRunId,
    toolResultId: toolRunId,
    toolExecutionReceiptId: receipt?.id,
    title: input.title ?? 'Change proposal from ToolResult',
    summary: input.summary ?? 'Local proposal created from deterministic ToolResult evidence.',
    rationale: input.rationale ?? 'ToolResult evidence cannot authorize File / Git / PR execution.',
    targetFiles: input.targetFiles ?? [{ path: 'metadata-only', pathKind: 'metadata_only', changeIntent: 'other', riskLevel: 'medium' }],
    proposedChangeKind: input.proposedChangeKind,
    riskLevel: input.riskLevel,
    idempotencyKey: input.idempotencyKey,
    createdBy: input.createdBy ?? 'human',
  })
}

export async function createFileChangeProposalFromToolExecutionReceipt(receiptId: string, input: Partial<Parameters<typeof createFileChangeProposal>[0]>) {
  const receipt = await findToolExecutionReceipt(receiptId)
  if (!receipt) throw new FileGitPrRepositoryError('ToolExecutionReceipt not found.', 404)
  return createFileChangeProposal({
    sourceType: 'tool_execution_receipt',
    sourceId: receiptId,
    sourceEvidenceRefs: [`tool_execution_receipt:${receiptId}`, `tool_run:${receipt.toolRunId}`],
    sourceSnapshot: {
      receiptId,
      toolRunId: receipt.toolRunId,
      status: receipt.status,
      resultSummary: receipt.resultSummary,
      sideEffects: safeJson(receipt.sideEffectsJson, []),
      sideEffectClass: receipt.sideEffectClass,
      outputHash: receipt.outputHash,
    },
    taskId: receipt.taskId ?? undefined,
    agentRunId: receipt.agentRunId ?? undefined,
    toolRunId: receipt.toolRunId,
    toolExecutionReceiptId: receiptId,
    title: input.title ?? 'Change proposal from ToolExecutionReceipt',
    summary: input.summary ?? 'Local proposal created from sanitized ToolExecutionReceipt evidence.',
    rationale: input.rationale ?? 'ToolExecutionReceipt is evidence only and cannot authorize File / Git / PR execution.',
    targetFiles: input.targetFiles ?? [{ path: 'metadata-only', pathKind: 'metadata_only', changeIntent: 'other', riskLevel: 'medium' }],
    proposedChangeKind: input.proposedChangeKind,
    riskLevel: input.riskLevel,
    idempotencyKey: input.idempotencyKey,
    createdBy: input.createdBy ?? 'human',
  })
}

export async function createFileChangeProposalFromCollaborationDecision(decisionId: string, input: Partial<Parameters<typeof createFileChangeProposal>[0]>) {
  const decision = await findCollaborationDecision(decisionId)
  if (!decision) throw new FileGitPrRepositoryError('CollaborationDecision not found.', 404)
  return createFileChangeProposal({
    sourceType: 'collaboration_decision',
    sourceId: decisionId,
    sourceEvidenceRefs: [`collaboration_decision:${decisionId}`],
    sourceSnapshot: {
      collaborationDecisionId: decision.id,
      status: decision.status,
      title: decision.title,
      recommendation: decision.recommendation,
    },
    taskId: decision.taskId ?? undefined,
    collaborationDecisionId: decisionId,
    title: input.title ?? 'Change proposal from CollaborationDecision',
    summary: input.summary ?? 'Local proposal created from collaboration decision evidence.',
    rationale: input.rationale ?? 'CollaborationDecision approval does not execute tools or write files.',
    targetFiles: input.targetFiles ?? [{ path: 'metadata-only', pathKind: 'metadata_only', changeIntent: 'other', riskLevel: 'medium' }],
    proposedChangeKind: input.proposedChangeKind,
    riskLevel: input.riskLevel,
    idempotencyKey: input.idempotencyKey,
    createdBy: input.createdBy ?? 'human',
  })
}

export async function listFileChangeProposals(filters: {
  taskId?: string
  agentRunId?: string
  toolRunId?: string
  toolExecutionReceiptId?: string
  collaborationDecisionId?: string
  status?: string
} = {}): Promise<FileChangeProposal[]> {
  const rows = await prisma.$queryRaw<RawFileChangeProposal[]>`
    SELECT * FROM file_change_proposals
    WHERE (${filters.taskId ?? null} IS NULL OR taskId = ${filters.taskId ?? null})
      AND (${filters.agentRunId ?? null} IS NULL OR agentRunId = ${filters.agentRunId ?? null})
      AND (${filters.toolRunId ?? null} IS NULL OR toolRunId = ${filters.toolRunId ?? null})
      AND (${filters.toolExecutionReceiptId ?? null} IS NULL OR toolExecutionReceiptId = ${filters.toolExecutionReceiptId ?? null})
      AND (${filters.collaborationDecisionId ?? null} IS NULL OR collaborationDecisionId = ${filters.collaborationDecisionId ?? null})
      AND (${filters.status ?? null} IS NULL OR status = ${filters.status ?? null})
    ORDER BY createdAt DESC
  `
  return rows.map(serializeFileChangeProposal)
}

export async function getFileChangeProposal(id: string): Promise<FileChangeProposal | null> {
  const rows = await prisma.$queryRaw<RawFileChangeProposal[]>`
    SELECT * FROM file_change_proposals WHERE id = ${id} LIMIT 1
  `
  return rows[0] ? serializeFileChangeProposal(rows[0]) : null
}

export async function updateFileChangeProposalStatus(id: string, event: FileGitPrEvent, reason: string) {
  const proposal = await mustGetFileChangeProposal(id)
  const nextStatus = transitionFileGitPrRecord(proposal.status, event)
  await prisma.$executeRaw`
    UPDATE file_change_proposals
    SET status = ${nextStatus},
        reviewedBy = ${nextStatus === 'approved_record' || nextStatus === 'rejected' ? 'kelvin' : proposal.reviewedBy ?? null},
        reviewedAt = ${nextStatus === 'approved_record' || nextStatus === 'rejected' ? new Date() : proposal.reviewedAt ? new Date(proposal.reviewedAt) : null},
        rejectionReason = ${nextStatus === 'rejected' ? reason : null},
        updatedAt = ${new Date()}
    WHERE id = ${id}
  `
  const auditEvents = await audit({
    correlationId: proposal.correlationId,
    taskId: proposal.taskId,
    eventType: eventTypeForResource('file_change_proposal', nextStatus),
    actorType: nextStatus === 'approved_record' || nextStatus === 'rejected' ? 'kelvin' : 'user',
    beforeStatus: proposal.status,
    afterStatus: nextStatus,
    reason: `${reason} Local proposal record only; no file read, file write, patch application, Git, PR, deploy, ToolRun, AgentRun, or Task completion.`,
    payload: { fileChangeProposalId: id, localRecordOnly: true },
  })
  const observabilityEvents = [await observe(proposal.correlationId, 'file_change_proposal', id, eventTypeForResource('file_change_proposal', nextStatus), reason)]
  return { fileChangeProposal: await mustGetFileChangeProposal(id), auditEvents, observabilityEvents }
}

export async function createPatchDraft(input: {
  fileChangeProposalId: string
  draftType?: PatchDraft['draftType']
  targetPath: string
  language?: string
  summary: string
  rationale: string
  proposedPatch: string
  sourceSnippet?: string
  sourceRedactionStatus?: SourceRedactionStatus
  redactedFields?: string[]
  riskLevel?: FileGitPrRiskLevel
  createdBy?: PatchDraft['createdBy']
}) {
  const proposal = await mustGetFileChangeProposal(input.fileChangeProposalId)
  validatePatchDraftDraft({
    targetPath: input.targetPath,
    targetPathKind: 'metadata_only',
    proposedPatch: input.proposedPatch,
    sourceRedactionStatus: input.sourceRedactionStatus ?? 'not_required',
    sourceSnippet: input.sourceSnippet,
    summary: input.summary,
    rationale: input.rationale,
  })
  assertLocalProposalOnly({ canApply: false, canWriteFile: false, canFormat: false })
  const id = randomUUID()
  await prisma.$executeRaw`
    INSERT INTO patch_drafts (
      id, schemaVersion, correlationId, fileChangeProposalId, status, draftType,
      targetPath, targetPathKind, language, summary, rationale, proposedPatch, patchHash,
      sourceSnippet, sourceSnippetHash, sourceRedactionStatus, redactedFieldsJson,
      riskLevel, requiresHumanConfirmation, confirmationArtifactId, canApply, canWriteFile,
      canFormat, createdBy, reviewedBy, reviewedAt, rejectionReason, createdAt, updatedAt
    ) VALUES (
      ${id}, ${schemaVersion}, ${proposal.correlationId}, ${proposal.id}, ${'draft'},
      ${input.draftType ?? 'unified_diff_proposal'}, ${input.targetPath}, ${'metadata_only'},
      ${input.language ?? null}, ${input.summary}, ${input.rationale}, ${input.proposedPatch},
      ${stableHash(input.proposedPatch)}, ${input.sourceSnippet ?? null},
      ${input.sourceSnippet ? stableHash(input.sourceSnippet) : null},
      ${input.sourceRedactionStatus ?? 'not_required'}, ${encodeJson(input.redactedFields ?? [])},
      ${input.riskLevel ?? proposal.riskLevel}, ${true}, ${null}, ${false}, ${false}, ${false},
      ${input.createdBy ?? 'human'}, ${null}, ${null}, ${null}, ${new Date()}, ${new Date()}
    )
  `
  const auditEvents = await audit({
    correlationId: proposal.correlationId,
    taskId: proposal.taskId,
    eventType: 'patch_draft.created',
    actorType: actorType(input.createdBy),
    afterStatus: 'draft',
    reason: 'PatchDraft local record created. It cannot be applied.',
    payload: { patchDraftId: id, fileChangeProposalId: proposal.id, localRecordOnly: true },
  })
  const observabilityEvents = [await observe(proposal.correlationId, 'patch_draft', id, 'patch_draft.created', 'PatchDraft local record created.')]
  return { patchDraft: await mustGetPatchDraft(id), auditEvents, observabilityEvents }
}

export async function listPatchDrafts(filters: { fileChangeProposalId?: string } = {}) {
  const rows = await prisma.$queryRaw<RawPatchDraft[]>`
    SELECT * FROM patch_drafts
    WHERE (${filters.fileChangeProposalId ?? null} IS NULL OR fileChangeProposalId = ${filters.fileChangeProposalId ?? null})
    ORDER BY createdAt DESC
  `
  return rows.map(serializePatchDraft)
}

export async function getPatchDraft(id: string) {
  const rows = await prisma.$queryRaw<RawPatchDraft[]>`
    SELECT * FROM patch_drafts WHERE id = ${id} LIMIT 1
  `
  return rows[0] ? serializePatchDraft(rows[0]) : null
}

export async function updatePatchDraftStatus(id: string, event: FileGitPrEvent, reason: string) {
  const draft = await mustGetPatchDraft(id)
  const nextStatus = transitionFileGitPrRecord(draft.status, event)
  await updateSimpleStatus('patch_drafts', id, nextStatus, draft.reviewedBy, draft.reviewedAt, nextStatus === 'rejected' ? reason : null)
  const auditEvents = await audit({
    correlationId: draft.correlationId,
    taskId: undefined,
    eventType: eventTypeForResource('patch_draft', nextStatus),
    actorType: nextStatus === 'approved_record' || nextStatus === 'rejected' ? 'kelvin' : 'user',
    beforeStatus: draft.status,
    afterStatus: nextStatus,
    reason: `${reason} Local PatchDraft record only; no patch was applied.`,
    payload: { patchDraftId: id, localRecordOnly: true },
  })
  return { patchDraft: await mustGetPatchDraft(id), auditEvents, observabilityEvents: [await observe(draft.correlationId, 'patch_draft', id, eventTypeForResource('patch_draft', nextStatus), reason)] }
}

export async function createGitChangePlan(input: {
  fileChangeProposalId?: string
  patchDraftIds?: string[]
  sourceEvidenceRefs?: string[]
  sourceRedactionStatus?: SourceRedactionStatus
  planType?: GitChangePlan['planType']
  title: string
  summary: string
  rationale: string
  proposedBranchName?: string
  proposedCommitMessage?: string
  proposedChangedPaths?: string[]
  proposedCommandsText?: string
  riskLevel?: FileGitPrRiskLevel
  createdBy?: GitChangePlan['createdBy']
}) {
  const proposal = input.fileChangeProposalId ? await mustGetFileChangeProposal(input.fileChangeProposalId) : null
  validateGitChangePlanDraft({
    proposedChangedPaths: input.proposedChangedPaths ?? [],
    proposedCommandsText: input.proposedCommandsText,
    sourceRedactionStatus: input.sourceRedactionStatus ?? 'not_required',
    title: input.title,
    summary: input.summary,
    rationale: input.rationale,
  })
  assertLocalProposalOnly({ canRunGit: false, canCommit: false, canPush: false, canMerge: false })
  const id = randomUUID()
  const correlationId = proposal?.correlationId ?? `sprint12:${id}`
  await prisma.$executeRaw`
    INSERT INTO git_change_plans (
      id, schemaVersion, correlationId, fileChangeProposalId, patchDraftIdsJson,
      sourceEvidenceRefsJson, sourceRedactionStatus, status, planType, title, summary,
      rationale, proposedBranchName, proposedCommitMessage, proposedChangedPathsJson,
      proposedCommandsText, riskLevel, requiresHumanConfirmation, confirmationArtifactId,
      canRunGit, canCommit, canPush, canMerge, createdBy, reviewedBy, reviewedAt,
      rejectionReason, createdAt, updatedAt
    ) VALUES (
      ${id}, ${schemaVersion}, ${correlationId}, ${input.fileChangeProposalId ?? null},
      ${encodeJson(input.patchDraftIds ?? [])}, ${encodeJson(input.sourceEvidenceRefs ?? [])},
      ${input.sourceRedactionStatus ?? 'not_required'}, ${'draft'}, ${input.planType ?? 'review_plan'},
      ${input.title}, ${input.summary}, ${input.rationale}, ${input.proposedBranchName ?? null},
      ${input.proposedCommitMessage ?? null}, ${encodeJson(input.proposedChangedPaths ?? [])},
      ${input.proposedCommandsText ?? null}, ${input.riskLevel ?? 'medium'}, ${true}, ${null},
      ${false}, ${false}, ${false}, ${false}, ${input.createdBy ?? 'human'}, ${null}, ${null},
      ${null}, ${new Date()}, ${new Date()}
    )
  `
  const auditEvents = await audit({
    correlationId,
    taskId: proposal?.taskId,
    eventType: 'git_change_plan.created',
    actorType: actorType(input.createdBy),
    afterStatus: 'draft',
    reason: 'GitChangePlan local record created. No Git command was run.',
    payload: { gitChangePlanId: id, localRecordOnly: true },
  })
  return { gitChangePlan: await mustGetGitChangePlan(id), auditEvents, observabilityEvents: [await observe(correlationId, 'git_change_plan', id, 'git_change_plan.created', 'GitChangePlan local record created.')] }
}

export async function listGitChangePlans(filters: { fileChangeProposalId?: string } = {}) {
  const rows = await prisma.$queryRaw<RawGitChangePlan[]>`
    SELECT * FROM git_change_plans
    WHERE (${filters.fileChangeProposalId ?? null} IS NULL OR fileChangeProposalId = ${filters.fileChangeProposalId ?? null})
    ORDER BY createdAt DESC
  `
  return rows.map(serializeGitChangePlan)
}

export async function getGitChangePlan(id: string) {
  const rows = await prisma.$queryRaw<RawGitChangePlan[]>`
    SELECT * FROM git_change_plans WHERE id = ${id} LIMIT 1
  `
  return rows[0] ? serializeGitChangePlan(rows[0]) : null
}

export async function updateGitChangePlanStatus(id: string, event: FileGitPrEvent, reason: string) {
  const plan = await mustGetGitChangePlan(id)
  const nextStatus = transitionFileGitPrRecord(plan.status, event)
  await updateSimpleStatus('git_change_plans', id, nextStatus, plan.reviewedBy, plan.reviewedAt, nextStatus === 'rejected' ? reason : null)
  const auditEvents = await audit({
    correlationId: plan.correlationId,
    eventType: eventTypeForResource('git_change_plan', nextStatus),
    actorType: nextStatus === 'approved_record' || nextStatus === 'rejected' ? 'kelvin' : 'user',
    beforeStatus: plan.status,
    afterStatus: nextStatus,
    reason: `${reason} Local GitChangePlan record only; no Git command was run.`,
    payload: { gitChangePlanId: id, localRecordOnly: true },
  })
  return { gitChangePlan: await mustGetGitChangePlan(id), auditEvents, observabilityEvents: [await observe(plan.correlationId, 'git_change_plan', id, eventTypeForResource('git_change_plan', nextStatus), reason)] }
}

export async function createPullRequestPlan(input: {
  fileChangeProposalId?: string
  gitChangePlanId?: string
  patchDraftIds?: string[]
  sourceEvidenceRefs?: string[]
  sourceRedactionStatus?: SourceRedactionStatus
  title: string
  summary: string
  bodyDraft: string
  checklist?: string[]
  riskNotes?: string[]
  testPlan?: string[]
  reviewerNotes?: string[]
  riskLevel?: FileGitPrRiskLevel
  createdBy?: PullRequestPlan['createdBy']
}) {
  const proposal = input.fileChangeProposalId ? await mustGetFileChangeProposal(input.fileChangeProposalId) : null
  validatePullRequestPlanDraft({
    title: input.title,
    summary: input.summary,
    bodyDraft: input.bodyDraft,
    sourceRedactionStatus: input.sourceRedactionStatus ?? 'not_required',
  })
  assertLocalProposalOnly({ canCreatePr: false, canPush: false, canMerge: false, canCallExternalApi: false })
  const id = randomUUID()
  const correlationId = proposal?.correlationId ?? `sprint12:${id}`
  await prisma.$executeRaw`
    INSERT INTO pull_request_plans (
      id, schemaVersion, correlationId, fileChangeProposalId, gitChangePlanId,
      patchDraftIdsJson, sourceEvidenceRefsJson, sourceRedactionStatus, status,
      title, summary, bodyDraft, checklistJson, riskNotesJson, testPlanJson,
      reviewerNotesJson, riskLevel, requiresHumanConfirmation, confirmationArtifactId,
      canCreatePr, canPush, canMerge, canCallExternalApi, createdBy, reviewedBy,
      reviewedAt, rejectionReason, createdAt, updatedAt
    ) VALUES (
      ${id}, ${schemaVersion}, ${correlationId}, ${input.fileChangeProposalId ?? null},
      ${input.gitChangePlanId ?? null}, ${encodeJson(input.patchDraftIds ?? [])},
      ${encodeJson(input.sourceEvidenceRefs ?? [])}, ${input.sourceRedactionStatus ?? 'not_required'},
      ${'draft'}, ${input.title}, ${input.summary}, ${input.bodyDraft},
      ${encodeJson(input.checklist ?? [])}, ${encodeJson(input.riskNotes ?? [])},
      ${encodeJson(input.testPlan ?? [])}, ${encodeJson(input.reviewerNotes ?? [])},
      ${input.riskLevel ?? 'medium'}, ${true}, ${null}, ${false}, ${false}, ${false}, ${false},
      ${input.createdBy ?? 'human'}, ${null}, ${null}, ${null}, ${new Date()}, ${new Date()}
    )
  `
  const auditEvents = await audit({
    correlationId,
    taskId: proposal?.taskId,
    eventType: 'pull_request_plan.created',
    actorType: actorType(input.createdBy),
    afterStatus: 'draft',
    reason: 'PullRequestPlan local record created. No PR was created.',
    payload: { pullRequestPlanId: id, localRecordOnly: true },
  })
  return { pullRequestPlan: await mustGetPullRequestPlan(id), auditEvents, observabilityEvents: [await observe(correlationId, 'pull_request_plan', id, 'pull_request_plan.created', 'PullRequestPlan local record created.')] }
}

export async function listPullRequestPlans(filters: { fileChangeProposalId?: string; gitChangePlanId?: string } = {}) {
  const rows = await prisma.$queryRaw<RawPullRequestPlan[]>`
    SELECT * FROM pull_request_plans
    WHERE (${filters.fileChangeProposalId ?? null} IS NULL OR fileChangeProposalId = ${filters.fileChangeProposalId ?? null})
      AND (${filters.gitChangePlanId ?? null} IS NULL OR gitChangePlanId = ${filters.gitChangePlanId ?? null})
    ORDER BY createdAt DESC
  `
  return rows.map(serializePullRequestPlan)
}

export async function getPullRequestPlan(id: string) {
  const rows = await prisma.$queryRaw<RawPullRequestPlan[]>`
    SELECT * FROM pull_request_plans WHERE id = ${id} LIMIT 1
  `
  return rows[0] ? serializePullRequestPlan(rows[0]) : null
}

export async function updatePullRequestPlanStatus(id: string, event: FileGitPrEvent, reason: string) {
  const plan = await mustGetPullRequestPlan(id)
  const nextStatus = transitionFileGitPrRecord(plan.status, event)
  await updateSimpleStatus('pull_request_plans', id, nextStatus, plan.reviewedBy, plan.reviewedAt, nextStatus === 'rejected' ? reason : null)
  const auditEvents = await audit({
    correlationId: plan.correlationId,
    eventType: eventTypeForResource('pull_request_plan', nextStatus),
    actorType: nextStatus === 'approved_record' || nextStatus === 'rejected' ? 'kelvin' : 'user',
    beforeStatus: plan.status,
    afterStatus: nextStatus,
    reason: `${reason} Local PullRequestPlan record only; no PR was created.`,
    payload: { pullRequestPlanId: id, localRecordOnly: true },
  })
  return { pullRequestPlan: await mustGetPullRequestPlan(id), auditEvents, observabilityEvents: [await observe(plan.correlationId, 'pull_request_plan', id, eventTypeForResource('pull_request_plan', nextStatus), reason)] }
}

export async function createReviewPatchRecord(input: {
  resourceType: ReviewPatchRecord['resourceType']
  resourceId: string
  taskId?: string
  reviewerType?: ReviewPatchRecord['reviewerType']
  reviewerId?: string
  verdict?: ReviewPatchRecord['verdict']
  summary: string
  findings?: ReviewPatchRecord['findings']
  requiresHumanConfirmation?: boolean
}) {
  const id = randomUUID()
  const correlationId = `sprint12:${id}`
  await prisma.$executeRaw`
    INSERT INTO review_patch_records (
      id, schemaVersion, correlationId, resourceType, resourceId, taskId, status,
      reviewerType, reviewerId, verdict, summary, findingsJson,
      requiresHumanConfirmation, confirmationArtifactId, canApply, canWriteFile,
      canRunGit, canCreatePr, canDeploy, createdAt, updatedAt
    ) VALUES (
      ${id}, ${schemaVersion}, ${correlationId}, ${input.resourceType}, ${input.resourceId},
      ${input.taskId ?? null}, ${'review'}, ${input.reviewerType ?? 'human'},
      ${input.reviewerId ?? null}, ${input.verdict ?? 'informational'}, ${input.summary},
      ${encodeJson(input.findings ?? [])}, ${input.requiresHumanConfirmation ?? true},
      ${null}, ${false}, ${false}, ${false}, ${false}, ${false}, ${new Date()}, ${new Date()}
    )
  `
  const auditEvents = await audit({
    correlationId,
    taskId: input.taskId,
    eventType: 'review_patch_record.created',
    actorType: input.reviewerType === 'kelvin' ? 'kelvin' : 'user',
    afterStatus: 'review',
    reason: 'ReviewPatchRecord local record created. It is not permission to apply changes.',
    payload: { reviewPatchRecordId: id, resourceType: input.resourceType, resourceId: input.resourceId, localRecordOnly: true },
  })
  return { reviewPatchRecord: await mustGetReviewPatchRecord(id), auditEvents, observabilityEvents: [await observe(correlationId, 'review_patch_record', id, 'review_patch_record.created', 'ReviewPatchRecord local record created.')] }
}

export async function listReviewPatchRecords(filters: { resourceType?: string; resourceId?: string } = {}) {
  const rows = await prisma.$queryRaw<RawReviewPatchRecord[]>`
    SELECT * FROM review_patch_records
    WHERE (${filters.resourceType ?? null} IS NULL OR resourceType = ${filters.resourceType ?? null})
      AND (${filters.resourceId ?? null} IS NULL OR resourceId = ${filters.resourceId ?? null})
    ORDER BY createdAt DESC
  `
  return rows.map(serializeReviewPatchRecord)
}

export async function getReviewPatchRecord(id: string) {
  const rows = await prisma.$queryRaw<RawReviewPatchRecord[]>`
    SELECT * FROM review_patch_records WHERE id = ${id} LIMIT 1
  `
  return rows[0] ? serializeReviewPatchRecord(rows[0]) : null
}

export async function updateReviewPatchRecordStatus(id: string, event: FileGitPrEvent, reason: string) {
  const record = await mustGetReviewPatchRecord(id)
  const nextStatus = transitionFileGitPrRecord(record.status, event)
  await updateReviewStatus(id, nextStatus)
  const auditEvents = await audit({
    correlationId: record.correlationId,
    taskId: record.taskId,
    eventType: eventTypeForResource('review_patch_record', nextStatus),
    actorType: nextStatus === 'approved_record' || nextStatus === 'rejected' ? 'kelvin' : 'user',
    beforeStatus: record.status,
    afterStatus: nextStatus,
    reason: `${reason} Review approval is local only and cannot apply changes.`,
    payload: { reviewPatchRecordId: id, localRecordOnly: true },
  })
  return { reviewPatchRecord: await mustGetReviewPatchRecord(id), auditEvents, observabilityEvents: [await observe(record.correlationId, 'review_patch_record', id, eventTypeForResource('review_patch_record', nextStatus), reason)] }
}

async function mustGetFileChangeProposal(id: string) {
  const record = await getFileChangeProposal(id)
  if (!record) throw new FileGitPrRepositoryError('FileChangeProposal not found.', 404)
  return record
}

async function mustGetPatchDraft(id: string) {
  const record = await getPatchDraft(id)
  if (!record) throw new FileGitPrRepositoryError('PatchDraft not found.', 404)
  return record
}

async function mustGetGitChangePlan(id: string) {
  const record = await getGitChangePlan(id)
  if (!record) throw new FileGitPrRepositoryError('GitChangePlan not found.', 404)
  return record
}

async function mustGetPullRequestPlan(id: string) {
  const record = await getPullRequestPlan(id)
  if (!record) throw new FileGitPrRepositoryError('PullRequestPlan not found.', 404)
  return record
}

async function mustGetReviewPatchRecord(id: string) {
  const record = await getReviewPatchRecord(id)
  if (!record) throw new FileGitPrRepositoryError('ReviewPatchRecord not found.', 404)
  return record
}

async function findFileChangeProposalByIdempotencyKey(idempotencyKey: string) {
  const rows = await prisma.$queryRaw<RawFileChangeProposal[]>`
    SELECT * FROM file_change_proposals WHERE idempotencyKey = ${idempotencyKey} LIMIT 1
  `
  return rows[0] ? serializeFileChangeProposal(rows[0]) : null
}

async function updateSimpleStatus(
  table: 'patch_drafts' | 'git_change_plans' | 'pull_request_plans',
  id: string,
  status: string,
  reviewedBy?: string,
  reviewedAt?: string,
  rejectionReason?: string | null
) {
  await prisma.$executeRawUnsafe(
    `UPDATE ${table} SET status = ?, reviewedBy = ?, reviewedAt = ?, rejectionReason = ?, updatedAt = ? WHERE id = ?`,
    status,
    status === 'approved_record' || status === 'rejected' ? 'kelvin' : reviewedBy ?? null,
    status === 'approved_record' || status === 'rejected' ? new Date() : reviewedAt ? new Date(reviewedAt) : null,
    rejectionReason ?? null,
    new Date(),
    id
  )
}

async function updateReviewStatus(id: string, status: string) {
  await prisma.$executeRaw`
    UPDATE review_patch_records SET status = ${status}, updatedAt = ${new Date()} WHERE id = ${id}
  `
}

async function audit(input: {
  correlationId: string
  taskId?: string
  eventType: string
  actorType: string
  beforeStatus?: string
  afterStatus?: string
  reason: string
  payload: Record<string, unknown>
}) {
  const event = await prisma.harmonyAuditEvent.create({
    data: {
      correlationId: input.correlationId,
      taskId: input.taskId,
      eventType: input.eventType,
      actorType: input.actorType,
      beforeStatus: input.beforeStatus,
      afterStatus: input.afterStatus,
      reason: input.reason,
      payloadJson: encodeJson(input.payload),
    },
  })
  return [event]
}

async function observe(correlationId: string, resourceType: string, resourceId: string, eventType: string, message: string) {
  return createObservabilityEvent({
    correlationId,
    resourceType: resourceType as never,
    resourceId,
    eventType,
    message,
    source: 'repository',
    attributes: { localRecordOnly: true, sprint: 12 },
  })
}

async function findAgentRun(id: string) {
  const rows = await prisma.$queryRaw<Array<{ id: string; taskId: string; resultJson: string | null }>>`
    SELECT id, taskId, resultJson FROM agent_runs WHERE id = ${id} LIMIT 1
  `
  return rows[0] ?? null
}

async function findToolRun(id: string) {
  const rows = await prisma.$queryRaw<Array<{
    id: string
    taskId: string | null
    agentRunId: string | null
    status: string
    mode: string
    resultJson: string | null
  }>>`
    SELECT id, taskId, agentRunId, status, mode, resultJson FROM tool_runs WHERE id = ${id} LIMIT 1
  `
  return rows[0] ?? null
}

async function findToolExecutionReceipt(id: string) {
  const rows = await prisma.$queryRaw<Array<{
    id: string
    toolRunId: string
    taskId: string | null
    agentRunId: string | null
    status: string
    resultSummary: string
    sideEffectsJson: string
    sideEffectClass: string
    outputHash: string | null
  }>>`
    SELECT id, toolRunId, taskId, agentRunId, status, resultSummary, sideEffectsJson, sideEffectClass, outputHash
    FROM tool_execution_receipts WHERE id = ${id} LIMIT 1
  `
  return rows[0] ?? null
}

async function findCollaborationDecision(id: string) {
  const rows = await prisma.$queryRaw<Array<{
    id: string
    taskId: string | null
    status: string
    title: string
    recommendation: string
  }>>`
    SELECT id, taskId, status, title, recommendation FROM collaboration_decisions WHERE id = ${id} LIMIT 1
  `
  return rows[0] ?? null
}

function actorType(createdBy?: 'human' | 'system' | 'agent_record') {
  if (createdBy === 'system') return 'system'
  if (createdBy === 'agent_record') return 'agent_runtime'
  return 'user'
}

function safeJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}
