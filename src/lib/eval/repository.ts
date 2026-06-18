import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { encodeJson } from '@/lib/harmony/serializers'
import {
  defaultForbiddenRuntimeActions,
  defaultMustReview,
} from '@/lib/harmony/route-to-task'
import { produceDeterministicEval, buildEvalTargetMetadata, hashSnapshot } from './rules'
import {
  serializeEvalCheck,
  serializeEvalFinding,
  serializeEvalRun,
  serializeEvalTarget,
} from './serializers'
import { transitionEvalRun } from './state-machine'
import type {
  CreateEvalRunInput,
  CreateEvalTargetInput,
  EvalCheck,
  EvalFinding,
  EvalRun,
  EvalRunBundle,
  EvalTarget,
  EvalTargetType,
  ReviewEvalFindingInput,
} from './types'

type RawEvalTarget = Parameters<typeof serializeEvalTarget>[0]
type RawEvalRun = Parameters<typeof serializeEvalRun>[0]
type RawEvalCheck = Parameters<typeof serializeEvalCheck>[0]
type RawEvalFinding = Parameters<typeof serializeEvalFinding>[0]

export class EvalRepositoryError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message)
    this.name = 'EvalRepositoryError'
  }
}

export async function createEvalTarget(
  input: CreateEvalTargetInput
): Promise<{ evalTarget: EvalTarget; auditEvents: unknown[] }> {
  if (input.idempotencyKey) {
    const existing = await findEvalTargetByIdempotencyKey(input.idempotencyKey)
    if (existing) return { evalTarget: existing, auditEvents: [] }
  }

  const snapshot = await buildTargetSnapshot(input.targetType, input.targetId)
  const metadata = buildEvalTargetMetadata(input.targetType, input.targetId, snapshot)
  const id = randomUUID()
  const auditEvents: unknown[] = []

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO eval_targets (
        id, idempotencyKey, correlationId, targetType, targetId, routeDecisionId,
        taskId, agentRunId, agentResultId, toolCallId, toolPermissionId,
        memoryEntryId, knowledgeItemId, contextPacketId, a2aMessageId, source,
        snapshotJson, snapshotVersion, snapshotHash, status, createdAt, updatedAt
      ) VALUES (
        ${id}, ${input.idempotencyKey ?? null}, ${input.correlationId ?? null},
        ${input.targetType}, ${input.targetId}, ${metadata.routeDecisionId ?? null},
        ${metadata.taskId ?? null}, ${metadata.agentRunId ?? null},
        ${metadata.agentResultId ?? null}, ${metadata.toolCallId ?? null},
        ${metadata.toolPermissionId ?? null}, ${metadata.memoryEntryId ?? null},
        ${metadata.knowledgeItemId ?? null}, ${metadata.contextPacketId ?? null},
        ${metadata.a2aMessageId ?? null}, ${input.source ?? 'api'},
        ${encodeJson(snapshot)}, ${'sprint-7-v1'}, ${hashSnapshot(snapshot)},
        ${'active'}, ${new Date()}, ${new Date()}
      )
    `
    const auditEvent = await tx.harmonyAuditEvent.create({
      data: {
        correlationId: input.correlationId,
        taskId: metadata.taskId,
        eventType: 'eval.target_created',
        actorType: 'eval_runtime',
        actorId: 'turing',
        afterStatus: 'active',
        reason: 'EvalTarget created from sanitized local snapshot. No target record was mutated.',
        payloadJson: encodeJson({
          evalTargetId: id,
          targetType: input.targetType,
          targetId: input.targetId,
        }),
      },
    })
    auditEvents.push(auditEvent)
  })

  const evalTarget = await getEvalTarget(id)
  if (!evalTarget) throw new EvalRepositoryError('EvalTarget not found after create.', 500)
  return { evalTarget, auditEvents }
}

export async function createEvalRunFromTarget(
  input: CreateEvalRunInput
): Promise<{ bundle: EvalRunBundle; auditEvents: unknown[] }> {
  if (input.idempotencyKey) {
    const existing = await findEvalRunByIdempotencyKey(input.idempotencyKey)
    if (existing) return { bundle: await buildEvalRunBundle(existing), auditEvents: [] }
  }

  const target = await getEvalTarget(input.evalTargetId)
  if (!target) throw new EvalRepositoryError('EvalTarget not found.', 404)
  if (target.status !== 'active') {
    throw new EvalRepositoryError('Only active EvalTarget can start EvalRun.')
  }

  const evalRunId = randomUUID()
  const startedAt = new Date()
  const completedAt = new Date()
  const runningStatus = transitionEvalRun('created', 'START')
  const evalResult = produceDeterministicEval({
    evalRunId,
    evalTarget: target,
    now: completedAt.toISOString(),
  })
  const finalStatus = transitionEvalRun(
    runningStatus,
    evalResult.qualityGateDecision.decision === 'blocked' ? 'BLOCK' : 'COMPLETE'
  )
  const summary = summarizeChecks(evalResult.checks)
  const auditEvents: unknown[] = []

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO eval_runs (
        id, evalTargetId, targetType, targetId, evaluatorId, evaluatorMode,
        status, trigger, checksSummaryJson, qualityGateDecisionJson,
        inputSnapshotJson, outputSnapshotJson, errorJson, idempotencyKey,
        correlationId, startedAt, completedAt, createdAt, updatedAt
      ) VALUES (
        ${evalRunId}, ${target.id}, ${target.targetType}, ${target.targetId},
        ${'turing'}, ${'deterministic_local'}, ${finalStatus},
        ${input.trigger ?? 'api'}, ${encodeJson(summary)},
        ${encodeJson(evalResult.qualityGateDecision)}, ${encodeJson(target.snapshot)},
        ${encodeJson({ checks: evalResult.checks.length, findings: evalResult.findings.length })},
        ${null}, ${input.idempotencyKey ?? null}, ${target.correlationId ?? null},
        ${startedAt}, ${completedAt}, ${startedAt}, ${completedAt}
      )
    `

    for (const check of evalResult.checks) {
      await tx.$executeRaw`
        INSERT INTO eval_checks (
          id, evalRunId, evalTargetId, checkKey, title, category, status,
          severity, confidence, targetPath, targetField, evidenceJson,
          evidenceRefsJson, recommendation, createdAt
        ) VALUES (
          ${randomUUID()}, ${evalRunId}, ${target.id}, ${check.checkKey},
          ${check.title}, ${check.category}, ${check.status}, ${check.severity},
          ${check.confidence}, ${check.targetPath ?? null}, ${check.targetField ?? null},
          ${encodeJson(check.evidence)}, ${encodeJson(check.evidenceRefs ?? [])},
          ${check.recommendation ?? null}, ${new Date()}
        )
      `
    }

    for (const finding of evalResult.findings) {
      const findingId = randomUUID()
      let confirmationArtifactId: string | null = null
      if (finding.needsHumanReview && target.taskId) {
        const confirmation = await tx.harmonyConfirmationArtifact.create({
          data: {
            taskId: target.taskId,
            status: 'pending',
            action: 'review_eval_finding',
            reason: finding.recommendation,
            requiresHumanOwner: true,
            mustReviewJson: encodeJson(defaultMustReview),
            forbiddenRuntimeActionsJson: encodeJson([
              ...defaultForbiddenRuntimeActions,
              'auto-fix',
              'auto-block-task',
              'auto-complete-task',
            ]),
            payloadJson: encodeJson({
              resourceType: 'eval_finding',
              resourceId: findingId,
              evalRunId,
              evalTargetId: target.id,
            }),
          },
        })
        confirmationArtifactId = confirmation.id
      }

      await tx.$executeRaw`
        INSERT INTO eval_findings (
          id, evalRunId, evalTargetId, relatedCheckIdsJson, severity, category,
          title, description, targetPath, targetField, evidenceJson,
          evidenceRefsJson, recommendation, status, needsHumanReview,
          confirmationArtifactId, reviewedBy, reviewedAt, reviewDecision,
          reviewReason, createdAt, updatedAt
        ) VALUES (
          ${findingId}, ${evalRunId}, ${target.id}, ${encodeJson(finding.relatedCheckIds)},
          ${finding.severity}, ${finding.category}, ${finding.title}, ${finding.description},
          ${finding.targetPath ?? null}, ${finding.targetField ?? null},
          ${encodeJson(finding.evidence)}, ${encodeJson(finding.evidenceRefs ?? [])},
          ${finding.recommendation}, ${finding.status}, ${finding.needsHumanReview},
          ${confirmationArtifactId}, ${null}, ${null}, ${null}, ${null},
          ${new Date()}, ${new Date()}
        )
      `
    }

    for (const data of [
      {
        correlationId: target.correlationId,
        taskId: target.taskId,
        eventType: 'eval.run_created',
        actorType: 'eval_runtime',
        actorId: 'turing',
        afterStatus: 'created',
        reason: 'EvalRun created. No target record was mutated.',
        payloadJson: encodeJson({ evalRunId, evalTargetId: target.id }),
      },
      {
        correlationId: target.correlationId,
        taskId: target.taskId,
        eventType: 'eval.run_started',
        actorType: 'turing',
        actorId: 'turing',
        beforeStatus: 'created',
        afterStatus: 'running',
        reason: 'Deterministic local verification started.',
        payloadJson: encodeJson({ evalRunId, evalTargetId: target.id }),
      },
      {
        correlationId: target.correlationId,
        taskId: target.taskId,
        eventType: finalStatus === 'blocked' ? 'eval.run_blocked' : 'eval.run_completed',
        actorType: 'turing',
        actorId: 'turing',
        beforeStatus: 'running',
        afterStatus: finalStatus,
        reason: 'Deterministic local verification finished. QualityGateDecision is recommendation-only.',
        payloadJson: encodeJson({
          evalRunId,
          evalTargetId: target.id,
          qualityGateDecision: evalResult.qualityGateDecision,
        }),
      },
      {
        correlationId: target.correlationId,
        taskId: target.taskId,
        eventType: 'eval.quality_gate_recorded',
        actorType: 'eval_runtime',
        actorId: 'turing',
        afterStatus: evalResult.qualityGateDecision.decision,
        reason: 'QualityGateDecision recorded as recommendation-only.',
        payloadJson: encodeJson({
          evalRunId,
          evalTargetId: target.id,
          qualityGateDecision: evalResult.qualityGateDecision,
        }),
      },
    ]) {
      auditEvents.push(await tx.harmonyAuditEvent.create({ data }))
    }
  })

  const run = await getEvalRun(evalRunId)
  if (!run) throw new EvalRepositoryError('EvalRun not found after create.', 500)
  return { bundle: await buildEvalRunBundle(run), auditEvents }
}

export async function cancelEvalRun(id: string): Promise<{ evalRun: EvalRun; auditEvents: unknown[] }> {
  const run = await getEvalRun(id)
  if (!run) throw new EvalRepositoryError('EvalRun not found.', 404)
  const nextStatus = transitionEvalRun(run.status, 'CANCEL')
  const auditEvents: unknown[] = []
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE eval_runs SET status = ${nextStatus}, updatedAt = ${new Date()}
      WHERE id = ${id}
    `
    const auditEvent = await tx.harmonyAuditEvent.create({
      data: {
        correlationId: run.correlationId,
        eventType: 'eval.run_cancelled',
        actorType: 'user',
        beforeStatus: run.status,
        afterStatus: nextStatus,
        reason: 'EvalRun cancelled. No target record was mutated.',
        payloadJson: encodeJson({ evalRunId: id, evalTargetId: run.evalTargetId }),
      },
    })
    auditEvents.push(auditEvent)
  })
  const updated = await getEvalRun(id)
  if (!updated) throw new EvalRepositoryError('EvalRun not found after cancel.', 500)
  return { evalRun: updated, auditEvents }
}

export async function markEvalFindingReviewed(
  id: string,
  input: ReviewEvalFindingInput
): Promise<{ finding: EvalFinding; auditEvents: unknown[] }> {
  const finding = await getEvalFinding(id)
  if (!finding) throw new EvalRepositoryError('EvalFinding not found.', 404)
  const target = await getEvalTarget(finding.evalTargetId)
  const auditEvents: unknown[] = []
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE eval_findings
      SET status = ${'reviewed'}, reviewedBy = ${input.reviewedBy ?? 'kelvin'},
          reviewedAt = ${new Date()}, reviewDecision = ${'accepted'},
          reviewReason = ${input.decisionReason}, updatedAt = ${new Date()}
      WHERE id = ${id}
    `
    const auditEvent = await tx.harmonyAuditEvent.create({
      data: {
        correlationId: target?.correlationId,
        taskId: target?.taskId,
        eventType: 'eval.finding_reviewed',
        actorType: 'kelvin',
        actorId: input.reviewedBy ?? 'kelvin',
        beforeStatus: finding.status,
        afterStatus: 'reviewed',
        reason: `${input.decisionReason} Target record was not mutated.`,
        payloadJson: encodeJson({ evalFindingId: id, evalRunId: finding.evalRunId }),
      },
    })
    auditEvents.push(auditEvent)
  })
  const updated = await getEvalFinding(id)
  if (!updated) throw new EvalRepositoryError('EvalFinding not found after review.', 500)
  return { finding: updated, auditEvents }
}

export async function requestKelvinReviewForFinding(
  id: string
): Promise<{ finding: EvalFinding; auditEvents: unknown[] }> {
  const finding = await getEvalFinding(id)
  if (!finding) throw new EvalRepositoryError('EvalFinding not found.', 404)
  const target = await getEvalTarget(finding.evalTargetId)
  const auditEvents: unknown[] = []
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE eval_findings
      SET status = ${'review_requested'}, needsHumanReview = ${true},
          updatedAt = ${new Date()}
      WHERE id = ${id}
    `
    const auditEvent = await tx.harmonyAuditEvent.create({
      data: {
        correlationId: target?.correlationId,
        taskId: target?.taskId,
        eventType: 'eval.finding_review_requested',
        actorType: 'eval_runtime',
        actorId: 'turing',
        beforeStatus: finding.status,
        afterStatus: 'review_requested',
        reason: 'Kelvin review requested for EvalFinding. No target record was mutated.',
        payloadJson: encodeJson({ evalFindingId: id, evalRunId: finding.evalRunId }),
      },
    })
    auditEvents.push(auditEvent)
  })
  const updated = await getEvalFinding(id)
  if (!updated) throw new EvalRepositoryError('EvalFinding not found after update.', 500)
  return { finding: updated, auditEvents }
}

export async function approveEvalConfirmation(
  confirmationId: string,
  input: ReviewEvalFindingInput
): Promise<{ finding: EvalFinding; auditEvents: unknown[] }> {
  return reviewEvalConfirmation(confirmationId, 'approved', input)
}

export async function rejectEvalConfirmation(
  confirmationId: string,
  input: ReviewEvalFindingInput
): Promise<{ finding: EvalFinding; auditEvents: unknown[] }> {
  return reviewEvalConfirmation(confirmationId, 'rejected', input)
}

export async function listEvalRuns(filters: {
  targetType?: string
  targetId?: string
  taskId?: string
  agentRunId?: string
  toolCallId?: string
  memoryEntryId?: string
  knowledgeItemId?: string
  a2aMessageId?: string
} = {}): Promise<EvalRunBundle[]> {
  const rows = await prisma.$queryRaw<RawEvalRun[]>`
    SELECT er.* FROM eval_runs er
    JOIN eval_targets et ON et.id = er.evalTargetId
    WHERE (${filters.targetType ?? null} IS NULL OR er.targetType = ${filters.targetType ?? null})
      AND (${filters.targetId ?? null} IS NULL OR er.targetId = ${filters.targetId ?? null})
      AND (${filters.taskId ?? null} IS NULL OR et.taskId = ${filters.taskId ?? null})
      AND (${filters.agentRunId ?? null} IS NULL OR et.agentRunId = ${filters.agentRunId ?? null})
      AND (${filters.toolCallId ?? null} IS NULL OR et.toolCallId = ${filters.toolCallId ?? null})
      AND (${filters.memoryEntryId ?? null} IS NULL OR et.memoryEntryId = ${filters.memoryEntryId ?? null})
      AND (${filters.knowledgeItemId ?? null} IS NULL OR et.knowledgeItemId = ${filters.knowledgeItemId ?? null})
      AND (${filters.a2aMessageId ?? null} IS NULL OR et.a2aMessageId = ${filters.a2aMessageId ?? null})
    ORDER BY er.createdAt DESC
  `
  return Promise.all(rows.map((row) => buildEvalRunBundle(serializeEvalRun(row))))
}

export async function getEvalTarget(id: string): Promise<EvalTarget | null> {
  const rows = await prisma.$queryRaw<RawEvalTarget[]>`
    SELECT * FROM eval_targets WHERE id = ${id} LIMIT 1
  `
  return rows[0] ? serializeEvalTarget(rows[0]) : null
}

export async function getEvalRun(id: string): Promise<EvalRun | null> {
  const rows = await prisma.$queryRaw<RawEvalRun[]>`
    SELECT * FROM eval_runs WHERE id = ${id} LIMIT 1
  `
  return rows[0] ? serializeEvalRun(rows[0]) : null
}

export async function getEvalRunBundle(id: string): Promise<EvalRunBundle | null> {
  const run = await getEvalRun(id)
  return run ? buildEvalRunBundle(run) : null
}

export async function listEvalChecks(evalRunId: string): Promise<EvalCheck[]> {
  const rows = await prisma.$queryRaw<RawEvalCheck[]>`
    SELECT * FROM eval_checks WHERE evalRunId = ${evalRunId} ORDER BY createdAt ASC
  `
  return rows.map(serializeEvalCheck)
}

export async function listEvalFindings(evalRunId: string): Promise<EvalFinding[]> {
  const rows = await prisma.$queryRaw<RawEvalFinding[]>`
    SELECT * FROM eval_findings WHERE evalRunId = ${evalRunId} ORDER BY createdAt ASC
  `
  return rows.map(serializeEvalFinding)
}

async function reviewEvalConfirmation(
  confirmationId: string,
  status: 'approved' | 'rejected',
  input: ReviewEvalFindingInput
): Promise<{ finding: EvalFinding; auditEvents: unknown[] }> {
  const finding = await findFindingByConfirmationId(confirmationId)
  if (!finding) throw new EvalRepositoryError('EvalFinding not found for confirmation.', 404)
  const target = await getEvalTarget(finding.evalTargetId)
  const nextStatus = status === 'approved' ? 'reviewed' : 'dismissed'
  const auditEvents: unknown[] = []
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE harmony_confirmation_artifacts
      SET status = ${status}, approvedBy = ${status === 'approved' ? input.reviewedBy ?? 'kelvin' : null},
          approvedAt = ${status === 'approved' ? new Date() : null},
          decisionReason = ${input.decisionReason}, updatedAt = ${new Date()}
      WHERE id = ${confirmationId}
    `
    await tx.$executeRaw`
      UPDATE eval_findings
      SET status = ${nextStatus}, reviewedBy = ${input.reviewedBy ?? 'kelvin'},
          reviewedAt = ${new Date()}, reviewDecision = ${status === 'approved' ? 'accepted' : 'dismissed'},
          reviewReason = ${input.decisionReason}, updatedAt = ${new Date()}
      WHERE id = ${finding.id}
    `
    const auditEvent = await tx.harmonyAuditEvent.create({
      data: {
        correlationId: target?.correlationId,
        taskId: target?.taskId,
        eventType: status === 'approved' ? 'eval.confirmation_approved' : 'eval.confirmation_rejected',
        actorType: 'kelvin',
        actorId: input.reviewedBy ?? 'kelvin',
        beforeStatus: finding.status,
        afterStatus: nextStatus,
        reason: `${input.decisionReason} Eval review changed only local EvalFinding state.`,
        payloadJson: encodeJson({
          evalFindingId: finding.id,
          evalRunId: finding.evalRunId,
          confirmationArtifactId: confirmationId,
        }),
      },
    })
    auditEvents.push(auditEvent)
  })
  const updated = await getEvalFinding(finding.id)
  if (!updated) throw new EvalRepositoryError('EvalFinding not found after confirmation.', 500)
  return { finding: updated, auditEvents }
}

async function buildTargetSnapshot(
  targetType: EvalTargetType,
  targetId: string
): Promise<Record<string, unknown>> {
  const table = tableForTarget(targetType)
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM ${table} WHERE id = ? LIMIT 1`,
    targetId
  )
  const row = rows[0]
  if (!row) throw new EvalRepositoryError(`${targetType} target not found.`, 404)
  return sanitizeRow(targetType, row)
}

function tableForTarget(targetType: EvalTargetType): string {
  const tables: Record<EvalTargetType, string> = {
    route_decision: 'harmony_tasks',
    harmony_task: 'harmony_tasks',
    agent_run: 'agent_runs',
    agent_result: 'agent_runs',
    memory_entry: 'memory_entries',
    knowledge_item: 'knowledge_items',
    context_packet: 'context_packets',
    a2a_message: 'a2a_messages',
    tool_call: 'tool_calls',
    tool_permission: 'tool_permissions',
    collaboration_session: 'collaboration_sessions',
    a2a_thread: 'a2a_threads',
    a2a_turn: 'a2a_turns',
    handoff_request: 'handoff_requests',
    collaboration_decision: 'collaboration_decisions',
  }
  return tables[targetType]
}

function sanitizeRow(targetType: EvalTargetType, row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { targetType }
  for (const [key, value] of Object.entries(row)) {
    if (/secret|token|password|apiKey|env/i.test(key)) continue
    if (value instanceof Date) {
      out[key] = value.toISOString()
    } else if (key.endsWith('Json') && typeof value === 'string') {
      out[key.replace(/Json$/, '')] = safeJson(value, null)
    } else if (typeof value === 'string' && value.length > 1000) {
      out[key] = `${value.slice(0, 1000)}...`
    } else {
      out[key] = value
    }
  }
  if (targetType === 'agent_result') {
    out.status = stringFrom(out.status) ?? 'completed'
    out.agentResultId = stringFrom(out.id)
    out.sideEffects = objectFrom(out.result)?.sideEffects
  }
  if (targetType === 'route_decision') {
    out.routeDecisionId = stringFrom(out.id)
    out.status = stringFrom(out.routeStatus) ?? stringFrom(out.status)
  }
  return out
}

function summarizeChecks(checks: { status: string }[]) {
  return {
    total: checks.length,
    passed: checks.filter((check) => check.status === 'passed').length,
    warned: checks.filter((check) => check.status === 'warned').length,
    failed: checks.filter((check) => check.status === 'failed').length,
    blocked: checks.filter((check) => check.status === 'blocked').length,
  }
}

async function buildEvalRunBundle(run: EvalRun): Promise<EvalRunBundle> {
  const evalTarget = await getEvalTarget(run.evalTargetId)
  if (!evalTarget) throw new EvalRepositoryError('EvalTarget not found for EvalRun.', 500)
  return {
    evalRun: run,
    evalTarget,
    checks: await listEvalChecks(run.id),
    findings: await listEvalFindings(run.id),
  }
}

async function findEvalTargetByIdempotencyKey(idempotencyKey: string) {
  const rows = await prisma.$queryRaw<RawEvalTarget[]>`
    SELECT * FROM eval_targets WHERE idempotencyKey = ${idempotencyKey} LIMIT 1
  `
  return rows[0] ? serializeEvalTarget(rows[0]) : null
}

async function findEvalRunByIdempotencyKey(idempotencyKey: string) {
  const rows = await prisma.$queryRaw<RawEvalRun[]>`
    SELECT * FROM eval_runs WHERE idempotencyKey = ${idempotencyKey} LIMIT 1
  `
  return rows[0] ? serializeEvalRun(rows[0]) : null
}

async function getEvalFinding(id: string): Promise<EvalFinding | null> {
  const rows = await prisma.$queryRaw<RawEvalFinding[]>`
    SELECT * FROM eval_findings WHERE id = ${id} LIMIT 1
  `
  return rows[0] ? serializeEvalFinding(rows[0]) : null
}

async function findFindingByConfirmationId(confirmationArtifactId: string) {
  const rows = await prisma.$queryRaw<RawEvalFinding[]>`
    SELECT * FROM eval_findings WHERE confirmationArtifactId = ${confirmationArtifactId} LIMIT 1
  `
  return rows[0] ? serializeEvalFinding(rows[0]) : null
}

function safeJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function objectFrom(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function stringFrom(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined
}
