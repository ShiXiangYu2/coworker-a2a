import { prisma } from '@/lib/prisma'
import { executeAgentTask, type SubTaskResult } from './task-executor'

export type RecordedSubTaskResult = SubTaskResult & {
  agentTaskRunRecordId: string
}

export interface ExecuteRecordedAgentTaskInput {
  correlationId: string
  orchestrator: string
  agentId: string
  taskId: string
  taskType: string
  taskDescription: string
  previousResults?: SubTaskResult[]
  input?: unknown
}

export async function executeRecordedAgentTask(
  input: ExecuteRecordedAgentTaskInput
): Promise<RecordedSubTaskResult> {
  const startedAt = new Date()
  const record = await prisma.agentTaskRunRecord.create({
    data: {
      correlationId: input.correlationId,
      orchestrator: input.orchestrator,
      agentId: input.agentId,
      taskId: input.taskId,
      taskType: input.taskType,
      status: 'started',
      inputJson: JSON.stringify({
        taskDescription: input.taskDescription,
        previousResults: input.previousResults ?? [],
        input: input.input ?? null,
      }),
      outputJson: null,
      errorJson: null,
      startedAt,
      completedAt: null,
    },
  })

  await writeAgentTaskAuditEvent({
    correlationId: input.correlationId,
    eventType: 'agent_task.started',
    actorId: input.agentId,
    afterStatus: 'started',
    reason: 'ChatHub agent task execution started.',
    payload: {
      agentTaskRunRecordId: record.id,
      taskId: input.taskId,
      taskType: input.taskType,
    },
  })

  try {
    const result = await executeAgentTask(
      input.agentId,
      input.taskDescription,
      input.previousResults
    )
    const completedAt = new Date()
    const status = result.status === 'completed' ? 'completed' : 'failed'
    const errorJson = status === 'failed'
      ? JSON.stringify({
          message: result.error ?? result.summary,
          status: result.status,
        })
      : null

    await prisma.agentTaskRunRecord.update({
      where: { id: record.id },
      data: {
        status,
        outputJson: JSON.stringify(result),
        errorJson,
        completedAt,
      },
    })

    await writeAgentTaskAuditEvent({
      correlationId: input.correlationId,
      eventType: status === 'completed' ? 'agent_task.completed' : 'agent_task.failed',
      actorId: input.agentId,
      beforeStatus: 'started',
      afterStatus: status,
      reason: status === 'completed'
        ? 'ChatHub agent task execution completed.'
        : 'ChatHub agent task execution failed.',
      payload: {
        agentTaskRunRecordId: record.id,
        taskId: input.taskId,
        taskType: input.taskType,
        status: result.status,
      },
    })

    return {
      ...result,
      agentTaskRunRecordId: record.id,
    }
  } catch (error) {
    const completedAt = new Date()
    const serializableError = toSerializableError(error)

    await prisma.agentTaskRunRecord.update({
      where: { id: record.id },
      data: {
        status: 'failed',
        outputJson: null,
        errorJson: JSON.stringify(serializableError),
        completedAt,
      },
    })

    await writeAgentTaskAuditEvent({
      correlationId: input.correlationId,
      eventType: 'agent_task.failed',
      actorId: input.agentId,
      beforeStatus: 'started',
      afterStatus: 'failed',
      reason: serializableError.message,
      payload: {
        agentTaskRunRecordId: record.id,
        taskId: input.taskId,
        taskType: input.taskType,
        error: serializableError,
      },
    })

    throw error
  }
}

async function writeAgentTaskAuditEvent(input: {
  correlationId: string
  eventType: 'agent_task.started' | 'agent_task.completed' | 'agent_task.failed'
  actorId: string
  beforeStatus?: string
  afterStatus: string
  reason: string
  payload: unknown
}) {
  await prisma.harmonyAuditEvent.create({
    data: {
      correlationId: input.correlationId,
      eventType: input.eventType,
      actorType: 'agent',
      actorId: input.actorId,
      beforeStatus: input.beforeStatus,
      afterStatus: input.afterStatus,
      reason: input.reason,
      payloadJson: JSON.stringify(input.payload),
    },
  })
}

function toSerializableError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    }
  }

  return {
    name: 'UnknownError',
    message: String(error),
  }
}
