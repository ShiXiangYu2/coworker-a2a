/**
 * Lifecycle State Machine — 生命周期状态机
 *
 * 管理任务在六阶段之间的转换。
 * 每次转换都记录审计日志。
 */

import { prisma } from '@/lib/prisma'
import { isValidTransition, getStageProgress, type LifecycleStage } from './types'
import { publishStepStarted, publishStepCompleted } from '@/lib/realtime/event-bus'

// ─── 类型定义 ──────────────────────────────────────────────────────

export interface TransitionResult {
  success: boolean
  from: LifecycleStage
  to: LifecycleStage
  /** 是否需要人工确认 */
  requiresHumanConfirmation: boolean
  /** 错误信息（如果失败） */
  error?: string
}

// ─── 状态机 ────────────────────────────────────────────────────────

/**
 * 执行阶段转换
 *
 * @param taskId 任务 ID
 * @param fromStage 当前阶段
 * @param toStage 目标阶段
 * @param agentId 执行转换的 Agent
 * @param reason 转换原因
 * @returns 转换结果
 */
export async function transitionStage(
  taskId: string,
  fromStage: LifecycleStage,
  toStage: LifecycleStage,
  agentId: string,
  reason: string = '',
): Promise<TransitionResult> {
  // 1. 验证转换是否有效
  if (!isValidTransition(fromStage, toStage)) {
    return {
      success: false,
      from: fromStage,
      to: toStage,
      requiresHumanConfirmation: false,
      error: `Invalid transition: ${fromStage} → ${toStage}`,
    }
  }

  // 2. 检查是否需要人工确认
  const requiresHumanConfirmation = checkRequiresHumanConfirmation(fromStage, toStage)

  // 3. 更新任务阶段
  try {
    await prisma.harmonyTask.update({
      where: { id: taskId },
      data: {
        // 使用 statusReason 字段存储阶段信息（兼容现有模型）
        statusReason: JSON.stringify({
          lifecycleStage: toStage,
          previousStage: fromStage,
          transitionedAt: new Date().toISOString(),
          transitionedBy: agentId,
          reason,
        }),
      },
    })
  } catch (error) {
    return {
      success: false,
      from: fromStage,
      to: toStage,
      requiresHumanConfirmation: false,
      error: `Failed to update task: ${error instanceof Error ? error.message : String(error)}`,
    }
  }

  // 4. 记录审计事件
  await recordLifecycleAudit(taskId, fromStage, toStage, agentId, reason)

  // 5. 发布实时事件
  const stageName = toStage
  publishStepStarted(agentId, taskId, `lifecycle:${stageName}`)
  publishStepCompleted(agentId, taskId, `lifecycle:${stageName}`, {
    from: fromStage,
    to: toStage,
    progress: getStageProgress(toStage),
  })

  return {
    success: true,
    from: fromStage,
    to: toStage,
    requiresHumanConfirmation,
  }
}

/**
 * 获取任务的当前生命周期阶段
 */
export async function getTaskStage(taskId: string): Promise<LifecycleStage> {
  try {
    const task = await prisma.harmonyTask.findUnique({
      where: { id: taskId },
      select: { statusReason: true },
    })

    if (!task?.statusReason) return 'intake'

    try {
      const meta = JSON.parse(task.statusReason)
      return meta.lifecycleStage ?? 'intake'
    } catch {
      return 'intake'
    }
  } catch {
    return 'intake'
  }
}

/**
 * 获取任务的生命周期进度
 */
export async function getTaskProgress(taskId: string): Promise<{
  stage: LifecycleStage
  progress: number
  stageHistory: Array<{ stage: LifecycleStage; timestamp: string; agentId: string }>
}> {
  const stage = await getTaskStage(taskId)
  const progress = getStageProgress(stage)

  // 从审计事件中提取阶段历史
  const stageHistory = await getStageHistory(taskId)

  return { stage, progress, stageHistory }
}

// ─── 辅助函数 ──────────────────────────────────────────────────────

function checkRequiresHumanConfirmation(from: LifecycleStage, to: LifecycleStage): boolean {
  if (from === 'execution' && to === 'review') return true
  if (from === 'review' && to === 'repair') return true
  return false
}

async function recordLifecycleAudit(
  taskId: string,
  fromStage: LifecycleStage,
  toStage: LifecycleStage,
  agentId: string,
  reason: string,
): Promise<void> {
  try {
    await prisma.harmonyAuditEvent.create({
      data: {
        taskId,
        eventType: 'lifecycle.transition',
        actorType: 'agent',
        actorId: agentId,
        beforeStatus: fromStage,
        afterStatus: toStage,
        reason: reason || `Lifecycle transition: ${fromStage} → ${toStage}`,
        payloadJson: JSON.stringify({
          fromStage,
          toStage,
          progress: getStageProgress(toStage),
          timestamp: new Date().toISOString(),
        }),
      },
    })
  } catch {
    // 审计失败不影响转换
  }
}

async function getStageHistory(taskId: string): Promise<Array<{ stage: LifecycleStage; timestamp: string; agentId: string }>> {
  try {
    const events = await prisma.harmonyAuditEvent.findMany({
      where: {
        taskId,
        eventType: 'lifecycle.transition',
      },
      orderBy: { createdAt: 'asc' },
      select: {
        afterStatus: true,
        createdAt: true,
        actorId: true,
      },
    })

    return events.map((e) => ({
      stage: (e.afterStatus as LifecycleStage) ?? 'intake',
      timestamp: e.createdAt.toISOString(),
      agentId: e.actorId ?? 'system',
    }))
  } catch {
    return []
  }
}
