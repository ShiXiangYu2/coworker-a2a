/**
 * Loop Engine — 自治循环引擎
 *
 * 实现"扫描 ready 任务 → 选择 Agent → 执行 → 审查 → 推进"的自动化流程。
 * 来源：auto-dev-framework Loop Engineering
 *
 * 安全：
 * - 每个执行都经过 eval 检查（四层 Eval）
 * - 失败时有人工介入路径
 * - 循环状态持久化（可恢复）
 * - 所有执行记录审计日志
 */

import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { startAgentRunFromTask } from '@/lib/agent-runtime/repository'
import { produceDeterministicEval } from '@/lib/eval/rules'
import { transitionHarmonyTask } from '@/lib/harmony/state-machine'
import { isHarmonyTaskStatus, type HarmonyTaskStatus } from '@/lib/harmony/types'
import {
  createInitialLoopState,
  shouldTerminate,
  transitionLoopState,
  type LoopConfig,
  type LoopState,
  type LoopEvent,
} from './loop-state'

// ─── 日志 ────────────────────────────────────────────────────────────

function log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) {
  const prefix = `[LoopEngine ${new Date().toISOString()}]`
  const suffix = data ? ` ${JSON.stringify(data)}` : ''
  if (level === 'error') console.error(`${prefix} ${message}${suffix}`)
  else if (level === 'warn') console.warn(`${prefix} ${message}${suffix}`)
  else console.log(`${prefix} ${message}${suffix}`)
}

function readHarmonyTaskStatus(status: string, taskId: string): HarmonyTaskStatus | null {
  if (isHarmonyTaskStatus(status)) return status
  log('warn', 'Skipping HarmonyTask transition for unknown status', { taskId, status })
  return null
}

// ─── 扫描 ────────────────────────────────────────────────────────────

interface ScanResult {
  taskId: string
  agentId: string | null
  conversationId: string | null
  title: string
}

/**
 * 扫描 HarmonyTask 中 status='queued' 的任务
 */
async function scanReadyTasks(limit: number): Promise<ScanResult[]> {
  const tasks = await prisma.harmonyTask.findMany({
    where: {
      status: 'queued',
      targetAgentId: { not: null },
    },
    select: {
      id: true,
      targetAgentId: true,
      conversationId: true,
      title: true,
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  })

  return tasks.map((t) => ({
    taskId: t.id,
    agentId: t.targetAgentId,
    conversationId: t.conversationId,
    title: t.title,
  }))
}

// ─── 执行 ────────────────────────────────────────────────────────────

interface ExecutionResult {
  taskId: string
  agentId: string
  success: boolean
  agentRunId?: string
  error?: string
  needsHumanConfirmation?: boolean
}

/**
 * 执行单个任务
 */
async function executeTask(
  taskId: string,
  timeoutMs: number
): Promise<ExecutionResult> {
  // 查询任务获取 agentId
  const task = await prisma.harmonyTask.findUnique({
    where: { id: taskId },
    select: { targetAgentId: true },
  })

  if (!task || !task.targetAgentId) {
    return {
      taskId,
      agentId: 'unknown',
      success: false,
      error: 'Task not found or no target agent',
    }
  }

  try {
    // 带超时执行
    const result = await Promise.race([
      startAgentRunFromTask({ taskId, trigger: 'task_ui' }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Execution timeout')), timeoutMs)
      ),
    ])

    const agentResult = result.agentRun.result
    const needsHumanConfirmation = agentResult?.needsHumanConfirmation ?? false

    return {
      taskId,
      agentId: task.targetAgentId,
      success: true,
      agentRunId: result.agentRun.id,
      needsHumanConfirmation,
    }
  } catch (error) {
    return {
      taskId,
      agentId: task.targetAgentId,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// ─── 审查 ────────────────────────────────────────────────────────────

interface ReviewResult {
  taskId: string
  decision: 'pass' | 'fail' | 'blocked'
  needsHumanReview: boolean
  summary: string
}

/**
 * 对执行结果进行 eval 审查（四层 Eval）
 */
async function reviewExecution(
  taskId: string,
  agentRunId: string
): Promise<ReviewResult> {
  const agentRun = await prisma.agentRun.findUnique({
    where: { id: agentRunId },
    select: { resultJson: true, agentId: true },
  })

  if (!agentRun) {
    return {
      taskId,
      decision: 'fail',
      needsHumanReview: true,
      summary: 'AgentRun not found for review',
    }
  }

  // 创建 EvalTarget 并执行审查
  const evalTarget = {
    id: `eval-target-loop-${taskId}`,
    targetType: 'agent_result' as const,
    targetId: agentRunId,
    agentRunId,
    source: 'system_test' as const,
    snapshot: {
      status: 'completed',
      agentId: agentRun.agentId,
      ...JSON.parse(agentRun.resultJson ?? '{}'),
    },
    snapshotVersion: 'loop-engine-v1',
    status: 'active' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const evalResult = produceDeterministicEval({
    evalRunId: `eval-run-loop-${taskId}`,
    evalTarget,
    now: new Date().toISOString(),
  })

  const decision = evalResult.qualityGateDecision
  const needsHumanReview = decision.requiresKelvinReview

  return {
    taskId,
    decision: decision.decision === 'blocked'
      ? 'blocked'
      : decision.decision === 'fail'
        ? 'fail'
        : 'pass',
    needsHumanReview,
    summary: decision.summary,
  }
}

// ─── 推进 ────────────────────────────────────────────────────────────

/**
 * 根据审查结果更新任务状态
 */
async function advanceTask(
  taskId: string,
  executionResult: ExecutionResult,
  reviewResult: ReviewResult
): Promise<{ newStatus: HarmonyTaskStatus; event: LoopEvent }> {
  const task = await prisma.harmonyTask.findUnique({
    where: { id: taskId },
    select: { status: true },
  })

  if (!task) {
    return { newStatus: 'failed', event: 'TASK_FAILED' }
  }

  const currentStatus = readHarmonyTaskStatus(task.status, taskId)
  if (!currentStatus) {
    return { newStatus: 'failed', event: 'TASK_FAILED' }
  }

  // 执行失败
  if (!executionResult.success) {
    try {
      const newStatus = transitionHarmonyTask(currentStatus, 'FAIL')
      await prisma.harmonyTask.update({
        where: { id: taskId },
        data: {
          status: newStatus,
          statusReason: `Loop engine execution failed: ${executionResult.error}`,
        },
      })
      return { newStatus, event: 'TASK_FAILED' }
    } catch {
      return { newStatus: currentStatus, event: 'TASK_FAILED' }
    }
  }

  // 需要人工确认
  if (executionResult.needsHumanConfirmation) {
    try {
      const newStatus = transitionHarmonyTask(currentStatus, 'REQUEST_CONFIRMATION_FROM_ANALYSIS')
      await prisma.harmonyTask.update({
        where: { id: taskId },
        data: {
          status: newStatus,
          statusReason: 'Loop engine: Agent analysis requires human confirmation.',
        },
      })
      return { newStatus, event: 'TASK_BLOCKED' }
    } catch {
      // 如果不能转换，标记为 blocked
      return { newStatus: 'blocked', event: 'TASK_BLOCKED' }
    }
  }

  // 审查被阻塞
  if (reviewResult.decision === 'blocked') {
    try {
      const newStatus = transitionHarmonyTask(currentStatus, 'BLOCK')
      await prisma.harmonyTask.update({
        where: { id: taskId },
        data: {
          status: newStatus,
          statusReason: `Loop engine eval blocked: ${reviewResult.summary}`,
        },
      })
      return { newStatus, event: 'TASK_BLOCKED' }
    } catch {
      return { newStatus: 'blocked', event: 'TASK_BLOCKED' }
    }
  }

  // 审查失败
  if (reviewResult.decision === 'fail') {
    try {
      const newStatus = transitionHarmonyTask(currentStatus, 'FAIL')
      await prisma.harmonyTask.update({
        where: { id: taskId },
        data: {
          status: newStatus,
          statusReason: `Loop engine eval failed: ${reviewResult.summary}`,
        },
      })
      return { newStatus, event: 'TASK_FAILED' }
    } catch {
      return { newStatus: 'failed', event: 'TASK_FAILED' }
    }
  }

  // 审查通过 → 完成
  try {
    const newStatus = transitionHarmonyTask(currentStatus, 'MARK_COMPLETED')
    await prisma.harmonyTask.update({
      where: { id: taskId },
      data: {
        status: newStatus,
        statusReason: 'Loop engine: Agent analysis completed and eval passed.',
      },
    })
    return { newStatus, event: 'TASK_SUCCEEDED' }
  } catch {
    return { newStatus: currentStatus, event: 'TASK_FAILED' }
  }
}

// ─── 单次迭代 ────────────────────────────────────────────────────────

interface IterationResult {
  iteration: number
  taskIds: string[]
  succeeded: number
  failed: number
  blocked: number
  shouldContinue: boolean
  terminateReason?: LoopEvent
}

/**
 * 执行一次迭代：扫描 → 执行 → 审查 → 推进
 */
async function runIteration(
  state: LoopState
): Promise<IterationResult> {
  const { maxConcurrent, timeoutMs } = state.config

  // 1. 扫描 ready 任务
  const readyTasks = await scanReadyTasks(maxConcurrent)

  if (readyTasks.length === 0) {
    return {
      iteration: state.currentIteration + 1,
      taskIds: [],
      succeeded: 0,
      failed: 0,
      blocked: 0,
      shouldContinue: false,
      terminateReason: 'NO_READY_TASKS',
    }
  }

  log('info', `Iteration ${state.currentIteration + 1}: found ${readyTasks.length} ready tasks`)

  let succeeded = 0
  let failed = 0
  let blocked = 0
  const taskIds: string[] = []

  // 2. 执行任务（可并行）
  for (const task of readyTasks) {
    taskIds.push(task.taskId)

    // 2a. 执行
    const executionResult = await executeTask(task.taskId, timeoutMs)

    // 2b. 审查
    let reviewResult: ReviewResult
    if (executionResult.success && executionResult.agentRunId) {
      reviewResult = await reviewExecution(task.taskId, executionResult.agentRunId)
    } else {
      reviewResult = {
        taskId: task.taskId,
        decision: 'fail',
        needsHumanReview: true,
        summary: executionResult.error ?? 'Execution failed',
      }
    }

    // 2c. 推进
    const { event } = await advanceTask(task.taskId, executionResult, reviewResult)

    // 2d. 统计
    if (event === 'TASK_SUCCEEDED') succeeded++
    else if (event === 'TASK_BLOCKED') blocked++
    else failed++
  }

  // 3. 检查是否应该继续
  const nextIteration = { ...state, currentIteration: state.currentIteration + 1 }
  const { terminate, reason } = shouldTerminate(nextIteration)

  return {
    iteration: nextIteration.currentIteration,
    taskIds,
    succeeded,
    failed,
    blocked,
    shouldContinue: !terminate,
    terminateReason: reason,
  }
}

// ─── 主循环 ──────────────────────────────────────────────────────────

export interface LoopRunResult {
  state: LoopState
  iterations: IterationResult[]
}

/**
 * 运行自治循环
 *
 * 扫描 → 执行 → 审查 → 推进，直到终止条件满足。
 */
export async function runLoop(
  config: LoopConfig,
  existingState?: LoopState
): Promise<LoopRunResult> {
  const state = existingState ?? createInitialLoopState(randomUUID(), config)
  const iterations: IterationResult[] = []

  // 启动循环
  state.status = transitionLoopState(state.status, 'START')
  state.startedAt = new Date().toISOString()
  log('info', `Loop ${state.loopId} started`, { config })

  try {
    let running = true

    while (running) {
      state.currentIteration++
      state.lastIterationAt = new Date().toISOString()

      // 执行一次迭代
      const iterationResult = await runIteration(state)
      iterations.push(iterationResult)

      // 更新统计
      state.tasksProcessed += iterationResult.taskIds.length
      state.tasksSucceeded += iterationResult.succeeded
      state.tasksFailed += iterationResult.failed
      state.tasksBlocked += iterationResult.blocked
      state.lastIterationTaskIds = iterationResult.taskIds

      // 更新连续失败计数
      if (iterationResult.failed > 0) {
        state.consecutiveFailures += iterationResult.failed
      } else {
        state.consecutiveFailures = 0
      }

      log('info', `Iteration ${iterationResult.iteration} complete`, {
        succeeded: iterationResult.succeeded,
        failed: iterationResult.failed,
        blocked: iterationResult.blocked,
        consecutiveFailures: state.consecutiveFailures,
      })

      // 检查终止条件
      if (!iterationResult.shouldContinue) {
        state.status = transitionLoopState(
          state.status,
          iterationResult.terminateReason ?? 'COMPLETE'
        )
        state.completedAt = new Date().toISOString()
        running = false
        log('info', `Loop ${state.loopId} completed`, {
          reason: iterationResult.terminateReason,
          tasksProcessed: state.tasksProcessed,
          tasksSucceeded: state.tasksSucceeded,
        })
      }
    }
  } catch (error) {
    state.status = transitionLoopState(state.status, 'FAIL')
    state.error = error instanceof Error ? error.message : String(error)
    state.completedAt = new Date().toISOString()
    log('error', `Loop ${state.loopId} failed`, { error: state.error })
  }

  return { state, iterations }
}
