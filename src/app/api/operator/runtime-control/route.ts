import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // 获取队列水位（queued 状态的 job 数量）
    const queueWatermark = await prisma.runtimeDispatchJob.count({
      where: { status: 'queued' },
    })

    // 获取活跃 lease 数量（leased 或 running 状态的 job）
    const activeLeases = await prisma.runtimeDispatchJob.count({
      where: { status: { in: ['leased', 'running'] } },
    })

    // 获取最近的阻塞原因
    const blockedJobs = await prisma.runtimeDispatchJob.findMany({
      where: { status: 'blocked' },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })
    const recentBlockedReasons = blockedJobs
      .map((job) => {
        try {
          const error = JSON.parse(job.lastErrorJson ?? '{}')
          return error.reason ?? '未知原因'
        } catch {
          return '解析错误'
        }
      })
      .filter(Boolean)

    // 获取最近的 Receipt
    const recentReceipts = await prisma.runtimeExecutionReceipt.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        jobId: true,
        status: true,
        summary: true,
        createdAt: true,
      },
    })

    // 获取最近的 Recovery Point
    const recentRecoveryPoints = await prisma.runtimeRecoveryPoint.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        jobId: true,
        recoveryKind: true,
        createdAt: true,
      },
    })

    // 获取 Idempotency 命中次数
    const idempotencyHits = await prisma.runtimeDispatchAttempt.count({
      where: {
        job: {
          status: 'succeeded',
        },
      },
    })

    // 获取总数统计
    const totalJobs = await prisma.runtimeDispatchJob.count()
    const completedJobs = await prisma.runtimeDispatchJob.count({
      where: { status: 'succeeded' },
    })
    const failedJobs = await prisma.runtimeDispatchJob.count({
      where: { status: 'failed' },
    })

    return Response.json({
      ok: true,
      data: {
        queueWatermark,
        activeLeases,
        recentBlockedReasons,
        recentReceipts: recentReceipts.map((r) => ({
          id: r.id,
          jobId: r.jobId,
          status: r.status,
          summary: r.summary,
          createdAt: r.createdAt,
        })),
        recentRecoveryPoints,
        idempotencyHits,
        totalJobs,
        completedJobs,
        failedJobs,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch runtime control data'
    return Response.json({ ok: false, error: { message } }, { status: 500 })
  }
}
