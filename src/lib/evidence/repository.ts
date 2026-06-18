import { prisma } from '@/lib/prisma'
import { encodeJson } from '@/lib/harmony/serializers'
import {
  computeContentHash,
  metadataOnly,
  normalizeEvidenceSource,
  redactSensitiveContent,
  summarizeUserContent,
  validateEvidenceImportInput,
  validateEvidenceOnlyTokenBlocker,
  validateEvidenceReviewInput,
  validateEvidenceReviewSafety,
  validateEvidenceSnapshotSafety,
  validateEvidenceSourceProfileInput,
  validateEvidenceSourceProfileSafety,
  validateRawInputStorage,
} from './validator'
import { isValidEvidenceImportStatus } from './state-machine'
import type {
  CreateEvidenceImportInput,
  CreateEvidenceReviewInput,
  CreateEvidenceSourceProfileInput,
  EvidenceItem,
  EvidenceSource,
  EvidenceSourceKind,
  FindEvidenceQuery,
  EvidenceMatch,
} from './types'
import {
  SPRINT_17_BASELINE,
  SPRINT_17_SAFETY_NOTE,
} from './types'

export class EvidenceApiError extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message)
    this.name = 'EvidenceApiError'
  }
}

export function evidenceErrorResponse(error: unknown) {
  if (error instanceof EvidenceApiError) {
    return Response.json({ ok: false, error: { code: 'evidence_error', message: error.message } }, { status: error.status })
  }
  if (error instanceof Error) {
    return Response.json({ ok: false, error: { code: 'validation_error', message: error.message } }, { status: 400 })
  }
  return Response.json({ ok: false, error: { code: 'unexpected_error', message: 'Unexpected Sprint 17 evidence API error.' } }, { status: 500 })
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function toJson(value: unknown): string {
  return JSON.stringify(value)
}

export function correlationIdFrom(value: unknown, prefix = 'evidence'): string {
  return typeof value === 'string' && value.trim()
    ? value
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function createEvidenceAuditEvent(args: {
  correlationId: string
  entityType: string
  entityId: string
  eventType: string
  actorType?: string
  reason: string
}) {
  return prisma.harmonyAuditEvent.create({
    data: {
      correlationId: args.correlationId,
      eventType: args.eventType,
      actorType: args.actorType ?? 'user',
      reason: args.reason,
      payloadJson: toJson({ entityType: args.entityType, entityId: args.entityId, sprint: 'sprint_17' }),
    },
  })
}

export async function ensureDefaultEvidenceRedactionPolicy(correlationId?: string) {
  const existing = await prisma.evidenceRedactionPolicy.findFirst({
    where: { targetSprint: 'sprint_17', status: 'active', policyVersion: 'sprint17-default' },
    orderBy: { createdAt: 'desc' },
  })
  if (existing) return existing

  return prisma.evidenceRedactionPolicy.create({
    data: {
      policyVersion: 'sprint17-default',
      targetSprint: 'sprint_17',
      status: 'active',
      allowedSnapshotKindsJson: toJson([
        'text_summary',
        'file_summary',
        'command_output_summary',
        'screenshot_description',
        'external_context_summary',
        'manual_note_summary',
      ]),
      forbiddenPatternsJson: toJson(['api_key', 'bearer_token', 'cookie', 'private_key', 'raw_header', 'raw_payload_secret']),
      createdBy: 'system_seed',
      correlationId: correlationIdFrom(correlationId, 'redaction'),
    },
  })
}

export async function createEvidenceSourceProfile(input: CreateEvidenceSourceProfileInput) {
  validateEvidenceSourceProfileInput(input)
  const correlationId = correlationIdFrom(input.correlationId, 'source')
  const data = {
    targetSprint: 'sprint_17',
    sourceKind: input.sourceKind,
    displayName: input.displayName,
    description: input.description,
    collectionMode: 'manual_user_provided_only',
    allowedContentTypesJson: toJson(input.allowedContentTypes ?? ['text/plain', 'text/markdown', 'application/json-summary']),
    forbiddenContentTypesJson: toJson(input.forbiddenContentTypes ?? ['raw_secret', 'raw_header', 'raw_payload', 'credential_dump']),
    metadataFieldsJson: toJson(input.metadataFields ?? []),
    mayDereferencePath: false,
    mayReadDirectory: false,
    mayReadClipboard: false,
    mayExecuteCommand: false,
    mayExecuteGit: false,
    mayFetchUrl: false,
    mayCallExternalApi: false,
    mayConnectMcp: false,
    mayReadExternalSystem: false,
    mayWriteExternalSystem: false,
    secretHandling: 'reject_or_redact',
    evidenceOnly: true,
    createdBy: input.createdBy ?? 'user',
    correlationId,
    auditRefsJson: '[]',
    idempotencyKey: input.idempotencyKey,
  }

  validateEvidenceSourceProfileSafety({
    targetSprint: 'sprint_17',
    collectionMode: 'manual_user_provided_only',
    mayDereferencePath: false,
    mayReadDirectory: false,
    mayReadClipboard: false,
    mayExecuteCommand: false,
    mayExecuteGit: false,
    mayFetchUrl: false,
    mayCallExternalApi: false,
    mayConnectMcp: false,
    mayReadExternalSystem: false,
    mayWriteExternalSystem: false,
    secretHandling: 'reject_or_redact',
    evidenceOnly: true,
  })

  const record = await prisma.evidenceSourceProfile.create({ data })
  const auditEvent = await createEvidenceAuditEvent({
    correlationId,
    entityType: 'EvidenceSourceProfile',
    entityId: record.id,
    eventType: 'evidence_source_profile.created',
    reason: 'Created local evidence source profile only.',
  })

  return { record, auditEvent, safetyNote: SPRINT_17_SAFETY_NOTE }
}

export async function ensureEvidenceSourceProfile(sourceKind: EvidenceSourceKind, correlationId?: string) {
  const existing = await prisma.evidenceSourceProfile.findFirst({
    where: { sourceKind, targetSprint: 'sprint_17' },
    orderBy: { createdAt: 'desc' },
  })
  if (existing) return existing

  const labels: Record<EvidenceSourceKind, string> = {
    user_pasted_text: 'User Pasted Text',
    user_provided_file_summary: 'User Provided File Summary',
    user_provided_command_output_summary: 'User Provided Command Output Summary',
    user_provided_external_screenshot_description: 'External Screenshot Description',
    user_provided_sanitized_context_snapshot: 'Sanitized Context Snapshot',
    manual_note: 'Manual Note',
  }

  const result = await createEvidenceSourceProfile({
    sourceKind,
    displayName: labels[sourceKind],
    description: 'Manual user-provided evidence source. Metadata is never dereferenced.',
    createdBy: 'system_seed',
    correlationId,
  })
  return result.record
}

export async function createEvidenceImportRecord(input: CreateEvidenceImportInput) {
  validateEvidenceImportInput(input)

  const sourceKind = normalizeEvidenceSource(input.sourceKind)
  const correlationId = correlationIdFrom(input.correlationId)
  const sourceProfile = input.sourceProfileId
    ? await prisma.evidenceSourceProfile.findUnique({ where: { id: input.sourceProfileId } })
    : await ensureEvidenceSourceProfile(sourceKind, correlationId)
  if (!sourceProfile) throw new EvidenceApiError('Evidence source profile not found.', 404)

  const redactionPolicy = input.redactionPolicyId
    ? await prisma.evidenceRedactionPolicy.findUnique({ where: { id: input.redactionPolicyId } })
    : await ensureDefaultEvidenceRedactionPolicy(correlationId)
  if (!redactionPolicy) throw new EvidenceApiError('Evidence redaction policy not found.', 404)

  const metadata = metadataOnly(input.sourceMetadata)
  const summary = input.importedContentSummary ?? summarizeUserContent(input.userProvidedSummary)
  const redacted = redactSensitiveContent(summary)
  const rawInputHandling = redacted.findings.length > 0 ? 'stored_redacted_excerpt_only' : 'not_stored'
  validateRawInputStorage(rawInputHandling)

  const record = await prisma.evidenceImportRecord.create({
    data: {
      title: input.title.trim(),
      summary: summarizeUserContent(summary, 500),
      targetSprint: 'sprint_17',
      baseline: SPRINT_17_BASELINE,
      sourceProfileId: sourceProfile.id,
      sourceKind,
      status: 'draft',
      userProvidedSummary: summarizeUserContent(input.userProvidedSummary, 2000),
      rawInputHandling,
      importedContentSummary: redacted.text,
      redactionPolicyId: redactionPolicy.id,
      sanitizedSnapshotRefsJson: '[]',
      sourceMetadataJson: toJson(metadata),
      sourceLimitationsJson: toJson(input.sourceLimitations ?? ['User-provided summary only; source metadata was not dereferenced.']),
      riskFindingsJson: toJson(redacted.findings),
      openIssuesJson: toJson(input.openIssues ?? []),
      evidenceOnly: true,
      isExecutionToken: false,
      isReleaseToken: false,
      isDeployToken: false,
      isExternalAccessToken: false,
      isTaskCompletionToken: false,
      mutatesSourceRecords: false,
      requiresKelvinConfirmation: true,
      createdBy: input.createdBy ?? 'user',
      correlationId,
      auditRefsJson: '[]',
      idempotencyKey: input.idempotencyKey,
    },
  })

  validateEvidenceOnlyTokenBlocker({
    evidenceOnly: record.evidenceOnly,
    isExecutionToken: record.isExecutionToken,
    isReleaseToken: record.isReleaseToken,
    isDeployToken: record.isDeployToken,
    isExternalAccessToken: record.isExternalAccessToken,
    isTaskCompletionToken: record.isTaskCompletionToken,
  })

  const snapshot = await createSanitizedEvidenceSnapshot({
    importRecordId: record.id,
    sourceKind,
    title: record.title,
    summary: record.importedContentSummary,
    redactedExcerpt: rawInputHandling === 'stored_redacted_excerpt_only'
      ? record.importedContentSummary.slice(0, redactionPolicy.maxRedactedExcerptLength)
      : undefined,
    sensitiveFindings: redacted.findings,
    sourceLimitations: parseJson<string[]>(record.sourceLimitationsJson, []),
    correlationId,
  })

  const updated = await prisma.evidenceImportRecord.update({
    where: { id: record.id },
    data: { sanitizedSnapshotRefsJson: toJson([snapshot.record.id]) },
  })

  const auditEvent = await createEvidenceAuditEvent({
    correlationId,
    entityType: 'EvidenceImportRecord',
    entityId: record.id,
    eventType: 'evidence_import.created',
    reason: 'Created local evidence import record from user-provided request body only.',
  })

  return { record: updated, snapshot: snapshot.record, auditEvents: [auditEvent, snapshot.auditEvent], safetyNote: SPRINT_17_SAFETY_NOTE }
}

async function createSanitizedEvidenceSnapshot(args: {
  importRecordId: string
  sourceKind: EvidenceSourceKind
  title: string
  summary: string
  redactedExcerpt?: string
  sensitiveFindings: string[]
  sourceLimitations: string[]
  correlationId: string
}) {
  const snapshotKindBySource: Record<EvidenceSourceKind, string> = {
    user_pasted_text: 'text_summary',
    user_provided_file_summary: 'file_summary',
    user_provided_command_output_summary: 'command_output_summary',
    user_provided_external_screenshot_description: 'screenshot_description',
    user_provided_sanitized_context_snapshot: 'external_context_summary',
    manual_note: 'manual_note_summary',
  }

  const record = await prisma.sanitizedEvidenceSnapshot.create({
    data: {
      importRecordId: args.importRecordId,
      targetSprint: 'sprint_17',
      snapshotKind: snapshotKindBySource[args.sourceKind],
      sanitizedTitle: args.title,
      sanitizedSummary: summarizeUserContent(args.summary, 2000),
      redactedExcerpt: args.redactedExcerpt,
      normalizedFactsJson: toJson(extractNormalizedFacts(args.summary)),
      sourceLimitationsJson: toJson(args.sourceLimitations),
      redactionStatus: args.sensitiveFindings.length > 0 ? 'redacted' : 'sanitized',
      rejectedSensitiveFindingsJson: toJson(args.sensitiveFindings),
      confidence: 'medium',
      mayBeUsedByJson: toJson(['operator_console', 'department_agent_profile', 'workflow_proposal', 'mvp_readiness', 'future_human_gated_execution_review']),
      evidenceOnly: true,
      isExecutionToken: false,
      isPermissionGrant: false,
      isReleaseToken: false,
      isDeployToken: false,
      isExternalAccessToken: false,
      isTaskCompletionToken: false,
      createdBy: 'system_record',
      correlationId: args.correlationId,
      auditRefsJson: '[]',
    },
  })

  validateEvidenceSnapshotSafety({
    targetSprint: 'sprint_17',
    evidenceOnly: record.evidenceOnly,
    isExecutionToken: record.isExecutionToken,
    isPermissionGrant: record.isPermissionGrant,
    isReleaseToken: record.isReleaseToken,
    isDeployToken: record.isDeployToken,
    isExternalAccessToken: record.isExternalAccessToken,
    isTaskCompletionToken: record.isTaskCompletionToken,
  })

  const auditEvent = await createEvidenceAuditEvent({
    correlationId: args.correlationId,
    entityType: 'SanitizedEvidenceSnapshot',
    entityId: record.id,
    eventType: 'sanitized_evidence_snapshot.created',
    reason: 'Created sanitized evidence snapshot only.',
  })

  return { record, auditEvent }
}

function extractNormalizedFacts(summary: string): string[] {
  return summary
    .split(/[.\n;]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 10)
}

export async function createEvidenceReviewRecord(input: CreateEvidenceReviewInput) {
  validateEvidenceReviewInput(input)
  const target = await findEvidenceReviewTarget(input.targetType, input.targetId)
  if (!target) throw new EvidenceApiError('Evidence review target not found.', 404)

  const correlationId = input.correlationId ?? target.correlationId
  const relationData =
    input.targetType === 'evidence_import_record'
      ? { importRecordId: input.targetId }
      : input.targetType === 'sanitized_evidence_snapshot'
        ? { snapshotId: input.targetId }
        : {}

  const record = await prisma.evidenceReviewRecord.create({
    data: {
      targetType: input.targetType,
      targetId: input.targetId,
      targetSprint: 'sprint_17',
      status: 'draft',
      reviewer: input.reviewer,
      verdict: input.verdict,
      reviewNotes: input.reviewNotes,
      confirmationArtifactId: input.confirmationArtifactId,
      evidenceOnly: true,
      doesNotReadFiles: true,
      doesNotRunCommands: true,
      doesNotRunGit: true,
      doesNotFetchUrls: true,
      doesNotCallExternalSystems: true,
      doesNotConnectMcp: true,
      doesNotExecute: true,
      doesNotRelease: true,
      doesNotDeploy: true,
      doesNotCompleteTask: true,
      createdBy: input.createdBy ?? 'user',
      correlationId,
      auditRefsJson: '[]',
      idempotencyKey: input.idempotencyKey,
      ...relationData,
    },
  })

  validateEvidenceReviewSafety({
    targetSprint: 'sprint_17',
    evidenceOnly: record.evidenceOnly,
    doesNotReadFiles: record.doesNotReadFiles,
    doesNotRunCommands: record.doesNotRunCommands,
    doesNotRunGit: record.doesNotRunGit,
    doesNotFetchUrls: record.doesNotFetchUrls,
    doesNotCallExternalSystems: record.doesNotCallExternalSystems,
    doesNotConnectMcp: record.doesNotConnectMcp,
    doesNotExecute: record.doesNotExecute,
    doesNotRelease: record.doesNotRelease,
    doesNotDeploy: record.doesNotDeploy,
    doesNotCompleteTask: record.doesNotCompleteTask,
  })

  const auditEvent = await createEvidenceAuditEvent({
    correlationId,
    entityType: 'EvidenceReviewRecord',
    entityId: record.id,
    eventType: 'evidence_review.created',
    reason: 'Created local evidence review record only.',
  })

  return { record, auditEvent, safetyNote: SPRINT_17_SAFETY_NOTE }
}

async function findEvidenceReviewTarget(targetType: string, targetId: string) {
  const select = { correlationId: true }
  if (targetType === 'evidence_source_profile') return prisma.evidenceSourceProfile.findUnique({ where: { id: targetId }, select })
  if (targetType === 'evidence_import_record') return prisma.evidenceImportRecord.findUnique({ where: { id: targetId }, select })
  if (targetType === 'sanitized_evidence_snapshot') return prisma.sanitizedEvidenceSnapshot.findUnique({ where: { id: targetId }, select })
  if (targetType === 'evidence_redaction_policy') return prisma.evidenceRedactionPolicy.findUnique({ where: { id: targetId }, select })
  return null
}

export async function transitionEvidenceRecordStatus(args: {
  recordType: 'evidence_import_record' | 'evidence_review_record'
  id: string
  targetStatus: string
  reason: string
}) {
  if (!isValidEvidenceImportStatus(args.targetStatus)) {
    throw new EvidenceApiError(`Invalid Sprint 17 status: ${args.targetStatus}`)
  }
  const allowed: Record<string, string[]> = {
    draft: ['review', 'archived'],
    review: ['approved_record', 'rejected', 'archived'],
    approved_record: ['archived'],
    rejected: ['archived'],
    archived: [],
  }

  const target = await getCurrentEvidenceStatus(args.recordType, args.id)
  if (!target) throw new EvidenceApiError('Sprint 17 evidence record not found.', 404)
  if (!allowed[target.status]?.includes(args.targetStatus)) {
    throw new EvidenceApiError(`Cannot transition from "${target.status}" to "${args.targetStatus}".`)
  }

  const now = new Date()
  const data = {
    status: args.targetStatus,
    ...(args.targetStatus === 'archived' ? { archivedAt: now } : {}),
    ...(args.recordType === 'evidence_import_record' && args.targetStatus === 'approved_record'
      ? { reviewedAt: now, reviewedBy: 'kelvin' }
      : {}),
  }

  const record = args.recordType === 'evidence_import_record'
    ? await prisma.evidenceImportRecord.update({ where: { id: args.id }, data })
    : await prisma.evidenceReviewRecord.update({ where: { id: args.id }, data })

  const auditEvent = await createEvidenceAuditEvent({
    correlationId: target.correlationId,
    entityType: args.recordType,
    entityId: args.id,
    eventType: `${args.recordType}.${args.targetStatus}`,
    reason: args.reason,
  })

  return { record, auditEvent, safetyNote: SPRINT_17_SAFETY_NOTE }
}

async function getCurrentEvidenceStatus(recordType: string, id: string) {
  const select = { status: true, correlationId: true }
  if (recordType === 'evidence_import_record') return prisma.evidenceImportRecord.findUnique({ where: { id }, select })
  return prisma.evidenceReviewRecord.findUnique({ where: { id }, select })
}

export async function listEvidenceSourceProfiles() {
  return prisma.evidenceSourceProfile.findMany({ orderBy: { createdAt: 'desc' }, take: 50 })
}

export async function getEvidenceSourceProfileById(id: string) {
  return prisma.evidenceSourceProfile.findUnique({ where: { id } })
}

export async function listEvidenceRedactionPolicies() {
  return prisma.evidenceRedactionPolicy.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
}

export async function listEvidenceImports(query: FindEvidenceQuery = {}) {
  const where: Record<string, unknown> = {}
  if (query.sourceKind) where.sourceKind = query.sourceKind
  if (query.source) where.sourceKind = normalizeEvidenceSource(query.source)
  if (query.status && ['draft', 'review', 'approved_record', 'rejected', 'archived'].includes(query.status)) where.status = query.status
  return prisma.evidenceImportRecord.findMany({ where, orderBy: { createdAt: 'desc' }, take: query.limit ?? 50 })
}

export async function getEvidenceImportRecordById(id: string) {
  return prisma.evidenceImportRecord.findUnique({
    where: { id },
    include: {
      sourceProfile: true,
      redactionPolicy: true,
      snapshots: true,
      reviews: true,
    },
  })
}

export async function listSanitizedEvidenceSnapshots(importRecordId?: string) {
  return prisma.sanitizedEvidenceSnapshot.findMany({
    where: importRecordId ? { importRecordId } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
}

export async function getSanitizedEvidenceSnapshotById(id: string) {
  return prisma.sanitizedEvidenceSnapshot.findUnique({ where: { id } })
}

export async function listEvidenceReviews(targetId?: string) {
  return prisma.evidenceReviewRecord.findMany({
    where: targetId ? { targetId } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
}

export async function getEvidenceReviewRecordById(id: string) {
  return prisma.evidenceReviewRecord.findUnique({ where: { id } })
}

export async function listEvidence(query: FindEvidenceQuery = {}): Promise<EvidenceItem[]> {
  const records = await listEvidenceImports(query)
  return records.map(importRecordToLegacyEvidenceItem)
}

export async function getEvidenceById(id: string): Promise<EvidenceItem | null> {
  const record = await prisma.evidenceImportRecord.findUnique({ where: { id } })
  return record ? importRecordToLegacyEvidenceItem(record) : null
}

export async function archiveEvidence(id: string): Promise<EvidenceItem | null> {
  const result = await transitionEvidenceRecordStatus({
    recordType: 'evidence_import_record',
    id,
    targetStatus: 'archived',
    reason: 'Archived local evidence import record only.',
  })
  return importRecordToLegacyEvidenceItem(result.record as Parameters<typeof importRecordToLegacyEvidenceItem>[0])
}

export async function deleteEvidence(id: string): Promise<boolean> {
  void id
  return false
}

export async function findRelevantEvidence(
  _agentId: string,
  _taskType: string,
  taskDescription: string,
  limit = 5
): Promise<EvidenceMatch[]> {
  const items = await listEvidence({ status: 'approved_record', limit: 50 })
  const desc = taskDescription.toLowerCase()
  return items
    .map((item) => {
      const haystack = `${item.title} ${item.content}`.toLowerCase()
      const matches = desc.split(/\s+/).filter((word) => word.length > 3 && haystack.includes(word)).length
      return {
        evidence: item,
        relevanceScore: Math.min(1, matches * 0.1 + (matches > 0 ? 0.2 : 0)),
        matchReason: matches > 0 ? `${matches} sanitized summary keyword matches` : 'recent approved evidence',
      }
    })
    .filter((match) => match.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit)
}

function importRecordToLegacyEvidenceItem(record: {
  id: string
  sourceKind: string
  title: string
  importedContentSummary: string
  sourceMetadataJson: string
  status: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}): EvidenceItem {
  return {
    id: record.id,
    source: record.sourceKind as EvidenceSource,
    sourceId: null,
    sourceUrl: null,
    title: record.title,
    content: record.importedContentSummary,
    metadataJson: record.sourceMetadataJson,
    contentHash: computeContentHash(record.importedContentSummary),
    contentSize: record.importedContentSummary.length,
    applicableAgentIds: [],
    applicableTaskTypes: [],
    tagsJson: encodeJson([]),
    status: record.status as EvidenceItem['status'],
    importedBy: record.createdBy,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}
