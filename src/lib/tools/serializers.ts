import { decodeJson } from '@/lib/harmony/serializers'
import type {
  ToolCall,
  ToolExecutionPlan,
  ToolExecutionReceipt,
  ToolPermission,
  ToolRun,
} from './types'

function dateToString(value: Date | null | undefined): string | undefined {
  return value ? value.toISOString() : undefined
}

export function serializeToolCall(record: {
  id: string
  idempotencyKey: string | null
  correlationId: string | null
  taskId: string | null
  agentRunId: string | null
  agentResultId: string | null
  source: string
  toolId: string
  toolName: string
  proposedByAgentId: string | null
  intent: string
  rationale: string
  inputJson: string
  inputSummary: string
  status: string
  riskLevel: string
  sideEffectsJson: string
  permissionDecisionId: string | null
  confirmationArtifactId: string | null
  sourceSnapshotJson: string | null
  policyInputSnapshotJson: string | null
  createdAt: Date
  updatedAt: Date
}): ToolCall {
  return {
    id: record.id,
    idempotencyKey: record.idempotencyKey ?? undefined,
    correlationId: record.correlationId ?? undefined,
    taskId: record.taskId ?? undefined,
    agentRunId: record.agentRunId ?? undefined,
    agentResultId: record.agentResultId ?? undefined,
    source: record.source as ToolCall['source'],
    toolId: record.toolId,
    toolName: record.toolName,
    proposedByAgentId: record.proposedByAgentId as ToolCall['proposedByAgentId'],
    intent: record.intent,
    rationale: record.rationale,
    input: decodeJson(record.inputJson, null),
    inputSummary: record.inputSummary,
    status: record.status as ToolCall['status'],
    riskLevel: record.riskLevel as ToolCall['riskLevel'],
    sideEffects: decodeJson(record.sideEffectsJson, [] as string[]),
    permissionDecisionId: record.permissionDecisionId ?? undefined,
    confirmationArtifactId: record.confirmationArtifactId ?? undefined,
    sourceSnapshot: decodeJson(record.sourceSnapshotJson, undefined),
    policyInputSnapshot: decodeJson(record.policyInputSnapshotJson, undefined),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export function serializeToolPermission(record: {
  id: string
  toolCallId: string
  toolId: string
  decision: string
  reason: string
  evaluatedBy: string
  policyRef: string
  permissionProfileRef: string
  riskLevel: string
  inputValidationStatus: string
  schemaValidationErrorsJson: string
  matchedRulesJson: string
  deniedRulesJson: string
  createdAt: Date
}): ToolPermission {
  return {
    id: record.id,
    toolCallId: record.toolCallId,
    toolId: record.toolId,
    decision: record.decision as ToolPermission['decision'],
    reason: record.reason,
    evaluatedBy: 'policy',
    policyRef: record.policyRef,
    permissionProfileRef: record.permissionProfileRef,
    riskLevel: record.riskLevel as ToolPermission['riskLevel'],
    inputValidationStatus:
      record.inputValidationStatus as ToolPermission['inputValidationStatus'],
    schemaValidationErrors: decodeJson(record.schemaValidationErrorsJson, [] as string[]),
    matchedRules: decodeJson(record.matchedRulesJson, [] as string[]),
    deniedRules: decodeJson(record.deniedRulesJson, [] as string[]),
    createdAt: record.createdAt.toISOString(),
  }
}

export function serializeToolRun(record: {
  id: string
  idempotencyKey?: string | null
  toolCallId: string
  taskId: string | null
  agentRunId: string | null
  toolId: string
  status: string
  mode: string
  inputSnapshotJson: string
  resultJson: string | null
  executionPlanId?: string | null
  executionReceiptId?: string | null
  executorId?: string | null
  sandboxId?: string | null
  executionPolicyId?: string | null
  recoveryPointId?: string | null
  sideEffectClass?: string | null
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}): ToolRun {
  return {
    id: record.id,
    idempotencyKey: record.idempotencyKey ?? undefined,
    toolCallId: record.toolCallId,
    taskId: record.taskId ?? undefined,
    agentRunId: record.agentRunId ?? undefined,
    toolId: record.toolId,
    status: record.status as ToolRun['status'],
    mode: record.mode as ToolRun['mode'],
    inputSnapshot: decodeJson(record.inputSnapshotJson, null),
    result: decodeJson(record.resultJson, undefined),
    executionPlanId: record.executionPlanId ?? undefined,
    executionReceiptId: record.executionReceiptId ?? undefined,
    executorId: record.executorId ?? undefined,
    sandboxId: record.sandboxId ?? undefined,
    executionPolicyId: record.executionPolicyId ?? undefined,
    recoveryPointId: record.recoveryPointId ?? undefined,
    sideEffectClass: record.sideEffectClass as ToolRun['sideEffectClass'],
    startedAt: dateToString(record.startedAt),
    completedAt: dateToString(record.completedAt),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export function serializeToolExecutionPlan(record: {
  id: string
  toolRunId: string
  toolCallId: string
  taskId: string | null
  agentRunId: string | null
  toolId: string
  executorId: string
  sandboxId: string
  policyId: string
  status: string
  executionMode: string
  sideEffectClass: string
  expectedSideEffectsJson: string
  reversibility: string
  idempotencyKey: string
  inputSnapshotJson: string
  normalizedInputHash: string
  policyVersion: string
  executorVersion: string
  requiresKelvinConfirmation: boolean
  confirmationArtifactId: string | null
  recoveryPointId: string | null
  evalRunIdsJson: string | null
  regressionGateId: string | null
  releaseReadinessChecklistId: string | null
  sandboxProfileId: string | null
  allowedWriteRoot: string | null
  allowedExtensionsJson: string | null
  expectedOutputPath: string | null
  expiresAt: Date | null
  createdAt: Date
  updatedAt: Date
}): ToolExecutionPlan {
  return {
    id: record.id,
    toolRunId: record.toolRunId,
    toolCallId: record.toolCallId,
    taskId: record.taskId ?? undefined,
    agentRunId: record.agentRunId ?? undefined,
    toolId: record.toolId,
    executorId: record.executorId,
    sandboxId: record.sandboxId,
    policyId: record.policyId,
    status: record.status as ToolExecutionPlan['status'],
    executionMode: 'deterministic_local',
    sideEffectClass: record.sideEffectClass as ToolExecutionPlan['sideEffectClass'],
    expectedSideEffects: decodeJson(record.expectedSideEffectsJson, []),
    reversibility: record.reversibility as ToolExecutionPlan['reversibility'],
    idempotencyKey: record.idempotencyKey,
    inputSnapshot: decodeJson(record.inputSnapshotJson, null),
    normalizedInputHash: record.normalizedInputHash,
    policyVersion: record.policyVersion,
    executorVersion: record.executorVersion,
    requiresKelvinConfirmation: record.requiresKelvinConfirmation,
    confirmationArtifactId: record.confirmationArtifactId ?? undefined,
    recoveryPointId: record.recoveryPointId ?? undefined,
    evalRunIds: decodeJson(record.evalRunIdsJson, undefined),
    regressionGateId: record.regressionGateId ?? undefined,
    releaseReadinessChecklistId: record.releaseReadinessChecklistId ?? undefined,
    sandboxProfileId: record.sandboxProfileId ?? undefined,
    allowedWriteRoot: (record.allowedWriteRoot as 'deliverables' | null) ?? undefined,
    allowedExtensions: decodeJson(record.allowedExtensionsJson, undefined),
    expectedOutputPath: record.expectedOutputPath ?? undefined,
    expiresAt: dateToString(record.expiresAt),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export function serializeToolExecutionReceipt(record: {
  id: string
  toolRunId: string
  toolCallId: string
  taskId: string | null
  agentRunId: string | null
  toolId: string
  executorId: string
  executionPlanId: string
  status: string
  startedAt: Date
  completedAt: Date
  durationMs: number
  idempotencyKey: string
  inputHash: string
  outputHash: string | null
  policyVersion: string
  executorVersion: string
  resultSummary: string
  resultSnapshotJson: string | null
  sideEffectsJson: string
  sideEffectClass: string
  reversibility: string
  simulatedReadsJson: string | null
  sandboxExecutionRecordId: string | null
  outputPath: string | null
  bytesWritten: number | null
  auditEventIdsJson: string
  observabilityEventIdsJson: string
  recoveryPointId: string
  createdAt: Date
}): ToolExecutionReceipt {
  return {
    id: record.id,
    toolRunId: record.toolRunId,
    toolCallId: record.toolCallId,
    taskId: record.taskId ?? undefined,
    agentRunId: record.agentRunId ?? undefined,
    toolId: record.toolId,
    executorId: record.executorId,
    executionPlanId: record.executionPlanId,
    status: record.status as ToolExecutionReceipt['status'],
    startedAt: record.startedAt.toISOString(),
    completedAt: record.completedAt.toISOString(),
    durationMs: record.durationMs,
    idempotencyKey: record.idempotencyKey,
    inputHash: record.inputHash,
    outputHash: record.outputHash ?? undefined,
    policyVersion: record.policyVersion,
    executorVersion: record.executorVersion,
    resultSummary: record.resultSummary,
    resultSnapshot: decodeJson(record.resultSnapshotJson, undefined),
    sideEffects: decodeJson(record.sideEffectsJson, []),
    sideEffectClass: record.sideEffectClass as ToolExecutionReceipt['sideEffectClass'],
    reversibility: record.reversibility as ToolExecutionReceipt['reversibility'],
    simulatedReads: decodeJson(record.simulatedReadsJson, undefined),
    sandboxExecutionRecordId: record.sandboxExecutionRecordId ?? undefined,
    outputPath: record.outputPath ?? undefined,
    bytesWritten: record.bytesWritten ?? undefined,
    auditEventIds: decodeJson(record.auditEventIdsJson, []),
    observabilityEventIds: decodeJson(record.observabilityEventIdsJson, []),
    recoveryPointId: record.recoveryPointId,
    createdAt: record.createdAt.toISOString(),
  }
}
