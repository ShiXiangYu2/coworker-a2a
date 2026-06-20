/**
 * Self-Improvement API — 自我改进 API
 *
 * GET /api/learning/self-improvement
 *
 * 返回自我改进数据：路由权重、Prompt 优化、错误模式、最佳实践。
 * 用于 Operator Console 展示。
 */

import { getRoutingSummary, analyzeAgentPerformance, computeRoutingAdjustments } from '@/lib/learning/feedback-loop'
import { getOptimizationReport } from '@/lib/learning/prompt-optimizer'
import { getErrorSummary } from '@/lib/learning/error-patterns'
import { getBestPracticeSummary } from '@/lib/learning/best-practices'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const view = url.searchParams.get('view') ?? 'overview'

  switch (view) {
    case 'overview': {
      return Response.json({
        ok: true,
        data: {
          routing: getRoutingSummary(),
          promptOptimization: getOptimizationReport(),
          errorPatterns: getErrorSummary(),
          bestPractices: getBestPracticeSummary(),
        },
      })
    }

    case 'routing': {
      return Response.json({ ok: true, data: getRoutingSummary() })
    }

    case 'performance': {
      return Response.json({ ok: true, data: analyzeAgentPerformance() })
    }

    case 'adjustments': {
      return Response.json({ ok: true, data: computeRoutingAdjustments() })
    }

    case 'prompt-optimization': {
      return Response.json({ ok: true, data: getOptimizationReport() })
    }

    case 'error-patterns': {
      return Response.json({ ok: true, data: getErrorSummary() })
    }

    case 'best-practices': {
      return Response.json({ ok: true, data: getBestPracticeSummary() })
    }

    default:
      return Response.json(
        { ok: false, error: `Unknown view: ${view}` },
        { status: 400 }
      )
  }
}
