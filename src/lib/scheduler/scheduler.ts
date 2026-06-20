/**
 * Task Scheduler — 任务调度器
 *
 * 统一管理任务调度、资源分配、限速控制。
 * 是 Agent Loop 和 LLM Provider 的门控层。
 *
 * 核心流程：
 *   1. 任务入队（带优先级）
 *   2. 调度器检查资源（token 预算 + 限速）
 *   3. 资源充足则执行，否则等待
 *   4. 执行后记录资源消耗
 *   5. 更新调度状态
 *
 * 安全：
 *   - 超过预算拒绝执行
 *   - 限速自动等待
 *   - 超时自动取消
 *   - 所有操作记录审计日志
 */

import { randomUUID } from 'node:crypto'
import { checkBudget, recordTokenUsage, getBudget, getCostSummary } from './token-budget'
import { checkRateLimit, recordRequest, waitForRateLimit, configureRateLimit } from './rate-limiter'
import {
  enqueueTask,
  dequeueNext,
  markRunning,
  markCompleted,
  markFailed,
  cancelTask,
  checkTimeouts,
  getQueueStatus,
  getAgentStats,
  pruneCompleted,
} from './task-queue'
import type { TaskPriority, TokenUsage, ScheduledTask } from './types'

// ─── 调度器接口 ────────────────────────────────────────────────────

export interface SchedulerSubmitOptions {
  /** 任务优先级 */
  priority?: TaskPriority
  /** Agent ID */
  agentId: string
  /** 任务描述 */
  description: string
  /** 预估 token 消耗 */
  estimatedTokens?: number
  /** 依赖的任务 ID */
  dependsOn?: string[]
  /** 超时毫秒 */
  timeoutMs?: number
  /** 任务类型（用于审计） */
  taskType?: string
}

export interface SchedulerSubmitResult {
  /** 任务 ID */
  taskId: string
  /** 入队状态 */
  status: 'queued' | 'rejected'
  /** 拒绝原因（如果 rejected） */
  reason?: string
  /** 队列位置 */
  queuePosition?: number
}

/**
 * 提交任务到调度器
 */
export function submitTask(options: SchedulerSubmitOptions): SchedulerSubmitResult {
  const taskId = `sched-${randomUUID()}`
  const estimatedTokens = options.estimatedTokens ?? 10_000

  // 1. 检查 token 预算
  const budgetError = checkBudget(options.agentId, taskId, estimatedTokens)
  if (budgetError) {
    return { taskId, status: 'rejected', reason: budgetError }
  }

  // 2. 检查限速
  const rateLimitWait = checkRateLimit(estimatedTokens)
  if (rateLimitWait !== null && rateLimitWait > 10_000) {
    // 等待时间超过 10s，拒绝
    return {
      taskId,
      status: 'rejected',
      reason: `Rate limit exceeded, estimated wait: ${rateLimitWait}ms`,
    }
  }

  // 3. 入队
  try {
    enqueueTask({
      id: taskId,
      priority: options.priority ?? 'normal',
      agentId: options.agentId,
      description: options.description,
      estimatedTokens,
      dependsOn: options.dependsOn,
    })

    const status = getQueueStatus()
    return {
      taskId,
      status: 'queued',
      queuePosition: status.queued,
    }
  } catch (error) {
    return {
      taskId,
      status: 'rejected',
      reason: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * 执行下一个待处理任务
 *
 * 调度器核心循环：
 * 1. 检查超时任务
 * 2. 出队下一个可执行任务
 * 3. 检查资源
 * 4. 执行
 * 5. 记录结果
 */
export async function executeNext(
  executor: (task: ScheduledTask) => Promise<TokenUsage>,
): Promise<ScheduledTask | null> {
  // 1. 检查超时
  checkTimeouts()

  // 2. 出队
  const completedIds = new Set(
    Array.from(getQueueStatus().runningTasks.map((t) => t.id))
  )
  const task = dequeueNext(completedIds)
  if (!task) return null

  // 3. 标记运行中
  const scheduled = markRunning(task, task.estimatedTokens > 50_000 ? 600_000 : 300_000)

  // 4. 检查限速（等待直到可以发送）
  const canProceed = await waitForRateLimit(task.estimatedTokens, 30_000)
  if (!canProceed) {
    markFailed(task.id, 'Rate limit timeout: could not proceed within 30s')
    return scheduled
  }

  // 5. 记录请求
  recordRequest(task.estimatedTokens)

  // 6. 执行
  try {
    const usage = await executor(scheduled)

    // 7. 记录 token 使用
    recordTokenUsage(task.agentId, usage, {
      taskId: task.id,
    })

    // 8. 标记完成
    markCompleted(task.id, usage)
    return scheduled
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    markFailed(task.id, errorMsg)
    return scheduled
  }
}

/**
 * 取消任务
 */
export function cancelScheduledTask(taskId: string): boolean {
  return cancelTask(taskId)
}

/**
 * 获取调度器状态
 */
export function getSchedulerStatus(): {
  queue: ReturnType<typeof getQueueStatus>
  budget: ReturnType<typeof getBudget>
  cost: ReturnType<typeof getCostSummary>
} {
  // 清理旧数据
  pruneCompleted()

  return {
    queue: getQueueStatus(),
    budget: getBudget(),
    cost: getCostSummary(),
  }
}

/**
 * 获取 Agent 调度统计
 */
export function getAgentSchedulerStats(agentId: string) {
  return getAgentStats(agentId)
}

/**
 * 配置调度器
 */
export function configureScheduler(options: {
  rateLimit?: { requestsPerMinute?: number; tokensPerMinute?: number }
  budget?: { dailyLimit?: number; perTaskLimit?: number; perAgentLimit?: number }
}): void {
  if (options.rateLimit) {
    configureRateLimit(options.rateLimit)
  }
  // budget 配置需要在 token-budget 模块中处理
}
