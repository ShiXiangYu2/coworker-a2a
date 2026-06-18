import { decodeJson } from '@/lib/harmony/serializers'
import type { AgentRun, AgentStep } from './types'

function dateToString(value: Date | null | undefined): string | undefined {
  return value ? value.toISOString() : undefined
}

export function serializeAgentRun(record: {
  id: string
  correlationId: string | null
  taskId: string
  taskRunId: string | null
  taskStepId: string | null
  contextPacketId?: string | null
  agentId: string
  status: string
  trigger: string
  runtimeMode: string
  attempt: number
  idempotencyKey: string | null
  inputSnapshotJson: string
  resultJson: string | null
  errorJson: string | null
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}): AgentRun {
  return {
    id: record.id,
    correlationId: record.correlationId ?? undefined,
    taskId: record.taskId,
    taskRunId: record.taskRunId ?? undefined,
    taskStepId: record.taskStepId ?? undefined,
    contextPacketId: record.contextPacketId ?? undefined,
    agentId: record.agentId as AgentRun['agentId'],
    status: record.status as AgentRun['status'],
    trigger: record.trigger as AgentRun['trigger'],
    runtimeMode: record.runtimeMode as AgentRun['runtimeMode'],
    attempt: record.attempt,
    idempotencyKey: record.idempotencyKey ?? undefined,
    inputSnapshot: decodeJson(record.inputSnapshotJson, null),
    result: decodeJson(record.resultJson, undefined),
    error: decodeJson(record.errorJson, undefined),
    startedAt: dateToString(record.startedAt),
    completedAt: dateToString(record.completedAt),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export function serializeAgentStep(record: {
  id: string
  agentRunId: string
  taskId: string
  agentId: string
  index: number
  kind: string
  status: string
  summary: string
  inputJson: string | null
  outputJson: string | null
  createdAt: Date
  updatedAt: Date
}): AgentStep {
  return {
    id: record.id,
    agentRunId: record.agentRunId,
    taskId: record.taskId,
    agentId: record.agentId as AgentStep['agentId'],
    index: record.index,
    kind: record.kind as AgentStep['kind'],
    status: record.status as AgentStep['status'],
    summary: record.summary,
    input: decodeJson(record.inputJson, undefined),
    output: decodeJson(record.outputJson, undefined),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}
