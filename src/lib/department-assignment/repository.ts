import { prisma } from '@/lib/prisma'
import { isValidDepartmentAssignmentRecordStatus } from './state-machine'
import {
  validateCreateDepartmentAssignmentApprovalInput,
  validateCreateDepartmentAssignmentAuditInput,
  validateCreateDepartmentAssignmentProposalInput,
  validateCreateDepartmentRoleFitReviewInput,
  validateCreateDepartmentTaskIntakeInput,
  validateDepartmentAssignmentApprovalSafety,
  validateDepartmentAssignmentAuditSafety,
  validateDepartmentAssignmentProposalSafety,
  validateDepartmentAssignmentRuntimeBlockers,
  validateDepartmentAssignmentTokenBlockers,
  validateDepartmentRoleFitReviewSafety,
} from './validators'
import type {
  CreateDepartmentAssignmentApprovalInput,
  CreateDepartmentAssignmentAuditInput,
  CreateDepartmentAssignmentProposalInput,
  CreateDepartmentRoleFitReviewInput,
  CreateDepartmentTaskIntakeInput,
  DepartmentAssignmentRecordStatus,
  DepartmentAssignmentRecordType,
  FindDepartmentAssignmentRecordsQuery,
} from './types'
import { DEPARTMENT_ASSIGNMENT_RUNTIME_BLOCKERS, DEPARTMENT_ASSIGNMENT_TOKEN_BLOCKERS, SPRINT_21_SAFETY_NOTE } from './types'

export class DepartmentAssignmentApiError extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message)
    this.name = 'DepartmentAssignmentApiError'
  }
}

export function departmentAssignmentErrorResponse(error: unknown) {
  if (error instanceof DepartmentAssignmentApiError) {
    return Response.json({ ok: false, error: { code: 'department_assignment_error', message: error.message } }, { status: error.status })
  }
  if (error instanceof Error) {
    return Response.json({ ok: false, error: { code: 'validation_error', message: error.message } }, { status: 400 })
  }
  return Response.json({ ok: false, error: { code: 'unexpected_error', message: 'Unexpected Sprint 21 department assignment API error.' } }, { status: 500 })
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

export function correlationIdFrom(value: unknown, prefix = 'department-assignment'): string {
  return typeof value === 'string' && value.trim()
    ? value
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function createDepartmentAssignmentAuditEvent(args: {
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
      payloadJson: toJson({ entityType: args.entityType, entityId: args.entityId, sprint: 'sprint_21' }),
    },
  })
}

export async function createDepartmentTaskIntake(input: CreateDepartmentTaskIntakeInput) {
  validateCreateDepartmentTaskIntakeInput(input)
  const correlationId = correlationIdFrom(input.correlationId)
  const record = await prisma.departmentTaskIntakeRecord.create({
    data: {
      idempotencyKey: input.idempotencyKey,
      targetSprint: 'sprint_21',
      baseline: 'sprint_1_20_complete',
      status: 'draft',
      sourceTaskId: input.sourceTaskId.trim(),
      taskTitle: input.taskTitle.trim(),
      taskSummary: input.taskSummary.trim(),
      taskType: input.taskType,
      intakeReason: input.intakeReason.trim(),
      intakeSource: input.intakeSource ?? 'operator',
      candidateDepartmentProfileIdsJson: toJson(input.candidateDepartmentProfileIds ?? []),
      candidateRoleIdsJson: toJson(input.candidateRoleIds ?? []),
      sanitizedEvidenceRefsJson: toJson(input.sanitizedEvidenceRefs ?? []),
      riskNotesJson: toJson(input.riskNotes ?? []),
      assignmentProposalRefsJson: '[]',
      roleFitReviewRefsJson: '[]',
      approvalRecordRefsJson: '[]',
      auditRecordRefsJson: '[]',
      ...DEPARTMENT_ASSIGNMENT_TOKEN_BLOCKERS,
      ...DEPARTMENT_ASSIGNMENT_RUNTIME_BLOCKERS,
      createdBy: input.createdBy ?? 'operator',
      correlationId,
    },
  })
  validateDepartmentAssignmentTokenBlockers(record)
  validateDepartmentAssignmentRuntimeBlockers(record)
  const auditEvent = await createDepartmentAssignmentAuditEvent({
    correlationId,
    entityType: 'DepartmentTaskIntakeRecord',
    entityId: record.id,
    eventType: 'department_task_intake_record.created',
    reason: 'Created local department task intake record only.',
  })
  return { record, auditEvent, safetyNote: SPRINT_21_SAFETY_NOTE }
}

export async function createDepartmentAssignmentProposal(input: CreateDepartmentAssignmentProposalInput) {
  validateCreateDepartmentAssignmentProposalInput(input)
  const intake = await assertDepartmentTaskIntakeExists(input.intakeRecordId)
  const correlationId = input.correlationId ?? intake.correlationId
  const record = await prisma.departmentAssignmentProposal.create({
    data: {
      idempotencyKey: input.idempotencyKey,
      targetSprint: 'sprint_21',
      baseline: 'sprint_1_20_complete',
      status: 'draft',
      intakeRecordId: input.intakeRecordId,
      sourceTaskId: input.sourceTaskId.trim(),
      proposedDepartmentProfileId: input.proposedDepartmentProfileId.trim(),
      proposedPrimaryRoleId: input.proposedPrimaryRoleId.trim(),
      proposedSupportingRoleIdsJson: toJson(input.proposedSupportingRoleIds ?? []),
      assignmentRationale: input.assignmentRationale.trim(),
      responsibilitySummary: input.responsibilitySummary.trim(),
      evidenceCoverageSummary: input.evidenceCoverageSummary.trim(),
      riskSummary: input.riskSummary.trim(),
      escalationPolicyRef: input.escalationPolicyRef,
      permissionBoundaryRef: input.permissionBoundaryRef,
      roleFitReviewRefsJson: '[]',
      approvalRecordRefsJson: '[]',
      auditRecordRefsJson: '[]',
      sanitizedEvidenceRefsJson: toJson(input.sanitizedEvidenceRefs ?? []),
      assignmentRecommendationOnly: true,
      localReviewOnly: true,
      ...DEPARTMENT_ASSIGNMENT_TOKEN_BLOCKERS,
      ...DEPARTMENT_ASSIGNMENT_RUNTIME_BLOCKERS,
      createdBy: input.createdBy ?? 'operator',
      correlationId,
    },
  })
  validateDepartmentAssignmentTokenBlockers(record)
  validateDepartmentAssignmentRuntimeBlockers(record)
  validateDepartmentAssignmentProposalSafety(record)
  await appendDepartmentAssignmentRef('department_task_intake_record', input.intakeRecordId, 'assignmentProposalRefsJson', record.id)
  const auditEvent = await createDepartmentAssignmentAuditEvent({
    correlationId,
    entityType: 'DepartmentAssignmentProposal',
    entityId: record.id,
    eventType: 'department_assignment_proposal.created',
    reason: 'Created local recommendation-only department assignment proposal.',
  })
  return { record, auditEvent, safetyNote: SPRINT_21_SAFETY_NOTE }
}

export async function createDepartmentRoleFitReview(input: CreateDepartmentRoleFitReviewInput) {
  validateCreateDepartmentRoleFitReviewInput(input)
  const proposal = await assertDepartmentAssignmentProposalExists(input.assignmentProposalId)
  const correlationId = input.correlationId ?? proposal.correlationId
  const record = await prisma.departmentRoleFitReview.create({
    data: {
      idempotencyKey: input.idempotencyKey,
      targetSprint: 'sprint_21',
      baseline: 'sprint_1_20_complete',
      status: 'draft',
      assignmentProposalId: input.assignmentProposalId,
      departmentProfileId: input.departmentProfileId.trim(),
      roleId: input.roleId.trim(),
      roleType: input.roleType ?? 'primary',
      fitScore: input.fitScore,
      fitLevel: input.fitLevel,
      fitRationale: input.fitRationale.trim(),
      missingCapabilityNotesJson: toJson(input.missingCapabilityNotes ?? []),
      evidenceRefsJson: toJson(input.evidenceRefs ?? []),
      recommendationOnly: true,
      doesNotAssignRuntimeAgent: true,
      approvalRecordRefsJson: '[]',
      auditRecordRefsJson: '[]',
      ...DEPARTMENT_ASSIGNMENT_TOKEN_BLOCKERS,
      ...DEPARTMENT_ASSIGNMENT_RUNTIME_BLOCKERS,
      createdBy: input.createdBy ?? 'operator',
      correlationId,
    },
  })
  validateDepartmentAssignmentTokenBlockers(record)
  validateDepartmentAssignmentRuntimeBlockers(record)
  validateDepartmentRoleFitReviewSafety(record)
  await appendDepartmentAssignmentRef('department_assignment_proposal', input.assignmentProposalId, 'roleFitReviewRefsJson', record.id)
  const intakeId = proposal.intakeRecordId
  await appendDepartmentAssignmentRef('department_task_intake_record', intakeId, 'roleFitReviewRefsJson', record.id)
  const auditEvent = await createDepartmentAssignmentAuditEvent({
    correlationId,
    entityType: 'DepartmentRoleFitReview',
    entityId: record.id,
    eventType: 'department_role_fit_review.created',
    reason: 'Created local recommendation-only role fit review.',
  })
  return { record, auditEvent, safetyNote: SPRINT_21_SAFETY_NOTE }
}

export async function createDepartmentAssignmentApproval(input: CreateDepartmentAssignmentApprovalInput) {
  validateCreateDepartmentAssignmentApprovalInput(input)
  const target = await getDepartmentAssignmentRecordStatus(input.targetType, input.targetId)
  if (!target) throw new DepartmentAssignmentApiError('Department assignment approval target not found.', 404)
  const correlationId = input.correlationId ?? target.correlationId
  const record = await prisma.departmentAssignmentApprovalRecord.create({
    data: {
      idempotencyKey: input.idempotencyKey,
      targetSprint: 'sprint_21',
      baseline: 'sprint_1_20_complete',
      status: 'draft',
      targetType: input.targetType,
      targetId: input.targetId,
      reviewer: input.reviewer ?? 'kelvin',
      verdict: input.verdict,
      reviewNotes: input.reviewNotes.trim(),
      confirmationArtifactId: input.confirmationArtifactId,
      approvalScope: 'single_local_assignment_record_only',
      doesNotExecuteAgent: true,
      doesNotContinueAgent: true,
      doesNotAutoRouteTask: true,
      doesNotAssignRuntimeAgent: true,
      doesNotExecuteToolRun: true,
      doesNotRequestRuntimePermission: true,
      doesNotApproveRuntimePermission: true,
      doesNotExecuteWorkflow: true,
      doesNotWriteFile: true,
      doesNotRunGit: true,
      doesNotCallExternalApi: true,
      doesNotConnectMcp: true,
      doesNotCreatePr: true,
      doesNotDeployReleasePublish: true,
      doesNotCompleteTask: true,
      doesNotApproveFutureAssignments: true,
      evidenceRefsJson: toJson(input.evidenceRefs ?? []),
      auditRecordRefsJson: '[]',
      ...DEPARTMENT_ASSIGNMENT_TOKEN_BLOCKERS,
      ...DEPARTMENT_ASSIGNMENT_RUNTIME_BLOCKERS,
      createdBy: input.createdBy ?? 'operator',
      correlationId,
    },
  })
  validateDepartmentAssignmentTokenBlockers(record)
  validateDepartmentAssignmentRuntimeBlockers(record)
  validateDepartmentAssignmentApprovalSafety(record)
  await appendDepartmentAssignmentRef(input.targetType, input.targetId, 'approvalRecordRefsJson', record.id)
  const auditEvent = await createDepartmentAssignmentAuditEvent({
    correlationId,
    entityType: 'DepartmentAssignmentApprovalRecord',
    entityId: record.id,
    eventType: 'department_assignment_approval_record.created',
    reason: 'Created local single-record assignment approval review.',
  })
  return { record, auditEvent, safetyNote: SPRINT_21_SAFETY_NOTE }
}

export async function createDepartmentAssignmentAudit(input: CreateDepartmentAssignmentAuditInput) {
  validateCreateDepartmentAssignmentAuditInput(input)
  const target = await getDepartmentAssignmentRecordStatus(input.targetType, input.targetId)
  if (!target) throw new DepartmentAssignmentApiError('Department assignment audit target not found.', 404)
  const correlationId = input.correlationId ?? target.correlationId
  const record = await prisma.departmentAssignmentAuditRecord.create({
    data: {
      idempotencyKey: input.idempotencyKey,
      targetSprint: 'sprint_21',
      baseline: 'sprint_1_20_complete',
      status: 'draft',
      targetType: input.targetType,
      targetId: input.targetId,
      eventType: input.eventType,
      actorType: input.actorType ?? 'system_record',
      actorId: input.actorId,
      beforeStatus: input.beforeStatus,
      afterStatus: input.afterStatus,
      reason: input.reason.trim(),
      evidenceRefsJson: toJson(input.evidenceRefs ?? []),
      localAuditOnly: true,
      doesNotMutateTargetTask: true,
      doesNotAssignRuntimeAgent: true,
      doesNotTriggerExecution: true,
      ...DEPARTMENT_ASSIGNMENT_TOKEN_BLOCKERS,
      ...DEPARTMENT_ASSIGNMENT_RUNTIME_BLOCKERS,
      createdBy: input.createdBy ?? 'operator',
      correlationId,
    },
  })
  validateDepartmentAssignmentTokenBlockers(record)
  validateDepartmentAssignmentRuntimeBlockers(record)
  validateDepartmentAssignmentAuditSafety(record)
  await appendDepartmentAssignmentRef(input.targetType, input.targetId, 'auditRecordRefsJson', record.id)
  const auditEvent = await createDepartmentAssignmentAuditEvent({
    correlationId,
    entityType: 'DepartmentAssignmentAuditRecord',
    entityId: record.id,
    eventType: 'department_assignment_audit_record.created',
    reason: 'Created local assignment audit record only.',
  })
  return { record, auditEvent, safetyNote: SPRINT_21_SAFETY_NOTE }
}

export async function transitionDepartmentAssignmentRecord(args: {
  recordType: DepartmentAssignmentRecordType
  id: string
  targetStatus: DepartmentAssignmentRecordStatus
  reason: string
  reviewedBy?: string
  supersededByRecordId?: string
}) {
  if (!isValidDepartmentAssignmentRecordStatus(args.targetStatus)) {
    throw new DepartmentAssignmentApiError(`Invalid Sprint 21 department assignment status: ${args.targetStatus}`)
  }
  const allowed: Record<string, DepartmentAssignmentRecordStatus[]> = {
    draft: ['review', 'archived'],
    review: ['approved_record', 'rejected', 'archived'],
    approved_record: ['superseded', 'archived'],
    rejected: ['archived'],
    superseded: ['archived'],
    archived: [],
  }

  const target = await getDepartmentAssignmentRecordStatus(args.recordType, args.id)
  if (!target) throw new DepartmentAssignmentApiError('Sprint 21 department assignment record not found.', 404)
  if (!allowed[target.status]?.includes(args.targetStatus)) {
    throw new DepartmentAssignmentApiError(`Cannot transition from "${target.status}" to "${args.targetStatus}".`)
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

  const record = await updateDepartmentAssignmentRecord(args.recordType, args.id, data)
  const auditEvent = await createDepartmentAssignmentAuditEvent({
    correlationId: target.correlationId,
    entityType: args.recordType,
    entityId: args.id,
    eventType: `${args.recordType}.${args.targetStatus}`,
    reason: args.reason,
  })
  return { record, auditEvent, safetyNote: SPRINT_21_SAFETY_NOTE }
}

export async function listDepartmentTaskIntakes(query: FindDepartmentAssignmentRecordsQuery = {}) {
  return prisma.departmentTaskIntakeRecord.findMany({
    where: {
      ...(query.status ? { status: query.status } : {}),
      ...(query.sourceTaskId ? { sourceTaskId: query.sourceTaskId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: query.limit ?? 50,
  })
}

export async function listDepartmentAssignmentProposals(query: FindDepartmentAssignmentRecordsQuery = {}) {
  return prisma.departmentAssignmentProposal.findMany({
    where: {
      ...(query.status ? { status: query.status } : {}),
      ...(query.intakeRecordId ? { intakeRecordId: query.intakeRecordId } : {}),
      ...(query.sourceTaskId ? { sourceTaskId: query.sourceTaskId } : {}),
      ...(query.departmentProfileId ? { proposedDepartmentProfileId: query.departmentProfileId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: query.limit ?? 50,
  })
}

export async function listDepartmentRoleFitReviews(query: FindDepartmentAssignmentRecordsQuery = {}) {
  return prisma.departmentRoleFitReview.findMany({
    where: {
      ...(query.status ? { status: query.status } : {}),
      ...(query.assignmentProposalId ? { assignmentProposalId: query.assignmentProposalId } : {}),
      ...(query.departmentProfileId ? { departmentProfileId: query.departmentProfileId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: query.limit ?? 50,
  })
}

export async function listDepartmentAssignmentApprovals(query: FindDepartmentAssignmentRecordsQuery = {}) {
  return prisma.departmentAssignmentApprovalRecord.findMany({
    where: {
      ...(query.status ? { status: query.status } : {}),
      ...(query.targetId ? { targetId: query.targetId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: query.limit ?? 50,
  })
}

export async function listDepartmentAssignmentAudits(query: FindDepartmentAssignmentRecordsQuery = {}) {
  return prisma.departmentAssignmentAuditRecord.findMany({
    where: {
      ...(query.status ? { status: query.status } : {}),
      ...(query.targetId ? { targetId: query.targetId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: query.limit ?? 50,
  })
}

export async function getDepartmentAssignmentRecordById(recordType: DepartmentAssignmentRecordType, id: string) {
  if (recordType === 'department_task_intake_record') return prisma.departmentTaskIntakeRecord.findUnique({ where: { id } })
  if (recordType === 'department_assignment_proposal') return prisma.departmentAssignmentProposal.findUnique({ where: { id } })
  if (recordType === 'department_role_fit_review') return prisma.departmentRoleFitReview.findUnique({ where: { id } })
  if (recordType === 'department_assignment_approval_record') return prisma.departmentAssignmentApprovalRecord.findUnique({ where: { id } })
  return prisma.departmentAssignmentAuditRecord.findUnique({ where: { id } })
}

export async function getTaskDepartmentIntake(sourceTaskId: string) {
  return {
    sourceTaskId,
    intakes: await listDepartmentTaskIntakes({ sourceTaskId, limit: 100 }),
    safetyNote: SPRINT_21_SAFETY_NOTE,
  }
}

export async function getTaskDepartmentAssignmentProposals(sourceTaskId: string) {
  return {
    sourceTaskId,
    proposals: await listDepartmentAssignmentProposals({ sourceTaskId, limit: 100 }),
    safetyNote: SPRINT_21_SAFETY_NOTE,
  }
}

export async function getDepartmentTaskIntakes(departmentProfileId: string) {
  return {
    departmentProfileId,
    intakes: await prisma.departmentTaskIntakeRecord.findMany({
      where: { candidateDepartmentProfileIdsJson: { contains: departmentProfileId } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    safetyNote: SPRINT_21_SAFETY_NOTE,
  }
}

export async function getDepartmentAssignmentReview(departmentProfileId: string) {
  const proposals = await listDepartmentAssignmentProposals({ departmentProfileId, limit: 100 })
  return {
    departmentProfileId,
    proposals,
    roleFitReviews: await listDepartmentRoleFitReviews({ departmentProfileId, limit: 100 }),
    linked: await Promise.all(proposals.map((proposal) => getDepartmentAssignmentProposalLinked(proposal.id))),
    safetyNote: SPRINT_21_SAFETY_NOTE,
  }
}

export async function getDepartmentAssignmentProposalRoleFit(assignmentProposalId: string) {
  return {
    assignmentProposalId,
    roleFitReviews: await listDepartmentRoleFitReviews({ assignmentProposalId, limit: 100 }),
    safetyNote: SPRINT_21_SAFETY_NOTE,
  }
}

export async function getDepartmentAssignmentProposalLinked(id: string) {
  const proposal = await prisma.departmentAssignmentProposal.findUnique({ where: { id } })
  const roleFitReviews = await listDepartmentRoleFitReviews({ assignmentProposalId: id, limit: 100 })
  const approvals = await prisma.departmentAssignmentApprovalRecord.findMany({
    where: {
      OR: [
        { targetType: 'department_assignment_proposal', targetId: id },
        { targetId: { in: roleFitReviews.map((review) => review.id) } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  const audits = await prisma.departmentAssignmentAuditRecord.findMany({
    where: {
      OR: [
        { targetType: 'department_assignment_proposal', targetId: id },
        { targetId: { in: roleFitReviews.map((review) => review.id) } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return { proposal, roleFitReviews, approvals, audits, safetyNote: SPRINT_21_SAFETY_NOTE }
}

export async function getDepartmentAssignmentProposalAudit(id: string) {
  const linked = await getDepartmentAssignmentProposalLinked(id)
  const correlationIds = [
    linked.proposal?.correlationId,
    ...linked.roleFitReviews.map((record) => record.correlationId),
    ...linked.approvals.map((record) => record.correlationId),
    ...linked.audits.map((record) => record.correlationId),
  ].filter(Boolean) as string[]
  return prisma.harmonyAuditEvent.findMany({
    where: {
      correlationId: { in: correlationIds.length ? correlationIds : ['__none__'] },
      payloadJson: { contains: 'sprint_21' },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
}

export async function getDepartmentAssignmentProposalTimeline(id: string) {
  return getDepartmentAssignmentProposalAudit(id)
}

async function assertDepartmentTaskIntakeExists(id: string) {
  const record = await prisma.departmentTaskIntakeRecord.findUnique({ where: { id }, select: { id: true, correlationId: true } })
  if (!record) throw new DepartmentAssignmentApiError('Department task intake record not found.', 404)
  return record
}

async function assertDepartmentAssignmentProposalExists(id: string) {
  const record = await prisma.departmentAssignmentProposal.findUnique({
    where: { id },
    select: { id: true, correlationId: true, intakeRecordId: true },
  })
  if (!record) throw new DepartmentAssignmentApiError('Department assignment proposal not found.', 404)
  return record
}

async function appendDepartmentAssignmentRef(
  recordType: DepartmentAssignmentRecordType,
  id: string,
  field: 'assignmentProposalRefsJson' | 'roleFitReviewRefsJson' | 'approvalRecordRefsJson' | 'auditRecordRefsJson',
  recordId: string
) {
  const target = (await getDepartmentAssignmentRecordById(recordType, id)) as Record<string, string> | null
  if (!target || typeof target[field] !== 'string') return
  const refs = parseJson<string[]>(target[field], [])
  if (!refs.includes(recordId)) refs.unshift(recordId)
  await updateDepartmentAssignmentRecord(recordType, id, { [field]: toJson(refs) })
}

async function getDepartmentAssignmentRecordStatus(recordType: DepartmentAssignmentRecordType, id: string) {
  const select = { status: true, correlationId: true }
  if (recordType === 'department_task_intake_record') return prisma.departmentTaskIntakeRecord.findUnique({ where: { id }, select }) as Promise<{ status: DepartmentAssignmentRecordStatus; correlationId: string } | null>
  if (recordType === 'department_assignment_proposal') return prisma.departmentAssignmentProposal.findUnique({ where: { id }, select }) as Promise<{ status: DepartmentAssignmentRecordStatus; correlationId: string } | null>
  if (recordType === 'department_role_fit_review') return prisma.departmentRoleFitReview.findUnique({ where: { id }, select }) as Promise<{ status: DepartmentAssignmentRecordStatus; correlationId: string } | null>
  if (recordType === 'department_assignment_approval_record') return prisma.departmentAssignmentApprovalRecord.findUnique({ where: { id }, select }) as Promise<{ status: DepartmentAssignmentRecordStatus; correlationId: string } | null>
  return prisma.departmentAssignmentAuditRecord.findUnique({ where: { id }, select }) as Promise<{ status: DepartmentAssignmentRecordStatus; correlationId: string } | null>
}

async function updateDepartmentAssignmentRecord(recordType: DepartmentAssignmentRecordType, id: string, data: Record<string, unknown>) {
  if (recordType === 'department_task_intake_record') return prisma.departmentTaskIntakeRecord.update({ where: { id }, data })
  if (recordType === 'department_assignment_proposal') return prisma.departmentAssignmentProposal.update({ where: { id }, data })
  if (recordType === 'department_role_fit_review') return prisma.departmentRoleFitReview.update({ where: { id }, data })
  if (recordType === 'department_assignment_approval_record') return prisma.departmentAssignmentApprovalRecord.update({ where: { id }, data })
  return prisma.departmentAssignmentAuditRecord.update({ where: { id }, data })
}
