import { prisma } from '@/lib/prisma'
import {
  REQUIRED_MVP_BASELINE_SPRINTS,
  SPRINT_15_SAFETY_NOTE,
  type DemoEntryPoint,
  type DemoScenarioKind,
  type MVPCreatedBy,
  type MVPDemoEvidenceRef,
  type MVPReadinessRecommendation,
  type MVPReadinessScope,
  type MVPReviewTargetType,
  type MVPReviewVerdict,
  type MVPReviewer,
  type MVPSourceEvidenceRef,
} from '@/lib/mvp-closure/types'
import {
  validateDemoScenarioSafety,
  validateGovernanceSummarySafety,
  validateMVPReadinessSafety,
  validateMVPReviewSafety,
  validateMVPSourceEvidenceRefs,
} from '@/lib/mvp-closure/validators'
import { isValidMVPReadinessStatus } from '@/lib/mvp-closure/state-machine'

export class MVPClosureApiError extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message)
    this.name = 'MVPClosureApiError'
  }
}

export function mvpClosureErrorResponse(error: unknown) {
  if (error instanceof MVPClosureApiError) {
    return Response.json(
      { ok: false, error: { code: 'mvp_closure_error', message: error.message } },
      { status: error.status }
    )
  }
  if (error instanceof Error) {
    return Response.json(
      { ok: false, error: { code: 'validation_error', message: error.message } },
      { status: 400 }
    )
  }
  return Response.json(
    { ok: false, error: { code: 'unexpected_error', message: 'Unexpected Sprint 15 API error.' } },
    { status: 500 }
  )
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json()
  if (!isObject(body)) throw new Error('JSON body must be an object.')
  return body
}

export function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

export function requiredString(value: unknown, name: string): string {
  const s = stringValue(value)
  if (!s) throw new Error(`${name} is required.`)
  return s
}

export function stringArray(value: unknown): string[] {
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return value
  return []
}

export function objectArray<T>(value: unknown): T[] {
  if (Array.isArray(value) && value.every(isObject)) return value as T[]
  return []
}

export function json(value: unknown): string {
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

export function correlationIdFrom(value: unknown, prefix = 'mvp'): string {
  return stringValue(value) ?? `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function createAuditEvent(args: {
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
      payloadJson: json({ entityType: args.entityType, entityId: args.entityId, sprint: 'sprint_15' }),
    },
  })
}

export function normalizeEvidenceRefs(value: unknown): MVPSourceEvidenceRef[] {
  const refs = objectArray<MVPSourceEvidenceRef>(value)
  validateMVPSourceEvidenceRefs(refs)
  return refs
}

export async function createMVPReadinessRecord(input: {
  title: string
  summary: string
  targetVersion: string
  readinessScope: MVPReadinessScope
  evidenceRefs: MVPSourceEvidenceRef[]
  demoScenarioRefs?: string[]
  governanceSummaryRefs?: string[]
  regressionGateRefs?: string[]
  releaseReadinessRefs?: string[]
  riskFindings?: string[]
  openIssues?: string[]
  acceptanceMatrix?: unknown[]
  recommendation: MVPReadinessRecommendation
  createdBy: MVPCreatedBy
  correlationId?: string
  idempotencyKey?: string
}) {
  const baselineSprints = [...REQUIRED_MVP_BASELINE_SPRINTS]
  validateMVPReadinessSafety({
    targetSprint: 'sprint_15',
    baselineSprints,
    evidenceRefs: input.evidenceRefs,
    isExecutionToken: false,
    isReleaseToken: false,
    isDeployToken: false,
    requiresKelvinConfirmation: true,
  })

  const correlationId = input.correlationId ?? correlationIdFrom(undefined)
  const record = await prisma.mVPReadinessRecord.create({
    data: {
      title: input.title,
      summary: input.summary,
      targetVersion: input.targetVersion,
      targetSprint: 'sprint_15',
      baselineSprintsJson: json(baselineSprints),
      status: 'draft',
      readinessScope: input.readinessScope,
      evidenceRefsJson: json(input.evidenceRefs),
      demoScenarioRefsJson: json(input.demoScenarioRefs ?? []),
      governanceSummaryRefsJson: json(input.governanceSummaryRefs ?? []),
      regressionGateRefsJson: json(input.regressionGateRefs ?? []),
      releaseReadinessRefsJson: json(input.releaseReadinessRefs ?? []),
      riskFindingsJson: json(input.riskFindings ?? []),
      openIssuesJson: json(input.openIssues ?? []),
      acceptanceMatrixJson: json(input.acceptanceMatrix ?? []),
      recommendation: input.recommendation,
      isExecutionToken: false,
      isReleaseToken: false,
      isDeployToken: false,
      requiresKelvinConfirmation: true,
      createdBy: input.createdBy,
      correlationId,
      auditRefsJson: '[]',
      idempotencyKey: input.idempotencyKey,
    },
  })

  const auditEvent = await createAuditEvent({
    correlationId,
    entityType: 'MVPReadinessRecord',
    entityId: record.id,
    eventType: 'mvp_readiness.created',
    reason: 'Created local MVP readiness record only.',
  })

  return { record, auditEvent, safetyNote: SPRINT_15_SAFETY_NOTE }
}

export async function createDemoScenarioRecord(input: {
  title: string
  summary: string
  scenarioKind: DemoScenarioKind
  entryPoint: DemoEntryPoint
  orderedEvidenceRefs: MVPDemoEvidenceRef[]
  expectedScreens?: string[]
  expectedLocalRecords?: string[]
  forbiddenRuntimeActions?: string[]
  demoScriptMarkdown: string
  seedDataRefs?: string[]
  createdBy: MVPCreatedBy
  correlationId?: string
  idempotencyKey?: string
}) {
  const baselineSprints = [...REQUIRED_MVP_BASELINE_SPRINTS]
  const forbiddenRuntimeActions = input.forbiddenRuntimeActions ?? []
  validateDemoScenarioSafety({
    targetSprint: 'sprint_15',
    baselineSprints,
    orderedEvidenceRefs: input.orderedEvidenceRefs,
    forbiddenRuntimeActions,
    demoScriptMarkdown: input.demoScriptMarkdown,
    canExecute: false,
    isExecutionToken: false,
    isReleaseToken: false,
    isDeployToken: false,
  })

  const correlationId = input.correlationId ?? correlationIdFrom(undefined, 'demo')
  const record = await prisma.demoScenarioRecord.create({
    data: {
      title: input.title,
      summary: input.summary,
      targetSprint: 'sprint_15',
      baselineSprintsJson: json(baselineSprints),
      status: 'draft',
      scenarioKind: input.scenarioKind,
      entryPoint: input.entryPoint,
      orderedEvidenceRefsJson: json(input.orderedEvidenceRefs),
      expectedScreensJson: json(input.expectedScreens ?? []),
      expectedLocalRecordsJson: json(input.expectedLocalRecords ?? []),
      forbiddenRuntimeActionsJson: json(forbiddenRuntimeActions),
      demoScriptMarkdown: input.demoScriptMarkdown,
      seedDataRefsJson: json(input.seedDataRefs ?? []),
      canExecute: false,
      isExecutionToken: false,
      isReleaseToken: false,
      isDeployToken: false,
      createdBy: input.createdBy,
      correlationId,
      auditRefsJson: '[]',
      idempotencyKey: input.idempotencyKey,
    },
  })

  const auditEvent = await createAuditEvent({
    correlationId,
    entityType: 'DemoScenarioRecord',
    entityId: record.id,
    eventType: 'demo_scenario.created',
    reason: 'Created local demo scenario record only.',
  })

  return { record, auditEvent, safetyNote: SPRINT_15_SAFETY_NOTE }
}

export async function createGovernanceSummaryRecord(input: {
  title: string
  summary: string
  recordCountsByType?: Record<string, number>
  safetyBoundarySummary: string
  defaultDenySummary: string
  humanConfirmationSummary: string
  auditCoverageSummary: string
  observabilityCoverageSummary: string
  recoveryCoverageSummary: string
  evalCoverageSummary: string
  regressionEvidenceRefs?: string[]
  releaseReadinessRefs?: string[]
  knownLimitations?: string[]
  riskFindings?: string[]
  createdBy: MVPCreatedBy
  correlationId?: string
  idempotencyKey?: string
}) {
  const coveredSprints = [...REQUIRED_MVP_BASELINE_SPRINTS]
  validateGovernanceSummarySafety({
    targetSprint: 'sprint_15',
    coveredSprints,
    isExecutionToken: false,
    isReleaseToken: false,
    isDeployToken: false,
  })

  const correlationId = input.correlationId ?? correlationIdFrom(undefined, 'gov')
  const record = await prisma.governanceSummaryRecord.create({
    data: {
      title: input.title,
      summary: input.summary,
      targetSprint: 'sprint_15',
      coveredSprintsJson: json(coveredSprints),
      status: 'draft',
      recordCountsByTypeJson: json(input.recordCountsByType ?? {}),
      safetyBoundarySummary: input.safetyBoundarySummary,
      defaultDenySummary: input.defaultDenySummary,
      humanConfirmationSummary: input.humanConfirmationSummary,
      auditCoverageSummary: input.auditCoverageSummary,
      observabilityCoverageSummary: input.observabilityCoverageSummary,
      recoveryCoverageSummary: input.recoveryCoverageSummary,
      evalCoverageSummary: input.evalCoverageSummary,
      regressionEvidenceRefsJson: json(input.regressionEvidenceRefs ?? []),
      releaseReadinessRefsJson: json(input.releaseReadinessRefs ?? []),
      knownLimitationsJson: json(input.knownLimitations ?? []),
      riskFindingsJson: json(input.riskFindings ?? []),
      isExecutionToken: false,
      isReleaseToken: false,
      isDeployToken: false,
      createdBy: input.createdBy,
      correlationId,
      auditRefsJson: '[]',
      idempotencyKey: input.idempotencyKey,
    },
  })

  const auditEvent = await createAuditEvent({
    correlationId,
    entityType: 'GovernanceSummaryRecord',
    entityId: record.id,
    eventType: 'governance_summary.created',
    reason: 'Created local governance summary record only.',
  })

  return { record, auditEvent, safetyNote: SPRINT_15_SAFETY_NOTE }
}

export async function createMVPReviewRecord(input: {
  targetType: MVPReviewTargetType
  targetId: string
  reviewer: MVPReviewer
  verdict: MVPReviewVerdict
  reviewNotes: string
  confirmationArtifactId?: string
  createdBy: 'user' | 'operator' | 'system_seed'
  correlationId?: string
  idempotencyKey?: string
}) {
  validateMVPReviewSafety({
    targetSprint: 'sprint_15',
    doesNotExecute: true,
    doesNotRelease: true,
    doesNotDeploy: true,
    doesNotCompleteTask: true,
  })

  const target = await findReviewTarget(input.targetType, input.targetId)
  if (!target) throw new MVPClosureApiError('Review target not found.', 404)

  const correlationId = input.correlationId ?? target.correlationId
  const relationData =
    input.targetType === 'mvp_readiness_record'
      ? { mvpReadinessRecordId: input.targetId }
      : input.targetType === 'demo_scenario_record'
        ? { demoScenarioRecordId: input.targetId }
        : { governanceSummaryRecordId: input.targetId }

  const record = await prisma.mVPReviewRecord.create({
    data: {
      targetType: input.targetType,
      targetId: input.targetId,
      targetSprint: 'sprint_15',
      status: 'draft',
      reviewer: input.reviewer,
      verdict: input.verdict,
      reviewNotes: input.reviewNotes,
      confirmationArtifactId: input.confirmationArtifactId,
      doesNotExecute: true,
      doesNotRelease: true,
      doesNotDeploy: true,
      doesNotCompleteTask: true,
      createdBy: input.createdBy,
      correlationId,
      auditRefsJson: '[]',
      idempotencyKey: input.idempotencyKey,
      ...relationData,
    },
  })

  const auditEvent = await createAuditEvent({
    correlationId,
    entityType: 'MVPReviewRecord',
    entityId: record.id,
    eventType: 'mvp_review.created',
    reason: 'Created local MVP review record only.',
  })

  return { record, auditEvent, safetyNote: SPRINT_15_SAFETY_NOTE }
}

async function findReviewTarget(targetType: MVPReviewTargetType, targetId: string) {
  if (targetType === 'mvp_readiness_record') {
    return prisma.mVPReadinessRecord.findUnique({ where: { id: targetId }, select: { correlationId: true } })
  }
  if (targetType === 'demo_scenario_record') {
    return prisma.demoScenarioRecord.findUnique({ where: { id: targetId }, select: { correlationId: true } })
  }
  return prisma.governanceSummaryRecord.findUnique({ where: { id: targetId }, select: { correlationId: true } })
}

export async function transitionMVPRecordStatus(args: {
  recordType: 'mvp_readiness_record' | 'demo_scenario_record' | 'governance_summary_record' | 'mvp_review_record'
  id: string
  targetStatus: string
  reason: string
}) {
  if (!isValidMVPReadinessStatus(args.targetStatus)) {
    throw new MVPClosureApiError(`Invalid Sprint 15 status: ${args.targetStatus}`)
  }

  const allowed: Record<string, string[]> = {
    draft: ['review', 'archived'],
    review: ['approved_record', 'rejected', 'archived'],
    approved_record: ['archived'],
    rejected: ['archived'],
    archived: [],
  }

  const now = new Date()
  const updateData: Record<string, unknown> = {
    status: args.targetStatus,
    ...(args.targetStatus === 'archived' ? { archivedAt: now } : {}),
    ...(args.recordType === 'mvp_readiness_record' && args.targetStatus === 'approved_record'
      ? { reviewedAt: now, reviewedBy: 'kelvin' }
      : {}),
  }

  const target = await getCurrentStatus(args.recordType, args.id)
  if (!target) throw new MVPClosureApiError('Sprint 15 record not found.', 404)
  if (!allowed[target.status]?.includes(args.targetStatus)) {
    throw new MVPClosureApiError(`Cannot transition from "${target.status}" to "${args.targetStatus}".`)
  }

  const updated = await updateRecordStatus(args.recordType, args.id, updateData)
  const auditEvent = await createAuditEvent({
    correlationId: target.correlationId,
    entityType: args.recordType,
    entityId: args.id,
    eventType: `${args.recordType}.${args.targetStatus}`,
    reason: args.reason,
  })

  return { record: updated, auditEvent, safetyNote: SPRINT_15_SAFETY_NOTE }
}

async function getCurrentStatus(recordType: string, id: string) {
  const select = { status: true, correlationId: true }
  if (recordType === 'mvp_readiness_record') return prisma.mVPReadinessRecord.findUnique({ where: { id }, select })
  if (recordType === 'demo_scenario_record') return prisma.demoScenarioRecord.findUnique({ where: { id }, select })
  if (recordType === 'governance_summary_record') return prisma.governanceSummaryRecord.findUnique({ where: { id }, select })
  return prisma.mVPReviewRecord.findUnique({ where: { id }, select })
}

async function updateRecordStatus(recordType: string, id: string, data: Record<string, unknown>) {
  if (recordType === 'mvp_readiness_record') return prisma.mVPReadinessRecord.update({ where: { id }, data })
  if (recordType === 'demo_scenario_record') return prisma.demoScenarioRecord.update({ where: { id }, data })
  if (recordType === 'governance_summary_record') return prisma.governanceSummaryRecord.update({ where: { id }, data })
  return prisma.mVPReviewRecord.update({ where: { id }, data })
}
