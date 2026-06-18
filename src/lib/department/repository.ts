import { prisma } from '@/lib/prisma'
import {
  validateCreateDepartmentAgentRoleInput,
  validateCreateDepartmentEscalationPolicyInput,
  validateCreateDepartmentPermissionBoundaryInput,
  validateCreateDepartmentProfileInput,
  validateCreateDepartmentResponsibilityMatrixInput,
  validateCreateDepartmentReviewRecordInput,
  validateDepartmentPermissionBoundarySafety,
  validateDepartmentReviewRecordSafety,
  validateDepartmentTokenBlockers,
} from './validators'
import { isValidDepartmentRecordStatus } from './state-machine'
import type {
  CreateDepartmentAgentRoleInput,
  CreateDepartmentEscalationPolicyInput,
  CreateDepartmentPermissionBoundaryInput,
  CreateDepartmentProfileInput,
  CreateDepartmentResponsibilityMatrixInput,
  CreateDepartmentReviewRecordInput,
  DepartmentRecordStatus,
  DepartmentRecordType,
  FindDepartmentRecordsQuery,
} from './types'
import {
  DEPARTMENT_LOCAL_ACTIONS,
  SPRINT_18_SAFETY_NOTE,
} from './types'

export class DepartmentApiError extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message)
    this.name = 'DepartmentApiError'
  }
}

export function departmentErrorResponse(error: unknown) {
  if (error instanceof DepartmentApiError) {
    return Response.json({ ok: false, error: { code: 'department_error', message: error.message } }, { status: error.status })
  }
  if (error instanceof Error) {
    return Response.json({ ok: false, error: { code: 'validation_error', message: error.message } }, { status: 400 })
  }
  return Response.json({ ok: false, error: { code: 'unexpected_error', message: 'Unexpected Sprint 18 department API error.' } }, { status: 500 })
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

export function correlationIdFrom(value: unknown, prefix = 'department'): string {
  return typeof value === 'string' && value.trim()
    ? value
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function createDepartmentAuditEvent(args: {
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
      payloadJson: toJson({ entityType: args.entityType, entityId: args.entityId, sprint: 'sprint_18' }),
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

export async function createDepartmentProfile(input: CreateDepartmentProfileInput) {
  validateCreateDepartmentProfileInput(input)
  const correlationId = correlationIdFrom(input.correlationId)
  const record = await prisma.departmentProfile.create({
    data: {
      idempotencyKey: input.idempotencyKey,
      targetSprint: 'sprint_18',
      baseline: 'sprint_1_17_complete',
      departmentKey: input.departmentKey.trim(),
      displayName: input.displayName.trim(),
      profileKind: input.profileKind ?? 'custom',
      mission: input.mission.trim(),
      responsibilitySummary: input.responsibilitySummary.trim(),
      excludedResponsibilitiesJson: toJson(input.excludedResponsibilities ?? []),
      status: 'draft',
      evidenceRefsJson: toJson(input.evidenceRefs ?? []),
      roleRefsJson: '[]',
      responsibilityMatrixRefsJson: '[]',
      escalationPolicyRefsJson: '[]',
      permissionBoundaryRefsJson: '[]',
      reviewRecordRefsJson: '[]',
      safetyNote: SPRINT_18_SAFETY_NOTE,
      ...TOKEN_BLOCKERS,
      createdBy: input.createdBy ?? 'user',
      correlationId,
      auditRefsJson: '[]',
    },
  })
  validateDepartmentTokenBlockers(record)
  const auditEvent = await createDepartmentAuditEvent({
    correlationId,
    entityType: 'DepartmentProfile',
    entityId: record.id,
    eventType: 'department_profile.created',
    reason: 'Created local department profile record only.',
  })
  return { record, auditEvent, safetyNote: SPRINT_18_SAFETY_NOTE }
}

export async function createDepartmentAgentRole(input: CreateDepartmentAgentRoleInput) {
  validateCreateDepartmentAgentRoleInput(input)
  await assertDepartmentProfileExists(input.departmentProfileId)
  const correlationId = correlationIdFrom(input.correlationId, 'department-role')
  const record = await prisma.departmentAgentRole.create({
    data: {
      idempotencyKey: input.idempotencyKey,
      targetSprint: 'sprint_18',
      baseline: 'sprint_1_17_complete',
      departmentProfileId: input.departmentProfileId,
      roleKey: input.roleKey.trim(),
      displayName: input.displayName.trim(),
      roleMission: input.roleMission.trim(),
      seniority: input.seniority ?? 'member',
      status: 'draft',
      allowedLocalActionsJson: toJson(input.allowedLocalActions ?? DEPARTMENT_LOCAL_ACTIONS),
      deniedRuntimeActionsJson: toJson(input.deniedRuntimeActions ?? defaultDeniedRuntimeActions()),
      evidenceRefsJson: toJson(input.evidenceRefs ?? []),
      ...TOKEN_BLOCKERS,
      createdBy: input.createdBy ?? 'user',
      correlationId,
      auditRefsJson: '[]',
    },
  })
  validateDepartmentTokenBlockers(record)
  await appendDepartmentProfileRef(input.departmentProfileId, 'roleRefsJson', record.id)
  const auditEvent = await createDepartmentAuditEvent({
    correlationId,
    entityType: 'DepartmentAgentRole',
    entityId: record.id,
    eventType: 'department_agent_role.created',
    reason: 'Created local department agent role record only.',
  })
  return { record, auditEvent, safetyNote: SPRINT_18_SAFETY_NOTE }
}

export async function createDepartmentResponsibilityMatrix(input: CreateDepartmentResponsibilityMatrixInput) {
  validateCreateDepartmentResponsibilityMatrixInput(input)
  await assertDepartmentProfileExists(input.departmentProfileId)
  const correlationId = correlationIdFrom(input.correlationId, 'department-matrix')
  const record = await prisma.departmentResponsibilityMatrix.create({
    data: {
      idempotencyKey: input.idempotencyKey,
      targetSprint: 'sprint_18',
      baseline: 'sprint_1_17_complete',
      departmentProfileId: input.departmentProfileId,
      matrixVersion: input.matrixVersion ?? 'sprint18-v1',
      status: 'draft',
      ownsJson: toJson(input.owns ?? []),
      supportsJson: toJson(input.supports ?? []),
      consultedJson: toJson(input.consulted ?? []),
      forbiddenResponsibilitiesJson: toJson(input.forbiddenResponsibilities ?? defaultDeniedRuntimeActions()),
      evidenceRefsJson: toJson(input.evidenceRefs ?? []),
      ...TOKEN_BLOCKERS,
      createdBy: input.createdBy ?? 'user',
      correlationId,
      auditRefsJson: '[]',
    },
  })
  validateDepartmentTokenBlockers(record)
  await appendDepartmentProfileRef(input.departmentProfileId, 'responsibilityMatrixRefsJson', record.id)
  const auditEvent = await createDepartmentAuditEvent({
    correlationId,
    entityType: 'DepartmentResponsibilityMatrix',
    entityId: record.id,
    eventType: 'department_responsibility_matrix.created',
    reason: 'Created local department responsibility matrix record only.',
  })
  return { record, auditEvent, safetyNote: SPRINT_18_SAFETY_NOTE }
}

export async function createDepartmentEscalationPolicy(input: CreateDepartmentEscalationPolicyInput) {
  validateCreateDepartmentEscalationPolicyInput(input)
  await assertDepartmentProfileExists(input.departmentProfileId)
  const correlationId = correlationIdFrom(input.correlationId, 'department-escalation')
  const record = await prisma.departmentEscalationPolicy.create({
    data: {
      idempotencyKey: input.idempotencyKey,
      targetSprint: 'sprint_18',
      baseline: 'sprint_1_17_complete',
      departmentProfileId: input.departmentProfileId,
      policyVersion: input.policyVersion ?? 'sprint18-v1',
      status: 'draft',
      escalationTriggersJson: toJson(input.escalationTriggers ?? ['unclear ownership', 'safety boundary ambiguity', 'Kelvin review required']),
      escalationTargetsJson: toJson(input.escalationTargets ?? ['kelvin', 'operator']),
      humanReviewRequired: input.humanReviewRequired ?? true,
      automaticEscalationAllowed: false,
      evidenceRefsJson: toJson(input.evidenceRefs ?? []),
      ...TOKEN_BLOCKERS,
      createdBy: input.createdBy ?? 'user',
      correlationId,
      auditRefsJson: '[]',
    },
  })
  validateDepartmentTokenBlockers(record)
  await appendDepartmentProfileRef(input.departmentProfileId, 'escalationPolicyRefsJson', record.id)
  const auditEvent = await createDepartmentAuditEvent({
    correlationId,
    entityType: 'DepartmentEscalationPolicy',
    entityId: record.id,
    eventType: 'department_escalation_policy.created',
    reason: 'Created local department escalation policy record only.',
  })
  return { record, auditEvent, safetyNote: SPRINT_18_SAFETY_NOTE }
}

export async function createDepartmentPermissionBoundary(input: CreateDepartmentPermissionBoundaryInput) {
  validateCreateDepartmentPermissionBoundaryInput(input)
  await assertDepartmentProfileExists(input.departmentProfileId)
  const correlationId = correlationIdFrom(input.correlationId, 'department-boundary')
  const record = await prisma.departmentPermissionBoundary.create({
    data: {
      idempotencyKey: input.idempotencyKey,
      targetSprint: 'sprint_18',
      baseline: 'sprint_1_17_complete',
      departmentProfileId: input.departmentProfileId,
      boundaryVersion: input.boundaryVersion ?? 'sprint18-v1',
      status: 'draft',
      allowedLocalRecordActionsJson: toJson(input.allowedLocalRecordActions ?? DEPARTMENT_LOCAL_ACTIONS),
      deniedRuntimeActionsJson: toJson(input.deniedRuntimeActions ?? defaultDeniedRuntimeActions()),
      deniedExternalActionsJson: toJson(input.deniedExternalActions ?? ['call external api', 'connect mcp', 'sync external system']),
      deniedFileGitPrActionsJson: toJson(input.deniedFileGitPrActions ?? ['write file', 'run git', 'create pr']),
      deniedWorkflowActionsJson: toJson(input.deniedWorkflowActions ?? ['execute workflow', 'execute workflow step']),
      deniedTaskActionsJson: toJson(input.deniedTaskActions ?? ['auto route task', 'complete task']),
      approvalMeaning: 'local_department_record_review_only',
      approvalDoesNotExecute: true,
      approvalDoesNotRoute: true,
      approvalDoesNotGrantFuturePermission: true,
      evidenceRefsJson: toJson(input.evidenceRefs ?? []),
      ...TOKEN_BLOCKERS,
      createdBy: input.createdBy ?? 'user',
      correlationId,
      auditRefsJson: '[]',
    },
  })
  validateDepartmentTokenBlockers(record)
  validateDepartmentPermissionBoundarySafety(record)
  await appendDepartmentProfileRef(input.departmentProfileId, 'permissionBoundaryRefsJson', record.id)
  const auditEvent = await createDepartmentAuditEvent({
    correlationId,
    entityType: 'DepartmentPermissionBoundary',
    entityId: record.id,
    eventType: 'department_permission_boundary.created',
    reason: 'Created local department permission boundary record only.',
  })
  return { record, auditEvent, safetyNote: SPRINT_18_SAFETY_NOTE }
}

export async function createDepartmentReviewRecord(input: CreateDepartmentReviewRecordInput) {
  validateCreateDepartmentReviewRecordInput(input)
  const target = await getDepartmentRecordStatus(input.targetType, input.targetId)
  if (!target) throw new DepartmentApiError('Department review target not found.', 404)
  const correlationId = input.correlationId ?? target.correlationId
  const record = await prisma.departmentReviewRecord.create({
    data: {
      idempotencyKey: input.idempotencyKey,
      targetSprint: 'sprint_18',
      baseline: 'sprint_1_17_complete',
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
      doesNotExecuteToolRun: true,
      doesNotExecuteWorkflow: true,
      doesNotWriteFile: true,
      doesNotRunGit: true,
      doesNotCallExternalApi: true,
      doesNotConnectMcp: true,
      doesNotCreatePr: true,
      doesNotDeployReleasePublish: true,
      doesNotCompleteTask: true,
      doesNotApproveFutureRecords: true,
      ...TOKEN_BLOCKERS,
      createdBy: input.createdBy ?? 'user',
      correlationId,
      auditRefsJson: '[]',
      ...reviewRelationData(input.targetType, input.targetId),
    },
  })
  validateDepartmentTokenBlockers(record)
  validateDepartmentReviewRecordSafety(record)
  await appendReviewRef(input.targetType, input.targetId, record.id)
  const auditEvent = await createDepartmentAuditEvent({
    correlationId,
    entityType: 'DepartmentReviewRecord',
    entityId: record.id,
    eventType: 'department_review_record.created',
    reason: 'Created local department review record only.',
  })
  return { record, auditEvent, safetyNote: SPRINT_18_SAFETY_NOTE }
}

export async function transitionDepartmentRecord(args: {
  recordType: DepartmentRecordType
  id: string
  targetStatus: DepartmentRecordStatus
  reason: string
  reviewedBy?: string
  supersededByRecordId?: string
}) {
  if (!isValidDepartmentRecordStatus(args.targetStatus)) {
    throw new DepartmentApiError(`Invalid Sprint 18 department status: ${args.targetStatus}`)
  }
  const allowed: Record<string, DepartmentRecordStatus[]> = {
    draft: ['review', 'archived'],
    review: ['approved_record', 'rejected', 'archived'],
    approved_record: ['superseded', 'archived'],
    rejected: ['archived'],
    superseded: ['archived'],
    archived: [],
  }

  const target = await getDepartmentRecordStatus(args.recordType, args.id)
  if (!target) throw new DepartmentApiError('Sprint 18 department record not found.', 404)
  if (!allowed[target.status]?.includes(args.targetStatus)) {
    throw new DepartmentApiError(`Cannot transition from "${target.status}" to "${args.targetStatus}".`)
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

  const record = await updateDepartmentRecord(args.recordType, args.id, data)
  const auditEvent = await createDepartmentAuditEvent({
    correlationId: target.correlationId,
    entityType: args.recordType,
    entityId: args.id,
    eventType: `${args.recordType}.${args.targetStatus}`,
    reason: args.reason,
  })

  return { record, auditEvent, safetyNote: SPRINT_18_SAFETY_NOTE }
}

export async function listDepartmentProfiles(query: FindDepartmentRecordsQuery = {}) {
  return prisma.departmentProfile.findMany({
    where: query.status ? { status: query.status } : undefined,
    orderBy: { createdAt: 'desc' },
    take: query.limit ?? 50,
  })
}

export async function getDepartmentProfileById(id: string) {
  return prisma.departmentProfile.findUnique({
    where: { id },
    include: {
      roles: true,
      responsibilityMatrices: true,
      escalationPolicies: true,
      permissionBoundaries: true,
      reviewRecords: true,
    },
  })
}

export async function listDepartmentAgentRoles(query: FindDepartmentRecordsQuery = {}) {
  return prisma.departmentAgentRole.findMany({
    where: compactWhere(query),
    orderBy: { createdAt: 'desc' },
    take: query.limit ?? 50,
  })
}

export async function listDepartmentResponsibilityMatrices(query: FindDepartmentRecordsQuery = {}) {
  return prisma.departmentResponsibilityMatrix.findMany({
    where: compactWhere(query),
    orderBy: { createdAt: 'desc' },
    take: query.limit ?? 50,
  })
}

export async function listDepartmentEscalationPolicies(query: FindDepartmentRecordsQuery = {}) {
  return prisma.departmentEscalationPolicy.findMany({
    where: compactWhere(query),
    orderBy: { createdAt: 'desc' },
    take: query.limit ?? 50,
  })
}

export async function listDepartmentPermissionBoundaries(query: FindDepartmentRecordsQuery = {}) {
  return prisma.departmentPermissionBoundary.findMany({
    where: compactWhere(query),
    orderBy: { createdAt: 'desc' },
    take: query.limit ?? 50,
  })
}

export async function listDepartmentReviewRecords(query: FindDepartmentRecordsQuery & { targetId?: string } = {}) {
  return prisma.departmentReviewRecord.findMany({
    where: {
      ...(query.status ? { status: query.status } : {}),
      ...(query.targetId ? { targetId: query.targetId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: query.limit ?? 50,
  })
}

export async function getDepartmentRecordById(recordType: DepartmentRecordType, id: string) {
  if (recordType === 'department_profile') return prisma.departmentProfile.findUnique({ where: { id } })
  if (recordType === 'department_agent_role') return prisma.departmentAgentRole.findUnique({ where: { id } })
  if (recordType === 'department_responsibility_matrix') return prisma.departmentResponsibilityMatrix.findUnique({ where: { id } })
  if (recordType === 'department_escalation_policy') return prisma.departmentEscalationPolicy.findUnique({ where: { id } })
  if (recordType === 'department_permission_boundary') return prisma.departmentPermissionBoundary.findUnique({ where: { id } })
  return prisma.departmentReviewRecord.findUnique({ where: { id } })
}

export async function getDepartmentLinkedRecords(profileId: string) {
  const profile = await getDepartmentProfileById(profileId)
  if (!profile) throw new DepartmentApiError('Department profile not found.', 404)
  const auditEvents = await prisma.harmonyAuditEvent.findMany({
    where: { correlationId: profile.correlationId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return {
    profile,
    roles: profile.roles,
    responsibilityMatrices: profile.responsibilityMatrices,
    escalationPolicies: profile.escalationPolicies,
    permissionBoundaries: profile.permissionBoundaries,
    reviewRecords: profile.reviewRecords,
    auditEvents,
    timeline: auditEvents,
    safetyNote: SPRINT_18_SAFETY_NOTE,
  }
}

async function assertDepartmentProfileExists(id: string) {
  const profile = await prisma.departmentProfile.findUnique({ where: { id }, select: { id: true } })
  if (!profile) throw new DepartmentApiError('Department profile not found.', 404)
}

async function appendDepartmentProfileRef(
  profileId: string,
  field:
    | 'roleRefsJson'
    | 'responsibilityMatrixRefsJson'
    | 'escalationPolicyRefsJson'
    | 'permissionBoundaryRefsJson',
  recordId: string
) {
  const profile = await prisma.departmentProfile.findUnique({ where: { id: profileId } })
  if (!profile) return
  const refs = parseJson<string[]>(profile[field], [])
  if (!refs.includes(recordId)) refs.unshift(recordId)
  await prisma.departmentProfile.update({ where: { id: profileId }, data: { [field]: toJson(refs) } })
}

async function appendReviewRef(recordType: DepartmentRecordType, id: string, reviewId: string) {
  if (recordType === 'department_review_record') return
  const target = await getDepartmentRecordById(recordType, id) as { reviewRecordRefsJson?: string } | null
  if (!target || typeof target.reviewRecordRefsJson !== 'string') return
  const refs = parseJson<string[]>(target.reviewRecordRefsJson, [])
  if (!refs.includes(reviewId)) refs.unshift(reviewId)
  await updateDepartmentRecord(recordType, id, { reviewRecordRefsJson: toJson(refs) })
}

async function getDepartmentRecordStatus(recordType: DepartmentRecordType, id: string) {
  const select = { status: true, correlationId: true }
  if (recordType === 'department_profile') return prisma.departmentProfile.findUnique({ where: { id }, select }) as Promise<{ status: DepartmentRecordStatus; correlationId: string } | null>
  if (recordType === 'department_agent_role') return prisma.departmentAgentRole.findUnique({ where: { id }, select }) as Promise<{ status: DepartmentRecordStatus; correlationId: string } | null>
  if (recordType === 'department_responsibility_matrix') return prisma.departmentResponsibilityMatrix.findUnique({ where: { id }, select }) as Promise<{ status: DepartmentRecordStatus; correlationId: string } | null>
  if (recordType === 'department_escalation_policy') return prisma.departmentEscalationPolicy.findUnique({ where: { id }, select }) as Promise<{ status: DepartmentRecordStatus; correlationId: string } | null>
  if (recordType === 'department_permission_boundary') return prisma.departmentPermissionBoundary.findUnique({ where: { id }, select }) as Promise<{ status: DepartmentRecordStatus; correlationId: string } | null>
  return prisma.departmentReviewRecord.findUnique({ where: { id }, select }) as Promise<{ status: DepartmentRecordStatus; correlationId: string } | null>
}

async function updateDepartmentRecord(recordType: DepartmentRecordType, id: string, data: Record<string, unknown>) {
  if (recordType === 'department_profile') return prisma.departmentProfile.update({ where: { id }, data })
  if (recordType === 'department_agent_role') return prisma.departmentAgentRole.update({ where: { id }, data })
  if (recordType === 'department_responsibility_matrix') return prisma.departmentResponsibilityMatrix.update({ where: { id }, data })
  if (recordType === 'department_escalation_policy') return prisma.departmentEscalationPolicy.update({ where: { id }, data })
  if (recordType === 'department_permission_boundary') return prisma.departmentPermissionBoundary.update({ where: { id }, data })
  return prisma.departmentReviewRecord.update({ where: { id }, data })
}

function reviewRelationData(recordType: DepartmentRecordType, targetId: string) {
  if (recordType === 'department_profile') return { departmentProfileId: targetId }
  if (recordType === 'department_agent_role') return { departmentAgentRoleId: targetId }
  if (recordType === 'department_responsibility_matrix') return { departmentResponsibilityMatrixId: targetId }
  if (recordType === 'department_escalation_policy') return { departmentEscalationPolicyId: targetId }
  if (recordType === 'department_permission_boundary') return { departmentPermissionBoundaryId: targetId }
  return {}
}

function compactWhere(query: FindDepartmentRecordsQuery) {
  return {
    ...(query.status ? { status: query.status } : {}),
    ...(query.departmentProfileId ? { departmentProfileId: query.departmentProfileId } : {}),
  }
}

function defaultDeniedRuntimeActions(): string[] {
  return [
    'execute Agent',
    'continue Agent',
    'auto-route Task',
    'assign Agent at runtime',
    'execute ToolRun',
    'request or approve runtime permission',
    'execute workflow or step',
    'write file',
    'run Git',
    'create PR',
    'call external API',
    'connect MCP',
    'deploy, publish, or release',
    'complete Task',
    'retry, replay, rollback, restore, or resume execution',
  ]
}
