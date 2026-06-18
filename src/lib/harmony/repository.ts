import { prisma } from '@/lib/prisma'
import { transitionHarmonyTask } from './state-machine'
import { createRouteToTaskDraft } from './route-to-task'
import {
  encodeJson,
  serializeAuditEvent,
  serializeConfirmation,
  serializeTask,
  serializeTaskRun,
  serializeTaskStep,
} from './serializers'
import type {
  CreateTaskFromRouteInput,
  HarmonyTaskBundle,
  HarmonyTaskStatus,
} from './types'

const taskBundleInclude = {
  runs: { orderBy: { createdAt: 'asc' as const } },
  steps: { orderBy: { index: 'asc' as const } },
  auditEvents: { orderBy: { createdAt: 'asc' as const } },
  confirmations: { orderBy: { createdAt: 'asc' as const } },
}

export class HarmonyRepositoryError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message)
    this.name = 'HarmonyRepositoryError'
  }
}

export async function createTaskFromRoute(
  input: CreateTaskFromRouteInput
): Promise<HarmonyTaskBundle> {
  const draft = createRouteToTaskDraft(input)
  if (!draft.task || !draft.taskRun) return draft

  if (input.idempotencyKey) {
    const existing = await prisma.harmonyTask.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: taskBundleInclude,
    })
    if (existing) return serializeBundle(existing)
  }

  const created = await prisma.$transaction(async (tx) => {
    const task = await tx.harmonyTask.create({
      data: {
        idempotencyKey: draft.task!.idempotencyKey,
        conversationId: draft.task!.conversationId,
        sourceMessageId: draft.task!.sourceMessageId,
        sourceMessageText: draft.task!.sourceMessageText,
        title: draft.task!.title,
        description: draft.task!.description,
        type: draft.task!.type,
        status: draft.task!.status,
        routeDecisionType: draft.task!.routeDecisionType,
        routeStatus: draft.task!.routeStatus,
        targetAgentId: draft.task!.targetAgentId,
        confidence: draft.task!.confidence,
        reason: draft.task!.reason,
        statusReason: draft.task!.statusReason,
        matchedSignalsJson: encodeJson(draft.task!.matchedSignals),
        routeDecisionSnapshotJson: encodeJson(draft.task!.routeDecisionSnapshot),
        requiresHumanConfirmation: draft.task!.requiresHumanConfirmation,
        sideEffectsJson: encodeJson(draft.task!.sideEffects),
        createdBy: draft.task!.createdBy,
      },
    })

    const run = await tx.harmonyTaskRun.create({
      data: {
        taskId: task.id,
        status: draft.taskRun!.status,
        trigger: draft.taskRun!.trigger,
        attempt: draft.taskRun!.attempt,
        runtimeKind: draft.taskRun!.runtimeKind,
      },
    })

    const stepsByDraftId = new Map<string, string>()
    for (const step of draft.steps) {
      const createdStep = await tx.harmonyTaskStep.create({
        data: {
          taskId: task.id,
          taskRunId: run.id,
          index: step.index,
          kind: step.kind,
          status: step.status,
          agentId: step.agentId,
          summary: step.summary,
          inputJson: encodeJson(step.input),
          outputJson: step.output === undefined ? null : encodeJson(step.output),
          confidence: step.confidence,
          nextRecommendedAction: step.nextRecommendedAction,
          sideEffectsJson: encodeJson(step.sideEffects),
        },
      })
      stepsByDraftId.set(step.id, createdStep.id)
    }

    let confirmationId: string | undefined
    if (draft.confirmationArtifact) {
      const confirmation = await tx.harmonyConfirmationArtifact.create({
        data: {
          taskId: task.id,
          status: draft.confirmationArtifact.status,
          action: draft.confirmationArtifact.action,
          reason: draft.confirmationArtifact.reason,
          requiresHumanOwner: draft.confirmationArtifact.requiresHumanOwner,
          mustReviewJson: encodeJson(draft.confirmationArtifact.mustReview),
          forbiddenRuntimeActionsJson: encodeJson(
            draft.confirmationArtifact.forbiddenRuntimeActions
          ),
          payloadJson: encodeJson(draft.confirmationArtifact.payload),
        },
      })
      confirmationId = confirmation.id
    }

    for (const event of draft.auditEvents) {
      await tx.harmonyAuditEvent.create({
        data: {
          taskId: task.id,
          taskRunId: event.taskRunId ? run.id : null,
          taskStepId: event.taskStepId ? stepsByDraftId.get(event.taskStepId) : null,
          eventType: event.eventType,
          actorType: event.actorType,
          actorId: event.actorId,
          beforeStatus: event.beforeStatus,
          afterStatus: event.afterStatus,
          reason: event.reason,
          payloadJson: encodeJson({
            ...(typeof event.payload === 'object' && event.payload ? event.payload : {}),
            confirmationArtifactId:
              event.eventType === 'task.confirmation_required'
                ? confirmationId
                : undefined,
          }),
        },
      })
    }

    return tx.harmonyTask.findUniqueOrThrow({
      where: { id: task.id },
      include: taskBundleInclude,
    })
  })

  return serializeBundle(created)
}

export async function listTasks(filters: {
  conversationId?: string
  status?: string
  agentId?: string
}): Promise<HarmonyTaskBundle[]> {
  const tasks = await prisma.harmonyTask.findMany({
    where: {
      conversationId: filters.conversationId,
      status: filters.status,
      targetAgentId: filters.agentId,
    },
    orderBy: { createdAt: 'desc' },
    include: taskBundleInclude,
  })

  return tasks.map(serializeBundle)
}

export async function getTaskBundle(id: string): Promise<HarmonyTaskBundle | null> {
  const task = await prisma.harmonyTask.findUnique({
    where: { id },
    include: taskBundleInclude,
  })

  return task ? serializeBundle(task) : null
}

export async function cancelTask(id: string): Promise<HarmonyTaskBundle> {
  return updateTaskStatus({
    id,
    event: 'CANCEL',
    auditEventType: 'task.cancelled',
    reason: 'Task cancelled by user. Sprint 3 performs no execution.',
    actorType: 'user',
  })
}

export async function approveConfirmation(
  id: string,
  input: { approvedBy?: string; decisionReason?: string }
): Promise<HarmonyTaskBundle> {
  const confirmation = await prisma.harmonyConfirmationArtifact.findUnique({
    where: { id },
    include: { task: true },
  })

  if (!confirmation) throw new HarmonyRepositoryError('Confirmation not found.', 404)
  if (confirmation.status !== 'pending') {
    throw new HarmonyRepositoryError('Confirmation is not pending.')
  }

  const nextStatus = transitionHarmonyTask(
    confirmation.task.status as HarmonyTaskStatus,
    'APPROVE_CONFIRMATION'
  )

  const updated = await prisma.$transaction(async (tx) => {
    await tx.harmonyConfirmationArtifact.update({
      where: { id },
      data: {
        status: 'approved',
        approvedBy: input.approvedBy ?? 'kelvin',
        approvedAt: new Date(),
        decisionReason: input.decisionReason,
      },
    })

    await tx.harmonyTask.update({
      where: { id: confirmation.taskId },
      data: {
        status: nextStatus,
        statusReason:
          'Confirmation approved. Task is queued only; no agents, tools, or side effects executed.',
      },
    })

    await tx.harmonyAuditEvent.create({
      data: {
        taskId: confirmation.taskId,
        eventType: 'task.confirmation_approved',
        actorType: 'user',
        actorId: input.approvedBy ?? 'kelvin',
        beforeStatus: confirmation.task.status,
        afterStatus: nextStatus,
        reason:
          input.decisionReason ??
          'Kelvin approved queueing only. Sprint 3 does not execute side effects.',
        payloadJson: encodeJson({ confirmationArtifactId: id }),
      },
    })

    await tx.harmonyAuditEvent.create({
      data: {
        taskId: confirmation.taskId,
        eventType: 'task.status_changed',
        actorType: 'system',
        beforeStatus: confirmation.task.status,
        afterStatus: nextStatus,
        reason: 'Approved confirmation moved the task to queued only.',
        payloadJson: encodeJson({ event: 'APPROVE_CONFIRMATION' }),
      },
    })

    return tx.harmonyTask.findUniqueOrThrow({
      where: { id: confirmation.taskId },
      include: taskBundleInclude,
    })
  })

  return serializeBundle(updated)
}

export async function rejectConfirmation(
  id: string,
  input: { rejectedBy?: string; decisionReason?: string }
): Promise<HarmonyTaskBundle> {
  const confirmation = await prisma.harmonyConfirmationArtifact.findUnique({
    where: { id },
    include: { task: true },
  })

  if (!confirmation) throw new HarmonyRepositoryError('Confirmation not found.', 404)
  if (confirmation.status !== 'pending') {
    throw new HarmonyRepositoryError('Confirmation is not pending.')
  }

  const nextStatus = transitionHarmonyTask(
    confirmation.task.status as HarmonyTaskStatus,
    'REJECT_CONFIRMATION'
  )

  const updated = await prisma.$transaction(async (tx) => {
    await tx.harmonyConfirmationArtifact.update({
      where: { id },
      data: {
        status: 'rejected',
        decisionReason: input.decisionReason,
      },
    })

    await tx.harmonyTask.update({
      where: { id: confirmation.taskId },
      data: {
        status: nextStatus,
        statusReason: 'Confirmation rejected. Task is blocked.',
      },
    })

    await tx.harmonyAuditEvent.create({
      data: {
        taskId: confirmation.taskId,
        eventType: 'task.confirmation_rejected',
        actorType: 'user',
        actorId: input.rejectedBy ?? 'kelvin',
        beforeStatus: confirmation.task.status,
        afterStatus: nextStatus,
        reason: input.decisionReason ?? 'Kelvin rejected this confirmation.',
        payloadJson: encodeJson({ confirmationArtifactId: id }),
      },
    })

    await tx.harmonyAuditEvent.create({
      data: {
        taskId: confirmation.taskId,
        eventType: 'task.status_changed',
        actorType: 'system',
        beforeStatus: confirmation.task.status,
        afterStatus: nextStatus,
        reason: 'Rejected confirmation blocked the task.',
        payloadJson: encodeJson({ event: 'REJECT_CONFIRMATION' }),
      },
    })

    return tx.harmonyTask.findUniqueOrThrow({
      where: { id: confirmation.taskId },
      include: taskBundleInclude,
    })
  })

  return serializeBundle(updated)
}

async function updateTaskStatus(input: {
  id: string
  event: 'CANCEL'
  auditEventType: 'task.cancelled'
  reason: string
  actorType: 'user' | 'system'
}): Promise<HarmonyTaskBundle> {
  const task = await prisma.harmonyTask.findUnique({ where: { id: input.id } })
  if (!task) throw new HarmonyRepositoryError('Task not found.', 404)

  const nextStatus = transitionHarmonyTask(
    task.status as HarmonyTaskStatus,
    input.event
  )

  const updated = await prisma.$transaction(async (tx) => {
    await tx.harmonyTask.update({
      where: { id: task.id },
      data: { status: nextStatus, statusReason: input.reason },
    })

    await tx.harmonyAuditEvent.create({
      data: {
        taskId: task.id,
        eventType: input.auditEventType,
        actorType: input.actorType,
        beforeStatus: task.status,
        afterStatus: nextStatus,
        reason: input.reason,
        payloadJson: encodeJson({ event: input.event }),
      },
    })

    await tx.harmonyAuditEvent.create({
      data: {
        taskId: task.id,
        eventType: 'task.status_changed',
        actorType: 'system',
        beforeStatus: task.status,
        afterStatus: nextStatus,
        reason: input.reason,
        payloadJson: encodeJson({ event: input.event }),
      },
    })

    return tx.harmonyTask.findUniqueOrThrow({
      where: { id: task.id },
      include: taskBundleInclude,
    })
  })

  return serializeBundle(updated)
}

function serializeBundle(record: {
  runs: Parameters<typeof serializeTaskRun>[0][]
  steps: Parameters<typeof serializeTaskStep>[0][]
  auditEvents: Parameters<typeof serializeAuditEvent>[0][]
  confirmations: Parameters<typeof serializeConfirmation>[0][]
} & Parameters<typeof serializeTask>[0]): HarmonyTaskBundle {
  return {
    task: serializeTask(record),
    taskRun: record.runs[0] ? serializeTaskRun(record.runs[0]) : undefined,
    steps: record.steps.map(serializeTaskStep),
    auditEvents: record.auditEvents.map(serializeAuditEvent),
    confirmationArtifact: record.confirmations[0]
      ? serializeConfirmation(record.confirmations[0])
      : undefined,
  }
}
