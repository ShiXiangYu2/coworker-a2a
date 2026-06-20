/**
 * Learning Feedback API — 自我改进闭环 API
 *
 * GET /api/learning/feedback
 *
 * 返回 Agent 性能分析和路由权重调整建议。
 * 用于 Operator Console 展示和路由系统调优。
 */

import {
  getRoutingSummary,
  analyzeAgentPerformance,
  computeRoutingAdjustments,
  getRoutingWeight,
  getRoutingRecords,
} from '@/lib/learning/feedback-loop'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const view = url.searchParams.get('view') ?? 'summary'

  switch (view) {
    case 'summary': {
      const summary = getRoutingSummary()
      return Response.json({ ok: true, data: summary })
    }

    case 'performance': {
      const stats = analyzeAgentPerformance()
      return Response.json({ ok: true, data: stats })
    }

    case 'adjustments': {
      const adjustments = computeRoutingAdjustments()
      return Response.json({ ok: true, data: adjustments })
    }

    case 'weight': {
      const agentId = url.searchParams.get('agentId')
      const taskType = url.searchParams.get('taskType')
      if (!agentId || !taskType) {
        return Response.json(
          { ok: false, error: 'agentId and taskType are required' },
          { status: 400 }
        )
      }
      const weight = getRoutingWeight(agentId, taskType)
      return Response.json({ ok: true, data: { agentId, taskType, weight } })
    }

    case 'records': {
      const records = getRoutingRecords()
      return Response.json({ ok: true, data: records })
    }

    default:
      return Response.json(
        { ok: false, error: `Unknown view: ${view}` },
        { status: 400 }
      )
  }
}
