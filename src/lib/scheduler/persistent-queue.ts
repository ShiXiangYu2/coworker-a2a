/**
 * Persistent Task Queue — 持久化任务队列
 *
 * 用 Prisma/SQLite 替代内存队列。
 * 进程重启后任务不丢失。
 *
 * 优先级：critical > high > normal > low
 * 状态：queued → running → completed/failed
 */

import { prisma } from '@/lib/prisma'
import type { TaskPriority, ScheduledTask } from './types'

// ─── 入队 ──────────────────────────────────────────────────────────

/**
 * 入队任务到数据库
 */
export async function enqueuePersistentTask(task: {
  id: string
  priority: TaskPriority
  agentId: string
  description: string
  estimatedTokens?: number
  dependsOn?: string[]
}): Promise<ScheduledTask> {
  const record = await prisma.persistentTask.create({
    data: {
      id: task.id,
      priority: task.priority,
      agentId: task.agentId,
      description: task.description,
      estimatedTokens: task.estimatedTokens ?? 10000,
      dependsOnJson: JSON.stringify(task.dependsOn ?? []),
      status: 'queued',
    },
  })

  return {
    id: record.id,
    status: 'queued',
    priority: record.priority as TaskPriority,
    agentId: record.agentId,
    description: record.description,
    enqueuedAt: record.enqueuedAt.toISOString(),
    timeoutMs: 300_000,
  }
}

// ─── 出队 ──────────────────────────────────────────────────────────

/**
 * 出队下一个可执行任务
 *
 * 按优先级排序，检查依赖是否满足。
 */
export async function dequeuePersistentTask(): Promise<ScheduledTask | null> {
  // 查找所有 queued 任务，按优先级排序
  const queuedTasks = await prisma.persistentTask.findMany({
    where: { status: 'queued' },
    orderBy: [
      { priority: 'asc' }, // critical=0 < high=1 < normal=2 < low=3
      { enqueuedAt: 'asc' },
    ],
    take: 10,
  })

  for (const task of queuedTasks) {
    // 检查依赖
    const dependsOn: string[] = JSON.parse(task.dependsOnJson)
    if (dependsOn.length > 0) {
      const allDepsMet = await checkDependenciesMet(dependsOn)
      if (!allDepsMet) continue
    }

    // 标记为 running
    await prisma.persistentTask.update({
      where: { id: task.id },
      data: { status: 'running', startedAt: new Date() },
    })

    return {
      id: task.id,
      status: 'running',
      priority: task.priority as TaskPriority,
      agentId: task.agentId,
      description: task.description,
      enqueuedAt: task.enqueuedAt.toISOString(),
      startedAt: new Date().toISOString(),
      timeoutMs: 300_000,
    }
  }

  return null
}

// ─── 完成/失败 ──────────────────────────────────────────────────────

/**
 * 标记任务完成
 */
export async function completePersistentTask(
  taskId: string,
  resultJson?: string,
): Promise<void> {
  await prisma.persistentTask.update({
    where: { id: taskId },
    data: {
      status: 'completed',
      completedAt: new Date(),
      resultJson: resultJson ?? null,
    },
  })
}

/**
 * 标记任务失败
 */
export async function failPersistentTask(
  taskId: string,
  error: string,
): Promise<void> {
  await prisma.persistentTask.update({
    where: { id: taskId },
    data: {
      status: 'failed',
      completedAt: new Date(),
      error,
    },
  })
}

// ─── 取消 ──────────────────────────────────────────────────────────

/**
 * 取消任务
 */
export async function cancelPersistentTask(taskId: string): Promise<boolean> {
  try {
    await prisma.persistentTask.update({
      where: { id: taskId },
      data: { status: 'cancelled', completedAt: new Date() },
    })
    return true
  } catch {
    return false
  }
}

// ─── 查询 ──────────────────────────────────────────────────────────

/**
 * 获取队列状态
 */
export async function getPersistentQueueStatus(): Promise<{
  queued: number
  running: number
  completed: number
  failed: number
  queue: Array<{ id: string; priority: string; agentId: string; enqueuedAt: string }>
  runningTasks: Array<{ id: string; agentId: string; startedAt: string }>
}> {
  const [queuedCount, runningCount, completedCount, failedCount] = await Promise.all([
    prisma.persistentTask.count({ where: { status: 'queued' } }),
    prisma.persistentTask.count({ where: { status: 'running' } }),
    prisma.persistentTask.count({ where: { status: 'completed' } }),
    prisma.persistentTask.count({ where: { status: 'failed' } }),
  ])

  const queued = await prisma.persistentTask.findMany({
    where: { status: 'queued' },
    orderBy: [{ priority: 'asc' }, { enqueuedAt: 'asc' }],
    take: 20,
    select: { id: true, priority: true, agentId: true, enqueuedAt: true },
  })

  const running = await prisma.persistentTask.findMany({
    where: { status: 'running' },
    orderBy: { startedAt: 'desc' },
    take: 10,
    select: { id: true, agentId: true, startedAt: true },
  })

  return {
    queued: queuedCount,
    running: runningCount,
    completed: completedCount,
    failed: failedCount,
    queue: queued.map((t) => ({
      id: t.id,
      priority: t.priority,
      agentId: t.agentId,
      enqueuedAt: t.enqueuedAt.toISOString(),
    })),
    runningTasks: running.map((t) => ({
      id: t.id,
      agentId: t.agentId,
      startedAt: t.startedAt?.toISOString() ?? '',
    })),
  }
}

// ─── 辅助函数 ──────────────────────────────────────────────────────

async function checkDependenciesMet(dependsOn: string[]): Promise<boolean> {
  if (dependsOn.length === 0) return true

  const completedCount = await prisma.persistentTask.count({
    where: {
      id: { in: dependsOn },
      status: 'completed',
    },
  })

  return completedCount === dependsOn.length
}

/**
 * 清理旧任务（保留最近 N 天）
 */
export async function pruneOldTasks(keepDays: number = 7): Promise<number> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - keepDays)

  const result = await prisma.persistentTask.deleteMany({
    where: {
      status: { in: ['completed', 'failed', 'cancelled'] },
      completedAt: { lt: cutoff },
    },
  })

  return result.count
}
