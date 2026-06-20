/**
 * Experience Knowledge API — 系统经验库 API
 *
 * GET /api/knowledge/experience - 搜索系统经验
 * POST /api/knowledge/experience - 创建系统经验
 *
 * 查询参数：
 *   - type: 按类型过滤
 *   - text: 搜索文本
 *   - tags: 标签过滤（逗号分隔）
 *   - limit: 结果数量
 */

import { searchKnowledge, createKnowledge, getKnowledgeStats } from '@/lib/knowledge/repository'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const view = url.searchParams.get('view') ?? 'search'

  try {
    if (view === 'stats') {
      const stats = await getKnowledgeStats()
      return Response.json({ ok: true, data: stats })
    }

    const results = await searchKnowledge({
      text: url.searchParams.get('text') ?? undefined,
      type: url.searchParams.get('type') as 'workflow_template' | 'execution_plan' | 'judgment_pattern' | 'debt_case' | 'failure_pattern' | 'fix_pattern' | 'evidence_snapshot' | 'best_practice' | 'lesson_learned' | 'tool_usage_pattern' | undefined,
      tags: url.searchParams.get('tags')?.split(',') ?? undefined,
      limit: parseInt(url.searchParams.get('limit') ?? '20'),
    })

    return Response.json({ ok: true, data: results })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const entry = await createKnowledge(body)
    return Response.json({ ok: true, data: entry })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}
