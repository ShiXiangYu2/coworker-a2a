import { prisma } from '@/lib/prisma'
import { isValidExecutionGatewayRecordStatus } from './state-machine'
import {
  validateCreateExecutionApprovalInput,
  validateCreateExecutionGateInput,
  validateCreateExecutionIntentInput,
  validateCreateExecutionPlanInput,
  validateCreateExecutionReceiptInput,
  validateExecutionApprovalSafety,
  validateExecutionBlockers,
  validateExecutionGateDecisionSafety,
  validateExecutionReceiptSafety,
  validateExecutionTokenBlockers,
} from './validators'
import type {
  CreateExecutionApprovalInput,
  CreateExecutionGateInput,
  CreateExecutionIntentInput,
  CreateExecutionPlanInput,
  CreateExecutionReceiptInput,
  ExecutionGatewayRecordStatus,
  ExecutionGatewayRecordType,
  FindExecutionGatewayRecordsQuery,
} from './types'
import { EXECUTION_BLOCKERS, EXECUTION_TOKEN_BLOCKERS, SPRINT_20_SAFETY_NOTE } from './types'

export class ExecutionGatewayApiError extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message)
    this.name = 'ExecutionGatewayApiError'
  }
}

export function executionGatewayErrorResponse(error: unknown) {
  if (error instanceof ExecutionGatewayApiError) {
    return Response.json({ ok: false, error: { code: 'execution_gateway_error', message: error.message } }, { status: error.status })
  }
  if (error instanceof Error) {
    return Response.json({ ok: false, error: { code: 'validation_error', message: error.message } }, { status: 400 })
  }
  return Response.json({ ok: false, error: { code: 'unexpected_error', message: 'Unexpected Sprint 20 execution gateway API error.' } }, { status: 500 })
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

export function correlationIdFrom(value: unknown, prefix = 'execution-gateway'): string {
  return typeof value === 'string' && value.trim()
    ? value
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function createExecutionGatewayAuditEvent(args: {
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
      payloadJson: toJson({ entityType: args.entityType, entityId: args.entityId, sprint: 'sprint_20' }),
    },
  })
}

export async function createExecutionIntent(input: CreateExecutionIntentInput) {
  validateCreateExecutionIntentInput(input)
  const correlationId = correlationIdFrom(input.correlationId)
  const record = await prisma.executionIntentRecord.create({
    data: {
      idempotencyKey: input.idempotencyKey,
      targetSprint: 'sprint_20',
      baseline: 'sprint_1_19_complete',
      status: 'draft',
      intentTitle: input.intentTitle.trim(),
      intentSummary: input.intentSummary.trim(),
      requestedBy: input.requestedBy ?? 'operator',
      departmentProfileId: input.departmentProfileId,
      departmentAgentRoleId: input.departmentAgentRoleId,
      sourceTaskId: input.sourceTaskId,
      requestedActionType: input.requestedActionType.trim(),
      requestedActionSummary: input.requestedActionSummary.trim(),
      expectedOutcome: input.expectedOutcome.trim(),
      riskSummary: input.riskSummary.trim(),
      sanitizedEvidenceRefsJson: toJson(input.sanitizedEvidenceRefs ?? []),
      departmentMappingRefsJson: toJson(input.departmentMappingRefs ?? []),
      planRecordRefsJson: '[]',
      gateRecordRefsJson: '[]',
      approvalRecordRefsJson: '[]',
      receiptRecordRefsJson: '[]',
      auditRefsJson: '[]',
      ...EXECUTION_TOKEN_BLOCKERS,
      ...EXECUTION_BLOCKERS,
      createdBy: input.createdBy ?? 'operator',
      correlationId,
    },
  })
  validateExecutionTokenBlockers(record)
  validateExecutionBlockers(record)
  const auditEvent = await createExecutionGatewayAuditEvent({
    correlationId,
    entityType: 'ExecutionIntentRecord',
    entityId: record.id,
    eventType: 'execution_intent_record.created',
    reason: 'Created local execution intent record only.',
  })
  return { record, auditEvent, safetyNote: SPRINT_20_SAFETY_NOTE }
}

export async function createExecutionPlan(input: CreateExecutionPlanInput) {
  validateCreateExecutionPlanInput(input)
  const intent = await assertExecutionIntentExists(input.intentRecordId)
  const correlationId = input.correlationId ?? intent.correlationId
  const record = await prisma.executionPlanRecord.create({
    data: {
      idempotencyKey: input.idempotencyKey,
      targetSprint: 'sprint_20',
      baseline: 'sprint_1_19_complete',
      intentRecordId: input.intentRecordId,
      status: 'draft',
      planTitle: input.planTitle.trim(),
      planSummary: input.planSummary.trim(),
      plannedStepsJson: toJson(input.plannedSteps ?? []),
      preconditionsJson: toJson(input.preconditions ?? []),
      postconditionsJson: toJson(input.postconditions ?? []),
      humanCheckpointsJson: toJson(input.humanCheckpoints ?? []),
      riskControlsJson: toJson(input.riskControls ?? []),
      rollbackNotes: input.rollbackNotes.trim(),
      nonExecutablePlanOnly: true,
      sanitizedEvidenceRefsJson: toJson(input.sanitizedEvidenceRefs ?? []),
      gateRecordRefsJson: '[]',
      approvalRecordRefsJson: '[]',
      receiptRecordRefsJson: '[]',
      auditRefsJson: '[]',
      ...EXECUTION_TOKEN_BLOCKERS,
      ...EXECUTION_BLOCKERS,
      createdBy: input.createdBy ?? 'operator',
      correlationId,
    },
  })
  validateExecutionTokenBlockers(record)
  validateExecutionBlockers(record)
  await appendExecutionRef('execution_intent_record', input.intentRecordId, 'planRecordRefsJson', record.id)
  const auditEvent = await createExecutionGatewayAuditEvent({
    correlationId,
    entityType: 'ExecutionPlanRecord',
    entityId: record.id,
    eventType: 'execution_plan_record.created',
    reason: 'Created local execution plan record only.',
  })
  return { record, auditEvent, safetyNote: SPRINT_20_SAFETY_NOTE }
}

export async function createExecutionGate(input: CreateExecutionGateInput) {
  validateCreateExecutionGateInput(input)
  const correlationId = await correlationIdForGate(input)
  const record = await prisma.executionGateRecord.create({
    data: {
      idempotencyKey: input.idempotencyKey,
      targetSprint: 'sprint_20',
      baseline: 'sprint_1_19_complete',
      intentRecordId: input.intentRecordId,
      planRecordId: input.planRecordId,
      status: 'draft',
      gateName: input.gateName.trim(),
      gateSummary: input.gateSummary.trim(),
      gateDecision: input.gateDecision ?? 'pending_review',
      requiredReviewer: input.requiredReviewer ?? 'kelvin',
      requiredEvidenceRefsJson: toJson(input.requiredEvidenceRefs ?? []),
      blockedReasonsJson: toJson(input.blockedReasons ?? []),
      approvalMeaning: 'local_execution_record_review_only',
      doesNotGrantRuntimePermission: true,
      approvalRecordRefsJson: '[]',
      receiptRecordRefsJson: '[]',
      auditRefsJson: '[]',
      ...EXECUTION_TOKEN_BLOCKERS,
      ...EXECUTION_BLOCKERS,
      createdBy: input.createdBy ?? 'operator',
      correlationId,
    },
  })
  validateExecutionTokenBlockers(record)
  validateExecutionBlockers(record)
  validateExecutionGateDecisionSafety(record)
  if (input.intentRecordId) await appendExecutionRef('execution_intent_record', input.intentRecordId, 'gateRecordRefsJson', record.id)
  if (input.planRecordId) await appendExecutionRef('execution_plan_record', input.planRecordId, 'gateRecordRefsJson', record.id)
  const auditEvent = await createExecutionGatewayAuditEvent({
    correlationId,
    entityType: 'ExecutionGateRecord',
    entityId: record.id,
    eventType: 'execution_gate_record.created',
    reason: 'Created local execution gate record only.',
  })
  return { record, auditEvent, safetyNote: SPRINT_20_SAFETY_NOTE }
}

export async function createExecutionApproval(input: CreateExecutionApprovalInput) {
  validateCreateExecutionApprovalInput(input)
  const target = await getExecutionGatewayRecordStatus(input.targetType, input.targetId)
  if (!target) throw new ExecutionGatewayApiError('Execution approval target not found.', 404)
  const correlationId = input.correlationId ?? target.correlationId
  const record = await prisma.executionApprovalRecord.create({
    data: {
      idempotencyKey: input.idempotencyKey,
      targetSprint: 'sprint_20',
      baseline: 'sprint_1_19_complete',
      targetType: input.targetType,
      targetId: input.targetId,
      status: 'draft',
      reviewer: input.reviewer ?? 'kelvin',
      verdict: input.verdict,
      reviewNotes: input.reviewNotes.trim(),
      confirmationArtifactId: input.confirmationArtifactId,
      approvalScope: 'single_local_record_only',
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
      doesNotApproveFutureExecutions: true,
      evidenceRefsJson: toJson(input.evidenceRefs ?? []),
      auditRefsJson: '[]',
      ...EXECUTION_TOKEN_BLOCKERS,
      ...EXECUTION_BLOCKERS,
      createdBy: input.createdBy ?? 'operator',
      correlationId,
    },
  })
  validateExecutionTokenBlockers(record)
  validateExecutionBlockers(record)
  validateExecutionApprovalSafety(record)
  await appendExecutionRef(input.targetType, input.targetId, 'approvalRecordRefsJson', record.id)
  const auditEvent = await createExecutionGatewayAuditEvent({
    correlationId,
    entityType: 'ExecutionApprovalRecord',
    entityId: record.id,
    eventType: 'execution_approval_record.created',
    reason: 'Created local execution approval record only.',
  })
  return { record, auditEvent, safetyNote: SPRINT_20_SAFETY_NOTE }
}

export async function createExecutionReceipt(input: CreateExecutionReceiptInput) {
  validateCreateExecutionReceiptInput(input)
  const correlationId = await correlationIdForReceipt(input)
  const record = await prisma.executionReceiptRecord.create({
    data: {
      idempotencyKey: input.idempotencyKey,
      targetSprint: 'sprint_20',
      baseline: 'sprint_1_19_complete',
      intentRecordId: input.intentRecordId,
      planRecordId: input.planRecordId,
      gateRecordId: input.gateRecordId,
      status: 'draft',
      receiptTitle: input.receiptTitle.trim(),
      receiptSummary: input.receiptSummary.trim(),
      observedOutcomeSummary: input.observedOutcomeSummary.trim(),
      operatorNotes: input.operatorNotes.trim(),
      evidenceRefsJson: toJson(input.evidenceRefs ?? []),
      receiptKind: input.receiptKind ?? 'manual_review_record',
      actualExecutionPerformed: false,
      sourceSystemAccessed: false,
      receiptIsLocalRecordOnly: true,
      receiptIsNotRuntimeReceipt: true,
      receiptIsNotToolExecutionReceipt: true,
      approvalRecordRefsJson: '[]',
      auditRefsJson: '[]',
      ...EXECUTION_TOKEN_BLOCKERS,
      ...EXECUTION_BLOCKERS,
      createdBy: input.createdBy ?? 'operator',
      correlationId,
    },
  })
  validateExecutionTokenBlockers(record)
  validateExecutionBlockers(record)
  validateExecutionReceiptSafety(record)
  if (input.intentRecordId) await appendExecutionRef('execution_intent_record', input.intentRecordId, 'receiptRecordRefsJson', record.id)
  if (input.planRecordId) await appendExecutionRef('execution_plan_record', input.planRecordId, 'receiptRecordRefsJson', record.id)
  if (input.gateRecordId) await appendExecutionRef('execution_gate_record', input.gateRecordId, 'receiptRecordRefsJson', record.id)
  const auditEvent = await createExecutionGatewayAuditEvent({
    correlationId,
    entityType: 'ExecutionReceiptRecord',
    entityId: record.id,
    eventType: 'execution_receipt_record.created',
    reason: 'Created local execution receipt record only.',
  })
  return { record, auditEvent, safetyNote: SPRINT_20_SAFETY_NOTE }
}

export async function transitionExecutionGatewayRecord(args: {
  recordType: ExecutionGatewayRecordType
  id: string
  targetStatus: ExecutionGatewayRecordStatus
  reason: string
  reviewedBy?: string
  supersededByRecordId?: string
}) {
  if (!isValidExecutionGatewayRecordStatus(args.targetStatus)) {
    throw new ExecutionGatewayApiError(`Invalid Sprint 20 execution gateway status: ${args.targetStatus}`)
  }
  const allowed: Record<string, ExecutionGatewayRecordStatus[]> = {
    draft: ['review', 'archived'],
    review: ['approved_record', 'rejected', 'archived'],
    approved_record: ['superseded', 'archived'],
    rejected: ['archived'],
    superseded: ['archived'],
    archived: [],
  }

  const target = await getExecutionGatewayRecordStatus(args.recordType, args.id)
  if (!target) throw new ExecutionGatewayApiError('Sprint 20 execution gateway record not found.', 404)
  if (!allowed[target.status]?.includes(args.targetStatus)) {
    throw new ExecutionGatewayApiError(`Cannot transition from "${target.status}" to "${args.targetStatus}".`)
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

  const record = await updateExecutionGatewayRecord(args.recordType, args.id, data)
  const auditEvent = await createExecutionGatewayAuditEvent({
    correlationId: target.correlationId,
    entityType: args.recordType,
    entityId: args.id,
    eventType: `${args.recordType}.${args.targetStatus}`,
    reason: args.reason,
  })
  return { record, auditEvent, safetyNote: SPRINT_20_SAFETY_NOTE }
}

export async function listExecutionIntents(query: FindExecutionGatewayRecordsQuery = {}) {
  return prisma.executionIntentRecord.findMany({
    where: {
      ...(query.status ? { status: query.status } : {}),
      ...(query.departmentProfileId ? { departmentProfileId: query.departmentProfileId } : {}),
      ...(query.sourceTaskId ? { sourceTaskId: query.sourceTaskId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: query.limit ?? 50,
  })
}

export async function listExecutionPlans(query: FindExecutionGatewayRecordsQuery = {}) {
  return prisma.executionPlanRecord.findMany({
    where: {
      ...(query.status ? { status: query.status } : {}),
      ...(query.intentRecordId ? { intentRecordId: query.intentRecordId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: query.limit ?? 50,
  })
}

export async function listExecutionGates(query: FindExecutionGatewayRecordsQuery = {}) {
  return prisma.executionGateRecord.findMany({
    where: {
      ...(query.status ? { status: query.status } : {}),
      ...(query.intentRecordId ? { intentRecordId: query.intentRecordId } : {}),
      ...(query.planRecordId ? { planRecordId: query.planRecordId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: query.limit ?? 50,
  })
}

export async function listExecutionApprovals(query: FindExecutionGatewayRecordsQuery = {}) {
  return prisma.executionApprovalRecord.findMany({
    where: {
      ...(query.status ? { status: query.status } : {}),
      ...(query.targetId ? { targetId: query.targetId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: query.limit ?? 50,
  })
}

export async function listExecutionReceipts(query: FindExecutionGatewayRecordsQuery = {}) {
  return prisma.executionReceiptRecord.findMany({
    where: {
      ...(query.status ? { status: query.status } : {}),
      ...(query.intentRecordId ? { intentRecordId: query.intentRecordId } : {}),
      ...(query.planRecordId ? { planRecordId: query.planRecordId } : {}),
      ...(query.gateRecordId ? { gateRecordId: query.gateRecordId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: query.limit ?? 50,
  })
}

export async function getExecutionGatewayRecordById(recordType: ExecutionGatewayRecordType, id: string) {
  if (recordType === 'execution_intent_record') return prisma.executionIntentRecord.findUnique({ where: { id } })
  if (recordType === 'execution_plan_record') return prisma.executionPlanRecord.findUnique({ where: { id } })
  if (recordType === 'execution_gate_record') return prisma.executionGateRecord.findUnique({ where: { id } })
  if (recordType === 'execution_approval_record') return prisma.executionApprovalRecord.findUnique({ where: { id } })
  return prisma.executionReceiptRecord.findUnique({ where: { id } })
}

export async function getExecutionIntentLinked(id: string) {
  const intent = await prisma.executionIntentRecord.findUnique({ where: { id } })
  const plans = await listExecutionPlans({ intentRecordId: id, limit: 100 })
  const gates = await listExecutionGates({ intentRecordId: id, limit: 100 })
  const receipts = await listExecutionReceipts({ intentRecordId: id, limit: 100 })
  const approvals = await prisma.executionApprovalRecord.findMany({
    where: {
      OR: [
        { targetType: 'execution_intent_record', targetId: id },
        { targetId: { in: [...plans.map((plan) => plan.id), ...gates.map((gate) => gate.id), ...receipts.map((receipt) => receipt.id)] } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return { intent, plans, gates, approvals, receipts, safetyNote: SPRINT_20_SAFETY_NOTE }
}

export async function getExecutionIntentAudit(id: string) {
  const linked = await getExecutionIntentLinked(id)
  const correlationIds = [
    linked.intent?.correlationId,
    ...linked.plans.map((record) => record.correlationId),
    ...linked.gates.map((record) => record.correlationId),
    ...linked.approvals.map((record) => record.correlationId),
    ...linked.receipts.map((record) => record.correlationId),
  ].filter(Boolean) as string[]
  return prisma.harmonyAuditEvent.findMany({
    where: {
      correlationId: { in: correlationIds.length ? correlationIds : ['__none__'] },
      payloadJson: { contains: 'sprint_20' },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
}

export async function getExecutionIntentTimeline(id: string) {
  return getExecutionIntentAudit(id)
}

export async function getDepartmentExecutionReview(departmentProfileId: string) {
  const intents = await listExecutionIntents({ departmentProfileId, limit: 100 })
  return {
    departmentProfileId,
    intents,
    linked: await Promise.all(intents.map((intent) => getExecutionIntentLinked(intent.id))),
    safetyNote: SPRINT_20_SAFETY_NOTE,
  }
}

export async function getTaskExecutionIntents(sourceTaskId: string) {
  return {
    sourceTaskId,
    intents: await listExecutionIntents({ sourceTaskId, limit: 100 }),
    safetyNote: SPRINT_20_SAFETY_NOTE,
  }
}

async function assertExecutionIntentExists(id: string) {
  const record = await prisma.executionIntentRecord.findUnique({ where: { id }, select: { id: true, correlationId: true } })
  if (!record) throw new ExecutionGatewayApiError('Execution intent record not found.', 404)
  return record
}

async function correlationIdForGate(input: CreateExecutionGateInput) {
  if (input.correlationId) return input.correlationId
  if (input.planRecordId) {
    const plan = await prisma.executionPlanRecord.findUnique({ where: { id: input.planRecordId }, select: { correlationId: true } })
    if (!plan) throw new ExecutionGatewayApiError('Execution plan record not found.', 404)
    return plan.correlationId
  }
  if (input.intentRecordId) return (await assertExecutionIntentExists(input.intentRecordId)).correlationId
  return correlationIdFrom(undefined)
}

async function correlationIdForReceipt(input: CreateExecutionReceiptInput) {
  if (input.correlationId) return input.correlationId
  if (input.gateRecordId) {
    const gate = await prisma.executionGateRecord.findUnique({ where: { id: input.gateRecordId }, select: { correlationId: true } })
    if (!gate) throw new ExecutionGatewayApiError('Execution gate record not found.', 404)
    return gate.correlationId
  }
  if (input.planRecordId) {
    const plan = await prisma.executionPlanRecord.findUnique({ where: { id: input.planRecordId }, select: { correlationId: true } })
    if (!plan) throw new ExecutionGatewayApiError('Execution plan record not found.', 404)
    return plan.correlationId
  }
  if (input.intentRecordId) return (await assertExecutionIntentExists(input.intentRecordId)).correlationId
  return correlationIdFrom(undefined)
}

async function appendExecutionRef(
  recordType: ExecutionGatewayRecordType,
  id: string,
  field: 'planRecordRefsJson' | 'gateRecordRefsJson' | 'approvalRecordRefsJson' | 'receiptRecordRefsJson',
  recordId: string
) {
  const target = (await getExecutionGatewayRecordById(recordType, id)) as Record<string, string> | null
  if (!target || typeof target[field] !== 'string') return
  const refs = parseJson<string[]>(target[field], [])
  if (!refs.includes(recordId)) refs.unshift(recordId)
  await updateExecutionGatewayRecord(recordType, id, { [field]: toJson(refs) })
}

async function getExecutionGatewayRecordStatus(recordType: ExecutionGatewayRecordType, id: string) {
  const select = { status: true, correlationId: true }
  if (recordType === 'execution_intent_record') return prisma.executionIntentRecord.findUnique({ where: { id }, select }) as Promise<{ status: ExecutionGatewayRecordStatus; correlationId: string } | null>
  if (recordType === 'execution_plan_record') return prisma.executionPlanRecord.findUnique({ where: { id }, select }) as Promise<{ status: ExecutionGatewayRecordStatus; correlationId: string } | null>
  if (recordType === 'execution_gate_record') return prisma.executionGateRecord.findUnique({ where: { id }, select }) as Promise<{ status: ExecutionGatewayRecordStatus; correlationId: string } | null>
  if (recordType === 'execution_approval_record') return prisma.executionApprovalRecord.findUnique({ where: { id }, select }) as Promise<{ status: ExecutionGatewayRecordStatus; correlationId: string } | null>
  return prisma.executionReceiptRecord.findUnique({ where: { id }, select }) as Promise<{ status: ExecutionGatewayRecordStatus; correlationId: string } | null>
}

async function updateExecutionGatewayRecord(recordType: ExecutionGatewayRecordType, id: string, data: Record<string, unknown>) {
  if (recordType === 'execution_intent_record') return prisma.executionIntentRecord.update({ where: { id }, data })
  if (recordType === 'execution_plan_record') return prisma.executionPlanRecord.update({ where: { id }, data })
  if (recordType === 'execution_gate_record') return prisma.executionGateRecord.update({ where: { id }, data })
  if (recordType === 'execution_approval_record') return prisma.executionApprovalRecord.update({ where: { id }, data })
  return prisma.executionReceiptRecord.update({ where: { id }, data })
}
