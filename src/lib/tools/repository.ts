import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { encodeJson } from '@/lib/harmony/serializers'
import {
  createObservabilityEvent,
  createRecoveryPoint,
  getRecoveryPoint,
} from '@/lib/observability/repository'
import {
  defaultForbiddenRuntimeActions,
  defaultMustReview,
} from '@/lib/harmony/route-to-task'
import type { AgentResult } from '@/lib/agent-runtime/types'
import { commandPolicy, findToolByIdOrName, toolRegistry } from './registry'
import {
  assertDeterministicOutput,
  executeDeterministicLocalTool,
  executeSandboxFileWriteTool,
  getPolicyForToolCategory,
  getToolExecutionPolicy,
  getToolExecutor,
  getToolSandbox,
  listToolExecutors,
  listToolSandboxes,
  stableHash,
  ToolExecutionGuardError,
  validateExecutionPolicy,
  validateExecutionPreconditions,
  validateToolResult,
  validateToolSandbox,
} from './execution'
import { evaluateToolPermission } from './policy'
import { mapAgentResultToToolCallDrafts } from './rules'
import {
  serializeToolCall,
  serializeToolExecutionPlan,
  serializeToolExecutionReceipt,
  serializeToolPermission,
  serializeToolRun,
} from './serializers'
import { transitionToolCall, transitionToolRun } from './state-machine'
import type {
  CreateToolCallsFromAgentResultInput,
  ReviewToolCallInput,
  ToolCall,
  ToolCallBundle,
  ToolExecutionPlan,
  ToolExecutionPolicy,
  ToolExecutionReceipt,
  ToolPermission,
  ToolRun,
} from './types'

type RawToolCall = Parameters<typeof serializeToolCall>[0]
type RawToolPermission = Parameters<typeof serializeToolPermission>[0]
type RawToolRun = Parameters<typeof serializeToolRun>[0]
type RawToolExecutionPlan = Parameters<typeof serializeToolExecutionPlan>[0]
type RawToolExecutionReceipt = Parameters<typeof serializeToolExecutionReceipt>[0]

export class ToolRepositoryError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message)
    this.name = 'ToolRepositoryError'
  }
}

function normalizeToolError(error: unknown): never {
  if (error instanceof ToolExecutionGuardError) {
    throw new ToolRepositoryError(error.message, error.status)
  }
  throw error
}

export function listTools() {
  return toolRegistry.tools
}

export function getTool(idOrName: string) {
  return findToolByIdOrName(idOrName) ?? null
}

export function getCommandPolicy() {
  return commandPolicy
}

export function readToolExecutionPolicy(): ToolExecutionPolicy {
  return getToolExecutionPolicy()
}

export function readToolExecutors() {
  return listToolExecutors()
}

export function readToolExecutor(id: string) {
  return getToolExecutor(id)
}

export function readToolSandboxes() {
  return listToolSandboxes()
}

export function readToolSandbox(id: string) {
  return getToolSandbox(id)
}

export async function createToolCallsFromAgentResult(
  input: CreateToolCallsFromAgentResultInput
): Promise<{ toolCalls: ToolCallBundle[]; auditEvents: unknown[] }> {
  const run = await findRawAgentRun(input.agentRunId)
  if (!run) throw new ToolRepositoryError('AgentRun not found.', 404)
  const result = (input.agentResult as AgentResult | undefined) ??
    safeJson<AgentResult | undefined>(run.resultJson, undefined)
  if (!result) throw new ToolRepositoryError('AgentRun has no AgentResult.')

  const drafts = mapAgentResultToToolCallDrafts({
    agentResult: result,
    agentRunId: run.id,
    taskId: run.taskId,
    agentId: run.agentId as never,
    idempotencyKey: input.idempotencyKey,
  })

  if (drafts.length === 0) return { toolCalls: [], auditEvents: [] }

  const ids: string[] = []
  const auditEvents: unknown[] = []
  await prisma.$transaction(async (tx) => {
    for (const draft of drafts) {
      if (draft.idempotencyKey) {
        const existing = await findToolCallByIdempotencyKey(draft.idempotencyKey)
        if (existing) {
          ids.push(existing.id)
          continue
        }
      }

      const id = randomUUID()
      ids.push(id)
      await tx.$executeRaw`
        INSERT INTO tool_calls (
          id, idempotencyKey, correlationId, taskId, agentRunId, agentResultId, source,
          toolId, toolName, proposedByAgentId, intent, rationale, inputJson, inputSummary,
          status, riskLevel, sideEffectsJson, permissionDecisionId, confirmationArtifactId,
          sourceSnapshotJson, policyInputSnapshotJson, createdAt, updatedAt
        ) VALUES (
          ${id}, ${draft.idempotencyKey ?? null}, ${draft.correlationId ?? null},
          ${draft.taskId ?? null}, ${draft.agentRunId ?? null}, ${draft.agentResultId ?? null},
          ${draft.source}, ${draft.toolId}, ${draft.toolName}, ${draft.proposedByAgentId ?? null},
          ${draft.intent}, ${draft.rationale}, ${encodeJson(draft.input)}, ${draft.inputSummary},
          ${draft.status}, ${draft.riskLevel}, ${encodeJson(draft.sideEffects)},
          ${null}, ${null}, ${encodeJson(draft.sourceSnapshot)},
          ${encodeJson(draft.policyInputSnapshot)}, ${new Date()}, ${new Date()}
        )
      `
      const auditEvent = await tx.harmonyAuditEvent.create({
        data: {
          correlationId: draft.correlationId,
          taskId: draft.taskId,
          eventType: 'tool.call_proposed',
          actorType: 'agent_runtime',
          actorId: draft.proposedByAgentId,
          afterStatus: 'proposed',
          reason: 'ToolCall proposal created from AgentResult. No tool was executed.',
          payloadJson: encodeJson({ toolCallId: id, toolId: draft.toolId }),
        },
      })
      auditEvents.push(auditEvent)
    }
  })

  const bundles = await Promise.all(ids.map((id) => getToolCallBundle(id)))
  return { toolCalls: bundles.filter(Boolean) as ToolCallBundle[], auditEvents }
}

export async function listToolCalls(filters: {
  taskId?: string
  agentRunId?: string
  status?: string
} = {}): Promise<ToolCallBundle[]> {
  const rows = await prisma.$queryRaw<RawToolCall[]>`
    SELECT * FROM tool_calls
    WHERE (${filters.taskId ?? null} IS NULL OR taskId = ${filters.taskId ?? null})
      AND (${filters.agentRunId ?? null} IS NULL OR agentRunId = ${filters.agentRunId ?? null})
      AND (${filters.status ?? null} IS NULL OR status = ${filters.status ?? null})
    ORDER BY createdAt DESC
  `
  return Promise.all(rows.map((row) => buildToolCallBundle(serializeToolCall(row))))
}

export async function getToolCallBundle(id: string): Promise<ToolCallBundle | null> {
  const call = await getToolCall(id)
  return call ? buildToolCallBundle(call) : null
}

export async function getLatestPermission(toolCallId: string): Promise<ToolPermission | null> {
  const rows = await prisma.$queryRaw<RawToolPermission[]>`
    SELECT * FROM tool_permissions WHERE toolCallId = ${toolCallId}
    ORDER BY createdAt DESC LIMIT 1
  `
  return rows[0] ? serializeToolPermission(rows[0]) : null
}

export async function evaluatePermissionForToolCall(
  id: string
): Promise<{ toolCall: ToolCall; latestPermission: ToolPermission; auditEvents: unknown[] }> {
  const call = await getToolCall(id)
  if (!call) throw new ToolRepositoryError('ToolCall not found.', 404)

  const existing = await getLatestPermission(id)
  if (existing) return { toolCall: call, latestPermission: existing, auditEvents: [] }

  const permission = evaluateToolPermission(call)
  const permissionId = randomUUID()
  const nextStatus = statusForPermission(call.status, permission.decision)
  const eventType =
    nextStatus === 'pending_confirmation'
      ? 'tool.confirmation_required'
      : nextStatus === 'permission_denied'
        ? 'tool.permission_denied'
        : nextStatus === 'blocked'
          ? 'tool.blocked'
          : 'tool.permission_evaluated'
  const auditEvents: unknown[] = []

  await prisma.$transaction(async (tx) => {
    let confirmationArtifactId: string | null = null
    if (nextStatus === 'pending_confirmation') {
      const confirmation = await tx.harmonyConfirmationArtifact.create({
        data: {
          taskId: call.taskId ?? '',
          status: 'pending',
          action: 'approve_tool_call_record',
          reason: permission.reason,
          requiresHumanOwner: true,
          mustReviewJson: encodeJson(defaultMustReview),
          forbiddenRuntimeActionsJson: encodeJson([
            ...defaultForbiddenRuntimeActions,
            'invoke-mcp-tool',
            'automate-browser',
          ]),
          payloadJson: encodeJson({
            resourceType: 'tool_call',
            resourceId: call.id,
            toolCallId: call.id,
            toolId: permission.toolId,
            permissionDecisionId: permissionId,
          }),
        },
      })
      confirmationArtifactId = confirmation.id
    }

    await tx.$executeRaw`
      INSERT INTO tool_permissions (
        id, toolCallId, toolId, decision, reason, evaluatedBy, policyRef,
        permissionProfileRef, riskLevel, inputValidationStatus,
        schemaValidationErrorsJson, matchedRulesJson, deniedRulesJson, createdAt
      ) VALUES (
        ${permissionId}, ${call.id}, ${permission.toolId}, ${permission.decision},
        ${permission.reason}, ${permission.evaluatedBy}, ${permission.policyRef},
        ${permission.permissionProfileRef}, ${permission.riskLevel},
        ${permission.inputValidationStatus}, ${encodeJson(permission.schemaValidationErrors ?? [])},
        ${encodeJson(permission.matchedRules)}, ${encodeJson(permission.deniedRules)}, ${new Date()}
      )
    `
    await tx.$executeRaw`
      UPDATE tool_calls
      SET status = ${nextStatus}, permissionDecisionId = ${permissionId},
          confirmationArtifactId = ${confirmationArtifactId}, updatedAt = ${new Date()}
      WHERE id = ${call.id}
    `
    const auditEvent = await tx.harmonyAuditEvent.create({
      data: {
        correlationId: call.correlationId,
        taskId: call.taskId,
        eventType,
        actorType: 'system',
        beforeStatus: call.status,
        afterStatus: nextStatus,
        reason: permission.reason,
        payloadJson: encodeJson({
          toolCallId: call.id,
          toolId: permission.toolId,
          permissionDecisionId: permissionId,
          matchedRules: permission.matchedRules,
          deniedRules: permission.deniedRules,
        }),
      },
    })
    auditEvents.push(auditEvent)
  })

  const updated = await getToolCall(id)
  const latest = await getLatestPermission(id)
  if (!updated || !latest) throw new ToolRepositoryError('ToolPermission not found after create.', 500)
  return { toolCall: updated, latestPermission: latest, auditEvents }
}

export async function cancelToolCall(id: string): Promise<{ toolCall: ToolCall; auditEvents: unknown[] }> {
  const call = await getToolCall(id)
  if (!call) throw new ToolRepositoryError('ToolCall not found.', 404)
  const nextStatus = transitionToolCall(call.status, 'CANCEL_TOOL_CALL')
  const auditEvents = await updateToolCallStatus(call, nextStatus, 'tool.cancelled', 'ToolCall cancelled. No tool was executed.')
  const updated = await getToolCall(id)
  if (!updated) throw new ToolRepositoryError('ToolCall not found after cancel.', 500)
  return { toolCall: updated, auditEvents }
}

export async function approveToolConfirmation(
  confirmationId: string,
  input: ReviewToolCallInput
): Promise<{ toolCall: ToolCall; auditEvents: unknown[] }> {
  const call = await findToolCallByConfirmationId(confirmationId)
  if (!call) throw new ToolRepositoryError('ToolCall not found for confirmation.', 404)
  const nextStatus = transitionToolCall(call.status, 'APPROVE_RECORD')
  await updateConfirmation(confirmationId, 'approved', input)
  const auditEvents = await updateToolCallStatus(
    call,
    nextStatus,
    'tool.approved_record',
    `${input.decisionReason} Approval created a local record only. No tool was executed.`
  )
  const updated = await getToolCall(call.id)
  if (!updated) throw new ToolRepositoryError('ToolCall not found after approval.', 500)
  return { toolCall: updated, auditEvents }
}

export async function rejectToolConfirmation(
  confirmationId: string,
  input: ReviewToolCallInput
): Promise<{ toolCall: ToolCall; auditEvents: unknown[] }> {
  const call = await findToolCallByConfirmationId(confirmationId)
  if (!call) throw new ToolRepositoryError('ToolCall not found for confirmation.', 404)
  const nextStatus = transitionToolCall(call.status, 'REJECT_TOOL_CALL')
  await updateConfirmation(confirmationId, 'rejected', input)
  const auditEvents = await updateToolCallStatus(call, nextStatus, 'tool.rejected', input.decisionReason)
  const updated = await getToolCall(call.id)
  if (!updated) throw new ToolRepositoryError('ToolCall not found after rejection.', 500)
  return { toolCall: updated, auditEvents }
}

export async function getToolRun(id: string): Promise<ToolRun | null> {
  const rows = await prisma.$queryRaw<RawToolRun[]>`
    SELECT * FROM tool_runs WHERE id = ${id} LIMIT 1
  `
  return rows[0] ? serializeToolRun(rows[0]) : null
}

export async function createControlledToolRunFromToolCall(
  toolCallId: string,
  input: { idempotencyKey?: string } = {}
): Promise<{ toolRun: ToolRun; auditEvents: unknown[] }> {
  const call = await getToolCall(toolCallId)
  if (!call) throw new ToolRepositoryError('ToolCall not found.', 404)
  const tool = findToolByIdOrName(call.toolId) ?? findToolByIdOrName(call.toolName)
  if (!tool) throw new ToolRepositoryError('Unknown tool cannot create controlled ToolRun.')
  if (tool.sprint11ExecutionMode !== 'controlled_deterministic_local') {
    throw new ToolRepositoryError('Tool is not executable under Sprint 11 controlled runtime.')
  }
  if (!isControlledExecutableCategory(tool.category)) {
    throw new ToolRepositoryError('Tool category is not executable under controlled runtime.')
  }
  const idempotencyKey = input.idempotencyKey ?? `controlled-tool-run:${toolCallId}`
  const existing = await findToolRunByIdempotencyKey(idempotencyKey)
  if (existing) return { toolRun: existing, auditEvents: [] }

  const id = randomUUID()
  const auditEvents: unknown[] = []
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO tool_runs (
        id, idempotencyKey, toolCallId, taskId, agentRunId, toolId, status, mode,
        inputSnapshotJson, resultJson, executionPlanId, executionReceiptId,
        executorId, sandboxId, executionPolicyId, recoveryPointId, sideEffectClass,
        startedAt, completedAt, createdAt, updatedAt
      ) VALUES (
        ${id}, ${idempotencyKey}, ${call.id}, ${call.taskId ?? null},
        ${call.agentRunId ?? null}, ${tool.id}, ${'created'}, ${'controlled_execution'},
        ${encodeJson(call.input)}, ${null}, ${null}, ${null}, ${tool.executorId ?? null},
        ${tool.sandboxId ?? null}, ${tool.executionPolicyRef ?? null}, ${null},
        ${sideEffectClassForToolCategory(tool.category)},
        ${null}, ${null}, ${new Date()}, ${new Date()}
      )
    `
    const auditEvent = await tx.harmonyAuditEvent.create({
      data: {
        correlationId: call.correlationId,
        taskId: call.taskId,
        eventType: 'tool.run_created',
        actorType: 'system',
        afterStatus: 'created',
        reason: 'Controlled ToolRun record created. No tool was executed.',
        payloadJson: encodeJson({
          toolCallId: call.id,
          toolRunId: id,
          mode: 'controlled_execution',
        }),
      },
    })
    auditEvents.push(auditEvent)
  })
  const toolRun = await getToolRun(id)
  if (!toolRun) throw new ToolRepositoryError('ToolRun not found after create.', 500)
  return { toolRun, auditEvents }
}

export async function requestToolRunPermission(
  id: string
): Promise<{ toolRun: ToolRun; latestPermission: ToolPermission; auditEvents: unknown[] }> {
  const toolRun = await requireToolRun(id)
  const call = await requireToolCall(toolRun.toolCallId)
  if (toolRun.mode !== 'controlled_execution') {
    throw new ToolRepositoryError('Legacy ToolRun cannot request Sprint 11 execution permission.')
  }
  const nextStatus = transitionToolRun(toolRun.status, 'REQUEST_PERMISSION')
  const permission = await getOrCreateControlledPermission(call)
  if (permission.decision !== 'allow_controlled_execution') {
    throw new ToolRepositoryError(`${permission.decision} cannot execute.`)
  }
  const auditEvents = await updateToolRunStatus(
    toolRun,
    nextStatus,
    'tool.execution_permission_requested',
    'Controlled ToolRun permission requested. No tool was executed.'
  )
  const updated = await requireToolRun(id)
  return { toolRun: updated, latestPermission: permission, auditEvents }
}

export async function planToolExecution(
  id: string
): Promise<{ toolRun: ToolRun; executionPlan: ToolExecutionPlan; recoveryPointId: string; auditEvents: unknown[]; observabilityEvents: unknown[] }> {
  let toolRun = await requireToolRun(id)
  const call = await requireToolCall(toolRun.toolCallId)
  const tool = findToolByIdOrName(toolRun.toolId)
  if (!tool) throw new ToolRepositoryError('ToolDefinition not found.', 404)
  const executor = getToolExecutor(tool.executorId ?? '')
  if (!executor) throw new ToolRepositoryError('ToolExecutor not found.', 404)
  const sandbox = getToolSandbox(tool.sandboxId ?? '')
  if (!sandbox) throw new ToolRepositoryError('ToolSandbox not found.', 404)

  try {
    const policy = getPolicyForToolCategory(tool.category)
    validateExecutionPolicy(policy, tool, executor)
    validateToolSandbox(sandbox)
  } catch (error) {
    normalizeToolError(error)
  }

  if (toolRun.status === 'created') {
    await requestToolRunPermission(toolRun.id)
    toolRun = await requireToolRun(toolRun.id)
  }
  if (toolRun.status !== 'awaiting_permission' && toolRun.status !== 'awaiting_confirmation') {
    throw new ToolRepositoryError('ToolRun must be awaiting permission or confirmation to plan execution.')
  }

  const existing = await getExecutionPlanForToolRun(toolRun.id)
  if (existing) {
    return {
      toolRun,
      executionPlan: existing,
      recoveryPointId: existing.recoveryPointId ?? '',
      auditEvents: [],
      observabilityEvents: [],
    }
  }

  const permission = await getLatestPermission(call.id)
  if (permission?.decision !== 'allow_controlled_execution') {
    throw new ToolRepositoryError(`${permission?.decision ?? 'missing_permission'} cannot execute.`)
  }
  const policy = getPolicyForToolCategory(tool.category)
  const isSandboxWrite = tool.category === 'write_sandbox'
  const sandboxPlan = isSandboxWrite ? sandboxPlanMetadata(call.input) : null
  const nextStatus = transitionToolRun(toolRun.status, 'REQUIRE_EXECUTION_CONFIRMATION')
  const recovery = await createRecoveryPoint({
    correlationId: call.correlationId,
    resourceType: 'tool_run',
    resourceId: toolRun.id,
    reason: 'before_tool_execution',
    snapshot: {
      ...toolRun,
      toolCall: {
        id: call.id,
        status: call.status,
        toolId: call.toolId,
        riskLevel: call.riskLevel,
      },
    },
    resourceStatusAtSnapshot: toolRun.status,
    createdBy: 'system',
  })
  const idempotencyKey = toolRun.idempotencyKey ?? `execution-plan:${toolRun.id}`
  const planId = randomUUID()
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
  const confirmation = await prisma.harmonyConfirmationArtifact.create({
    data: {
      taskId: call.taskId ?? '',
      status: 'pending',
      action: 'approve_tool_run_execution',
      reason: 'Kelvin approval is required before executing one controlled local ToolRun.',
      requiresHumanOwner: true,
      mustReviewJson: encodeJson([
        'one specific ToolRun',
        'ToolExecutionPlan',
        'RecoveryPoint before_tool_execution',
        'ToolSandbox denies forbidden capabilities',
      ]),
      forbiddenRuntimeActionsJson: encodeJson([
        ...defaultForbiddenRuntimeActions,
        'run-shell-command',
        'read-real-file',
        'invoke-mcp-tool',
        'automate-browser',
        'auto-approve-future-toolruns',
      ]),
      payloadJson: encodeJson({
        resourceType: 'tool_run',
        resourceId: toolRun.id,
        toolRunId: toolRun.id,
        toolExecutionPlanId: planId,
        action: 'approve_tool_run_execution',
      }),
    },
  })

  const auditEvents: unknown[] = []
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO tool_execution_plans (
        id, toolRunId, toolCallId, taskId, agentRunId, toolId, executorId,
        sandboxId, policyId, status, executionMode, sideEffectClass,
        expectedSideEffectsJson, reversibility, idempotencyKey, inputSnapshotJson,
        normalizedInputHash, policyVersion, executorVersion, requiresKelvinConfirmation,
        confirmationArtifactId, recoveryPointId, evalRunIdsJson, regressionGateId,
        releaseReadinessChecklistId, sandboxProfileId, allowedWriteRoot,
        allowedExtensionsJson, expectedOutputPath, expiresAt, createdAt, updatedAt
      ) VALUES (
        ${planId}, ${toolRun.id}, ${call.id}, ${call.taskId ?? null}, ${call.agentRunId ?? null},
        ${tool.id}, ${executor.id}, ${sandbox.id}, ${policy.id},
        ${'ready_for_confirmation'}, ${'deterministic_local'}, ${executor.sideEffectClass},
        ${encodeJson(isSandboxWrite ? ['sandbox_file_write'] : [])}, ${executor.sideEffectClass === 'simulated_read' ? 'inspect_only' : 'not_required'},
        ${idempotencyKey}, ${encodeJson(call.input)}, ${stableHash(call.input)},
        ${policy.policyVersion}, ${executor.executorVersion}, ${true},
        ${confirmation.id}, ${recovery.recoveryPoint.id}, ${encodeJson([])}, ${null},
        ${null}, ${sandboxPlan?.sandboxProfileId ?? null}, ${sandboxPlan?.allowedWriteRoot ?? null},
        ${sandboxPlan ? encodeJson(sandboxPlan.allowedExtensions) : null},
        ${sandboxPlan?.expectedOutputPath ?? null}, ${expiresAt}, ${new Date()}, ${new Date()}
      )
    `
    await tx.$executeRaw`
      UPDATE tool_runs
      SET status = ${nextStatus}, executionPlanId = ${planId}, executorId = ${executor.id},
          sandboxId = ${sandbox.id}, executionPolicyId = ${policy.id},
          recoveryPointId = ${recovery.recoveryPoint.id}, updatedAt = ${new Date()}
      WHERE id = ${toolRun.id}
    `
    const auditEvent = await tx.harmonyAuditEvent.create({
      data: {
        correlationId: call.correlationId,
        taskId: call.taskId,
        eventType: 'tool.execution_plan_created',
        actorType: 'system',
        beforeStatus: toolRun.status,
        afterStatus: nextStatus,
        reason: 'ToolExecutionPlan created with RecoveryPoint. No tool was executed.',
        payloadJson: encodeJson({
          toolRunId: toolRun.id,
          toolExecutionPlanId: planId,
          recoveryPointId: recovery.recoveryPoint.id,
          confirmationArtifactId: confirmation.id,
        }),
      },
    })
    auditEvents.push(auditEvent)
  })
  const observability = await createObservabilityEvent({
    correlationId: call.correlationId,
    resourceType: 'tool_run',
    resourceId: toolRun.id,
    eventType: 'tool.execution_plan_created',
    message: 'ToolExecutionPlan created for controlled local execution. No tool was executed.',
    source: 'repository',
    attributes: { toolExecutionPlanId: planId, recoveryPointId: recovery.recoveryPoint.id },
  })
  const executionPlan = await requireExecutionPlan(planId)
  const updated = await requireToolRun(toolRun.id)
  return {
    toolRun: updated,
    executionPlan,
    recoveryPointId: recovery.recoveryPoint.id,
    auditEvents,
    observabilityEvents: [...recovery.observabilityEvents, observability],
  }
}

export async function planToolExecutionFromToolRunOrCall(
  id: string
): Promise<{ toolRun: ToolRun; executionPlan: ToolExecutionPlan; recoveryPointId: string; auditEvents: unknown[]; observabilityEvents: unknown[] }> {
  const existingRun = await getToolRun(id)
  if (existingRun) return planToolExecution(existingRun.id)
  const created = await createControlledToolRunFromToolCall(id)
  const planned = await planToolExecution(created.toolRun.id)
  return {
    ...planned,
    auditEvents: [...created.auditEvents, ...planned.auditEvents],
  }
}

export async function submitToolExecutionConfirmation(
  planId: string,
  input: ReviewToolCallInput
): Promise<{ executionPlan: ToolExecutionPlan; auditEvents: unknown[] }> {
  const plan = await requireExecutionPlan(planId)
  if (!plan.confirmationArtifactId) throw new ToolRepositoryError('ConfirmationArtifact not found.', 404)
  await updateConfirmation(plan.confirmationArtifactId, 'approved', input)
  const auditEvents = await updateExecutionPlanStatus(
    plan,
    'ready_for_confirmation',
    'tool.execution_approved',
    `${input.decisionReason} Confirmation approved one ToolRun record only. No tool was executed.`
  )
  const updated = await requireExecutionPlan(planId)
  return { executionPlan: updated, auditEvents }
}

export async function rejectToolExecutionPlan(
  planId: string,
  input: ReviewToolCallInput
): Promise<{ executionPlan: ToolExecutionPlan; toolRun: ToolRun; auditEvents: unknown[] }> {
  const plan = await requireExecutionPlan(planId)
  if (plan.confirmationArtifactId) await updateConfirmation(plan.confirmationArtifactId, 'rejected', input)
  const auditEvents = await updateExecutionPlanStatus(plan, 'rejected', 'tool.execution_rejected', input.decisionReason)
  const toolRun = await requireToolRun(plan.toolRunId)
  const nextStatus = transitionToolRun(toolRun.status, 'REJECT_EXECUTION')
  await updateToolRunStatus(toolRun, nextStatus, 'tool.execution_rejected', input.decisionReason)
  const updatedPlan = await requireExecutionPlan(planId)
  const updatedRun = await requireToolRun(plan.toolRunId)
  return { executionPlan: updatedPlan, toolRun: updatedRun, auditEvents }
}

export async function approveToolRunExecution(
  id: string
): Promise<{ toolRun: ToolRun; executionPlan: ToolExecutionPlan; auditEvents: unknown[] }> {
  const toolRun = await requireToolRun(id)
  const plan = await requireExecutionPlan(toolRun.executionPlanId ?? '')
  const permission = await getLatestPermission(toolRun.toolCallId)
  const confirmation = plan.confirmationArtifactId
    ? await prisma.harmonyConfirmationArtifact.findUnique({ where: { id: plan.confirmationArtifactId } })
    : null
  const recoveryPoint = plan.recoveryPointId ? await getRecoveryPoint(plan.recoveryPointId) : null
  const planForApproval = { ...plan, status: 'approved_record' as const }
  try {
    validateExecutionPreconditions({
      toolRun: { ...toolRun, status: 'approved_for_execution' },
      plan: planForApproval,
      permission,
      recoveryPoint,
      confirmationArtifact: confirmation ? { id: confirmation.id, status: confirmation.status } : null,
    })
  } catch (error) {
    normalizeToolError(error)
  }
  const nextStatus = transitionToolRun(toolRun.status, 'APPROVE_FOR_EXECUTION')
  const auditEvents: unknown[] = []
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE tool_execution_plans
      SET status = ${'approved_record'}, updatedAt = ${new Date()}
      WHERE id = ${plan.id}
    `
    await tx.$executeRaw`
      UPDATE tool_runs
      SET status = ${nextStatus}, updatedAt = ${new Date()}
      WHERE id = ${toolRun.id}
    `
    const auditEvent = await tx.harmonyAuditEvent.create({
      data: {
        correlationId: (await requireToolCall(toolRun.toolCallId)).correlationId,
        taskId: toolRun.taskId,
        eventType: 'tool.execution_approved',
        actorType: 'kelvin',
        actorId: 'kelvin',
        beforeStatus: toolRun.status,
        afterStatus: nextStatus,
        reason: 'ToolRun approved for one controlled local execution. No tool was executed.',
        payloadJson: encodeJson({ toolRunId: toolRun.id, toolExecutionPlanId: plan.id }),
      },
    })
    auditEvents.push(auditEvent)
  })
  const updated = await requireToolRun(id)
  const updatedPlan = await requireExecutionPlan(plan.id)
  return { toolRun: updated, executionPlan: updatedPlan, auditEvents }
}

export async function cancelToolExecution(
  id: string
): Promise<{ toolRun: ToolRun; auditEvents: unknown[] }> {
  const toolRun = await requireToolRun(id)
  const nextStatus =
    toolRun.status === 'executing'
      ? transitionToolRun(toolRun.status, 'CANCEL_EXECUTION')
      : 'cancelled'
  const auditEvents = await updateToolRunStatus(
    toolRun,
    nextStatus,
    'tool.execution_cancelled',
    'Tool execution cancelled. No retry, replay, rollback, or resume execution was started.'
  )
  const updated = await requireToolRun(id)
  return { toolRun: updated, auditEvents }
}

export async function executeApprovedToolRun(
  id: string
): Promise<{ toolRun: ToolRun; executionReceipt: ToolExecutionReceipt; auditEvents: unknown[]; observabilityEvents: unknown[] }> {
  const toolRun = await requireToolRun(id)
  const call = await requireToolCall(toolRun.toolCallId)
  const plan = await requireExecutionPlan(toolRun.executionPlanId ?? '')
  const tool = findToolByIdOrName(toolRun.toolId)
  if (!tool) throw new ToolRepositoryError('ToolDefinition not found.', 404)
  const executor = getToolExecutor(plan.executorId)
  if (!executor) throw new ToolRepositoryError('ToolExecutor not found.', 404)
  const sandbox = getToolSandbox(plan.sandboxId)
  if (!sandbox) throw new ToolRepositoryError('ToolSandbox not found.', 404)
  const permission = await getLatestPermission(call.id)
  const confirmation = plan.confirmationArtifactId
    ? await prisma.harmonyConfirmationArtifact.findUnique({ where: { id: plan.confirmationArtifactId } })
    : null
  const recoveryPoint = plan.recoveryPointId ? await getRecoveryPoint(plan.recoveryPointId) : null

  try {
    const policy = getPolicyForToolCategory(tool.category)
    validateExecutionPolicy(policy, tool, executor)
    validateToolSandbox(sandbox)
    validateExecutionPreconditions({
      toolRun,
      plan,
      permission,
      recoveryPoint,
      confirmationArtifact: confirmation ? { id: confirmation.id, status: confirmation.status } : null,
    })
  } catch (error) {
    normalizeToolError(error)
  }

  const startedAt = new Date()
  const isSandboxWrite = executor.toolCategory === 'write_sandbox'
  await updateToolRunStatus(
    toolRun,
    transitionToolRun(toolRun.status, 'START_APPROVED_EXECUTION'),
    'tool.execution_started',
    isSandboxWrite
      ? 'execute-approved started one human-gated sandbox file write ToolRun.'
      : 'execute-approved started one deterministic local ToolRun.'
  )
  const first = isSandboxWrite
    ? await executeSandboxFileWriteTool({ toolRun, toolCall: call, plan })
    : executeDeterministicLocalTool({ toolRun, toolCall: call, plan, executor })
  try {
    if (!isSandboxWrite) {
      const second = executeDeterministicLocalTool({ toolRun, toolCall: call, plan, executor })
      assertDeterministicOutput(first.resultSnapshot, second.resultSnapshot)
    }
    validateToolResult(first.result)
  } catch (error) {
    await updateToolRunStatus(await requireToolRun(id), 'failed', 'tool.execution_failed', error instanceof Error ? error.message : 'Tool execution failed.')
    normalizeToolError(error)
  }

  const completedAt = new Date()
  const receiptId = randomUUID()
  const auditEvents: unknown[] = []
  let observabilityId = ''
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO tool_execution_receipts (
        id, toolRunId, toolCallId, taskId, agentRunId, toolId, executorId,
        executionPlanId, status, startedAt, completedAt, durationMs, idempotencyKey,
        inputHash, outputHash, policyVersion, executorVersion, resultSummary,
        resultSnapshotJson, sideEffectsJson, sideEffectClass, reversibility,
        simulatedReadsJson, sandboxExecutionRecordId, outputPath, bytesWritten,
        auditEventIdsJson, observabilityEventIdsJson,
        recoveryPointId, createdAt
      ) VALUES (
        ${receiptId}, ${toolRun.id}, ${call.id}, ${call.taskId ?? null}, ${call.agentRunId ?? null},
        ${tool.id}, ${executor.id}, ${plan.id}, ${'succeeded'}, ${startedAt}, ${completedAt},
        ${completedAt.getTime() - startedAt.getTime()}, ${plan.idempotencyKey},
        ${plan.normalizedInputHash}, ${stableHash(first.resultSnapshot)},
        ${plan.policyVersion}, ${plan.executorVersion}, ${first.result.summary},
        ${encodeJson(first.resultSnapshot)}, ${encodeJson([])}, ${plan.sideEffectClass},
        ${plan.reversibility}, ${encodeJson(first.simulatedReads)}, ${null},
        ${readOutputPath(first.resultSnapshot)}, ${readBytesWritten(first.resultSnapshot)},
        ${encodeJson([])},
        ${encodeJson([])}, ${plan.recoveryPointId}, ${new Date()}
      )
    `
    await tx.$executeRaw`
      UPDATE tool_runs
      SET status = ${'succeeded'}, resultJson = ${encodeJson(first.result)},
          executionReceiptId = ${receiptId}, completedAt = ${completedAt}, updatedAt = ${new Date()}
      WHERE id = ${toolRun.id}
    `
    const auditEvent = await tx.harmonyAuditEvent.create({
      data: {
        correlationId: call.correlationId,
        taskId: call.taskId,
        eventType: 'tool.execution_succeeded',
        actorType: 'user',
        beforeStatus: 'executing',
        afterStatus: 'succeeded',
        reason: isSandboxWrite
          ? 'Approved sandbox deliverable write executed inside deliverables/. No source, Git, external API, MCP, or deploy action occurred.'
          : 'Approved deterministic local ToolRun executed. No external side effects occurred.',
        payloadJson: encodeJson({
          toolRunId: toolRun.id,
          executionReceiptId: receiptId,
          sideEffects: isSandboxWrite ? ['sandbox_file_write'] : [],
          sideEffectClass: plan.sideEffectClass,
        }),
      },
    })
    auditEvents.push(auditEvent)
  })
  const observability = await createObservabilityEvent({
    correlationId: call.correlationId,
    resourceType: 'tool_run',
    resourceId: toolRun.id,
    eventType: 'tool.execution_succeeded',
    message: isSandboxWrite
      ? 'Approved sandbox deliverable write succeeded inside deliverables/.'
      : 'Approved deterministic local ToolRun succeeded with empty sideEffects.',
    source: 'repository',
    attributes: {
      executionReceiptId: receiptId,
      sideEffects: isSandboxWrite ? ['sandbox_file_write'] : [],
      outputPath: readOutputPath(first.resultSnapshot),
      bytesWritten: readBytesWritten(first.resultSnapshot),
    },
  })
  observabilityId = observability.id
  await prisma.$executeRaw`
    UPDATE tool_execution_receipts
    SET auditEventIdsJson = ${encodeJson(auditEvents.map((event) => (event as { id?: string }).id).filter(Boolean))},
        observabilityEventIdsJson = ${encodeJson([observabilityId])}
    WHERE id = ${receiptId}
  `
  const receipt = await requireExecutionReceipt(receiptId)
  const updated = await requireToolRun(id)
  return { toolRun: updated, executionReceipt: receipt, auditEvents, observabilityEvents: [observability] }
}

async function getToolCall(id: string): Promise<ToolCall | null> {
  const rows = await prisma.$queryRaw<RawToolCall[]>`
    SELECT * FROM tool_calls WHERE id = ${id} LIMIT 1
  `
  return rows[0] ? serializeToolCall(rows[0]) : null
}

export async function getToolExecutionPlan(id: string): Promise<ToolExecutionPlan | null> {
  const rows = await prisma.$queryRaw<RawToolExecutionPlan[]>`
    SELECT * FROM tool_execution_plans WHERE id = ${id} LIMIT 1
  `
  return rows[0] ? serializeToolExecutionPlan(rows[0]) : null
}

export async function getExecutionPlanForToolRun(toolRunId: string): Promise<ToolExecutionPlan | null> {
  const rows = await prisma.$queryRaw<RawToolExecutionPlan[]>`
    SELECT * FROM tool_execution_plans WHERE toolRunId = ${toolRunId}
    ORDER BY createdAt DESC LIMIT 1
  `
  return rows[0] ? serializeToolExecutionPlan(rows[0]) : null
}

export async function getExecutionReceiptForToolRun(toolRunId: string): Promise<ToolExecutionReceipt | null> {
  return getToolExecutionReceiptForRun(toolRunId)
}

export async function listToolExecutionPlans(filters: {
  toolCallId?: string
  toolRunId?: string
  taskId?: string
  agentRunId?: string
} = {}): Promise<ToolExecutionPlan[]> {
  const rows = await prisma.$queryRaw<RawToolExecutionPlan[]>`
    SELECT * FROM tool_execution_plans
    WHERE (${filters.toolCallId ?? null} IS NULL OR toolCallId = ${filters.toolCallId ?? null})
      AND (${filters.toolRunId ?? null} IS NULL OR toolRunId = ${filters.toolRunId ?? null})
      AND (${filters.taskId ?? null} IS NULL OR taskId = ${filters.taskId ?? null})
      AND (${filters.agentRunId ?? null} IS NULL OR agentRunId = ${filters.agentRunId ?? null})
    ORDER BY createdAt DESC
  `
  return rows.map(serializeToolExecutionPlan)
}

export async function getToolExecutionReceiptForRun(toolRunId: string): Promise<ToolExecutionReceipt | null> {
  const rows = await prisma.$queryRaw<RawToolExecutionReceipt[]>`
    SELECT * FROM tool_execution_receipts WHERE toolRunId = ${toolRunId}
    ORDER BY createdAt DESC LIMIT 1
  `
  return rows[0] ? serializeToolExecutionReceipt(rows[0]) : null
}

export async function listToolExecutionReceipts(filters: {
  toolCallId?: string
  toolRunId?: string
  taskId?: string
  agentRunId?: string
} = {}): Promise<ToolExecutionReceipt[]> {
  const rows = await prisma.$queryRaw<RawToolExecutionReceipt[]>`
    SELECT * FROM tool_execution_receipts
    WHERE (${filters.toolCallId ?? null} IS NULL OR toolCallId = ${filters.toolCallId ?? null})
      AND (${filters.toolRunId ?? null} IS NULL OR toolRunId = ${filters.toolRunId ?? null})
      AND (${filters.taskId ?? null} IS NULL OR taskId = ${filters.taskId ?? null})
      AND (${filters.agentRunId ?? null} IS NULL OR agentRunId = ${filters.agentRunId ?? null})
    ORDER BY createdAt DESC
  `
  return rows.map(serializeToolExecutionReceipt)
}

async function buildToolCallBundle(toolCall: ToolCall): Promise<ToolCallBundle> {
  const latestPermission = await getLatestPermission(toolCall.id)
  const runs = await prisma.$queryRaw<RawToolRun[]>`
    SELECT * FROM tool_runs WHERE toolCallId = ${toolCall.id} ORDER BY createdAt DESC
  `
  const executionPlans = await listToolExecutionPlans({ toolCallId: toolCall.id })
  const executionReceipts = await listToolExecutionReceipts({ toolCallId: toolCall.id })
  return {
    toolCall,
    latestPermission: latestPermission ?? undefined,
    toolRuns: runs.map(serializeToolRun),
    executionPlans,
    executionReceipts,
  }
}

async function findToolCallByIdempotencyKey(idempotencyKey: string) {
  const rows = await prisma.$queryRaw<RawToolCall[]>`
    SELECT * FROM tool_calls WHERE idempotencyKey = ${idempotencyKey} LIMIT 1
  `
  return rows[0] ? serializeToolCall(rows[0]) : null
}

async function findToolRunByIdempotencyKey(idempotencyKey: string): Promise<ToolRun | null> {
  const rows = await prisma.$queryRaw<RawToolRun[]>`
    SELECT * FROM tool_runs WHERE idempotencyKey = ${idempotencyKey} LIMIT 1
  `
  return rows[0] ? serializeToolRun(rows[0]) : null
}

async function requireToolRun(id: string): Promise<ToolRun> {
  const toolRun = await getToolRun(id)
  if (!toolRun) throw new ToolRepositoryError('ToolRun not found.', 404)
  return toolRun
}

async function requireToolCall(id: string): Promise<ToolCall> {
  const toolCall = await getToolCall(id)
  if (!toolCall) throw new ToolRepositoryError('ToolCall not found.', 404)
  return toolCall
}

async function requireExecutionPlan(id: string): Promise<ToolExecutionPlan> {
  if (!id) throw new ToolRepositoryError('ToolExecutionPlan not found.', 404)
  const plan = await getToolExecutionPlan(id)
  if (!plan) throw new ToolRepositoryError('ToolExecutionPlan not found.', 404)
  return plan
}

async function requireExecutionReceipt(id: string): Promise<ToolExecutionReceipt> {
  const rows = await prisma.$queryRaw<RawToolExecutionReceipt[]>`
    SELECT * FROM tool_execution_receipts WHERE id = ${id} LIMIT 1
  `
  if (!rows[0]) throw new ToolRepositoryError('ToolExecutionReceipt not found.', 404)
  return serializeToolExecutionReceipt(rows[0])
}

async function getOrCreateControlledPermission(call: ToolCall): Promise<ToolPermission> {
  const existing = await getLatestPermission(call.id)
  if (existing?.decision === 'allow_controlled_execution') return existing
  if (existing && existing.decision !== 'allow_record_only') return existing
  const tool = findToolByIdOrName(call.toolId) ?? findToolByIdOrName(call.toolName)
  if (!tool || tool.sprint11ExecutionMode !== 'controlled_deterministic_local') {
    throw new ToolRepositoryError('ToolCall cannot receive controlled execution permission.')
  }
  if (!isControlledExecutableCategory(tool.category)) {
    throw new ToolRepositoryError('Only controlled executable tool categories may receive controlled execution permission.')
  }
  const policy = getPolicyForToolCategory(tool.category)
  const permissionId = randomUUID()
  await prisma.$executeRaw`
    INSERT INTO tool_permissions (
      id, toolCallId, toolId, decision, reason, evaluatedBy, policyRef,
      permissionProfileRef, riskLevel, inputValidationStatus,
      schemaValidationErrorsJson, matchedRulesJson, deniedRulesJson, createdAt
    ) VALUES (
      ${permissionId}, ${call.id}, ${tool.id}, ${'allow_controlled_execution'},
      ${tool.category === 'write_sandbox'
        ? 'Sprint 22 allows this specific approved ToolRun to write one sandbox deliverable only.'
        : 'Sprint 11 allows this specific ToolRun to continue toward controlled local execution only.'},
      ${'policy'}, ${policy.id}, ${tool.permissionProfileRef},
      ${tool.riskLevel}, ${'valid'}, ${encodeJson([])},
      ${encodeJson([
        tool.category === 'write_sandbox' ? 'sprint22.human_gated_sandbox_write' : 'sprint11.controlled_execution',
        `category.${tool.category}.allowed`,
      ])},
      ${encodeJson([])}, ${new Date()}
    )
  `
  const permission = await getLatestPermission(call.id)
  if (!permission) throw new ToolRepositoryError('ToolPermission not found after create.', 500)
  return permission
}

async function findToolCallByConfirmationId(confirmationId: string) {
  const rows = await prisma.$queryRaw<RawToolCall[]>`
    SELECT * FROM tool_calls WHERE confirmationArtifactId = ${confirmationId} LIMIT 1
  `
  return rows[0] ? serializeToolCall(rows[0]) : null
}

async function findRawAgentRun(id: string) {
  const rows = await prisma.$queryRaw<{
    id: string
    taskId: string
    agentId: string
    resultJson: string | null
  }[]>`
    SELECT id, taskId, agentId, resultJson FROM agent_runs WHERE id = ${id} LIMIT 1
  `
  return rows[0] ?? null
}

function statusForPermission(
  currentStatus: ToolCall['status'],
  decision: ToolPermission['decision']
): ToolCall['status'] {
  if (decision === 'allow_record_only') return transitionToolCall(currentStatus, 'EVALUATE_PERMISSION')
  if (decision === 'allow_controlled_execution') return transitionToolCall(currentStatus, 'EVALUATE_PERMISSION')
  if (decision === 'requires_human') return transitionToolCall(currentStatus, 'REQUIRE_CONFIRMATION')
  if (decision === 'deny') return transitionToolCall(currentStatus, 'DENY_PERMISSION')
  return transitionToolCall(currentStatus, 'BLOCK_TOOL_CALL')
}

async function updateToolRunStatus(
  toolRun: ToolRun,
  status: ToolRun['status'],
  eventType: string,
  reason: string
): Promise<unknown[]> {
  const call = await requireToolCall(toolRun.toolCallId)
  const auditEvents: unknown[] = []
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE tool_runs
      SET status = ${status},
          startedAt = ${status === 'executing' ? new Date() : toolRun.startedAt ? new Date(toolRun.startedAt) : null},
          completedAt = ${['succeeded', 'failed', 'cancelled', 'denied', 'rejected'].includes(status) ? new Date() : toolRun.completedAt ? new Date(toolRun.completedAt) : null},
          updatedAt = ${new Date()}
      WHERE id = ${toolRun.id}
    `
    const auditEvent = await tx.harmonyAuditEvent.create({
      data: {
        correlationId: call.correlationId,
        taskId: toolRun.taskId,
        eventType,
        actorType: eventType === 'tool.execution_approved' ? 'kelvin' : 'system',
        actorId: eventType === 'tool.execution_approved' ? 'kelvin' : undefined,
        beforeStatus: toolRun.status,
        afterStatus: status,
        reason,
        payloadJson: encodeJson({ toolRunId: toolRun.id, toolCallId: toolRun.toolCallId }),
      },
    })
    auditEvents.push(auditEvent)
  })
  return auditEvents
}

async function updateExecutionPlanStatus(
  plan: ToolExecutionPlan,
  status: ToolExecutionPlan['status'],
  eventType: string,
  reason: string
): Promise<unknown[]> {
  const auditEvents: unknown[] = []
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE tool_execution_plans SET status = ${status}, updatedAt = ${new Date()}
      WHERE id = ${plan.id}
    `
    const auditEvent = await tx.harmonyAuditEvent.create({
      data: {
        correlationId: undefined,
        taskId: plan.taskId,
        eventType,
        actorType: 'kelvin',
        actorId: 'kelvin',
        beforeStatus: plan.status,
        afterStatus: status,
        reason,
        payloadJson: encodeJson({ toolExecutionPlanId: plan.id, toolRunId: plan.toolRunId }),
      },
    })
    auditEvents.push(auditEvent)
  })
  return auditEvents
}

async function updateToolCallStatus(
  call: ToolCall,
  status: ToolCall['status'],
  eventType: string,
  reason: string
): Promise<unknown[]> {
  const auditEvents: unknown[] = []
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE tool_calls SET status = ${status}, updatedAt = ${new Date()}
      WHERE id = ${call.id}
    `
    const auditEvent = await tx.harmonyAuditEvent.create({
      data: {
        correlationId: call.correlationId,
        taskId: call.taskId,
        eventType,
        actorType: eventType === 'tool.cancelled' ? 'user' : 'kelvin',
        actorId: eventType === 'tool.cancelled' ? undefined : 'kelvin',
        beforeStatus: call.status,
        afterStatus: status,
        reason,
        payloadJson: encodeJson({ toolCallId: call.id, toolId: call.toolId }),
      },
    })
    auditEvents.push(auditEvent)
  })
  return auditEvents
}

async function updateConfirmation(
  confirmationId: string,
  status: 'approved' | 'rejected',
  input: ReviewToolCallInput
) {
  await prisma.$executeRaw`
    UPDATE harmony_confirmation_artifacts
    SET status = ${status}, approvedBy = ${status === 'approved' ? input.reviewedBy ?? 'kelvin' : null},
        approvedAt = ${status === 'approved' ? new Date() : null},
        decisionReason = ${input.decisionReason}, updatedAt = ${new Date()}
    WHERE id = ${confirmationId}
  `
}

function safeJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function isControlledExecutableCategory(category: string): boolean {
  return ['internal_noop', 'read_simulated', 'write_sandbox'].includes(category)
}

function sideEffectClassForToolCategory(category: string): ToolRun['sideEffectClass'] {
  if (category === 'read_simulated') return 'simulated_read'
  if (category === 'write_sandbox') return 'sandbox_file_write'
  return 'none'
}

function sandboxPlanMetadata(input: unknown): {
  sandboxProfileId: string
  allowedWriteRoot: 'deliverables'
  allowedExtensions: string[]
  expectedOutputPath: string
} {
  const targetPath =
    input && typeof input === 'object' && !Array.isArray(input)
      ? (input as Record<string, unknown>).targetPath
      : undefined
  if (typeof targetPath !== 'string' || !targetPath.trim()) {
    throw new ToolRepositoryError('Sandbox write targetPath is required.')
  }
  return {
    sandboxProfileId: 'sandbox-file-write-deliverables-sprint-22',
    allowedWriteRoot: 'deliverables',
    allowedExtensions: ['.md', '.json', '.txt'],
    expectedOutputPath: targetPath,
  }
}

function readOutputPath(snapshot: Record<string, unknown>): string | null {
  return typeof snapshot.outputPath === 'string' ? snapshot.outputPath : null
}

function readBytesWritten(snapshot: Record<string, unknown>): number | null {
  return typeof snapshot.bytesWritten === 'number' ? snapshot.bytesWritten : null
}
