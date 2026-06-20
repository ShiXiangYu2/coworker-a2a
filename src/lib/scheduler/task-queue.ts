/**
 * Task Queue — 优先级任务队列
 *
 * 管理待执行的任务，支持：
 *   - 优先级排序（critical > high > normal > low）
 *   - 依赖检查（dependsOn）
 *   - 超时控制
 *   - 任务取消
 *   - 并发限制
 *
 * 与 Orchestrator 的区别：
 *   - Orchestrator：管理子任务分解和执行
 *   - Task Queue：管理全局任务调度和资源分配
 */

import type {
  PrioritizedTask,
  TaskPriority,
  ScheduledTask,
} from './types'

// ─── 优先级权重 ────────────────────────────────────────────────────

const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
}

// ─── 队列状态 ──────────────────────────────────────────────────────

const queue: PrioritizedTask[] = []
const running = new Map<string, ScheduledTask>()
const completed = new Map<string, ScheduledTask>()
const MAX_QUEUE_SIZE = 50
const MAX_RUNNING = 3
const DEFAULT_TIMEOUT_MS = 300_000 // 5 分钟

// ─── 队列操作 ──────────────────────────────────────────────────────

/**
 * 入队任务
 */
export function enqueueTask(task: Omit<PrioritizedTask, 'enqueuedAt'>): ScheduledTask {
  if (queue.length >= MAX_QUEUE_SIZE) {
    throw new Error(`Task queue is full (${MAX_QUEUE_SIZE})`)
  }

  const fullTask: PrioritizedTask = {
    ...task,
    enqueuedAt: new Date().toISOString(),
  }

  // 按优先级插入（高的在前）
  let insertIndex = queue.length
  for (let i = 0; i < queue.length; i++) {
    if (PRIORITY_WEIGHT[queue[i].priority] < PRIORITY_WEIGHT[task.priority]) {
      insertIndex = i
      break
    }
  }
  queue.splice(insertIndex, 0, fullTask)

  const scheduled: ScheduledTask = {
    id: task.id,
    status: 'queued',
    priority: task.priority,
    agentId: task.agentId,
    description: task.description,
    enqueuedAt: fullTask.enqueuedAt,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  }

  return scheduled
}

/**
 * 出队下一个可执行任务
 *
 * 考虑：
 * - 优先级
 * - 依赖是否满足
 * - 并发限制
 */
export function dequeueNext(completedIds: Set<string>): PrioritizedTask | null {
  if (running.size >= MAX_RUNNING) return null

  for (let i = 0; i < queue.length; i++) {
    const task = queue[i]

    // 检查依赖
    if (task.dependsOn && task.dependsOn.length > 0) {
      const allDepsMet = task.dependsOn.every((depId) => completedIds.has(depId))
      if (!allDepsMet) continue
    }

    // 移出队列
    queue.splice(i, 1)
    return task
  }

  return null
}

/**
 * 标记任务开始运行
 */
export function markRunning(task: PrioritizedTask, timeoutMs?: number): ScheduledTask {
  const scheduled: ScheduledTask = {
    id: task.id,
    status: 'running',
    priority: task.priority,
    agentId: task.agentId,
    description: task.description,
    enqueuedAt: task.enqueuedAt,
    startedAt: new Date().toISOString(),
    timeoutMs: timeoutMs ?? DEFAULT_TIMEOUT_MS,
  }

  running.set(task.id, scheduled)
  return scheduled
}

/**
 * 标记任务完成
 */
export function markCompleted(
  taskId: string,
  tokenUsage?: { inputTokens: number; outputTokens: number; totalTokens: number; estimatedCostUsd: number },
): ScheduledTask | null {
  const task = running.get(taskId)
  if (!task) return null

  task.status = 'completed'
  task.completedAt = new Date().toISOString()
  task.tokenUsage = tokenUsage

  running.delete(taskId)
  completed.set(taskId, task)
  return task
}

/**
 * 标记任务失败
 */
export function markFailed(taskId: string, error: string): ScheduledTask | null {
  const task = running.get(taskId)
  if (!task) return null

  task.status = 'failed'
  task.completedAt = new Date().toISOString()
  task.error = error

  running.delete(taskId)
  completed.set(taskId, task)
  return task
}

/**
 * 取消任务
 */
export function cancelTask(taskId: string): boolean {
  // 尝试从队列中移除
  const queueIndex = queue.findIndex((t) => t.id === taskId)
  if (queueIndex !== -1) {
    queue.splice(queueIndex, 1)
    return true
  }

  // 尝试从运行中取消
  const task = running.get(taskId)
  if (task) {
    task.status = 'cancelled'
    task.completedAt = new Date().toISOString()
    running.delete(taskId)
    completed.set(taskId, task)
    return true
  }

  return false
}

/**
 * 检查超时任务
 */
export function checkTimeouts(): string[] {
  const now = Date.now()
  const timedOut: string[] = []

  for (const [id, task] of running) {
    if (task.startedAt) {
      const elapsed = now - new Date(task.startedAt).getTime()
      if (elapsed > task.timeoutMs) {
        task.status = 'timeout'
        task.completedAt = new Date().toISOString()
        task.error = `Task timed out after ${elapsed}ms (limit: ${task.timeoutMs}ms)`
        running.delete(id)
        completed.set(id, task)
        timedOut.push(id)
      }
    }
  }

  return timedOut
}

// ─── 查询 ──────────────────────────────────────────────────────────

/**
 * 获取队列状态
 */
export function getQueueStatus(): {
  queued: number
  running: number
  completed: number
  queue: Array<{ id: string; priority: TaskPriority; agentId: string; enqueuedAt: string }>
  runningTasks: Array<{ id: string; agentId: string; startedAt: string }>
} {
  return {
    queued: queue.length,
    running: running.size,
    completed: completed.size,
    queue: queue.map((t) => ({
      id: t.id,
      priority: t.priority,
      agentId: t.agentId,
      enqueuedAt: t.enqueuedAt,
    })),
    runningTasks: Array.from(running.values()).map((t) => ({
      id: t.id,
      agentId: t.agentId,
      startedAt: t.startedAt ?? '',
    })),
  }
}

/**
 * 获取指定 Agent 的任务统计
 */
export function getAgentStats(agentId: string): {
  queued: number
  running: number
  completed: number
  failed: number
} {
  const queued = queue.filter((t) => t.agentId === agentId).length
  let runningCount = 0
  let completedCount = 0
  let failedCount = 0

  for (const task of running.values()) {
    if (task.agentId === agentId) runningCount++
  }
  for (const task of completed.values()) {
    if (task.agentId === agentId) {
      if (task.status === 'completed') completedCount++
      else if (task.status === 'failed') failedCount++
    }
  }

  return { queued, running: runningCount, completed: completedCount, failed: failedCount }
}

/**
 * 清空已完成的任务（仅保留最近 N 条）
 */
export function pruneCompleted(keepLast: number = 100): void {
  const entries = Array.from(completed.entries())
  if (entries.length <= keepLast) return

  // 按时间排序，保留最新的
  entries.sort((a, b) => new Date(b[1].completedAt ?? '').getTime() - new Date(a[1].completedAt ?? '').getTime())
  const toRemove = entries.slice(keepLast)
  for (const [id] of toRemove) {
    completed.delete(id)
  }
}
