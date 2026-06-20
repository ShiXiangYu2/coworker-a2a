/**
 * HARNESS Task Flow API — 任务流 API
 *
 * GET /api/operator/harness-task-flow
 *
 * 返回任务列表和阶段分布。
 */

import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // 获取最近的任务
    const tasks = await prisma.harmonyTask.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        status: true,
        targetAgentId: true,
        confidence: true,
        statusReason: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // 提取生命周期阶段
    const stageCounts: Record<string, number> = {
      intake: 0, consensus: 0, planning: 0,
      execution: 0, review: 0, repair: 0,
    }

    const taskItems = tasks.map((t) => {
      let stage = 'intake'
      if (t.statusReason) {
        try {
          const meta = JSON.parse(t.statusReason)
          stage = meta.lifecycleStage ?? 'intake'
        } catch {
          // 使用默认值
        }
      }
      stageCounts[stage] = (stageCounts[stage] ?? 0) + 1

      return {
        id: t.id,
        title: t.title,
        stage,
        status: t.status,
        agentId: t.targetAgentId ?? 'unassigned',
        confidence: t.confidence,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }
    })

    return Response.json({
      ok: true,
      data: {
        tasks: taskItems,
        stageCounts,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}
