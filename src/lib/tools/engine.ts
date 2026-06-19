/**
 * ToolExecutionEngine — 工具执行引擎
 *
 * 打通 ToolCall → ToolRun → ToolExecutionPlan → 真实执行 → ToolExecutionReceipt 链路。
 *
 * 核心流程：
 *   1. 校验执行前置条件（已有 validateExecutionPreconditions）
 *   2. 根据 toolCategory 路由到对应执行器
 *   3. 执行工具，生成 ToolResult
 *   4. 构建 ToolExecutionReceipt
 *   5. 写入审计日志
 *
 * 安全边界：
 *   - 只执行已批准的 ToolRun（status = approved_for_execution）
 *   - 只执行已批准的 ToolExecutionPlan（status = approved_record）
 *   - 需要 RecoveryPoint（reason = before_tool_execution）
 *   - 需要 Kelvin 确认的工具必须有 approved ConfirmationArtifact
 */

import { randomUUID } from 'node:crypto'
import { createHash } from 'node:crypto'
import {
  validateExecutionPreconditions,
  validateToolResult,
  stableHash,
} from './execution'
import { createSandboxToolExecutor } from './sandbox-tool-executor'
import { writeSandboxDeliverable, sprint23FileWriteProfile } from '@/lib/sandbox/file-write-sandbox'
import type {
  ToolCall,
  ToolExecutionPlan,
  ToolExecutionReceipt,
  ToolPermission,
  ToolResult,
  ToolRun,
  ToolSideEffectClass,
} from './types'

// ─── 类型定义 ──────────────────────────────────────────────────────

export interface ToolExecutionEngineInput {
  toolRun: ToolRun
  toolCall: ToolCall
  plan: ToolExecutionPlan
  permission?: ToolPermission | null
  recoveryPoint?: { reason: string; id: string } | null
  confirmationArtifact?: { id: string; status: string } | null
  /** Agent ID（用于审计和沙箱执行器） */
  agentId?: string
}

export interface ToolExecutionEngineResult {
  receipt: ToolExecutionReceipt
  result: ToolResult
  executed: boolean
  durationMs: number
}

export class ToolExecutionEngineError extends Error {
  constructor(message: string, public readonly code: string, public readonly status = 400) {
    super(message)
    this.name = 'ToolExecutionEngineError'
  }
}

// ─── 审计日志 ──────────────────────────────────────────────────────

export interface EngineAuditEvent {
  eventType: string
  actorType: 'tool_execution_engine'
  reason: string
  payload: Record<string, unknown>
}

export type EngineAuditWriter = (event: EngineAuditEvent) => Promise<string>

// ─── 核心引擎 ──────────────────────────────────────────────────────

/**
 * 执行已批准的工具
 *
 * 完整流程：validate → route → execute → receipt → audit
 */
export async function executeApprovedTool(
  input: ToolExecutionEngineInput,
  auditWriter?: EngineAuditWriter,
): Promise<ToolExecutionEngineResult> {
  const startTime = Date.now()

  // 1. 校验执行前置条件
  try {
    validateExecutionPreconditions({
      toolRun: input.toolRun,
      plan: input.plan,
      permission: input.permission,
      recoveryPoint: input.recoveryPoint,
      confirmationArtifact: input.confirmationArtifact,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new ToolExecutionEngineError(
      `Precondition check failed: ${errorMessage}`,
      'PRECONDITION_FAILED',
    )
  }

  // 2. 审计：开始执行
  if (auditWriter) {
    await auditWriter({
      eventType: 'tool_execution_started',
      actorType: 'tool_execution_engine',
      reason: `Starting execution for tool ${input.toolRun.toolId}.`,
      payload: {
        toolRunId: input.toolRun.id,
        toolCallId: input.toolCall.id,
        planId: input.plan.id,
        toolId: input.toolRun.toolId,
      },
    })
  }

  // 3. 路由到执行器
  const toolCategory = resolveToolCategory(input.toolRun.toolId)

  try {
    let result: ToolResult
    let resultSnapshot: Record<string, unknown>

    switch (toolCategory) {
      case 'write_sandbox':
        ;({ result, resultSnapshot } = await executeWriteSandbox(input))
        break

      case 'command':
      case 'git':
        ;({ result, resultSnapshot } = await executeCommandOrGit(input))
        break

      case 'internal_noop':
        ;({ result, resultSnapshot } = executeNoop(input))
        break

      case 'read_simulated':
        ;({ result, resultSnapshot } = executeSimulatedRead(input))
        break

      default:
        throw new ToolExecutionEngineError(
          `Tool category "${toolCategory}" is not supported for execution.`,
          'UNSUPPORTED_CATEGORY',
        )
    }

    // 4. 校验结果
    validateToolResult(result)

    // 5. 构建 Receipt
    const durationMs = Date.now() - startTime
    const receipt = buildReceipt(input, result, resultSnapshot, 'succeeded', durationMs)

    // 6. 审计：执行成功
    if (auditWriter) {
      await auditWriter({
        eventType: 'tool_execution_completed',
        actorType: 'tool_execution_engine',
        reason: `Tool ${input.toolRun.toolId} executed successfully.`,
        payload: {
          receiptId: receipt.id,
          toolRunId: input.toolRun.id,
          toolId: input.toolRun.toolId,
          status: 'succeeded',
          durationMs,
          category: toolCategory,
        },
      })
    }

    return { receipt, result, executed: true, durationMs }
  } catch (error) {
    const durationMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)

    // 构建失败 Receipt
    const receipt = buildReceipt(
      input,
      {
        status: 'failed',
        confidence: 0,
        summary: `Execution failed: ${errorMessage}`,
        data: { error: errorMessage },
        next: { recommendedAction: 'escalate', reason: errorMessage },
        sideEffects: [],
      },
      { error: errorMessage },
      'failed',
      durationMs,
    )

    // 审计：执行失败
    if (auditWriter) {
      await auditWriter({
        eventType: 'tool_execution_failed',
        actorType: 'tool_execution_engine',
        reason: `Tool ${input.toolRun.toolId} execution failed: ${errorMessage}`,
        payload: {
          receiptId: receipt.id,
          toolRunId: input.toolRun.id,
          toolId: input.toolRun.toolId,
          status: 'failed',
          error: errorMessage,
          durationMs,
          category: toolCategory,
        },
      })
    }

    return { receipt, result: receipt.resultSnapshot as ToolResult, executed: false, durationMs }
  }
}

// ─── 执行器路由 ────────────────────────────────────────────────────

function resolveToolCategory(toolId: string): string {
  // Sprint 23 sandbox tools
  if (toolId.startsWith('write.sandbox') || toolId === 'file_write_controlled') {
    return 'write_sandbox'
  }
  if (toolId.startsWith('git_') || toolId === 'git_add' || toolId === 'git_commit') {
    return 'git'
  }
  if (
    toolId === 'execute_sandbox_command' ||
    toolId === 'execute_command' ||
    toolId === 'run_tests' ||
    toolId === 'run_typecheck' ||
    toolId === 'run_lint' ||
    toolId === 'run_build'
  ) {
    return 'command'
  }
  if (toolId === 'noop.note') {
    return 'internal_noop'
  }
  if (toolId === 'read_simulated.project_summary') {
    return 'read_simulated'
  }
  // Default: treat as command
  return 'command'
}

// ─── 执行器实现 ────────────────────────────────────────────────────

async function executeWriteSandbox(
  input: ToolExecutionEngineInput,
): Promise<{ result: ToolResult; resultSnapshot: Record<string, unknown> }> {
  const toolInput = input.toolCall.input as Record<string, unknown>

  // Sprint 23: file_write_controlled 走 sprint23 profile
  if (input.toolRun.toolId === 'file_write_controlled') {
    const written = await writeSandboxDeliverable(toolInput, {
      profile: sprint23FileWriteProfile,
    })
    const resultSnapshot = {
      kind: 'sandbox_file_write',
      toolId: input.toolRun.toolId,
      sandboxProfileId: written.sandboxProfileId,
      allowedWriteRoot: written.allowedRoot,
      outputPath: written.outputPath,
      relativePath: written.relativePath,
      extension: written.extension,
      bytesWritten: written.bytesWritten,
      contentHash: written.contentHash,
      normalizedInputHash: input.plan.normalizedInputHash,
      policyVersion: input.plan.policyVersion,
      executorVersion: input.plan.executorVersion,
    }
    const result = buildSuccessResult(input, resultSnapshot, 'Sprint 23 controlled file write succeeded.')
    return { result, resultSnapshot }
  }

  // Sprint 22: write.sandbox_deliverable 走 sprint22 profile
  const written = await writeSandboxDeliverable(toolInput)
  const resultSnapshot = {
    kind: 'sandbox_file_write',
    toolId: input.toolRun.toolId,
    sandboxProfileId: written.sandboxProfileId,
    allowedWriteRoot: written.allowedRoot,
    outputPath: written.outputPath,
    relativePath: written.relativePath,
    extension: written.extension,
    bytesWritten: written.bytesWritten,
    contentHash: written.contentHash,
    normalizedInputHash: input.plan.normalizedInputHash,
    policyVersion: input.plan.policyVersion,
    executorVersion: input.plan.executorVersion,
  }
  const result = buildSuccessResult(input, resultSnapshot, 'Approved sandbox deliverable write succeeded.')
  return { result, resultSnapshot }
}

async function executeCommandOrGit(
  input: ToolExecutionEngineInput,
): Promise<{ result: ToolResult; resultSnapshot: Record<string, unknown> }> {
  const agentId = input.agentId ?? 'system'
  const toolInput = input.toolCall.input as Record<string, unknown>
  const executor = createSandboxToolExecutor(agentId, { timeoutMs: 30_000 })

  const execResult = await executor(input.toolRun.toolId, toolInput)

  const resultSnapshot = {
    kind: 'sandbox_command_execution',
    toolId: input.toolRun.toolId,
    agentId,
    success: execResult.success,
    output: execResult.output,
    error: execResult.error,
    normalizedInputHash: input.plan.normalizedInputHash,
    policyVersion: input.plan.policyVersion,
    executorVersion: input.plan.executorVersion,
  }

  if (execResult.success) {
    const result = buildSuccessResult(input, resultSnapshot, `Sandbox command "${input.toolRun.toolId}" succeeded.`)
    return { result, resultSnapshot }
  }

  // 执行失败但不是引擎错误 — 返回 failed ToolResult
  const result: ToolResult = {
    status: 'failed',
    confidence: 0,
    summary: `Sandbox command "${input.toolRun.toolId}" failed: ${execResult.error ?? 'unknown error'}`,
    data: resultSnapshot,
    next: { recommendedAction: 'retry', reason: execResult.error ?? 'Command execution failed' },
    sideEffects: [],
  }
  return { result, resultSnapshot }
}

function executeNoop(
  input: ToolExecutionEngineInput,
): { result: ToolResult; resultSnapshot: Record<string, unknown> } {
  const resultSnapshot = {
    kind: 'internal_noop',
    toolId: input.toolRun.toolId,
    normalizedInputHash: input.plan.normalizedInputHash,
    policyVersion: input.plan.policyVersion,
    executorVersion: input.plan.executorVersion,
    acknowledged: true,
    summary: input.toolCall.inputSummary,
  }
  const result = buildSuccessResult(input, resultSnapshot, 'No-op ToolRun succeeded.')
  return { result, resultSnapshot }
}

function executeSimulatedRead(
  input: ToolExecutionEngineInput,
): { result: ToolResult; resultSnapshot: Record<string, unknown> } {
  const resultSnapshot = {
    kind: 'read_simulated',
    toolId: input.toolRun.toolId,
    normalizedInputHash: input.plan.normalizedInputHash,
    policyVersion: input.plan.policyVersion,
    executorVersion: input.plan.executorVersion,
    simulated: {
      source: 'local_in_memory' as const,
      key: 'default',
      value: { project: 'coworker-a2a', capability: 'simulated read' },
    },
  }
  const result = buildSuccessResult(input, resultSnapshot, 'Simulated read succeeded.')
  return { result, resultSnapshot }
}

// ─── Receipt 构建 ──────────────────────────────────────────────────

function buildReceipt(
  input: ToolExecutionEngineInput,
  result: ToolResult,
  resultSnapshot: Record<string, unknown>,
  status: 'succeeded' | 'failed' | 'cancelled',
  durationMs: number,
): ToolExecutionReceipt {
  const now = new Date()
  return {
    id: `tool-receipt-${randomUUID()}`,
    toolRunId: input.toolRun.id,
    toolCallId: input.toolCall.id,
    taskId: input.plan.taskId,
    agentRunId: input.plan.agentRunId,
    toolId: input.toolRun.toolId,
    executorId: `engine-${resolveToolCategory(input.toolRun.toolId)}`,
    executionPlanId: input.plan.id,
    status,
    startedAt: new Date(now.getTime() - durationMs).toISOString(),
    completedAt: now.toISOString(),
    durationMs,
    idempotencyKey: input.plan.idempotencyKey,
    inputHash: input.plan.normalizedInputHash,
    outputHash: stableHash(resultSnapshot),
    policyVersion: input.plan.policyVersion,
    executorVersion: input.plan.executorVersion,
    resultSummary: result.summary,
    resultSnapshot,
    sideEffects: result.sideEffects,
    sideEffectClass: input.plan.sideEffectClass,
    reversibility: input.plan.reversibility,
    auditEventIds: [],
    observabilityEventIds: [],
    recoveryPointId: input.plan.recoveryPointId ?? '',
    createdAt: now.toISOString(),
  }
}

function buildSuccessResult(
  input: { plan: ToolExecutionPlan },
  data: Record<string, unknown>,
  summary: string,
): ToolResult {
  return {
    status: 'success',
    confidence: 1,
    summary,
    data,
    next: {
      recommendedAction: 'stop',
      reason: 'Tool execution completed successfully.',
    },
    sideEffects: [],
    sideEffectClass: input.plan.sideEffectClass,
    reversibility: input.plan.reversibility,
    idempotencyKey: input.plan.idempotencyKey,
    inputHash: input.plan.normalizedInputHash,
    outputHash: stableHash(data),
    recoveryPointId: input.plan.recoveryPointId,
    auditRefs: [],
    observabilityRefs: [],
  }
}
