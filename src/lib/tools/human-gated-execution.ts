/**
 * Human-Gated Execution Engine
 *
 * 在 Kelvin 审批后执行白名单命令，保留完整审计追踪。
 * 只执行已审批的 ToolRun，每次执行需要人类明确确认。
 *
 * 安全边界：
 * - 只执行白名单命令
 * - 每次执行需要 Kelvin 审批
 * - 超时 30s，输出截断 12KB
 * - 完整审计追踪
 * - 不自动重试、不自动继续
 */

import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { decodeJson, encodeJson } from '@/lib/harmony/serializers'
import {
  executeInSandbox,
  matchCommandWhitelist,
  checkForbiddenPatterns,
  type SandboxExecutionResult,
} from './sandbox-execution'

/** 执行结果 */
export interface ExecutionResult {
  /** 执行状态 */
  status: 'executed' | 'denied' | 'forbidden' | 'timeout' | 'failed' | 'not_found' | 'not_approved'
  /** 工具运行 ID */
  toolRunId: string
  /** 执行的命令 */
  command: string | null
  /** 标准输出 */
  stdout: string
  /** 标准错误 */
  stderr: string
  /** 退出码 */
  exitCode: number
  /** 执行耗时 */
  durationMs: number
  /** 是否被截断 */
  truncated: boolean
  /** 拒绝原因 */
  denialReason?: string
  /** 收据 ID */
  receiptId?: string
  /** 审计事件 ID */
  auditEventId?: string
}

/** Sprint 18 安全说明 */
export const sprint18SafetyNote =
  'Sprint 18 executes only Kelvin-approved ToolRuns against whitelisted commands. Each execution requires explicit human approval, has a 30s timeout, 12KB output limit, and writes a full audit trail. No auto-retry, no auto-continue, no background execution.'

/**
 * 执行已审批的 ToolRun
 *
 * 流程：
 * 1. 查询 ToolRun 状态
 * 2. 检查是否已通过 Kelvin 审批
 * 3. 检查命令是否在白名单中
 * 4. 在沙箱中执行
 * 5. 写入 ToolExecutionReceipt
 * 6. 写入 AuditEvent
 * 7. 更新 ToolRun 状态
 */
export async function executeApprovedToolRun(
  toolRunId: string,
  options: { cwd?: string; timeoutMs?: number; maxOutputChars?: number } = {}
): Promise<ExecutionResult> {
  const {
    cwd = process.cwd(),
    timeoutMs = 30_000,
    maxOutputChars = 12_000,
  } = options

  // 1. 查询 ToolRun
  const toolRun = await prisma.toolRun.findUnique({
    where: { id: toolRunId },
    include: { toolCall: true },
  })

  if (!toolRun) {
    return {
      status: 'not_found',
      toolRunId,
      command: null,
      stdout: '',
      stderr: `ToolRun ${toolRunId} not found.`,
      exitCode: -1,
      durationMs: 0,
      truncated: false,
    }
  }

  // 2. 检查是否已审批
  if (toolRun.status !== 'approved_for_execution') {
    return {
      status: 'not_approved',
      toolRunId,
      command: null,
      stdout: '',
      stderr: `ToolRun status is "${toolRun.status}", expected "approved_for_execution". Kelvin approval required.`,
      exitCode: -1,
      durationMs: 0,
      truncated: false,
    }
  }

  // 3. 提取命令
  const input = decodeJson<Record<string, unknown> | null>(toolRun.inputSnapshotJson, null)
  const command = extractCommand(input)

  if (!command) {
    return {
      status: 'denied',
      toolRunId,
      command: null,
      stdout: '',
      stderr: 'No command found in ToolRun input.',
      exitCode: -1,
      durationMs: 0,
      truncated: false,
      denialReason: 'ToolRun input does not contain a command.',
    }
  }

  // 4. 检查白名单
  const matchedEntry = matchCommandWhitelist(command)
  if (!matchedEntry) {
    return {
      status: 'denied',
      toolRunId,
      command,
      stdout: '',
      stderr: `Command not in whitelist: "${command.split(' ')[0]}".`,
      exitCode: -1,
      durationMs: 0,
      truncated: false,
      denialReason: `Command "${command.split(' ')[0]}" is not whitelisted.`,
    }
  }

  // 5. 检查禁止模式
  const forbidden = checkForbiddenPatterns(command)
  if (forbidden) {
    return {
      status: 'forbidden',
      toolRunId,
      command,
      stdout: '',
      stderr: forbidden,
      exitCode: -1,
      durationMs: 0,
      truncated: false,
      denialReason: forbidden,
    }
  }

  // 6. 更新状态为 executing
  await prisma.toolRun.update({
    where: { id: toolRunId },
    data: {
      status: 'executing',
      startedAt: new Date(),
    },
  })

  // 7. 执行命令
  const startTime = Date.now()
  const sandboxResult: SandboxExecutionResult = executeInSandbox(command, {
    cwd,
    timeoutMs,
    maxOutputChars,
  })

  const durationMs = Date.now() - startTime

  // 8. 构建执行结果
  const receiptId = randomUUID()
  const auditEventId = randomUUID()

  // 9. 写入 ToolExecutionReceipt
  const receiptStatus = sandboxResult.status === 'success' ? 'succeeded' : 'failed'
  await prisma.toolExecutionReceipt.create({
    data: {
      id: receiptId,
      toolRunId,
      toolCallId: toolRun.toolCallId,
      taskId: toolRun.taskId ?? null,
      agentRunId: toolRun.agentRunId ?? null,
      toolId: toolRun.toolId,
      executorId: 'human-gated-executor',
      executionPlanId: toolRun.executionPlanId ?? '',
      status: receiptStatus,
      startedAt: new Date(startTime),
      completedAt: new Date(),
      durationMs,
      idempotencyKey: randomUUID(),
      inputHash: '',
      outputHash: '',
      policyVersion: 'sprint-18',
      executorVersion: 'sprint-18.0',
      resultSummary: sandboxResult.status === 'success'
        ? `Command executed successfully in ${durationMs}ms.`
        : `Command ${sandboxResult.status}: ${sandboxResult.denialReason ?? 'unknown error'}`,
      resultSnapshotJson: encodeJson({
        stdout: sandboxResult.stdout.slice(0, 1000),
        stderr: sandboxResult.stderr.slice(0, 1000),
        exitCode: sandboxResult.exitCode,
        matchedEntry: matchedEntry.pattern,
      }),
      sideEffectsJson: encodeJson([]),
      sideEffectClass: 'simulated_read',
      reversibility: 'inspect_only',
      auditEventIdsJson: encodeJson([auditEventId]),
      observabilityEventIdsJson: encodeJson([]),
      recoveryPointId: '',
      createdAt: new Date(),
    },
  })

  // 10. 写入 AuditEvent
  await prisma.harmonyAuditEvent.create({
    data: {
      id: auditEventId,
      correlationId: toolRunId,
      taskId: toolRun.taskId ?? null,
      taskRunId: null,
      taskStepId: null,
      eventType: 'tool_execution_completed',
      actorType: 'human_gated_executor',
      actorId: 'kelvin',
      beforeStatus: 'approved_for_execution',
      afterStatus: receiptStatus,
      reason: `Kelvin-approved execution of "${command.split(' ')[0]}" (${matchedEntry.category})`,
      payloadJson: encodeJson({
        command,
        category: matchedEntry.category,
        riskLevel: matchedEntry.riskLevel,
        durationMs,
        exitCode: sandboxResult.exitCode,
        truncated: sandboxResult.truncated,
      }),
      createdAt: new Date(),
    },
  })

  // 11. 更新 ToolRun 状态
  const finalStatus = receiptStatus === 'succeeded' ? 'succeeded' : 'failed'
  await prisma.toolRun.update({
    where: { id: toolRunId },
    data: {
      status: finalStatus,
      completedAt: new Date(),
      resultJson: encodeJson({
        status: finalStatus === 'succeeded' ? 'success' : 'failed',
        confidence: finalStatus === 'succeeded' ? 1 : 0,
        summary: sandboxResult.status === 'success'
          ? `Command executed successfully.`
          : `Command ${sandboxResult.status}.`,
        data: {
          stdout: sandboxResult.stdout.slice(0, 2000),
          stderr: sandboxResult.stderr.slice(0, 2000),
          exitCode: sandboxResult.exitCode,
        },
        next: {
          recommendedAction: 'stop',
          reason: 'Human-gated execution completed.',
        },
        sideEffects: [],
      }),
    },
  })

  return {
    status: 'executed',
    toolRunId,
    command,
    stdout: sandboxResult.stdout,
    stderr: sandboxResult.stderr,
    exitCode: sandboxResult.exitCode,
    durationMs,
    truncated: sandboxResult.truncated,
    denialReason: sandboxResult.denialReason,
    receiptId,
    auditEventId,
  }
}

/**
 * 从 ToolRun input 中提取命令
 */
function extractCommand(input: Record<string, unknown> | null): string | null {
  if (!input) return null

  // 尝试多种字段名
  const candidates = ['command', 'cmd', 'script', 'expression']
  for (const key of candidates) {
    const val = input[key]
    if (typeof val === 'string' && val.trim()) {
      return val.trim()
    }
  }

  // 尝试从嵌套结构提取
  if (input.params && typeof input.params === 'object') {
    const params = input.params as Record<string, unknown>
    for (const key of candidates) {
      const val = params[key]
      if (typeof val === 'string' && val.trim()) {
        return val.trim()
      }
    }
  }

  return null
}

/**
 * 列出待执行的 ToolRun（已审批但未执行）
 */
export async function listPendingExecutions(): Promise<{
  id: string
  toolId: string
  command: string | null
  status: string
  createdAt: string
}[]> {
  const runs = await prisma.toolRun.findMany({
    where: { status: 'approved_for_execution' },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return runs.map((run) => {
    const input = decodeJson<Record<string, unknown> | null>(run.inputSnapshotJson, null)
    return {
      id: run.id,
      toolId: run.toolId,
      command: extractCommand(input),
      status: run.status,
      createdAt: run.createdAt.toISOString(),
    }
  })
}
