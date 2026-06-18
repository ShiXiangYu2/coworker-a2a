import { prisma } from '@/lib/prisma'
import {
  validateCoverageRecommendationOnly,
  validateCreateDepartmentEvidenceCoverageInput,
  validateCreateDepartmentMappingReviewRecordInput,
  validateCreateDepartmentReviewGapInput,
  validateCreateEvidenceToDepartmentMappingInput,
  validateDepartmentMappingReviewRecordSafety,
  validateDepartmentMappingRuntimeBlockers,
  validateDepartmentMappingTokenBlockers,
  validateGapRecommendationOnly,
} from './validators'
import { isValidDepartmentMappingRecordStatus } from './state-machine'
import type {
  CreateDepartmentEvidenceCoverageInput,
  CreateDepartmentMappingReviewRecordInput,
  CreateDepartmentReviewGapInput,
  CreateEvidenceToDepartmentMappingInput,
  DepartmentMappingRecordStatus,
  DepartmentMappingRecordType,
  FindDepartmentMappingRecordsQuery,
} from './types'
import { SPRINT_19_SAFETY_NOTE } from './types'

export class DepartmentMappingApiError extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message)
    this.name = 'DepartmentMappingApiError'
  }
}

export function departmentMappingErrorResponse(error: unknown) {
  if (error instanceof DepartmentMappingApiError) {
    return Response.json({ ok: false, error: { code: 'department_mapping_error', message: error.message } }, { status: error.status })
  }
  if (error instanceof Error) {
    return Response.json({ ok: false, error: { code: 'validation_error', message: error.message } }, { status: 400 })
  }
  return Response.json({ ok: false, error: { code: 'unexpected_error', message: 'Unexpected Sprint 19 department mapping API error.' } }, { status: 500 })
}

export function toJson(value: unknown): string {
  return JSON.stringify(value)
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function correlationIdFrom(value: unknown, prefix = 'department-mapping'): string {
  return typeof value === 'string' && value.trim()
    ? value
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function createDepartmentMappingAuditEvent(args: {
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
      payloadJson: toJson({ entityType: args.entityType, entityId: args.entityId, sprint: 'sprint_19' }),
    },
  })
}

const TOKEN_BLOCKERS = {
  isExecutionToken: false,
  isRoutingToken: false,
  isPermissionGrant: false,
  isReleaseToken: false,
  isDeployToken: false,
  isTaskCompletionToken: false,
  grantsRuntimePermission: false,
  mutatesSourceRecords: false,
} as const

const RUNTIME_BLOCKERS = {
  importsLiveEvidence: false,
  syncsEvidence: false,
  triggersAgentRouting: false,
  triggersTaskAssignment: false,
} as const

export async function createEvidenceToDepartmentMapping(input: CreateEvidenceToDepartmentMappingInput) {
  validateCreateEvidenceToDepartmentMappingInput(input)
  const correlationId = correlationIdFrom(input.correlationId)
  const record = await prisma.evidenceToDepartmentMappingRecord.create({
    data: {
      idempotencyKey: input.idempotencyKey,
      targetSprint: 'sprint_19',
      baseline: 'sprint_1_18_complete',
      mappingKey: input.mappingKey.trim(),
      title: input.title.trim(),
      description: input.description.trim(),
      status: 'draft',
      evidenceRecordType: input.evidenceRecordType,
      evidenceRecordId: input.evidenceRecordId,
      evidenceSummary: input.evidenceSummary.trim(),
      departmentRecordType: input.departmentRecordType,
      departmentRecordId: input.departmentRecordId,
      departmentProfileId: input.departmentProfileId,
      mappingStrength: input.mappingStrength ?? 'supporting',
      mappingRationale: input.mappingRationale.trim(),
      riskNotesJson: toJson(input.riskNotes ?? []),
      coverageRecordRefsJson: '[]',
      gapRecordRefsJson: '[]',
      reviewRecordRefsJson: '[]',
      auditRefsJson: '[]',
      ...TOKEN_BLOCKERS,
      ...RUNTIME_BLOCKERS,
      createdBy: input.createdBy ?? 'user',
      correlationId,
    },
  })
  validateDepartmentMappingTokenBlockers(record)
  validateDepartmentMappingRuntimeBlockers(record)
  const auditEvent = await createDepartmentMappingAuditEvent({
    correlationId,
    entityType: 'EvidenceToDepartmentMappingRecord',
    entityId: record.id,
    eventType: 'evidence_to_department_mapping_record.created',
    reason: 'Created local evidence-to-department mapping record only.',
  })
  return { record, auditEvent, safetyNote: SPRINT_19_SAFETY_NOTE }
}

export async function createDepartmentEvidenceCoverage(input: CreateDepartmentEvidenceCoverageInput) {
  validateCreateDepartmentEvidenceCoverageInput(input)
  if (input.mappingRecordId) await assertMappingRecordExists(input.mappingRecordId)
  const correlationId = correlationIdFrom(input.correlationId, 'department-coverage')
  const record = await prisma.departmentEvidenceCoverageRecord.create({
    data: {
      idempotencyKey: input.idempotencyKey,
      targetSprint: 'sprint_19',
      baseline: 'sprint_1_18_complete',
      mappingRecordId: input.mappingRecordId,
      departmentProfileId: input.departmentProfileId,
      departmentRecordType: input.departmentRecordType,
      departmentRecordId: input.departmentRecordId,
      coverageScope: input.coverageScope.trim(),
      coverageLevel: input.coverageLevel ?? 'partial',
      coverageSummary: input.coverageSummary.trim(),
      supportingMappingRefsJson: toJson(input.supportingMappingRefs ?? []),
      missingEvidenceNotesJson: toJson(input.missingEvidenceNotes ?? []),
      recommendationOnly: true,
      status: 'draft',
      reviewRecordRefsJson: '[]',
      auditRefsJson: '[]',
      ...TOKEN_BLOCKERS,
      ...RUNTIME_BLOCKERS,
      createdBy: input.createdBy ?? 'user',
      correlationId,
    },
  })
  validateDepartmentMappingTokenBlockers(record)
  validateDepartmentMappingRuntimeBlockers(record)
  validateCoverageRecommendationOnly(record)
  if (input.mappingRecordId) await appendMappingRef(input.mappingRecordId, 'coverageRecordRefsJson', record.id)
  const auditEvent = await createDepartmentMappingAuditEvent({
    correlationId,
    entityType: 'DepartmentEvidenceCoverageRecord',
    entityId: record.id,
    eventType: 'department_evidence_coverage_record.created',
    reason: 'Created local evidence coverage record only.',
  })
  return { record, auditEvent, safetyNote: SPRINT_19_SAFETY_NOTE }
}

export async function createDepartmentReviewGap(input: CreateDepartmentReviewGapInput) {
  validateCreateDepartmentReviewGapInput(input)
  if (input.mappingRecordId) await assertMappingRecordExists(input.mappingRecordId)
  const correlationId = correlationIdFrom(input.correlationId, 'department-gap')
  const record = await prisma.departmentReviewGapRecord.create({
    data: {
      idempotencyKey: input.idempotencyKey,
      targetSprint: 'sprint_19',
      baseline: 'sprint_1_18_complete',
      mappingRecordId: input.mappingRecordId,
      departmentProfileId: input.departmentProfileId,
      departmentRecordType: input.departmentRecordType,
      departmentRecordId: input.departmentRecordId,
      gapType: input.gapType.trim(),
      gapSummary: input.gapSummary.trim(),
      riskLevel: input.riskLevel ?? 'medium',
      recommendedEvidenceJson: toJson(input.recommendedEvidence ?? []),
      recommendationOnly: true,
      status: 'draft',
      reviewRecordRefsJson: '[]',
      auditRefsJson: '[]',
      ...TOKEN_BLOCKERS,
      ...RUNTIME_BLOCKERS,
      createdBy: input.createdBy ?? 'user',
      correlationId,
    },
  })
  validateDepartmentMappingTokenBlockers(record)
  validateDepartmentMappingRuntimeBlockers(record)
  validateGapRecommendationOnly(record)
  if (input.mappingRecordId) await appendMappingRef(input.mappingRecordId, 'gapRecordRefsJson', record.id)
  const auditEvent = await createDepartmentMappingAuditEvent({
    correlationId,
    entityType: 'DepartmentReviewGapRecord',
    entityId: record.id,
    eventType: 'department_review_gap_record.created',
    reason: 'Created local department review gap record only.',
  })
  return { record, auditEvent, safetyNote: SPRINT_19_SAFETY_NOTE }
}

export async function createDepartmentMappingReviewRecord(input: CreateDepartmentMappingReviewRecordInput) {
  validateCreateDepartmentMappingReviewRecordInput(input)
  const target = await getDepartmentMappingRecordStatus(input.targetType, input.targetId)
  if (!target) throw new DepartmentMappingApiError('Department mapping review target not found.', 404)
  const correlationId = input.correlationId ?? target.correlationId
  const record = await prisma.departmentMappingReviewRecord.create({
    data: {
      idempotencyKey: input.idempotencyKey,
      targetSprint: 'sprint_19',
      baseline: 'sprint_1_18_complete',
      targetType: input.targetType,
      targetId: input.targetId,
      status: 'draft',
      reviewer: input.reviewer ?? 'kelvin',
      verdict: input.verdict,
      reviewNotes: input.reviewNotes,
      confirmationArtifactId: input.confirmationArtifactId,
      evidenceRefsJson: toJson(input.evidenceRefs ?? []),
      doesNotExecuteAgent: true,
      doesNotContinueAgent: true,
      doesNotAutoRouteTask: true,
      doesNotAssignAgent: true,
      doesNotExecuteToolRun: true,
      doesNotExecuteWorkflow: true,
      doesNotWriteFile: true,
      doesNotRunGit: true,
      doesNotCallExternalApi: true,
      doesNotConnectMcp: true,
      doesNotCreatePr: true,
      doesNotDeployReleasePublish: true,
      doesNotCompleteTask: true,
      doesNotApproveFutureMappings: true,
      statusChangeOnly: true,
      reviewRecordRefsJson: '[]',
      auditRefsJson: '[]',
      ...TOKEN_BLOCKERS,
      ...RUNTIME_BLOCKERS,
      createdBy: input.createdBy ?? 'user',
      correlationId,
      ...reviewRelationData(input.targetType, input.targetId),
    },
  })
  validateDepartmentMappingTokenBlockers(record)
  validateDepartmentMappingRuntimeBlockers(record)
  validateDepartmentMappingReviewRecordSafety(record)
  await appendReviewRef(input.targetType, input.targetId, record.id)
  const auditEvent = await createDepartmentMappingAuditEvent({
    correlationId,
    entityType: 'DepartmentMappingReviewRecord',
    entityId: record.id,
    eventType: 'department_mapping_review_record.created',
    reason: 'Created local department mapping review record only.',
  })
  return { record, auditEvent, safetyNote: SPRINT_19_SAFETY_NOTE }
}

export async function transitionDepartmentMappingRecord(args: {
  recordType: DepartmentMappingRecordType
  id: string
  targetStatus: DepartmentMappingRecordStatus
  reason: string
  reviewedBy?: string
  supersededByRecordId?: string
}) {
  if (!isValidDepartmentMappingRecordStatus(args.targetStatus)) {
    throw new DepartmentMappingApiError(`Invalid Sprint 19 department mapping status: ${args.targetStatus}`)
  }
  const allowed: Record<string, DepartmentMappingRecordStatus[]> = {
    draft: ['review', 'archived'],
    review: ['approved_record', 'rejected', 'archived'],
    approved_record: ['superseded', 'archived'],
    rejected: ['archived'],
    superseded: ['archived'],
    archived: [],
  }

  const target = await getDepartmentMappingRecordStatus(args.recordType, args.id)
  if (!target) throw new DepartmentMappingApiError('Sprint 19 department mapping record not found.', 404)
  if (!allowed[target.status]?.includes(args.targetStatus)) {
    throw new DepartmentMappingApiError(`Cannot transition from "${target.status}" to "${args.targetStatus}".`)
  }

  const now = new Date()
  const data = {
    status: args.targetStatus,
    ...(args.targetStatus === 'approved_record' ? { reviewedAt: now, reviewedBy: args.reviewedBy ?? 'kelvin' } : {}),
    ...(args.targetStatus === 'archived' ? { archivedAt: now } : {}),
    ...(args.targetStatus === 'superseded'
      ? {
          supersededAt: now,
          supersededByRecordId: args.supersededByRecordId ?? args.id,
          supersedeReason: args.reason,
        }
      : {}),
  }

  const record = await updateDepartmentMappingRecord(args.recordType, args.id, data)
  const auditEvent = await createDepartmentMappingAuditEvent({
    correlationId: target.correlationId,
    entityType: args.recordType,
    entityId: args.id,
    eventType: `${args.recordType}.${args.targetStatus}`,
    reason: args.reason,
  })
  return { record, auditEvent, safetyNote: SPRINT_19_SAFETY_NOTE }
}

export async function listEvidenceToDepartmentMappings(query: FindDepartmentMappingRecordsQuery = {}) {
  return prisma.evidenceToDepartmentMappingRecord.findMany({
    where: {
      ...(query.status ? { status: query.status } : {}),
      ...(query.departmentProfileId ? { departmentProfileId: query.departmentProfileId } : {}),
      ...(query.departmentRecordId ? { departmentRecordId: query.departmentRecordId } : {}),
      ...(query.evidenceRecordId ? { evidenceRecordId: query.evidenceRecordId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: query.limit ?? 50,
  })
}

export async function listDepartmentEvidenceCoverages(query: FindDepartmentMappingRecordsQuery = {}) {
  return prisma.departmentEvidenceCoverageRecord.findMany({
    where: {
      ...(query.status ? { status: query.status } : {}),
      ...(query.departmentProfileId ? { departmentProfileId: query.departmentProfileId } : {}),
      ...(query.departmentRecordId ? { departmentRecordId: query.departmentRecordId } : {}),
      ...(query.mappingRecordId ? { mappingRecordId: query.mappingRecordId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: query.limit ?? 50,
  })
}

export async function listDepartmentReviewGaps(query: FindDepartmentMappingRecordsQuery = {}) {
  return prisma.departmentReviewGapRecord.findMany({
    where: {
      ...(query.status ? { status: query.status } : {}),
      ...(query.departmentProfileId ? { departmentProfileId: query.departmentProfileId } : {}),
      ...(query.departmentRecordId ? { departmentRecordId: query.departmentRecordId } : {}),
      ...(query.mappingRecordId ? { mappingRecordId: query.mappingRecordId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: query.limit ?? 50,
  })
}

export async function listDepartmentMappingReviewRecords(query: FindDepartmentMappingRecordsQuery = {}) {
  return prisma.departmentMappingReviewRecord.findMany({
    where: {
      ...(query.status ? { status: query.status } : {}),
      ...(query.targetId ? { targetId: query.targetId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: query.limit ?? 50,
  })
}

export async function getDepartmentMappingRecordById(recordType: DepartmentMappingRecordType, id: string) {
  if (recordType === 'evidence_to_department_mapping_record') return prisma.evidenceToDepartmentMappingRecord.findUnique({ where: { id } })
  if (recordType === 'department_evidence_coverage_record') return prisma.departmentEvidenceCoverageRecord.findUnique({ where: { id } })
  if (recordType === 'department_review_gap_record') return prisma.departmentReviewGapRecord.findUnique({ where: { id } })
  return prisma.departmentMappingReviewRecord.findUnique({ where: { id } })
}

export async function getDepartmentEvidenceMap(departmentProfileId: string) {
  const mappings = await listEvidenceToDepartmentMappings({ departmentProfileId, limit: 100 })
  const coverages = await listDepartmentEvidenceCoverages({ departmentProfileId, limit: 100 })
  const gaps = await listDepartmentReviewGaps({ departmentProfileId, limit: 100 })
  const auditEvents = await prisma.harmonyAuditEvent.findMany({
    where: {
      eventType: { contains: 'department_' },
      payloadJson: { contains: 'sprint_19' },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return {
    departmentProfileId,
    mappings,
    coverages,
    gaps,
    auditEvents,
    timeline: auditEvents,
    safetyNote: SPRINT_19_SAFETY_NOTE,
  }
}

export async function getDepartmentMappingAudit(departmentProfileId: string) {
  const linked = await getDepartmentEvidenceMap(departmentProfileId)
  return linked.auditEvents
}

export async function getDepartmentMappingTimeline(departmentProfileId: string) {
  const linked = await getDepartmentEvidenceMap(departmentProfileId)
  return linked.timeline
}

async function assertMappingRecordExists(id: string) {
  const record = await prisma.evidenceToDepartmentMappingRecord.findUnique({ where: { id }, select: { id: true } })
  if (!record) throw new DepartmentMappingApiError('Evidence-to-department mapping record not found.', 404)
}

async function appendMappingRef(
  mappingRecordId: string,
  field: 'coverageRecordRefsJson' | 'gapRecordRefsJson',
  recordId: string
) {
  const mapping = await prisma.evidenceToDepartmentMappingRecord.findUnique({ where: { id: mappingRecordId } })
  if (!mapping) return
  const refs = parseJson<string[]>(mapping[field], [])
  if (!refs.includes(recordId)) refs.unshift(recordId)
  await prisma.evidenceToDepartmentMappingRecord.update({ where: { id: mappingRecordId }, data: { [field]: toJson(refs) } })
}

async function appendReviewRef(recordType: DepartmentMappingRecordType, id: string, reviewId: string) {
  if (recordType === 'department_mapping_review_record') return
  const target = await getDepartmentMappingRecordById(recordType, id) as { reviewRecordRefsJson?: string } | null
  if (!target || typeof target.reviewRecordRefsJson !== 'string') return
  const refs = parseJson<string[]>(target.reviewRecordRefsJson, [])
  if (!refs.includes(reviewId)) refs.unshift(reviewId)
  await updateDepartmentMappingRecord(recordType, id, { reviewRecordRefsJson: toJson(refs) })
}

async function getDepartmentMappingRecordStatus(recordType: DepartmentMappingRecordType, id: string) {
  const select = { status: true, correlationId: true }
  if (recordType === 'evidence_to_department_mapping_record') return prisma.evidenceToDepartmentMappingRecord.findUnique({ where: { id }, select }) as Promise<{ status: DepartmentMappingRecordStatus; correlationId: string } | null>
  if (recordType === 'department_evidence_coverage_record') return prisma.departmentEvidenceCoverageRecord.findUnique({ where: { id }, select }) as Promise<{ status: DepartmentMappingRecordStatus; correlationId: string } | null>
  if (recordType === 'department_review_gap_record') return prisma.departmentReviewGapRecord.findUnique({ where: { id }, select }) as Promise<{ status: DepartmentMappingRecordStatus; correlationId: string } | null>
  return prisma.departmentMappingReviewRecord.findUnique({ where: { id }, select }) as Promise<{ status: DepartmentMappingRecordStatus; correlationId: string } | null>
}

async function updateDepartmentMappingRecord(recordType: DepartmentMappingRecordType, id: string, data: Record<string, unknown>) {
  if (recordType === 'evidence_to_department_mapping_record') return prisma.evidenceToDepartmentMappingRecord.update({ where: { id }, data })
  if (recordType === 'department_evidence_coverage_record') return prisma.departmentEvidenceCoverageRecord.update({ where: { id }, data })
  if (recordType === 'department_review_gap_record') return prisma.departmentReviewGapRecord.update({ where: { id }, data })
  return prisma.departmentMappingReviewRecord.update({ where: { id }, data })
}

function reviewRelationData(recordType: DepartmentMappingRecordType, targetId: string) {
  if (recordType === 'evidence_to_department_mapping_record') return { mappingRecordId: targetId }
  if (recordType === 'department_evidence_coverage_record') return { coverageRecordId: targetId }
  if (recordType === 'department_review_gap_record') return { gapRecordId: targetId }
  return {}
}
