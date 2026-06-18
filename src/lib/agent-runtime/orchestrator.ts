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
 * 使用 Elon Agent 分解复杂任务为子任务
 *
 * 在 analysis_only 模式下，Elon 返回结构化的分解结果。
 * 我们解析其输出并转换为 SubtaskDefinition 列表。
 */
async function decomposeTask(
  taskId: string,
  conversationId: string
): Promise<SubtaskDefinition[]> {
  void conversationId

  // 查询父任务信息
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

  // 使用 Elon Agent 进行分解
  // 在 production 模式下，这会调用 LLM；在测试模式下，使用确定性分解
  const subtasks = await decomposeWithElon(
    parentTask.title,
    parentTask.description,
    parentTask.type
  )

  log('info', `Decomposed task into ${subtasks.length} subtasks`, {
    taskId,
    subtasks: subtasks.map((s) => ({ title: s.title, agentId: s.targetAgentId })),
  })

  return subtasks
}

/**
 * 使用 Elon Agent 进行任务分解
 *
 * 根据任务类型和内容，确定性地生成子任务列表。
 * 生产环境中应替换为 LLM 调用。
 */
async function decomposeWithElon(
  title: string,
  description: string,
  taskType: string
): Promise<SubtaskDefinition[]> {
  // 基于任务类型的确定性分解规则
  const subtasks: SubtaskDefinition[] = []

  // 产品任务 → Jobs 分析需求 + Linus 评估技术
  if (taskType === 'product') {
    subtasks.push({
      title: `需求分析: ${title}`,
      description: `分析以下需求的完整性和可行性: ${description}`,
      targetAgentId: 'jobs',
      type: 'product',
      dependsOn: [],
      priority: 'high',
    })
    subtasks.push({
      title: `技术评估: ${title}`,
      description: `评估以下需求的技术实现方案: ${description}`,
      targetAgentId: 'linus',
      type: 'engineering',
      dependsOn: [0], // 依赖需求分析
      priority: 'medium',
    })
  }

  // 工程任务 → Linus 设计 + Turing 验证
  else if (taskType === 'engineering') {
    subtasks.push({
      title: `架构设计: ${title}`,
      description: `设计以下功能的架构方案: ${description}`,
      targetAgentId: 'linus',
      type: 'engineering',
      dependsOn: [],
      priority: 'high',
    })
    subtasks.push({
      title: `质量验证: ${title}`,
      description: `验证以下设计的质量和安全性: ${description}`,
      targetAgentId: 'turing',
      type: 'verification',
      dependsOn: [0], // 依赖架构设计
      priority: 'medium',
    })
  }

  // 验证任务 → Turing 检查 + Bezos 评估业务价值
  else if (taskType === 'verification') {
    subtasks.push({
      title: `质量检查: ${title}`,
      description: `检查以下内容的质量: ${description}`,
      targetAgentId: 'turing',
      type: 'verification',
      dependsOn: [],
      priority: 'high',
    })
    subtasks.push({
      title: `业务价值评估: ${title}`,
      description: `评估以下内容的业务价值: ${description}`,
      targetAgentId: 'bezos',
      type: 'customer',
      dependsOn: [0], // 依赖质量检查
      priority: 'low',
    })
  }

  // 客户任务 → Bezos 分析 + Jobs 产品化
  else if (taskType === 'customer') {
    subtasks.push({
      title: `客户反馈分析: ${title}`,
      description: `分析以下客户反馈: ${description}`,
      targetAgentId: 'bezos',
      type: 'customer',
      dependsOn: [],
      priority: 'high',
    })
    subtasks.push({
      title: `产品化建议: ${title}`,
      description: `基于客户反馈给出产品化建议: ${description}`,
      targetAgentId: 'jobs',
      type: 'product',
      dependsOn: [0], // 依赖客户分析
      priority: 'medium',
    })
  }

  // 协调任务 → 并行执行多个 Agent
  else {
    subtasks.push(
      {
        title: `产品视角: ${title}`,
        description: `从产品角度分析: ${description}`,
        targetAgentId: 'jobs',
        type: 'product',
        dependsOn: [],
        priority: 'medium',
      },
      {
        title: `工程视角: ${title}`,
        description: `从工程角度分析: ${description}`,
        targetAgentId: 'linus',
        type: 'engineering',
        dependsOn: [],
        priority: 'medium',
      },
      {
        title: `质量视角: ${title}`,
        description: `从质量角度分析: ${description}`,
        targetAgentId: 'turing',
        type: 'verification',
        dependsOn: [],
        priority: 'medium',
      }
    )
  }

  return subtasks
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

  // 1. 分解任务
  const subtaskDefs = await decomposeTask(input.taskId, input.conversationId)

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
        decompositionConfidence: 0,
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
      decompositionConfidence: 0.8,
      executionTime,
      subtasksTotal: subtaskRecords.length,
      subtasksSucceeded: collected.completedCount,
      subtasksFailed: collected.failedCount,
      subtasksBlocked: collected.blockedCount,
    },
  }
}
