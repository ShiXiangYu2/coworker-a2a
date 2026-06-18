import { randomUUID } from 'node:crypto'
import { getAgentById } from '@/lib/agents/registry'
import type { AgentId } from '@/lib/agents/types'
import { prisma } from '@/lib/prisma'
import { encodeJson } from '@/lib/harmony/serializers'
import { transitionHarmonyTask } from '@/lib/harmony/state-machine'
import { emptySideEffects, hasSideEffects, type HarmonyTask } from '@/lib/harmony/types'
import {
  defaultForbiddenRuntimeActions,
  defaultMustReview,
} from '@/lib/harmony/route-to-task'
import { transitionAgentRun } from './state-machine'
import { produceDeterministicAgentResult } from './producer'
import { produceLLMAgentResult } from './llm-producer'
import { validateAgentResult } from './validator'
import { serializeAgentRun, serializeAgentStep } from './serializers'
import type { AgentRunBundle, StartAgentRunInput } from './types'

type RawAgentRun = Parameters<typeof serializeAgentRun>[0]
type RawAgentStep = Parameters<typeof serializeAgentStep>[0]

export class AgentRuntimeRepositoryError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message)
    this.name = 'AgentRuntimeRepositoryError'
  }
}

export async function startAgentRunFromTask(
  input: StartAgentRunInput
): Promise<AgentRunBundle> {
  if (input.idempotencyKey) {
    const existing = await findRawAgentRunByIdempotencyKey(input.idempotencyKey)
    if (existing) return serializeAgentRunBundle(existing)
  }

  const task = await prisma.harmonyTask.findUnique({
    where: { id: input.taskId },
    include: {
      runs: { orderBy: { createdAt: 'asc' } },
      confirmations: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!task) throw new AgentRuntimeRepositoryError('Task not found.', 404)
  assertTaskEligible(task)

  const harmonyRun = task.runs[0]
  if (!harmonyRun) {
    throw new AgentRuntimeRepositoryError('Task has no Harmony planning run.')
  }

  const harmonyTask = recordToHarmonyTask(task)
  // Try LLM-driven analysis first, fall back to deterministic on error
  let usedLLM = false
  let rawResult: Awaited<ReturnType<typeof produceLLMAgentResult>>
  try {
    rawResult = await produceLLMAgentResult(harmonyTask)
    usedLLM = true
  } catch {
    rawResult = produceDeterministicAgentResult(harmonyTask)
  }
  let result = validateAgentResult(rawResult)
  if (result.findings.length === 0 && result.proposedChanges.length === 0) {
    result = produceDeterministicAgentResult(harmonyTask)
    usedLLM = false
  }
  const correlationId = `agent-${task.id}-${Date.now()}`
  const startedAt = new Date()
  const completedAt = new Date()
  const assignedStatus = transitionHarmonyTask('queued', 'ASSIGN_PLACEHOLDER')

  const createdId = await prisma.$transaction(async (tx) => {
    await tx.harmonyTask.update({
      where: { id: task.id },
      data: {
        status: assignedStatus,
        statusReason:
          'Assigned to analysis-only Agent Runtime. No tools or side effects executed.',
      },
    })

    const agentRunId = randomUUID()
    const agentRunStatus = transitionAgentRun(
      'running',
      result.needsHumanConfirmation ? 'REQUIRE_CONFIRMATION' : 'COMPLETE_WITH_RESULT'
    )

    await tx.$executeRaw`
      INSERT INTO agent_runs (
        id, correlationId, taskId, taskRunId, taskStepId, agentId, status,
        trigger, runtimeMode, attempt, idempotencyKey, inputSnapshotJson,
        resultJson, errorJson, startedAt, completedAt, createdAt, updatedAt
      ) VALUES (
        ${agentRunId}, ${correlationId}, ${task.id}, ${harmonyRun.id}, ${null},
        ${task.targetAgentId}, ${agentRunStatus}, ${input.trigger}, ${'analysis_only'},
        ${1}, ${input.idempotencyKey ?? null}, ${encodeJson(buildInputSnapshot(task))},
        ${encodeJson(result)}, ${null}, ${startedAt}, ${completedAt}, ${startedAt}, ${completedAt}
      )
    `

    await insertAgentStep(tx, {
      agentRunId,
      taskId: task.id,
      agentId: task.targetAgentId!,
      index: 0,
      kind: 'load_task_context',
      status: 'completed',
      summary: 'Loaded Harmony Task context for analysis-only Agent Runtime.',
      input: { taskId: task.id },
      output: { targetAgentId: task.targetAgentId },
    })
    await insertAgentStep(tx, {
      agentRunId,
      taskId: task.id,
      agentId: task.targetAgentId!,
      index: 1,
      kind: 'build_agent_prompt',
      status: 'completed',
      summary: 'Built analysis-only prompt boundary for deterministic AgentResult producer.',
      input: { targetAgentId: task.targetAgentId },
      output: { runtimeMode: 'analysis_only' },
    })
    await insertAgentStep(tx, {
      agentRunId,
      taskId: task.id,
      agentId: task.targetAgentId!,
      index: 2,
      kind: 'llm_analysis',
      status: 'completed',
      summary: usedLLM
        ? 'Produced AgentResult via LLM tool use.'
        : 'Produced deterministic AgentResult (LLM fallback).',
      input: { producer: usedLLM ? 'llm' : 'deterministic' },
      output: result,
    })
    await insertAgentStep(tx, {
      agentRunId,
      taskId: task.id,
      agentId: task.targetAgentId!,
      index: 3,
      kind: 'validate_agent_result',
      status: 'completed',
      summary: 'Validated AgentResult schema and empty sideEffects.',
      input: result,
      output: { valid: true },
    })

    const taskStep = await tx.harmonyTaskStep.create({
      data: {
        taskId: task.id,
        taskRunId: harmonyRun.id,
        index: await nextTaskStepIndex(task.id),
        kind: 'agent_runtime_analysis',
        status: result.needsHumanConfirmation ? 'blocked' : 'completed',
        agentId: task.targetAgentId,
        summary: result.summary,
        inputJson: encodeJson({ agentRunId, taskId: task.id }),
        outputJson: encodeJson(result),
        confidence: result.confidence,
        nextRecommendedAction: result.needsHumanConfirmation
          ? 'ask_human_confirmation'
          : 'show_task',
        sideEffectsJson: encodeJson(emptySideEffects),
      },
    })

    await insertAgentStep(tx, {
      agentRunId,
      taskId: task.id,
      agentId: task.targetAgentId!,
      index: 4,
      kind: 'write_task_step',
      status: 'completed',
      summary: 'Wrote Harmony TaskStep summary for AgentResult.',
      input: { agentRunId },
      output: { taskStepId: taskStep.id },
    })

    await tx.$executeRaw`
      UPDATE agent_runs
      SET taskStepId = ${taskStep.id}, updatedAt = ${new Date()}
      WHERE id = ${agentRunId}
    `

    await tx.harmonyAuditEvent.createMany({
      data: [
        {
          correlationId,
          taskId: task.id,
          eventType: 'task.status_changed',
          actorType: 'agent_placeholder',
          actorId: task.targetAgentId,
          beforeStatus: task.status,
          afterStatus: assignedStatus,
          reason: 'Task assigned to analysis-only Agent Runtime.',
          payloadJson: encodeJson({ event: 'ASSIGN_PLACEHOLDER', agentRunId }),
        },
        {
          correlationId,
          taskId: task.id,
          eventType: 'agent.run_created',
          actorType: 'agent_placeholder',
          actorId: task.targetAgentId,
          afterStatus: 'created',
          reason: 'AgentRun created for analysis-only runtime.',
          payloadJson: encodeJson({ agentRunId }),
        },
        {
          correlationId,
          taskId: task.id,
          eventType: 'agent.run_started',
          actorType: 'agent_placeholder',
          actorId: task.targetAgentId,
          beforeStatus: 'created',
          afterStatus: 'running',
          reason: usedLLM
            ? 'AgentRun started with LLM-driven analysis.'
            : 'AgentRun started deterministic analysis.',
          payloadJson: encodeJson({ agentRunId }),
        },
        {
          correlationId,
          taskId: task.id,
          taskStepId: taskStep.id,
          eventType: 'task.step_created',
          actorType: 'system',
          actorId: task.targetAgentId,
          reason: 'Agent analysis summary TaskStep created.',
          payloadJson: encodeJson({ agentRunId }),
        },
        {
          correlationId,
          taskId: task.id,
          taskStepId: taskStep.id,
          eventType: result.needsHumanConfirmation ? 'agent.run_blocked' : 'agent.run_completed',
          actorType: 'agent_placeholder',
          actorId: task.targetAgentId,
          beforeStatus: 'running',
          afterStatus: result.needsHumanConfirmation ? 'blocked' : 'completed',
          reason: result.needsHumanConfirmation
            ? 'AgentRun requires human confirmation.'
            : 'AgentRun completed analysis only. Task was not marked completed.',
          payloadJson: encodeJson({
            agentRunId,
            resultStatus: result.status,
            confidence: result.confidence,
          }),
        },
      ],
    })

    if (result.needsHumanConfirmation) {
      const pendingStatus = transitionHarmonyTask(
        assignedStatus,
        'REQUEST_CONFIRMATION_FROM_ANALYSIS'
      )
      const confirmation = await tx.harmonyConfirmationArtifact.create({
        data: {
          taskId: task.id,
          status: 'pending',
          action: 'future_tool_execution',
          reason: result.next.reason,
          requiresHumanOwner: true,
          mustReviewJson: encodeJson(defaultMustReview),
          forbiddenRuntimeActionsJson: encodeJson(defaultForbiddenRuntimeActions),
          payloadJson: encodeJson({ agentRunId, result }),
        },
      })

      await tx.harmonyTask.update({
        where: { id: task.id },
        data: {
          status: pendingStatus,
          requiresHumanConfirmation: true,
          statusReason:
            'Agent analysis requested human confirmation. No tools or side effects executed.',
        },
      })

      await tx.harmonyAuditEvent.create({
        data: {
          correlationId,
          taskId: task.id,
          taskStepId: taskStep.id,
          eventType: 'task.confirmation_required',
          actorType: 'agent_placeholder',
          actorId: task.targetAgentId,
          beforeStatus: assignedStatus,
          afterStatus: pendingStatus,
          reason: 'AgentResult requested human confirmation.',
          payloadJson: encodeJson({
            event: 'REQUEST_CONFIRMATION_FROM_ANALYSIS',
            agentRunId,
            confirmationArtifactId: confirmation.id,
          }),
        },
      })
    }

    return agentRunId
  })

  const created = await findRawAgentRunById(createdId)
  if (!created) throw new AgentRuntimeRepositoryError('AgentRun not found after create.', 500)
  return serializeAgentRunBundle(created)
}

export async function getAgentRun(id: string): Promise<AgentRunBundle | null> {
  const run = await findRawAgentRunById(id)
  return run ? serializeAgentRunBundle(run) : null
}

export async function listAgentRunsForTask(taskId: string): Promise<AgentRunBundle[]> {
  const runs = await findRawAgentRunsByTaskId(taskId)
  return runs.map(serializeAgentRunBundle)
}

export async function cancelAgentRun(id: string): Promise<AgentRunBundle> {
  const run = await findRawAgentRunById(id)
  if (!run) throw new AgentRuntimeRepositoryError('AgentRun not found.', 404)

  const nextStatus = transitionAgentRun(run.status as never, 'CANCEL')
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE agent_runs
      SET status = ${nextStatus}, updatedAt = ${new Date()}
      WHERE id = ${id}
    `
    await tx.harmonyAuditEvent.create({
      data: {
        correlationId: run.correlationId,
        taskId: run.taskId,
        eventType: 'agent.run_cancelled',
        actorType: 'user',
        actorId: run.agentId,
        beforeStatus: run.status,
        afterStatus: nextStatus,
        reason: 'AgentRun cancelled. No tools or side effects executed.',
        payloadJson: encodeJson({ agentRunId: run.id }),
      },
    })
  })

  const updated = await findRawAgentRunById(id)
  if (!updated) throw new AgentRuntimeRepositoryError('AgentRun not found after cancel.', 500)
  return serializeAgentRunBundle(updated)
}

function assertTaskEligible(task: {
  status: string
  targetAgentId: string | null
  routeDecisionType: string
  sideEffectsJson: string
  confirmations: { status: string }[]
}) {
  if (task.status !== 'queued') {
    throw new AgentRuntimeRepositoryError('Only queued tasks can start Agent analysis.')
  }
  if (!task.targetAgentId) {
    throw new AgentRuntimeRepositoryError('Task targetAgentId is required.')
  }
  if (task.targetAgentId === 'kelvin') {
    throw new AgentRuntimeRepositoryError('Kelvin is reserved for human confirmation.')
  }
  if (!getAgentById(task.targetAgentId as AgentId)) {
    throw new AgentRuntimeRepositoryError('Unknown target agent.')
  }
  if (task.routeDecisionType === 'chat_only' || task.routeDecisionType === 'unsupported') {
    throw new AgentRuntimeRepositoryError('Task routeDecisionType cannot start Agent analysis.')
  }
  const sideEffects = JSON.parse(task.sideEffectsJson) as Parameters<typeof hasSideEffects>[0]
  if (hasSideEffects(sideEffects)) {
    throw new AgentRuntimeRepositoryError('Task sideEffects must be empty.')
  }
  if (task.confirmations.some((confirmation) => confirmation.status === 'pending')) {
    throw new AgentRuntimeRepositoryError('Pending confirmation blocks Agent analysis.')
  }
}

async function nextTaskStepIndex(taskId: string): Promise<number> {
  const last = await prisma.harmonyTaskStep.findFirst({
    where: { taskId },
    orderBy: { index: 'desc' },
  })
  return last ? last.index + 1 : 0
}

function buildInputSnapshot(task: Parameters<typeof recordToHarmonyTask>[0]) {
  return {
    taskId: task.id,
    title: task.title,
    description: task.description,
    targetAgentId: task.targetAgentId,
    sourceMessageText: task.sourceMessageText,
    routeDecisionSnapshot: JSON.parse(task.routeDecisionSnapshotJson),
    status: task.status,
  }
}

function recordToHarmonyTask(task: {
  id: string
  idempotencyKey: string | null
  conversationId: string | null
  sourceMessageId: string | null
  sourceMessageText: string
  title: string
  description: string
  type: string
  status: string
  routeDecisionType: string
  routeStatus: string
  targetAgentId: string | null
  confidence: number
  reason: string
  statusReason: string | null
  matchedSignalsJson: string
  routeDecisionSnapshotJson: string
  requiresHumanConfirmation: boolean
  sideEffectsJson: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}): HarmonyTask {
  return {
    id: task.id,
    idempotencyKey: task.idempotencyKey ?? undefined,
    conversationId: task.conversationId ?? undefined,
    sourceMessageId: task.sourceMessageId ?? undefined,
    sourceMessageText: task.sourceMessageText,
    title: task.title,
    description: task.description,
    type: task.type as HarmonyTask['type'],
    status: task.status as HarmonyTask['status'],
    routeDecisionType: task.routeDecisionType as HarmonyTask['routeDecisionType'],
    routeStatus: task.routeStatus as HarmonyTask['routeStatus'],
    targetAgentId: task.targetAgentId as HarmonyTask['targetAgentId'],
    confidence: task.confidence,
    reason: task.reason,
    statusReason: task.statusReason ?? undefined,
    matchedSignals: JSON.parse(task.matchedSignalsJson),
    routeDecisionSnapshot: JSON.parse(task.routeDecisionSnapshotJson),
    requiresHumanConfirmation: task.requiresHumanConfirmation,
    sideEffects: JSON.parse(task.sideEffectsJson),
    createdBy: task.createdBy as HarmonyTask['createdBy'],
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  }
}

async function insertAgentStep(
  tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>,
  input: {
    agentRunId: string
    taskId: string
    agentId: string
    index: number
    kind: string
    status: string
    summary: string
    input?: unknown
    output?: unknown
  }
) {
  await tx.$executeRaw`
    INSERT INTO agent_steps (
      id, agentRunId, taskId, agentId, "index", kind, status, summary,
      inputJson, outputJson, createdAt, updatedAt
    ) VALUES (
      ${randomUUID()}, ${input.agentRunId}, ${input.taskId}, ${input.agentId},
      ${input.index}, ${input.kind}, ${input.status}, ${input.summary},
      ${input.input === undefined ? null : encodeJson(input.input)},
      ${input.output === undefined ? null : encodeJson(input.output)},
      ${new Date()}, ${new Date()}
    )
  `
}

async function findRawAgentRunById(id: string) {
  const runs = await prisma.$queryRaw<RawAgentRun[]>`
    SELECT * FROM agent_runs WHERE id = ${id} LIMIT 1
  `
  if (!runs[0]) return null

  return {
    ...runs[0],
    steps: await findRawAgentSteps(runs[0].id),
  }
}

async function findRawAgentRunByIdempotencyKey(idempotencyKey: string) {
  const runs = await prisma.$queryRaw<RawAgentRun[]>`
    SELECT * FROM agent_runs WHERE idempotencyKey = ${idempotencyKey} LIMIT 1
  `
  if (!runs[0]) return null

  return {
    ...runs[0],
    steps: await findRawAgentSteps(runs[0].id),
  }
}

async function findRawAgentRunsByTaskId(taskId: string) {
  const runs = await prisma.$queryRaw<RawAgentRun[]>`
    SELECT * FROM agent_runs WHERE taskId = ${taskId} ORDER BY createdAt DESC
  `

  return Promise.all(
    runs.map(async (run) => ({
      ...run,
      steps: await findRawAgentSteps(run.id),
    }))
  )
}

async function findRawAgentSteps(agentRunId: string) {
  return prisma.$queryRaw<RawAgentStep[]>`
    SELECT * FROM agent_steps WHERE agentRunId = ${agentRunId} ORDER BY "index" ASC
  `
}

function serializeAgentRunBundle(record: RawAgentRun & { steps: RawAgentStep[] }): AgentRunBundle {
  return {
    agentRun: serializeAgentRun(record),
    agentSteps: record.steps.map(serializeAgentStep),
  }
}
