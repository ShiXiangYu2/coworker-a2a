import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

// 系统经验类型
const EXPERIENCE_TYPES = [
  'workflow_template',
  'execution_plan',
  'judgment_pattern',
  'resolved_debt_case',
  'failure_pattern',
  'evidence_snapshot',
  'system_experience',
]

const EXPERIENCE_TYPE_LABELS: Record<string, string> = {
  workflow_template: 'Workflow 模板',
  execution_plan: '执行计划',
  judgment_pattern: '判断模式',
  resolved_debt_case: '已关闭债务案例',
  failure_pattern: '失败模式',
  evidence_snapshot: '证据快照',
  system_experience: '系统经验',
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const type = url.searchParams.get('type') ?? undefined
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : undefined

    // 查询知识条目，筛选系统经验类型
    const where = {
      kind: type && EXPERIENCE_TYPES.includes(type) ? type : { in: EXPERIENCE_TYPES },
      status: 'approved',
    }

    const items = await prisma.knowledgeItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit ?? 50,
    })

    // 按类型分组统计
    const stats = await prisma.knowledgeItem.groupBy({
      by: ['kind'],
      where: { kind: { in: EXPERIENCE_TYPES }, status: 'approved' },
      _count: true,
    })

    const statsMap: Record<string, number> = {}
    for (const stat of stats) {
      statsMap[stat.kind] = stat._count
    }

    return Response.json({
      ok: true,
      data: {
        items: items.map((item) => ({
          id: item.id,
          kind: item.kind,
          kindLabel: EXPERIENCE_TYPE_LABELS[item.kind] ?? item.kind,
          title: item.title,
          content: item.content,
          scope: item.scope,
          version: item.version,
          createdBy: item.createdBy,
          createdAt: item.createdAt,
        })),
        stats: EXPERIENCE_TYPES.map((type) => ({
          type,
          label: EXPERIENCE_TYPE_LABELS[type],
          count: statsMap[type] ?? 0,
        })),
        total: items.length,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch system experience'
    return Response.json({ ok: false, error: { message } }, { status: 500 })
  }
}
