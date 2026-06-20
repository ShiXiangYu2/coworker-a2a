/**
 * HARNESS Execution API — 执行态 API
 *
 * GET /api/operator/harness-execution
 *
 * 返回运行时状态：活跃运行、工具调用、资源消耗、错误。
 */

import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // 活跃运行
    const activeRuns = await prisma.agentRun.findMany({
      where: { status: 'running' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        agentId: true,
        taskId: true,
        status: true,
        startedAt: true,
        createdAt: true,
      },
    })

    const activeRunItems = activeRuns.map((r) => ({
      id: r.id,
      agentId: r.agentId,
      taskId: r.taskId,
      status: r.status,
      startedAt: r.startedAt?.toISOString() ?? r.createdAt.toISOString(),
      durationMs: r.startedAt ? Date.now() - r.startedAt.getTime() : 0,
    }))

    // 最近工具调用
    const recentToolCalls = await prisma.toolCall.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        toolName: true,
        status: true,
        createdAt: true,
      },
    })

    const recentToolCallItems = recentToolCalls.map((c) => ({
      id: c.id,
      agentId: 'system',
      toolName: c.toolName,
      status: c.status,
      durationMs: 0,
      timestamp: c.createdAt.toISOString(),
    }))

    // 资源消耗（简化：从审计事件中统计）
    const recentReceipts = await prisma.toolExecutionReceipt.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      select: { durationMs: true },
    })

    const resourceUsage = {
      tokensUsed: recentReceipts.length * 3000, // 估算
      costUsd: recentReceipts.length * 0.01, // 估算
      requestsCount: recentReceipts.length,
    }

    // 最近错误
    const recentErrors = await prisma.harmonyAuditEvent.findMany({
      where: {
        eventType: { contains: 'fail' },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        actorId: true,
        reason: true,
        createdAt: true,
      },
    })

    const recentErrorItems = recentErrors.map((e) => ({
      id: e.id,
      agentId: e.actorId ?? 'system',
      error: e.reason ?? 'Unknown error',
      timestamp: e.createdAt.toISOString(),
    }))

    return Response.json({
      ok: true,
      data: {
        activeRuns: activeRunItems,
        recentToolCalls: recentToolCallItems,
        resourceUsage,
        recentErrors: recentErrorItems,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}
