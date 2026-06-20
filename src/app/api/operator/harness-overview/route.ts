/**
 * HARNESS Overview API — 总控台总览 API
 *
 * GET /api/operator/harness-overview
 *
 * 返回系统全局状态：活跃任务、运行中 Agent、阻塞点、审查发现、执行回执。
 */

import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth/middleware'

export const GET = withAuth(async () => {
  try {
    // 活跃任务数
    const activeTasks = await prisma.harmonyTask.count({
      where: { status: { in: ['queued', 'running', 'pending_confirmation'] } },
    })

    // 运行中的 AgentRun
    const runningAgentRuns = await prisma.agentRun.count({
      where: { status: 'running' },
    })

    // 最近阻塞点
    const recentBlockages = await prisma.harmonyTask.count({
      where: {
        status: 'blocked',
        updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    })

    // 最近审查发现
    const recentReviewFindings = await prisma.evalFinding.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    })

    // 最近执行回执
    const recentReceipts = await prisma.toolExecutionReceipt.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    })

    // 生命周期阶段分布
    const lifecycleDistribution: Record<string, number> = {
      intake: 0, consensus: 0, planning: 0,
      execution: 0, review: 0, repair: 0,
    }

    // 从 statusReason 中提取阶段信息
    const recentTasks = await prisma.harmonyTask.findMany({
      where: {
        updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      select: { statusReason: true },
      take: 200,
    })

    for (const task of recentTasks) {
      if (task.statusReason) {
        try {
          const meta = JSON.parse(task.statusReason)
          const stage = meta.lifecycleStage ?? 'intake'
          lifecycleDistribution[stage] = (lifecycleDistribution[stage] ?? 0) + 1
        } catch {
          lifecycleDistribution.intake++
        }
      } else {
        lifecycleDistribution.intake++
      }
    }

    // 最近事件
    const recentAuditEvents = await prisma.harmonyAuditEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        eventType: true,
        actorId: true,
        reason: true,
        createdAt: true,
      },
    })

    const recentEvents = recentAuditEvents.map((e) => ({
      id: e.id,
      type: e.eventType,
      agentId: e.actorId ?? 'system',
      timestamp: e.createdAt.toISOString(),
      summary: e.reason?.slice(0, 100) ?? '',
    }))

    return Response.json({
      ok: true,
      data: {
        activeTasks,
        runningAgentRuns,
        recentBlockages,
        recentReviewFindings,
        recentReceipts,
        lifecycleDistribution,
        recentEvents,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
})
