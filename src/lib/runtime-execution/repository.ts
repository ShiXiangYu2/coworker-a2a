import { prisma } from '@/lib/prisma'
import {
  createObsidianDraftPlan,
  executeObsidianDraftPlan,
} from '@/lib/tools/obsidian-draft'
import {
  canTransitionRuntimeDispatchJobStatus,
  isValidRuntimeDispatchJobStatus,
  isValidRuntimeExecutionTokenStatus,
} from './state-machine'
import {
  validateCreateRuntimeDispatchAttemptInput,
  validateCreateRuntimeDispatchJobInput,
  validateCreateRuntimeExecutionReceiptInput,
  validateCreateRuntimeExecutionTokenInput,
  validateCreateRuntimeRecoveryPointInput,
} from './validators'
import type {
  CreateRuntimeDispatchAttemptInput,
  CreateRuntimeDispatchJobInput,
  CreateRuntimeExecutionReceiptInput,
  CreateRuntimeExecutionTokenInput,
  CreateRuntimeRecoveryPointInput,
  FindRuntimeExecutionQuery,
  RuntimeDispatchJobStatus,
  RuntimeExecutionTokenStatus,
} from './types'
import { SPRINT_22_SAFETY_NOTE } from './types'

export class RuntimeExecutionApiError extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message)
    this.name = 'RuntimeExecutionApiError'
  }
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

function ensureObsidianRuntimeAction(current: {
  connectorId: string
  actionType: string
}) {
  if (current.connectorId !== 'obsidian_local') {
    throw new RuntimeExecutionApiError('complete-obsidian-write requires connectorId "obsidian_local".', 409)
  }
  if (current.actionType !== 'write_local_markdown_draft') {
    throw new RuntimeExecutionApiError('complete-obsidian-write requires actionType "write_local_markdown_draft".', 409)
  }
}

export function correlationIdFrom(value: unknown, prefix = 'runtime-execution'): string {
  return typeof value === 'string' && value.trim()
    ? value
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function createRuntimeExecutionAuditEvent(args: {
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
      actorType: args.actorType ?? 'system',
      reason: args.reason,
      payloadJson: toJson({ entityType: args.entityType, entityId: args.entityId, sprint: 'sprint_22' }),
    },
  })
}

export async function createRuntimeExecutionToken(input: CreateRuntimeExecutionTokenInput) {
  validateCreateRuntimeExecutionTokenInput(input)
  const correlationId = correlationIdFrom(input.correlationId)
  const record = await prisma.runtimeExecutionToken.create({
    data: {
      idempotencyKey: input.idempotencyKey ?? input.plan.idempotencyKey,
      targetSprint: 'sprint_22',
      baseline: 'sprint_1_21_complete',
      status: 'draft',
      taskId: input.taskId,
      agentRunId: input.agentRunId,
      executionPlanRecordId: input.executionPlanRecordId,
      executionApprovalRecordId: input.executionApprovalRecordId,
      connectorId: input.plan.connectorId,
      actionType: input.plan.actionType,
      scopeJson: toJson(input.scope),
      issuedBy: input.issuedBy ?? 'system_dispatcher',
      approvedBy: input.approvedBy ?? 'kelvin',
      expiresAt: new Date(input.expiresAt ?? input.scope.expiresAt),
      correlationId,
    },
  })
  const auditEvent = await createRuntimeExecutionAuditEvent({
    correlationId,
    entityType: 'RuntimeExecutionToken',
    entityId: record.id,
    eventType: 'runtime_execution_token.created',
    reason: 'Created Sprint 22 runtime execution token skeleton.',
  })
  return { record, auditEvent, safetyNote: SPRINT_22_SAFETY_NOTE }
}

export async function createRuntimeDispatchJob(input: CreateRuntimeDispatchJobInput) {
  validateCreateRuntimeDispatchJobInput(input)
  const correlationId = correlationIdFrom(input.correlationId)
  const record = await prisma.runtimeDispatchJob.create({
    data: {
      idempotencyKey: input.idempotencyKey ?? input.plan.idempotencyKey,
      targetSprint: 'sprint_22',
      baseline: 'sprint_1_21_complete',
      runtimeTokenId: input.runtimeTokenId,
      taskId: input.taskId,
      status: 'queued',
      connectorId: input.plan.connectorId,
      actionType: input.plan.actionType,
      payloadJson: toJson(input.plan.payload),
      priority: input.priority ?? 100,
      attemptCount: 0,
      maxAttempts: input.plan.maxAttempts,
      scheduledAt: new Date(input.scheduledAt ?? new Date().toISOString()),
      correlationId,
    },
  })
  const auditEvent = await createRuntimeExecutionAuditEvent({
    correlationId,
    entityType: 'RuntimeDispatchJob',
    entityId: record.id,
    eventType: 'runtime_dispatch_job.created',
    reason: 'Created Sprint 22 runtime dispatch job skeleton.',
  })
  return { record, auditEvent, safetyNote: SPRINT_22_SAFETY_NOTE }
}

export async function createRuntimeDispatchAttempt(input: CreateRuntimeDispatchAttemptInput) {
  validateCreateRuntimeDispatchAttemptInput(input)
  const record = await prisma.runtimeDispatchAttempt.create({
    data: {
      jobId: input.jobId,
      attempt: input.attempt,
      status: input.status,
      workerId: input.workerId,
      startedAt: input.startedAt ? new Date(input.startedAt) : new Date(),
      endedAt: input.endedAt ? new Date(input.endedAt) : undefined,
      errorJson: input.error ? toJson(input.error) : undefined,
      receiptId: input.receiptId,
    },
  })
  return { record, safetyNote: SPRINT_22_SAFETY_NOTE }
}

export async function createRuntimeExecutionReceipt(input: CreateRuntimeExecutionReceiptInput) {
  validateCreateRuntimeExecutionReceiptInput(input)
  const record = await prisma.runtimeExecutionReceipt.create({
    data: {
      jobId: input.jobId,
      runtimeTokenId: input.runtimeTokenId,
      taskId: input.taskId,
      connectorId: input.connectorId,
      actionType: input.actionType,
      status: input.status,
      targetRef: input.targetRef,
      summary: input.summary,
      resultJson: toJson(input.result),
      startedAt: new Date(input.startedAt),
      completedAt: new Date(input.completedAt),
      correlationId: input.correlationId,
    },
  })
  const auditEvent = await createRuntimeExecutionAuditEvent({
    correlationId: input.correlationId,
    entityType: 'RuntimeExecutionReceipt',
    entityId: record.id,
    eventType: 'runtime_execution_receipt.created',
    reason: 'Created Sprint 22 runtime execution receipt skeleton.',
  })
  return { record, auditEvent, safetyNote: SPRINT_22_SAFETY_NOTE }
}

export async function createRuntimeRecoveryPoint(input: CreateRuntimeRecoveryPointInput) {
  validateCreateRuntimeRecoveryPointInput(input)
  const record = await prisma.runtimeRecoveryPoint.create({
    data: {
      jobId: input.jobId,
      attemptId: input.attemptId,
      recoveryKind: input.recoveryKind,
      snapshotJson: toJson(input.snapshot),
    },
  })
  return { record, safetyNote: SPRINT_22_SAFETY_NOTE }
}

export async function transitionRuntimeExecutionToken(args: {
  id: string
  targetStatus: RuntimeExecutionTokenStatus
  reason: string
}) {
  if (!isValidRuntimeExecutionTokenStatus(args.targetStatus)) {
    throw new RuntimeExecutionApiError(`Invalid Sprint 22 runtime token status: ${args.targetStatus}`)
  }
  const record = await prisma.runtimeExecutionToken.update({
    where: { id: args.id },
    data: {
      status: args.targetStatus,
      ...(args.targetStatus === 'consumed' ? { consumedAt: new Date() } : {}),
      ...(args.targetStatus === 'revoked' ? { revokedAt: new Date() } : {}),
    },
  })
  const auditEvent = await createRuntimeExecutionAuditEvent({
    correlationId: record.correlationId,
    entityType: 'RuntimeExecutionToken',
    entityId: record.id,
    eventType: `runtime_execution_token.${args.targetStatus}`,
    reason: args.reason,
  })
  return { record, auditEvent, safetyNote: SPRINT_22_SAFETY_NOTE }
}

export async function transitionRuntimeDispatchJob(args: {
  id: string
  targetStatus: RuntimeDispatchJobStatus
  reason: string
  leaseOwner?: string | null
  leaseExpiresAt?: string | null
  lastError?: Record<string, unknown> | null
}) {
  if (!isValidRuntimeDispatchJobStatus(args.targetStatus)) {
    throw new RuntimeExecutionApiError(`Invalid Sprint 22 runtime dispatch job status: ${args.targetStatus}`)
  }
  const record = await prisma.runtimeDispatchJob.update({
    where: { id: args.id },
    data: {
      status: args.targetStatus,
      leaseOwner: args.leaseOwner === undefined ? undefined : args.leaseOwner,
      leaseExpiresAt: args.leaseExpiresAt === undefined
        ? undefined
        : args.leaseExpiresAt
          ? new Date(args.leaseExpiresAt)
          : null,
      lastErrorJson: args.lastError === undefined
        ? undefined
        : args.lastError
          ? toJson(args.lastError)
          : null,
      ...(args.targetStatus === 'running' ? { startedAt: new Date() } : {}),
      ...(args.targetStatus === 'succeeded' || args.targetStatus === 'failed' || args.targetStatus === 'blocked' || args.targetStatus === 'cancelled'
        ? { completedAt: new Date() }
        : {}),
    },
  })
  const auditEvent = await createRuntimeExecutionAuditEvent({
    correlationId: record.correlationId,
    entityType: 'RuntimeDispatchJob',
    entityId: record.id,
    eventType: `runtime_dispatch_job.${args.targetStatus}`,
    reason: args.reason,
  })
  return { record, auditEvent, safetyNote: SPRINT_22_SAFETY_NOTE }
}

export async function listRuntimeExecutionTokens(query: FindRuntimeExecutionQuery = {}) {
  return prisma.runtimeExecutionToken.findMany({
    where: {
      ...(query.status ? { status: query.status as RuntimeExecutionTokenStatus } : {}),
      ...(query.taskId ? { taskId: query.taskId } : {}),
      ...(query.connectorId ? { connectorId: query.connectorId } : {}),
      ...(query.actionType ? { actionType: query.actionType } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: query.limit ?? 50,
  })
}

export async function listRuntimeDispatchJobs(query: FindRuntimeExecutionQuery = {}) {
  return prisma.runtimeDispatchJob.findMany({
    where: {
      ...(query.status ? { status: query.status as RuntimeDispatchJobStatus } : {}),
      ...(query.taskId ? { taskId: query.taskId } : {}),
      ...(query.runtimeTokenId ? { runtimeTokenId: query.runtimeTokenId } : {}),
      ...(query.connectorId ? { connectorId: query.connectorId } : {}),
      ...(query.actionType ? { actionType: query.actionType } : {}),
    },
    orderBy: [{ priority: 'asc' }, { scheduledAt: 'asc' }],
    take: query.limit ?? 50,
  })
}

export async function listRuntimeDispatchAttempts(jobId: string) {
  return prisma.runtimeDispatchAttempt.findMany({
    where: { jobId },
    orderBy: [{ attempt: 'asc' }, { createdAt: 'asc' }],
    take: 50,
  })
}

export async function listRuntimeRecoveryPoints(jobId: string) {
  return prisma.runtimeRecoveryPoint.findMany({
    where: { jobId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
}

export async function getRuntimeExecutionTokenById(id: string) {
  return prisma.runtimeExecutionToken.findUnique({ where: { id } })
}

export async function getRuntimeDispatchJobById(id: string) {
  return prisma.runtimeDispatchJob.findUnique({ where: { id } })
}

export async function getRuntimeExecutionReceiptByJobId(jobId: string) {
  return prisma.runtimeExecutionReceipt.findUnique({ where: { jobId } })
}

export async function claimRuntimeDispatchJob(args: {
  workerId: string
  leaseDurationMs?: number
  now?: Date
}) {
  const workerId = args.workerId.trim()
  if (!workerId) throw new RuntimeExecutionApiError('workerId is required.')
  const now = args.now ?? new Date()
  const leaseDurationMs = args.leaseDurationMs ?? 60_000
  if (!Number.isInteger(leaseDurationMs) || leaseDurationMs < 1 || leaseDurationMs > 300_000) {
    throw new RuntimeExecutionApiError('leaseDurationMs must be an integer between 1 and 300000.')
  }

  const candidate = await prisma.runtimeDispatchJob.findFirst({
    where: { status: 'queued' },
    orderBy: [{ priority: 'asc' }, { scheduledAt: 'asc' }],
  })
  if (!candidate) throw new RuntimeExecutionApiError('No queued runtime dispatch job available.', 404)
  if (!canTransitionRuntimeDispatchJobStatus(candidate.status as RuntimeDispatchJobStatus, 'LEASE')) {
    throw new RuntimeExecutionApiError(`Runtime dispatch job ${candidate.id} cannot be leased from status "${candidate.status}".`, 409)
  }

  const leaseExpiresAt = new Date(now.getTime() + leaseDurationMs)
  const updated = await prisma.runtimeDispatchJob.update({
    where: { id: candidate.id },
    data: {
      status: 'leased',
      leaseOwner: workerId,
      leaseExpiresAt,
    },
  })
  const attempt = await createRuntimeDispatchAttempt({
    jobId: updated.id,
    attempt: candidate.attemptCount + 1,
    status: 'leased',
    workerId,
    startedAt: now.toISOString(),
  })
  const auditEvent = await createRuntimeExecutionAuditEvent({
    correlationId: updated.correlationId,
    entityType: 'RuntimeDispatchJob',
    entityId: updated.id,
    eventType: 'runtime_dispatch_job.claimed',
    actorType: 'worker',
    reason: `Worker ${workerId} claimed queued runtime dispatch job.`,
  })
  return { record: updated, attempt: attempt.record, auditEvent, safetyNote: SPRINT_22_SAFETY_NOTE }
}

export async function claimRuntimeDispatchJobById(args: {
  id: string
  workerId: string
  leaseDurationMs?: number
  now?: Date
}) {
  const workerId = args.workerId.trim()
  if (!workerId) throw new RuntimeExecutionApiError('workerId is required.')
  const jobId = args.id.trim()
  if (!jobId) throw new RuntimeExecutionApiError('id is required.')
  const now = args.now ?? new Date()
  const leaseDurationMs = args.leaseDurationMs ?? 60_000
  if (!Number.isInteger(leaseDurationMs) || leaseDurationMs < 1 || leaseDurationMs > 300_000) {
    throw new RuntimeExecutionApiError('leaseDurationMs must be an integer between 1 and 300000.')
  }

  const current = await prisma.runtimeDispatchJob.findUnique({ where: { id: jobId } })
  if (!current) throw new RuntimeExecutionApiError('Runtime dispatch job not found.', 404)
  if (current.status !== 'queued') {
    throw new RuntimeExecutionApiError(`Runtime dispatch job claim-by-id requires queued status, got "${current.status}".`, 409)
  }
  if (!canTransitionRuntimeDispatchJobStatus(current.status as RuntimeDispatchJobStatus, 'LEASE')) {
    throw new RuntimeExecutionApiError(`Runtime dispatch job ${current.id} cannot be leased from status "${current.status}".`, 409)
  }

  const leaseExpiresAt = new Date(now.getTime() + leaseDurationMs)
  const updated = await prisma.runtimeDispatchJob.update({
    where: { id: current.id },
    data: {
      status: 'leased',
      leaseOwner: workerId,
      leaseExpiresAt,
    },
  })
  const attempt = await createRuntimeDispatchAttempt({
    jobId: updated.id,
    attempt: current.attemptCount + 1,
    status: 'leased',
    workerId,
    startedAt: now.toISOString(),
  })
  const auditEvent = await createRuntimeExecutionAuditEvent({
    correlationId: updated.correlationId,
    entityType: 'RuntimeDispatchJob',
    entityId: updated.id,
    eventType: 'runtime_dispatch_job.claimed_by_id',
    actorType: 'worker',
    reason: `Worker ${workerId} claimed runtime dispatch job ${updated.id} by explicit id.`,
  })
  return { record: updated, attempt: attempt.record, auditEvent, safetyNote: SPRINT_22_SAFETY_NOTE }
}

export async function heartbeatRuntimeDispatchJob(args: {
  id: string
  workerId: string
  leaseDurationMs?: number
  now?: Date
}) {
  const workerId = args.workerId.trim()
  if (!workerId) throw new RuntimeExecutionApiError('workerId is required.')
  const leaseDurationMs = args.leaseDurationMs ?? 60_000
  if (!Number.isInteger(leaseDurationMs) || leaseDurationMs < 1 || leaseDurationMs > 300_000) {
    throw new RuntimeExecutionApiError('leaseDurationMs must be an integer between 1 and 300000.')
  }

  const current = await prisma.runtimeDispatchJob.findUnique({ where: { id: args.id } })
  if (!current) throw new RuntimeExecutionApiError('Runtime dispatch job not found.', 404)
  if (current.status !== 'leased' && current.status !== 'running') {
    throw new RuntimeExecutionApiError(`Runtime dispatch job heartbeat requires leased or running status, got "${current.status}".`, 409)
  }
  if (current.leaseOwner !== workerId) {
    throw new RuntimeExecutionApiError('leaseOwner mismatch for runtime dispatch job heartbeat.', 409)
  }

  const now = args.now ?? new Date()
  const leaseExpiresAt = new Date(now.getTime() + leaseDurationMs)
  const record = await prisma.runtimeDispatchJob.update({
    where: { id: args.id },
    data: { leaseExpiresAt },
  })
  const auditEvent = await createRuntimeExecutionAuditEvent({
    correlationId: record.correlationId,
    entityType: 'RuntimeDispatchJob',
    entityId: record.id,
    eventType: 'runtime_dispatch_job.heartbeat',
    actorType: 'worker',
    reason: `Worker ${workerId} extended the runtime dispatch job lease.`,
  })
  return { record, auditEvent, safetyNote: SPRINT_22_SAFETY_NOTE }
}

export async function startRuntimeDispatchJob(args: {
  id: string
  workerId: string
  now?: Date
}) {
  const workerId = args.workerId.trim()
  if (!workerId) throw new RuntimeExecutionApiError('workerId is required.')

  const current = await prisma.runtimeDispatchJob.findUnique({ where: { id: args.id } })
  if (!current) throw new RuntimeExecutionApiError('Runtime dispatch job not found.', 404)
  if (current.status !== 'leased') {
    throw new RuntimeExecutionApiError(`Runtime dispatch job start requires leased status, got "${current.status}".`, 409)
  }
  if (current.leaseOwner !== workerId) {
    throw new RuntimeExecutionApiError('leaseOwner mismatch for runtime dispatch job start.', 409)
  }
  if (!canTransitionRuntimeDispatchJobStatus('leased', 'START')) {
    throw new RuntimeExecutionApiError('Runtime dispatch job cannot transition to running.', 409)
  }

  const now = args.now ?? new Date()
  const record = await prisma.runtimeDispatchJob.update({
    where: { id: args.id },
    data: {
      status: 'running',
      startedAt: now,
      attemptCount: current.attemptCount + 1,
    },
  })
  const attempt = await createRuntimeDispatchAttempt({
    jobId: record.id,
    attempt: record.attemptCount,
    status: 'running',
    workerId,
    startedAt: now.toISOString(),
  })
  const auditEvent = await createRuntimeExecutionAuditEvent({
    correlationId: record.correlationId,
    entityType: 'RuntimeDispatchJob',
    entityId: record.id,
    eventType: 'runtime_dispatch_job.started',
    actorType: 'worker',
    reason: `Worker ${workerId} marked the runtime dispatch job as running.`,
  })
  return { record, attempt: attempt.record, auditEvent, safetyNote: SPRINT_22_SAFETY_NOTE }
}

export async function failRuntimeDispatchJob(args: {
  id: string
  workerId: string
  error: Record<string, unknown>
  snapshot?: Record<string, unknown>
  now?: Date
}) {
  const workerId = args.workerId.trim()
  if (!workerId) throw new RuntimeExecutionApiError('workerId is required.')
  const current = await prisma.runtimeDispatchJob.findUnique({ where: { id: args.id } })
  if (!current) throw new RuntimeExecutionApiError('Runtime dispatch job not found.', 404)
  if (current.status !== 'running' && current.status !== 'leased') {
    throw new RuntimeExecutionApiError(`Runtime dispatch job fail requires leased or running status, got "${current.status}".`, 409)
  }
  if (current.leaseOwner !== workerId) {
    throw new RuntimeExecutionApiError('leaseOwner mismatch for runtime dispatch job fail.', 409)
  }

  const now = args.now ?? new Date()
  const record = await prisma.runtimeDispatchJob.update({
    where: { id: args.id },
    data: {
      status: 'failed',
      completedAt: now,
      lastErrorJson: toJson(args.error),
    },
  })
  const attempt = await createRuntimeDispatchAttempt({
    jobId: record.id,
    attempt: Math.max(record.attemptCount, 1),
    status: 'failed',
    workerId,
    startedAt: current.startedAt?.toISOString() ?? now.toISOString(),
    endedAt: now.toISOString(),
    error: args.error,
  })
  const recovery = await createRuntimeRecoveryPoint({
    jobId: record.id,
    attemptId: attempt.record.id,
    recoveryKind: 'failure_snapshot',
    snapshot: args.snapshot ?? { error: args.error, status: record.status },
  })
  const auditEvent = await createRuntimeExecutionAuditEvent({
    correlationId: record.correlationId,
    entityType: 'RuntimeDispatchJob',
    entityId: record.id,
    eventType: 'runtime_dispatch_job.failed',
    actorType: 'worker',
    reason: `Worker ${workerId} marked the runtime dispatch job as failed.`,
  })
  return { record, attempt: attempt.record, recovery: recovery.record, auditEvent, safetyNote: SPRINT_22_SAFETY_NOTE }
}

export async function blockRuntimeDispatchJob(args: {
  id: string
  workerId: string
  reason: string
  snapshot?: Record<string, unknown>
  now?: Date
}) {
  const workerId = args.workerId.trim()
  if (!workerId) throw new RuntimeExecutionApiError('workerId is required.')
  const reason = args.reason.trim()
  if (!reason) throw new RuntimeExecutionApiError('reason is required.')
  const current = await prisma.runtimeDispatchJob.findUnique({ where: { id: args.id } })
  if (!current) throw new RuntimeExecutionApiError('Runtime dispatch job not found.', 404)
  if (current.status !== 'running' && current.status !== 'leased') {
    throw new RuntimeExecutionApiError(`Runtime dispatch job block requires leased or running status, got "${current.status}".`, 409)
  }
  if (current.leaseOwner !== workerId) {
    throw new RuntimeExecutionApiError('leaseOwner mismatch for runtime dispatch job block.', 409)
  }

  const now = args.now ?? new Date()
  const error = { reason }
  const record = await prisma.runtimeDispatchJob.update({
    where: { id: args.id },
    data: {
      status: 'blocked',
      completedAt: now,
      lastErrorJson: toJson(error),
    },
  })
  const attempt = await createRuntimeDispatchAttempt({
    jobId: record.id,
    attempt: Math.max(record.attemptCount, 1),
    status: 'blocked',
    workerId,
    startedAt: current.startedAt?.toISOString() ?? now.toISOString(),
    endedAt: now.toISOString(),
    error,
  })
  const recovery = await createRuntimeRecoveryPoint({
    jobId: record.id,
    attemptId: attempt.record.id,
    recoveryKind: 'failure_snapshot',
    snapshot: args.snapshot ?? { reason, status: record.status },
  })
  const auditEvent = await createRuntimeExecutionAuditEvent({
    correlationId: record.correlationId,
    entityType: 'RuntimeDispatchJob',
    entityId: record.id,
    eventType: 'runtime_dispatch_job.blocked',
    actorType: 'worker',
    reason: `Worker ${workerId} marked the runtime dispatch job as blocked.`,
  })
  return { record, attempt: attempt.record, recovery: recovery.record, auditEvent, safetyNote: SPRINT_22_SAFETY_NOTE }
}

export async function completeRuntimeDispatchJobDryRun(args: {
  id: string
  workerId: string
  targetRef?: string
  summary?: string
  result?: Record<string, unknown>
  snapshot?: Record<string, unknown>
  now?: Date
}) {
  const workerId = args.workerId.trim()
  if (!workerId) throw new RuntimeExecutionApiError('workerId is required.')
  const current = await prisma.runtimeDispatchJob.findUnique({ where: { id: args.id } })
  if (!current) throw new RuntimeExecutionApiError('Runtime dispatch job not found.', 404)
  if (current.status !== 'running') {
    throw new RuntimeExecutionApiError(`Runtime dispatch job complete-dry-run requires running status, got "${current.status}".`, 409)
  }
  if (current.leaseOwner !== workerId) {
    throw new RuntimeExecutionApiError('leaseOwner mismatch for runtime dispatch job complete-dry-run.', 409)
  }
  if (!canTransitionRuntimeDispatchJobStatus('running', 'SUCCEED')) {
    throw new RuntimeExecutionApiError('Runtime dispatch job cannot transition to succeeded.', 409)
  }

  const now = args.now ?? new Date()
  const record = await prisma.runtimeDispatchJob.update({
    where: { id: args.id },
    data: {
      status: 'succeeded',
      completedAt: now,
    },
  })
  const token = await prisma.runtimeExecutionToken.update({
    where: { id: current.runtimeTokenId },
    data: {
      status: 'consumed',
      consumedAt: now,
    },
  })
  const receipt = await createRuntimeExecutionReceipt({
    jobId: record.id,
    runtimeTokenId: current.runtimeTokenId,
    taskId: current.taskId,
    connectorId: current.connectorId as never,
    actionType: current.actionType as never,
    status: 'dry_run',
    targetRef: args.targetRef ?? `dry-run:${record.id}`,
    summary: args.summary ?? 'Dry-run runtime completion recorded without executing a connector.',
    result: args.result ?? { dryRun: true, executedConnector: false },
    startedAt: current.startedAt?.toISOString() ?? now.toISOString(),
    completedAt: now.toISOString(),
    correlationId: record.correlationId,
  })
  const recovery = await createRuntimeRecoveryPoint({
    jobId: record.id,
    attemptId: `dry-run-${record.id}`,
    recoveryKind: 'post_execute',
    snapshot: args.snapshot ?? {
      dryRun: true,
      receiptId: receipt.record.id,
      tokenStatus: token.status,
      status: record.status,
    },
  })
  const auditEvent = await createRuntimeExecutionAuditEvent({
    correlationId: record.correlationId,
    entityType: 'RuntimeDispatchJob',
    entityId: record.id,
    eventType: 'runtime_dispatch_job.completed_dry_run',
    actorType: 'worker',
    reason: `Worker ${workerId} completed the runtime dispatch job as dry-run only.`,
  })
  return { record, token, receipt: receipt.record, recovery: recovery.record, auditEvent, safetyNote: SPRINT_22_SAFETY_NOTE }
}

export async function completeRuntimeDispatchJobObsidianWrite(args: {
  id: string
  workerId: string
  execute?: boolean
  vaultPath?: string
  snapshot?: Record<string, unknown>
  now?: Date
}) {
  const workerId = args.workerId.trim()
  if (!workerId) throw new RuntimeExecutionApiError('workerId is required.')
  if (args.execute !== true) {
    throw new RuntimeExecutionApiError('complete-obsidian-write requires execute=true for real connector execution.', 409)
  }

  const current = await prisma.runtimeDispatchJob.findUnique({ where: { id: args.id } })
  if (!current) throw new RuntimeExecutionApiError('Runtime dispatch job not found.', 404)
  if (current.status !== 'running') {
    throw new RuntimeExecutionApiError(`Runtime dispatch job complete-obsidian-write requires running status, got "${current.status}".`, 409)
  }
  if (current.leaseOwner !== workerId) {
    throw new RuntimeExecutionApiError('leaseOwner mismatch for runtime dispatch job complete-obsidian-write.', 409)
  }
  ensureObsidianRuntimeAction(current)
  if (!canTransitionRuntimeDispatchJobStatus('running', 'SUCCEED')) {
    throw new RuntimeExecutionApiError('Runtime dispatch job cannot transition to succeeded.', 409)
  }

  const tokenRecord = await prisma.runtimeExecutionToken.findUnique({ where: { id: current.runtimeTokenId } })
  if (!tokenRecord) throw new RuntimeExecutionApiError('Runtime execution token not found.', 404)
  ensureObsidianRuntimeAction(tokenRecord)

  const scope = parseJson(tokenRecord.scopeJson, {}) as {
    allowedVaultRoot?: string
    allowedFilename?: string
    allowedTargetDirectoryLabel?: string
  }
  const payload = parseJson(current.payloadJson, {}) as {
    draftTitle?: string
    filename?: string
    content?: string
    targetDirectoryLabel?: string
  }

  if (scope.allowedTargetDirectoryLabel !== 'Inbox/AI Drafts') {
    throw new RuntimeExecutionApiError('Runtime token scope must be limited to Inbox/AI Drafts.', 409)
  }
  if (payload.targetDirectoryLabel !== 'Inbox/AI Drafts') {
    throw new RuntimeExecutionApiError('Runtime dispatch payload must target Inbox/AI Drafts.', 409)
  }
  if (!payload.draftTitle || !payload.filename || !payload.content) {
    throw new RuntimeExecutionApiError('Runtime dispatch job payload is missing required Obsidian draft fields.', 400)
  }
  if (scope.allowedFilename && scope.allowedFilename !== payload.filename) {
    throw new RuntimeExecutionApiError('Runtime dispatch job filename does not match the approved runtime token scope.', 409)
  }

  const now = args.now ?? new Date()
  const plan = createObsidianDraftPlan({
    draftTitle: payload.draftTitle,
    filename: payload.filename,
    content: payload.content,
    dryRun: false,
  }, {
    vaultPath: args.vaultPath ?? scope.allowedVaultRoot,
    now,
  })

  const connectorReceipt = await executeObsidianDraftPlan(plan, {
    approved: true,
    approvalRecordId: tokenRecord.executionApprovalRecordId,
    approvedBy: tokenRecord.approvedBy === 'kelvin' ? 'kelvin' : undefined,
    vaultPath: args.vaultPath ?? scope.allowedVaultRoot,
    now,
  })

  if (connectorReceipt.status !== 'succeeded') {
    throw new RuntimeExecutionApiError(
      `Obsidian connector did not produce a real succeeded receipt (status "${connectorReceipt.status}").`,
      409
    )
  }

  const record = await prisma.runtimeDispatchJob.update({
    where: { id: args.id },
    data: {
      status: 'succeeded',
      completedAt: now,
    },
  })
  const token = await prisma.runtimeExecutionToken.update({
    where: { id: current.runtimeTokenId },
    data: {
      status: 'consumed',
      consumedAt: now,
    },
  })
  const receipt = await createRuntimeExecutionReceipt({
    jobId: record.id,
    runtimeTokenId: current.runtimeTokenId,
    taskId: current.taskId,
    connectorId: 'obsidian_local',
    actionType: 'write_local_markdown_draft',
    status: 'succeeded',
    targetRef: connectorReceipt.path,
    summary: 'Controlled Obsidian Markdown draft write completed through Sprint 22 runtime execution.',
    result: {
      action: connectorReceipt.action,
      status: connectorReceipt.status,
      path: connectorReceipt.path,
      timestamp: connectorReceipt.timestamp,
      executionPlanId: connectorReceipt.executionPlanId,
      approvalRecordId: connectorReceipt.approvalRecordId,
      approvedBy: connectorReceipt.approvedBy,
      reason: connectorReceipt.reason,
    },
    startedAt: current.startedAt?.toISOString() ?? now.toISOString(),
    completedAt: now.toISOString(),
    correlationId: record.correlationId,
  })
  const recovery = await createRuntimeRecoveryPoint({
    jobId: record.id,
    attemptId: `obsidian-write-${record.id}`,
    recoveryKind: 'post_execute',
    snapshot: args.snapshot ?? {
      receiptId: receipt.record.id,
      receiptStatus: receipt.record.status,
      connectorReceipt,
      tokenStatus: token.status,
      status: record.status,
    },
  })
  const auditEvent = await createRuntimeExecutionAuditEvent({
    correlationId: record.correlationId,
    entityType: 'RuntimeDispatchJob',
    entityId: record.id,
    eventType: 'runtime_dispatch_job.completed_obsidian_write',
    actorType: 'worker',
    reason: `Worker ${workerId} completed the runtime dispatch job with the scoped Obsidian connector.`,
  })
  return { record, token, receipt: receipt.record, recovery: recovery.record, connectorReceipt, auditEvent, safetyNote: SPRINT_22_SAFETY_NOTE }
}
