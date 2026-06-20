/**
 * Persistent Feedback — 持久化反馈数据
 *
 * 用 Prisma/SQLite 替代内存中的路由决策记录和权重。
 * 进程重启后数据不丢失。
 */

import { prisma } from '@/lib/prisma'
import type { RoutingWeightAdjustment, AgentPerformanceStats } from './feedback-loop'

// ─── 记录路由决策 ──────────────────────────────────────────────────

/**
 * 持久化记录路由决策
 */
export async function recordPersistentRoutingDecision(outcome: {
  agentId: string
  taskType: string
  routeConfidence: number
  executionStatus: string
  executionConfidence: number
  durationMs: number
  matchedSignals?: string[]
}): Promise<void> {
  try {
    await prisma.routingDecisionRecord.create({
      data: {
        agentId: outcome.agentId,
        taskType: outcome.taskType,
        routeConfidence: outcome.routeConfidence,
        executionStatus: outcome.executionStatus,
        executionConfidence: outcome.executionConfidence,
        durationMs: outcome.durationMs,
        matchedSignalsJson: JSON.stringify(outcome.matchedSignals ?? []),
      },
    })

    // 异步更新权重
    await updatePersistentWeights(outcome.agentId, outcome.taskType)
  } catch (error) {
    console.error('[PersistentFeedback] Failed to record decision:', error)
  }
}

// ─── 更新权重 ──────────────────────────────────────────────────────

async function updatePersistentWeights(agentId: string, taskType: string): Promise<void> {
  // 统计该组合的成功率
  const totalDecisions = await prisma.routingDecisionRecord.count({
    where: { agentId, taskType },
  })

  if (totalDecisions < 5) return // 样本不足

  const successDecisions = await prisma.routingDecisionRecord.count({
    where: { agentId, taskType, executionStatus: 'completed' },
  })

  const successRate = successDecisions / totalDecisions

  // 计算全局平均成功率
  const globalTotal = await prisma.routingDecisionRecord.count()
  const globalSuccess = await prisma.routingDecisionRecord.count({
    where: { executionStatus: 'completed' },
  })
  const globalSuccessRate = globalTotal > 0 ? globalSuccess / globalTotal : 0.5

  // 计算建议权重
  const ratio = globalSuccessRate > 0 ? successRate / globalSuccessRate : 1.0
  const suggestedWeight = Math.max(0.3, Math.min(2.0, Math.round(ratio * 100) / 100))

  // 更新或创建权重记录
  await prisma.routingWeightRecord.upsert({
    where: { agentId_taskType: { agentId, taskType } },
    update: {
      suggestedWeight,
      reason: successRate > globalSuccessRate
        ? `Above-average success rate (${(successRate * 100).toFixed(0)}%)`
        : `Below-average success rate (${(successRate * 100).toFixed(0)}%)`,
      sampleSize: totalDecisions,
      successRate,
    },
    create: {
      agentId,
      taskType,
      currentWeight: 1.0,
      suggestedWeight,
      reason: `Initial weight from ${totalDecisions} decisions`,
      sampleSize: totalDecisions,
      successRate,
    },
  })
}

// ─── 查询权重 ──────────────────────────────────────────────────────

/**
 * 获取持久化路由权重
 */
export async function getPersistentRoutingWeight(
  agentId: string,
  taskType: string,
): Promise<number> {
  try {
    const record = await prisma.routingWeightRecord.findUnique({
      where: { agentId_taskType: { agentId, taskType } },
    })
    return record?.suggestedWeight ?? 1.0
  } catch {
    return 1.0
  }
}

/**
 * 获取所有持久化权重
 */
export async function getAllPersistentWeights(): Promise<
  Array<{
    agentId: string
    taskType: string
    weight: number
    successRate: number
    sampleSize: number
  }>
> {
  try {
    const records = await prisma.routingWeightRecord.findMany({
      orderBy: { sampleSize: 'desc' },
    })

    return records.map((r) => ({
      agentId: r.agentId,
      taskType: r.taskType,
      weight: r.suggestedWeight,
      successRate: r.successRate,
      sampleSize: r.sampleSize,
    }))
  } catch {
    return []
  }
}

// ─── 性能统计 ──────────────────────────────────────────────────────

/**
 * 获取持久化 Agent 性能统计
 */
export async function getPersistentAgentStats(): Promise<AgentPerformanceStats[]> {
  try {
    // 按 agentId 分组统计
    const agentGroups = await prisma.routingDecisionRecord.groupBy({
      by: ['agentId'],
      _count: true,
      _avg: { executionConfidence: true, durationMs: true },
    })

    const stats: AgentPerformanceStats[] = []

    for (const group of agentGroups) {
      const agentId = group.agentId
      const totalExecutions = group._count
      const successCount = await prisma.routingDecisionRecord.count({
        where: { agentId, executionStatus: 'completed' },
      })
      const failureCount = await prisma.routingDecisionRecord.count({
        where: { agentId, executionStatus: 'failed' },
      })

      // 按 taskType 分组
      const typeGroups = await prisma.routingDecisionRecord.groupBy({
        by: ['taskType'],
        where: { agentId },
        _count: true,
      })

      const typeStats = await Promise.all(
        typeGroups.map(async (tg) => {
          const typeSuccess = await prisma.routingDecisionRecord.count({
            where: { agentId, taskType: tg.taskType, executionStatus: 'completed' },
          })
          return {
            type: tg.taskType,
            successRate: tg._count > 0 ? typeSuccess / tg._count : 0,
            count: tg._count,
          }
        })
      )

      const strongestTaskTypes = [...typeStats]
        .sort((a, b) => b.successRate - a.successRate)
        .slice(0, 3)

      const weakestTaskTypes = [...typeStats]
        .sort((a, b) => a.successRate - b.successRate)
        .slice(0, 3)

      stats.push({
        agentId,
        totalExecutions,
        successCount,
        failureCount,
        successRate: totalExecutions > 0 ? successCount / totalExecutions : 0,
        avgConfidence: group._avg.executionConfidence ?? 0.5,
        avgDurationMs: group._avg.durationMs ?? 0,
        strongestTaskTypes,
        weakestTaskTypes,
      })
    }

    return stats.sort((a, b) => b.successRate - a.successRate)
  } catch {
    return []
  }
}

/**
 * 获取持久化路由决策摘要
 */
export async function getPersistentRoutingSummary(): Promise<{
  totalDecisions: number
  agentStats: AgentPerformanceStats[]
  topAdjustments: RoutingWeightAdjustment[]
  recentTrend: 'improving' | 'stable' | 'declining'
}> {
  const totalDecisions = await prisma.routingDecisionRecord.count()
  const agentStats = await getPersistentAgentStats()
  const weights = await getAllPersistentWeights()

  const topAdjustments: RoutingWeightAdjustment[] = weights
    .filter((w) => Math.abs(w.weight - 1.0) > 0.1)
    .map((w) => ({
      agentId: w.agentId,
      taskType: w.taskType,
      currentWeight: 1.0,
      suggestedWeight: w.weight,
      reason: `Success rate: ${(w.successRate * 100).toFixed(0)}%`,
      sampleSize: w.sampleSize,
    }))

  // 计算趋势
  const recentCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const prevCutoff = new Date(Date.now() - 48 * 60 * 60 * 1000)

  const recentSuccess = await prisma.routingDecisionRecord.count({
    where: { executionStatus: 'completed', createdAt: { gte: recentCutoff } },
  })
  const recentTotal = await prisma.routingDecisionRecord.count({
    where: { createdAt: { gte: recentCutoff } },
  })
  const prevSuccess = await prisma.routingDecisionRecord.count({
    where: { executionStatus: 'completed', createdAt: { gte: prevCutoff, lt: recentCutoff } },
  })
  const prevTotal = await prisma.routingDecisionRecord.count({
    where: { createdAt: { gte: prevCutoff, lt: recentCutoff } },
  })

  const recentRate = recentTotal > 0 ? recentSuccess / recentTotal : 0.5
  const prevRate = prevTotal > 0 ? prevSuccess / prevTotal : 0.5

  let recentTrend: 'improving' | 'stable' | 'declining' = 'stable'
  if (recentRate > prevRate + 0.05) recentTrend = 'improving'
  else if (recentRate < prevRate - 0.05) recentTrend = 'declining'

  return { totalDecisions, agentStats, topAdjustments, recentTrend }
}
