/**
 * HARNESS Governance API — 治理台账 API
 *
 * GET /api/operator/harness-governance
 *
 * 返回治理记录：判断记录、债务登记、审计日志、评估摘要。
 */

import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // 判断记录
    const judgments = await prisma.judgmentRecord.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        judgmentType: true,
        targetType: true,
        targetId: true,
        title: true,
        reason: true,
        status: true,
        createdAt: true,
      },
    })

    const judgmentItems = judgments.map((j) => ({
      id: j.id,
      type: j.judgmentType,
      targetType: j.targetType,
      targetId: j.targetId,
      reason: `${j.title}: ${j.reason}`.slice(0, 150),
      status: j.status,
      createdAt: j.createdAt.toISOString(),
    }))

    // 债务登记
    const debts = await prisma.governanceDebt.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        debtType: true,
        severity: true,
        title: true,
        status: true,
        blocksExecution: true,
        createdAt: true,
      },
    })

    const debtItems = debts.map((d) => ({
      id: d.id,
      type: d.debtType,
      severity: d.severity,
      title: d.title,
      status: d.status,
      blocksExecution: d.blocksExecution,
      createdAt: d.createdAt.toISOString(),
    }))

    // 最近审计日志
    const recentAudits = await prisma.harmonyAuditEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        eventType: true,
        actorId: true,
        reason: true,
        createdAt: true,
      },
    })

    const auditItems = recentAudits.map((a) => ({
      id: a.id,
      eventType: a.eventType,
      actorId: a.actorId ?? 'system',
      reason: a.reason ?? '',
      createdAt: a.createdAt.toISOString(),
    }))

    // 评估摘要
    const totalRuns = await prisma.evalRun.count()
    const passedRuns = await prisma.evalRun.count({
      where: { status: 'completed' },
    })
    const recentFindings = await prisma.evalFinding.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    })

    const evalSummary = {
      totalRuns,
      passRate: totalRuns > 0 ? passedRuns / totalRuns : 0,
      recentFindings,
    }

    return Response.json({
      ok: true,
      data: {
        judgments: judgmentItems,
        debts: debtItems,
        recentAudits: auditItems,
        evalSummary,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}
