/**
 * Multi-Agent Orchestrator — 多 Agent 编排器
 *
 * 管理复杂任务的分解、分配、并行执行和汇总。
 * 核心流程：Elon 分解 → 分配给 Jobs/Linus/Turing/Bezos → 并行执行 → 汇总结果
 *
 * 安全：
 * - 每个子任务都经过 eval 检查
 * - 子任务间通过 context-resolver 共享上下文
 * - 编排过程记录审计日志
 * - 失败的子任务有重试或升级机制
 */

import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import type { AgentId, AgentResultNextAction } from '@/lib/agents/types'
import {
  createSubtasks,
  getExecutableSubtasks,
  updateSubtaskStatus,
  collectResults,
  type SubtaskDefinition,
  type SubtaskRecord,
} from './subtask-manager'
import { startAgentRunFromTask } from './repository'
import { decomposeWithLLM, replanWithLLM } from './llm-decomposer'

// ─── 类型 ────────────────────────────────────────────────────────────

export type DecompositionStrategy = 'auto' | 'manual'

export interface OrchestratorInput {
  /** 父任务 ID */
  taskId: string
  /** 对话 ID */
  conversationId: string
  /** 分解策略 */
  decompositionStrategy: DecompositionStrategy
  /** 最大并行数 */
  maxParallel: number
  /** 汇总 Agent（默认 turing） */
  summaryAgentId: AgentId
  /** 最大重试次数 */
  maxRetries?: number
}

export interface SubtaskResult {
  index: number
  title: string
  agentId: AgentId
  status: 'completed' | 'failed' | 'blocked'
  summary: string
  confidence: number
}

export interface OrchestratorResult {
  /** 编排 ID */
  orchestrationId: string
  /** 父任务 ID */
  parentTaskId: string
  /** 子任务结果 */
  subtasks: SubtaskResult[]
  /** 汇总摘要 */
  summary: string
  /** 整体置信度 */
  overallConfidence: number
  /** 推荐下一步 */
  nextAction: AgentResultNextAction
  /** 汇总说明 */
  summaryReason: string
  /** 是否需要人工审查 */
  needsHumanReview: boolean
  /** 审计信息 */
  audit: {
    decompositionConfidence: number
    executionTime: number
    subtasksTotal: number
    subtasksSucceeded: number
    subtasksFailed: number
    subtasksBlocked: number
  }
}

// ─── 日志 ────────────────────────────────────────────────────────────

function log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) {
  const prefix = `[Orchestrator ${new Date().toISOString()}]`
  const suffix = data ? ` ${JSON.stringify(data)}` : ''
  if (level === 'error') console.error(`${prefix} ${message}${suffix}`)
  else if (level === 'warn') console.warn(`${prefix} ${message}${suffix}`)
  else console.log(`${prefix} ${message}${suffix}`)
}

// ─── 分解 ────────────────────────────────────────────────────────────

/**
 * 使用 LLM 分解复杂任务为子任务
 *
 * 优先使用 LLM 进行智能分解，LLM 不可用时回退到确定性规则。
 */
async function decomposeTask(
  taskId: string,
  conversationId: string
): Promise<{ subtasks: SubtaskDefinition[]; confidence: number }> {
  void conversationId

  const parentTask = await prisma.harmonyTask.findUnique({
    where: { id: taskId },
    select: {
      title: true,
      description: true,
      type: true,
      targetAgentId: true,
    },
  })

  if (!parentTask) {
    throw new Error(`Parent task ${taskId} not found`)
  }

  const result = await decomposeWithLLM(
    parentTask.title,
    parentTask.description,
    parentTask.type,
  )

  log('info', `Decomposed task into ${result.subtasks.length} subtasks (confidence: ${result.confidence})`, {
    taskId,
    reasoning: result.reasoning,
    subtasks: result.subtasks.map((s) => ({ title: s.title, agentId: s.targetAgentId })),
  })

  return { subtasks: result.subtasks, confidence: result.confidence }
}

// ─── 重规划 ──────────────────────────────────────────────────────────

/**
 * 当子任务失败时，使用 LLM 重新规划
 *
 * 分析失败原因，生成替代子任务，追加到现有编排中。
 */
async function replanFailedSubtasks(
  subtaskRecords: SubtaskRecord[],
  parentTitle: string,
  parentDescription: string,
  conversationId: string,
): Promise<SubtaskRecord[]> {
  const failed = subtaskRecords.filter((s) => s.status === 'failed')
  if (failed.length === 0) return []

  log('info', `Replanning ${failed.length} failed subtasks`)

  const result = await replanWithLLM(
    subtaskRecords.map((s) => ({
      title: s.definition.title,
      description: s.definition.description,
      targetAgentId: s.definition.targetAgentId,
      status: s.status,
      error: s.error,
      resultSummary: s.resultSummary,
    })),
    parentTitle,
    parentDescription,
  )

  if (result.subtasks.length === 0) {
    log('info', 'Replanning produced no replacement subtasks', { reasoning: result.reasoning })
    return []
  }

  log('info', `Replanning generated ${result.subtasks.length} replacement subtasks`, {
    reasoning: result.reasoning,
    confidence: result.confidence,
    subtasks: result.subtasks.map((s) => ({ title: s.title, agentId: s.targetAgentId })),
  })

  // 创建新的子任务记录
  const newRecords = await createSubtasks(result.subtasks, subtaskRecords[0]?.harmonyTaskId ?? '', conversationId)
  const startIndex = subtaskRecords.length
  return newRecords.map((r, i) => ({ ...r, index: startIndex + i }))
}

// ─── 执行 ────────────────────────────────────────────────────────────

/**
 * 执行单个子任务
 */
async function executeSubtask(
  record: SubtaskRecord,
  _conversationId: string,
  maxRetries: number
): Promise<SubtaskRecord> {
  if (!record.harmonyTaskId) {
    return updateSubtaskStatus(record, 'failed', {
      error: 'No harmonyTaskId assigned',
    })
  }

  // 标记为运行中
  let current = await updateSubtaskStatus(record, 'running')

  let lastError: string | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      log('info', `Executing subtask: ${record.definition.title}`, {
        attempt,
        agentId: record.definition.targetAgentId,
      })

      const result = await startAgentRunFromTask({
        taskId: record.harmonyTaskId,
        trigger: 'task_ui',
      })

      const agentResult = result.agentRun.result

      // 执行成功
      current = await updateSubtaskStatus(current, 'completed', {
        agentRunId: result.agentRun.id,
        resultSummary: agentResult?.summary ?? 'No summary',
        resultConfidence: agentResult?.confidence ?? 0.5,
      })

      log('info', `Subtask completed: ${record.definition.title}`, {
        confidence: agentResult?.confidence,
      })

      return current
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
      log('warn', `Subtask execution failed (attempt ${attempt + 1}): ${lastError}`, {
        title: record.definition.title,
      })
    }
  }

  // 所有重试都失败
  current = await updateSubtaskStatus(current, 'failed', {
    error: lastError ?? 'Execution failed after all retries',
  })

  return current
}

/**
 * 并行执行可执行的子任务
 */
async function executeBatch(
  subtasks: SubtaskRecord[],
  conversationId: string,
  maxParallel: number,
  maxRetries: number
): Promise<SubtaskRecord[]> {
  const executable = getExecutableSubtasks(subtasks)

  if (executable.length === 0) {
    return subtasks
  }

  log('info', `Executing batch of ${executable.length} subtasks (max parallel: ${maxParallel})`)

  // 按 maxParallel 分批执行
  const results: SubtaskRecord[] = []
  const remaining = [...subtasks]

  while (remaining.length > 0) {
    const batch = getExecutableSubtasks(remaining).slice(0, maxParallel)

    if (batch.length === 0) {
      // 没有可执行的子任务，可能有依赖阻塞
      // 检查是否有失败的子任务阻塞了后续
      const hasFailed = remaining.some((s) => s.status === 'failed')
      if (hasFailed) {
        log('warn', 'Blocking remaining subtasks due to failed dependency')
        for (const s of remaining) {
          if (s.status === 'pending') {
            const updated = await updateSubtaskStatus(s, 'blocked', {
              error: 'Blocked by failed dependency',
            })
            results.push(updated)
          }
        }
      }
      break
    }

    // 并行执行当前批次
    const batchResults = await Promise.all(
      batch.map((s) => executeSubtask(s, conversationId, maxRetries))
    )

    // 更新 remaining 中的对应记录
    for (const result of batchResults) {
      const idx = remaining.findIndex((s) => s.index === result.index)
      if (idx !== -1) {
        remaining[idx] = result
        results.push(result)
      }
    }
  }

  return results
}

// ─── 汇总 ────────────────────────────────────────────────────────────

/**
 * 汇总所有子任务结果
 */
async function summarizeResults(
  subtasks: SubtaskRecord[],
  _summaryAgentId: AgentId
): Promise<{
  summary: string
  confidence: number
  needsHumanReview: boolean
  summaryReason: string
}> {
  void _summaryAgentId

  const collected = collectResults(subtasks)

  // 计算整体置信度
  const completedSubtasks = subtasks.filter((s) => s.status === 'completed')
  const avgConfidence = completedSubtasks.length > 0
    ? completedSubtasks.reduce((sum, s) => sum + (s.resultConfidence ?? 0.5), 0) / completedSubtasks.length
    : 0.5

  // 生成汇总摘要
  const summaryParts: string[] = []

  summaryParts.push(`任务分解为 ${collected.results.length} 个子任务:`)
  summaryParts.push(`- 成功: ${collected.completedCount}`)
  summaryParts.push(`- 失败: ${collected.failedCount}`)
  summaryParts.push(`- 阻塞: ${collected.blockedCount}`)
  summaryParts.push('')

  for (const result of collected.results) {
    const statusIcon = result.status === 'completed' ? '✅'
      : result.status === 'failed' ? '❌'
        : '⏸️'
    summaryParts.push(`${statusIcon} [${result.agentId}] ${result.title}`)
    if (result.summary) {
      summaryParts.push(`   ${result.summary}`)
    }
  }

  const needsHumanReview = collected.anyFailed || avgConfidence < 0.6
  const summaryReason = collected.anyFailed
    ? 'Some subtasks failed, requires human review'
    : collected.anyBlocked
      ? 'Some subtasks blocked, requires human review'
      : 'All subtasks completed successfully'

  return {
    summary: summaryParts.join('\n'),
    confidence: avgConfidence,
    needsHumanReview,
    summaryReason,
  }
}

// ─── 审计 ────────────────────────────────────────────────────────────

/**
 * 记录编排审计事件
 */
async function recordAuditEvent(
  orchestrationId: string,
  parentTaskId: string,
  event: string,
  details: Record<string, unknown>
): Promise<void> {
  await prisma.harmonyAuditEvent.create({
    data: {
      taskId: parentTaskId,
      eventType: 'task.status_changed',
      actorType: 'system',
      actorId: 'orchestrator',
      afterStatus: 'assigned',
      reason: `Orchestrator: ${event}`,
      payloadJson: JSON.stringify({
        orchestrationId,
        ...details,
      }),
    },
  })
}

// ─── 主编排 ──────────────────────────────────────────────────────────

/**
 * 运行多 Agent 编排
 *
 * 核心流程：分解 → 创建子任务 → 并行执行 → 汇总结果
 */
export async function runOrchestration(
  input: OrchestratorInput
): Promise<OrchestratorResult> {
  const orchestrationId = randomUUID()
  const startTime = Date.now()

  log('info', `Starting orchestration ${orchestrationId}`, {
    taskId: input.taskId,
    strategy: input.decompositionStrategy,
  })

  // 1. 分解任务（LLM 驱动）
  const decomposition = await decomposeTask(input.taskId, input.conversationId)
  const subtaskDefs = decomposition.subtasks

  if (subtaskDefs.length === 0) {
    return {
      orchestrationId,
      parentTaskId: input.taskId,
      subtasks: [],
      summary: 'No subtasks generated from decomposition.',
      overallConfidence: 0,
      nextAction: 'stop',
      summaryReason: 'Empty decomposition',
      needsHumanReview: false,
      audit: {
        decompositionConfidence: decomposition.confidence,
        executionTime: Date.now() - startTime,
        subtasksTotal: 0,
        subtasksSucceeded: 0,
        subtasksFailed: 0,
        subtasksBlocked: 0,
      },
    }
  }

  // 2. 创建子任务
  let subtaskRecords = await createSubtasks(
    subtaskDefs,
    input.taskId,
    input.conversationId
  )

  // 设置索引
  subtaskRecords = subtaskRecords.map((r, i) => ({ ...r, index: i }))

  await recordAuditEvent(orchestrationId, input.taskId, 'decomposition_complete', {
    subtaskCount: subtaskRecords.length,
    decompositionConfidence: decomposition.confidence,
    subtasks: subtaskRecords.map((s) => ({
      title: s.definition.title,
      agentId: s.definition.targetAgentId,
    })),
  })

  // 3. 并行执行
  const maxRetries = input.maxRetries ?? 1
  subtaskRecords = await executeBatch(
    subtaskRecords,
    input.conversationId,
    input.maxParallel,
    maxRetries
  )

  // 4. 重规划：如果有失败的子任务，尝试 LLM 重新规划
  const hasFailed = subtaskRecords.some((s) => s.status === 'failed')
  if (hasFailed) {
    const parentTask = await prisma.harmonyTask.findUnique({
      where: { id: input.taskId },
      select: { title: true, description: true },
    })

    if (parentTask) {
      const replannedRecords = await replanFailedSubtasks(
        subtaskRecords,
        parentTask.title,
        parentTask.description,
        input.conversationId,
      )

      if (replannedRecords.length > 0) {
        await recordAuditEvent(orchestrationId, input.taskId, 'replan_complete', {
          replannedCount: replannedRecords.length,
          subtasks: replannedRecords.map((s) => ({
            title: s.definition.title,
            agentId: s.definition.targetAgentId,
          })),
        })

        // 执行重规划的子任务
        const replanResults = await executeBatch(
          replannedRecords,
          input.conversationId,
          input.maxParallel,
          maxRetries,
        )

        // 合并结果
        subtaskRecords = [...subtaskRecords, ...replanResults]
      }
    }
  }

  await recordAuditEvent(orchestrationId, input.taskId, 'execution_complete', {
    results: subtaskRecords.map((s) => ({
      title: s.definition.title,
      status: s.status,
      confidence: s.resultConfidence,
    })),
  })

  // 4. 汇总结果
  const summaryResult = await summarizeResults(subtaskRecords, input.summaryAgentId)

  const collected = collectResults(subtaskRecords)
  const executionTime = Date.now() - startTime

  await recordAuditEvent(orchestrationId, input.taskId, 'orchestration_complete', {
    summary: summaryResult.summary,
    confidence: summaryResult.confidence,
    executionTime,
  })

  log('info', `Orchestration ${orchestrationId} complete`, {
    subtasksTotal: collected.completedCount + collected.failedCount + collected.blockedCount,
    subtasksSucceeded: collected.completedCount,
    executionTime,
  })

  // 5. 返回结果
  return {
    orchestrationId,
    parentTaskId: input.taskId,
    subtasks: subtaskRecords.map((s) => ({
      index: s.index,
      title: s.definition.title,
      agentId: s.definition.targetAgentId,
      status: s.status as 'completed' | 'failed' | 'blocked',
      summary: s.resultSummary ?? 'No summary',
      confidence: s.resultConfidence ?? 0.5,
    })),
    summary: summaryResult.summary,
    overallConfidence: summaryResult.confidence,
    nextAction: summaryResult.needsHumanReview ? 'ask_human_confirmation' : 'show_result',
    summaryReason: summaryResult.summaryReason,
    needsHumanReview: summaryResult.needsHumanReview,
    audit: {
      decompositionConfidence: decomposition.confidence,
      executionTime,
      subtasksTotal: subtaskRecords.length,
      subtasksSucceeded: collected.completedCount,
      subtasksFailed: collected.failedCount,
      subtasksBlocked: collected.blockedCount,
    },
  }
}
